import EasyStar from 'easystarjs';
//import { AbiCoder } from 'ethers/lib/utils';
import Phaser from 'phaser';

import Enemy from '../actors/enemy';
import Player from '../actors/player';
import dialogue from '../assets/dialogue.json';
import { getPublicUrl } from '../assets/helpers';
import * as constants from '../constants';
import { NUM_ENEMIES, TILEHEIGHT, TILEWIDTH } from '../constants';
import { completeBoard, startBoard } from '../contractAbi'
import gameState from '../gameState';
import { BoardMeta } from '../types';
import { VrfProvider } from '../vrfProvider';
import { GameScene } from './gameScene';

const GAME_MODE = Object.freeze({ OFFLINE: 1, ONLINE:2 });
const COLLISION_INDEX_START = 54;
const COLLISION_INDEX_END = 83;
const ENEMY_SPRITE_SIZE_PX = 64;
/* const WALKABLE_RANGES = [
    [1, 3], [26, 28], [51, 53], [76, 78], [101, 103], [126, 128], [183, 185], [189, 200]
]; */
const COLLIDING_RANGES = [
    [4, 25], [29, 50], [54, 75], [79, 100], [104, 125], [129, 182], [186, 188]
];
const PATHFINDER_ITERATIONS = 1000;

export class LabScene extends GameScene {
    //////////////// PHASER LIFECYLE //////////////////////////

    preload() {
        this.load.image('tiles', getPublicUrl('/tilemaps/tiles/factory64x64.png'));
        this.load.tilemapCSV('map', getPublicUrl('/tilemaps/csv/lab1.csv'));
        this.load.spritesheet('player', getPublicUrl('/sprites/scientist_game.png'), { frameWidth: TILEWIDTH, frameHeight: TILEHEIGHT });
        for (let i = 0; i < NUM_ENEMIES; i++) {
            this.load.spritesheet(
                'enemy_' + i,
                getPublicUrl('/sprites/droids_sprite_64x64.png'),
                {
                    frameWidth: ENEMY_SPRITE_SIZE_PX,
                    frameHeight: ENEMY_SPRITE_SIZE_PX,
                    startFrame: 2 * i,
                    endFrame: 2 * i + 1
                }
            );
        }
        this.load.spritesheet('damageSprites', getPublicUrl('/animations/explosionSheet.png'), { frameWidth: 32, frameHeight: 32 });
    }

    create() {
        this.pathfinder = new EasyStar.js();

        // LOAD MAP 
        this.map = this.make.tilemap({ key: 'map', tileWidth: TILEWIDTH, tileHeight: TILEHEIGHT });
        this.tileset = this.map.addTilesetImage('tiles');
        const layer = this.map.createLayer(0, this.tileset, 0, 0);
        this.map.setCollisionBetween(COLLISION_INDEX_START, COLLISION_INDEX_END);
        this.pathfinder.setGrid(this.buildPathfindingGrid());
        this.pathfinder.setAcceptableTiles(this.buildAcceptableTileList());
        // so that we can call this in the update loop
        this.pathfinder.enableSync();
        // we recalculate every turn... keeping this low for now
        this.pathfinder.setIterationsPerCalculation(PATHFINDER_ITERATIONS);
        this.vrfProvider = new VrfProvider();

        // SPAWN SPRITES
        this.player = new Player(
            this,
            2,
            5,
            'player',
            0, // frame
            this.getPlayerConfig(),
            this.vrfProvider);
        this.collidingGameObjects.push(this.player);

        for (let i = 0; i < NUM_ENEMIES; i++) {
            const enemyXY = this.getEnemySpawnPosition(i);
            const enemy = new Enemy(
                this,
                enemyXY[0],
                enemyXY[1],
                'enemy_' + i,
                i * 2, //frame
                this.getEnemyConfig(), 
                this.vrfProvider);

            enemy.scaleX = TILEWIDTH / ENEMY_SPRITE_SIZE_PX;
            enemy.scaleY = TILEHEIGHT / ENEMY_SPRITE_SIZE_PX;
            this.enemies.push(enemy);
            this.collidingGameObjects.push(enemy);
        }

        // INITIALIZE ANIMATIONS
        this.anims.create({
            key: "damageAnimation",
            //frameRate:, 
            frames: this.anims.generateFrameNumbers("damageSprites", {}),
            repeat: 0
        });

        this.physics.add.collider(this.player, layer);

        // INITIALIZE HISTORY
        this.moveHistory.push([this.player.tileX(), this.player.tileY(), false]);
        this.enemies.forEach(enemy => {
            this.moveHistory.push([enemy.tileX(), enemy.tileY(), false]);
        });

        // CONFIGURE CAMERA
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

        // INIT INPUT
        this.cursors = this.input.keyboard.createCursorKeys();

        // INIT UI / UX
        const turnsRemainingText = this.add.text(0, 0, "TURNS REMAINING: XX", {
            fontSize: constants.TURNS_REMAINING_FONT_SIZE_STRING,
            fontFamily: constants.TURNS_REMAINING_FONT_FAMILY,
            color: "#fff",
            backgroundColor: "#000"
        });
        turnsRemainingText.setPosition(
            (constants.VIEWPORT_WIDTH - turnsRemainingText.width) / 2,
            constants.VIEWPORT_HEIGHT - turnsRemainingText.height);
        turnsRemainingText.setAlpha(0);

        this.textSprites.turnsRemaining = turnsRemainingText;
    }

