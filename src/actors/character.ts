import * as Constants from '../constants';
import { GameScene } from '../scenes/gameScene';
import { Actor, Dialogs } from '../types';

const { TILEHEIGHT, TILEWIDTH } = Constants;

export default abstract class Character extends Phaser.Physics.Arcade.Sprite implements Actor {
    soundDictionary: Dialogs = {move: [], attack: [], death: [], collide: []};
    dialogue: Dialogs = {spawn: [], death: [], generic: []};
    currentAnimations: Record<string, any> = {};
    currentDialogue: any = null;
    vrfProvider: any;
    hp: number = 0;
    ap: number = 0;
    dp: number = 0;
    numDice: number = 2;
    diceSides: number = 6;
    scene: GameScene;

    constructor(
        scene: GameScene, 
        x: number, 
        y: number, 
        texture: string | Phaser.Textures.Texture, 
        frame: string | number,
        config: Record<string, any>, 
        vrfProvider: any,
    ) {
        super(scene, x, y, texture, frame);
        this.scene = scene;
        // config['sounds'] should be a dictionary with the following keys:
        //       'move', 'attack', 'death', 'collide'
        // the values will be preloaded handles to sounds for these events
        this.soundDictionary = config['sounds'];

        // config['dialogue'] should be a dictionary with the following keys:
        //       'spawn', 'death', 'generic'
        // the values will be lists of dialogue strings 
        this.dialogue = config['dialogue'];

        this.currentAnimations = {};

        this.vrfProvider = vrfProvider;

        // the top left pixel of the character is the
        // "anchor" for its x and y coordinates, as opposed
        // to the center
        this.setOrigin(0, 0);

        this.scene = scene;
        this.scene.add.existing(this);
        this.scene.physics.add.existing(this);
        this.setCollideWorldBounds(true);

        this.setX(x * TILEWIDTH);
        this.setY(y * TILEHEIGHT);;

        // this.initStatsFromChain();
    }

    // performs a move with collision checks
    moveTileXY(x: number, y: number): void {
        // check collision
        // TODO: I don't think this method exists on a Phase Scene.
        const scene = this.scene as any;
        if (scene.doesTileCollide && scene.doesTileCollide(x, y)) {
            // play sound
            this.playSound('collide');
            return;
        }

        // move 
        this.setX(x * TILEWIDTH);
        this.setY(y * TILEHEIGHT);

        // play sound
        this.playSound('move');

        if (this.vrfProvider.roll(10) === 10) {
            this.animateDialogue('generic');
        }
    }

    tileX(): number {
        return this.x / TILEWIDTH;
    }

    tileY(): number {
        return this.y / TILEHEIGHT;
    }

    getName(): string {
        // hacky way to uniquely determine name of the sprite
        return this.texture.key;
    }

    isDead(): boolean {
        return this.hp <= 0;
    }

    attack(character: Actor): void {
        if (!character.isDead()) {
            // calculate damage w/ randomness
            var damage = this.calculateDamage();

            // animate attack

            // animate dialogue
            if (this.vrfProvider.roll(3) === 3) {
                this.animateDialogue('attack');
            }

            // play sound
            this.playSound('attack');

            // apply damage to character
            character.takeDamage(damage);
        }
    }

    calculateDamage(): number {
        // adapting from Simple D6 - 3rd ed: https://i.4pcdn.org/tg/1372924544491.pdf
        // ap === num dice

        // roll dice
        var maxRoll = 0;
        var numMax = 0;
        for (var i = 0; i < this.ap; i++) {
            var roll = this.vrfProvider.roll(this.diceSides);
            if (roll > maxRoll) {
                maxRoll = roll;
                continue;
            }
            if (roll === this.diceSides) {
                console.log("%s: natural %s added to total", this.getName(), this.diceSides);
                ++numMax;
            }
        }

        // damage should never exceed numSides (6) + ap - 1
        return maxRoll + numMax;
    }

    kill() {
        // play death animation + sound + dialogue
        console.log("%s: killing!", this.getName());
        this.animateDialogue('death');
        this.playSound('death');

        // change sprite
        this.setFrame(this.frame.name + 1);
    }
    