    update (time: number, delta: number) {
        // block until either:
        //      wallet is connected & on-chain state retrieved <---- ONLINE mode
        // OR   opted-out of wallet, default offline state used <---- OFFLINE mode
        if (!this.initGameState()) {
            let { modeSelectPrompt } = this.textSprites;
            if (modeSelectPrompt == null) {
                modeSelectPrompt = this.add.text(
                    0,
                    0,
                    constants.CONNECT_PROMPT_TEXT,
                    {fontSize: '22px', backgroundColor:"#000", color: "#fff"});
                modeSelectPrompt.setPosition((constants.VIEWPORT_WIDTH - modeSelectPrompt.width) / 2, 80);
                this.textSprites.modeSelectPrompt = modeSelectPrompt;
            }
            return;
        }

        if (this.textSprites.modeSelectPrompt != null) {
            this.textSprites.modeSelectPrompt.destroy();
            delete this.textSprites.modeSelectPrompt;
        }
 
        if (!this.hasGameStarted()){
            return;
        }

        if (!this.gameStarted) {
            this.startGame();
            this.gameStarted = true;
        }
 
        const input = this.gameOver ? constants.INPUT.NONE : this.getInput(time);
        
        // update sprites
        this.player?.update(input);

        if (input !== constants.INPUT.NONE) {
            this.decrementTurnsRemaining();
        }

        // update enemies 
        const allEnemiesDead = this.enemies.every(enemy => enemy.isDead());
        this.endGameIfOver(allEnemiesDead);
    }

    // TODO: add menu or visual prompt before sending a txn using user's wallet
    hasGameStarted() {
        if (this.gameMode === GAME_MODE.OFFLINE) {
            // no extra interaction necessary if wallet isn't connected
            return true;
        }
        if (this.gameMode === GAME_MODE.ONLINE) {
            // send prompt to user

            // wait for user to affirm prompt 
            return true;
        }

        return false;
    }

    startGame() {
        const remaining = this.textSprites.turnsRemaining;
        remaining?.setAlpha(1);
        remaining?.setText(constants.TURNS_REMAINING_TEXT + " " + this.turnsRemaining);
        remaining?.setAlpha(1);
        if (this.gameMode === GAME_MODE.OFFLINE || this.currentGame !== null) {
            console.log("offline mode enabled or game is in progress");
            this.vrfProvider?.setSeed(this.getOfflineBoard());
            return; 
        }
        console.log("starting game on-chain");
        const avatarId = gameState.getCurrentAvatar()?.id;
        startBoard(gameState.getProvider(), gameState.getBoard(), avatarId).then(
            (results) => {
                if (results) {
                    const [gameId, gameData] = results;
                    console.log("retrieved on-chain gameId: %s and gameData ", gameId, gameData);
                    this.gameId = gameId;
                    this.gameData = gameData;
                    // TODO: get the seed from character sheet
                    this.vrfProvider?.setSeed(this.gameData.seed);
                }
            });
    }

    endGame() {
        console.log("ending game on-chain");
        if (this.gameMode === GAME_MODE.OFFLINE)
            return; 

        completeBoard(gameState.getProvider(), gameState.getBoard(), this.gameId, this.gameData);
    }

    endGameIfOver(allEnemiesDead: boolean) {
        let terminal = false;
        let victory = false;

        if (allEnemiesDead) {
            terminal = true;
            victory = true;
        }
        else if (this.player?.isDead()) {
            // animation
            terminal = true;
        }
        else if (this.haveMaxTurnsElapsed()) {
            // animation
            terminal = true;
        }

        if (!terminal || this.gameOver)
            return false;
        
        this.gameOver = true;
        
        if (this.gameMode === GAME_MODE.OFFLINE) {
            if (victory) {
                this.animateVictory();
                // dispaly a "here's what you *would* win prompt"
            } else {
                this.animateDefeat(this.haveMaxTurnsElapsed());
            }
        }
        if (this.gameMode === GAME_MODE.ONLINE) {
            this.gameData.completed = true;
            if (victory) {
                this.gameData.victory = true;
                // submit result + end game

                // claim NFT

                // submit ZK history
            } else {
                // update game state
                this.gameData.victory = false;
                this.gameData.resign = this.haveMaxTurnsElapsed();
                this.animateDefeat(this.haveMaxTurnsElapsed());

                // animate damage to equipped loot
                this.animateLootDamage(1);
            }
        }

        return true;
    }

    /////////////////////////////////////////////

    getEnemySpawnPosition(enemyIndex: number): [number, number] {
        switch (enemyIndex) {
            case 0:
                return [7, 4];
            case 1:
                return [15, 1];
            case 2:
                return [20, 10];
            default:
                return [-1, -1];
        }
    }

    //////////// TILING & NAVIGATION //////////////////
    getTileID(x: number, y: number): number {
        return this.map?.getTileAt(x, y)?.index ?? -1;
    }

    // checks if a tile at coordinate x,y has collision enabled
    doesTileCollide(x: number, y: number): boolean {
        const nextTile = this.map?.getTileAt(x, y) || null;
        return nextTile == null || this.doesTileIDCollide(nextTile.index);
    }

    doesTileIDCollide(index: number): boolean {
        return this.map?.tilesets[0]?.tileProperties.hasOwnProperty(index + 1) || true;
    }

    buildPathfindingGrid() {
        const grid = [];
        const height = this.map?.height ?? -1;
        const width = this.map?.width ?? -1;
        for (let y = 0; y < height; y++) {
            const col = [];
            for (let x = 0; x < width; x++) {
                // In each cell we store the ID of the tile, which corresponds
                // to its index in the tileset of the map ("ID" field in Tiled)
                col.push(this.getTileID(x, y));
            }
            grid.push(col);
        }
        return grid;
    }

    buildAcceptableTileList() {
        const acceptableTiles = [];
        const tileset = this.map?.tilesets[0] || null;
        if (tileset) {
            let properties = tileset.tileProperties as Record<string, any>;

            // iterate manually set ranges for collision
            COLLIDING_RANGES.forEach(range => {
                for (let i = range[0]; i <= range[1]; i++) {
                    properties[i] = { collide: true };
                }
            });

            for (let i = tileset.firstgid; i < tileset.total; i++) { // firstgid and total are fields from Tiled that indicate the range of IDs that the tiles can take in that tileset
                if (!properties.hasOwnProperty(i + 1)) acceptableTiles.push(i);
            }
        }
        return acceptableTiles
    }