    takeDamage(damageDealt: number): void {
        var damageReceived = Math.max(0, damageDealt - this.dp);

        // animate damage done
        this.animateDamage(damageDealt - damageReceived, damageReceived);

        // apply damage
        this.hp -= damageReceived;
        console.log("%s: takeDamage; damageReceived %s, remaining hp %s ", this.getName(), damageReceived, this.hp);
        if (this.hp <= 0) {
            this.kill();
        }
    }

    playSound(soundName: string): void {
        // TODO: implement
    }

    fadeText(textObject: any): boolean {
        if (textObject != null) {
            var fadeDeltaPerUpdate = Constants.FADE_TEXT_RATE;
            // hacky
            textObject.alpha -= fadeDeltaPerUpdate
            if (textObject.alpha <= fadeDeltaPerUpdate) {
                textObject.destroy()
                return true;
            }
        }
        return false;
    }

    updateAnimations():void {
        if (this.fadeText(this.currentAnimations['dialogue'])) {
            this.currentAnimations['dialogue'] = null;
        }

        if (this.fadeText(this.currentAnimations['damageReceived'])) {
            this.currentAnimations['damageReceived'] = null;
        }

        if (this.fadeText(this.currentAnimations['damageBlocked'])) {
            this.currentAnimations['damageBlocked'] = null;
        }
    }

    // animates a random dialogue choice in the supplied category
    animateDialogue(dialogueName: string): void {
        if (this.currentDialogue == null) {
            var dialogueCategory = this.dialogue[dialogueName];
            var dialogueToDisplay = dialogueCategory[Math.floor(Math.random() * dialogueCategory.length)];
            var dialogue = this.animateText(dialogueToDisplay, this.x - TILEWIDTH / 2, this.y, "#000000");
            this.currentAnimations['dialogue'] = dialogue;
        }
        else {
            console.log("%s: current dialogue not null", this.getName());
        }
    }

    animateDamage(received: number, blocked: number): void {
        this.playDamageAnimation();
        this.animateDamageStats(received, blocked);
    }

    playDamageAnimation() {
        var dmgSprite = new Phaser.GameObjects.Sprite(this.scene, this.x, this.y, "damageSprites", 0);
        this.scene.add.existing(dmgSprite);
        dmgSprite.play({ key: "damageAnimation", showOnStart: true });
        dmgSprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            dmgSprite.destroy();
        });
    }

    animateDamageStats(received: number, blocked: number): void {
        if (this.currentAnimations['damageReceived'] == null && this.currentAnimations['damageBlocked'] == null) {
            // crimson and grey colors with staggering
            this.currentAnimations['damageReceived'] = this.animateText(
                received.toString(),
                this.x + Constants.DAMAGE_X_OFFSET_PX,
                this.y + TILEHEIGHT,
                Constants.DAMAGE_RECEIVED_COLOR,
                Constants.DAMAGE_FONT_SIZE);
            this.currentAnimations['damageBlocked'] = this.animateText(
                blocked.toString(),
                this.x + TILEWIDTH - Constants.DAMAGE_X_OFFSET_PX,
                this.y + TILEHEIGHT,
                Constants.DAMAGE_BLOCKED_COLOR,
                Constants.DAMAGE_FONT_SIZE);
        }
    }

    animateText(
        textToDisplay: string,
        x = this.x,
        y = this.y,
        color = Constants.DEFAULT_FONT_COLOR,
        size = Constants.DEFAULT_FONT_SIZE) {
        const text = this.scene.add.text(
            x, // center the text
            y,
            textToDisplay,
            { fontFamily: Constants.DEFAULT_FONT, fontSize: size + "px", color });
        text.setStroke("#de77ae", 14);

        this.scene.physics.world.enable([text]);

        const body = text.body as Phaser.Physics.Arcade.Body ;
        // text floats up
        body.velocity.setTo(0, -20);
        body.setCollideWorldBounds(true);

        return text;
    }
}