    //////////ON-CHAIN INTERACTIONS////////////

    /// returns true if:
    ///     offline mode is selected 
    /// OR  wallet is connected, avatar selected, board state retrieved
    /// and false otherwise  
    initGameState() {
        // If the game mode has been set, then the requisited state has been
        //  retrieved
        if (this.gameMode === GAME_MODE.OFFLINE || this.gameMode === GAME_MODE.ONLINE)
            return true;

        let initialized = false;

        // check if the user has either opted for offline play, or connected a wallet and avatar
        const provider = gameState.getProvider();
        const currentAvatar = gameState.getCurrentAvatar();
        const board = gameState.getBoard();
        if (provider && currentAvatar && board) {
            this.gameMode = GAME_MODE.ONLINE;
            initialized = true;
        }
        else if (gameState.isOffline()) {
            this.gameMode = GAME_MODE.OFFLINE;
            initialized = true;
        }

        if (initialized && currentAvatar) {
            this.initGameStateFromBoard(board);
            this.player?.initStatsFromAvatar(currentAvatar);
        }

        return initialized;
    }

    initGameStateFromBoard(board: BoardMeta) {
        if (!board) {
            console.warn("unexpected state, should have a board");
            return;
        }
        this.enemies.forEach(enemy => {
            if (this.gameMode === GAME_MODE.OFFLINE) {
                enemy.initOfflineStats();
            }
            if (this.gameMode === GAME_MODE.ONLINE) {
                enemy.initStats(board);
            }
        });

        if (this.gameMode === GAME_MODE.OFFLINE)
            this.turnsRemaining = 50;
        //TODO
        if (this.gameMode === GAME_MODE.ONLINE)
            this.turnsRemaining = 50;
    }

    getOfflineAvatar() {
        return JSON.parse(
            '[{"id":"0x0","fields":{"name":"Alcibiades","description":"An avatar ready to fight moloch.","image":"ipfs://bafkreib4ftqeobfmdy7kvurixv55m7nqtvwj3o2hw3clsyo3hjpxwo3sda","attributes":[{"trait_type":"HP","value":3},{"trait_type":"AP","value":1},{"trait_type":"DP","value":0},{"trait_type":"Armor","value":"Worn Lab Coat"},{"trait_type":"Weapon","value":"Used Plasma Cutter"},{"trait_type":"Implant","value":"No Implant"},{"trait_type":"Experience","value":0}]}},0]'
        );
    }

    getOfflineBoard() {
        return {maxTurns: 50};
    }

    /////////EMBELLISHMENTS/////////
    getEnemyConfig() {
        return {
            "dialogue": dialogue.enemy
        };
    }

    getPlayerConfig() {
        return {
            "dialogue": dialogue.player
        };
    }

    animateVictory() {
        const { player } = this;
        if (!player) return;
        player.animateText("YOU HAVE VANQUISHED MOLOCH!", player.x, player.y, "#D4AF37", 50);
    }

    animateDefeat(ranOutOfTurns: boolean) {
        // TODO
    }

    animateLootDamage(damage: number) {
        // TODO
    }
    //////////DEBUG///////////////

    drawDebug() {
        if (this.debugGraphics) {
            this.debugGraphics.clear();

            if (this.showDebug && this.debugGraphics) {
                // Pass in null for any of the style options to disable drawing that component
                this.map?.renderDebug(this.debugGraphics, {
                    tileColor: null, // Non-colliding tiles
                    collidingTileColor: new Phaser.Display.Color(243, 134, 48, 200), // Colliding tiles
                    faceColor: new Phaser.Display.Color(40, 39, 37, 255) // Colliding face edges
                });
            }

            this.helpText?.setText(this.getHelpMessage());
        }
    }

    getHelpMessage() {
        return 'Arrow keys to move.' +
            '\nPress "C" to toggle debug visuals: ' + (this.showDebug ? 'on' : 'off');
    }
}
