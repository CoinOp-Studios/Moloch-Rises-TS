import { INPUT } from '../constants';
import { Avatar, PlayerActor } from '../types';
import { Character } from './character';

export class Player extends Character implements PlayerActor {
    update (input: number) {
        let x = this.tileX();
        let y = this.tileY();
        let dx = 0;
        let dy = 0;

        this.updateAnimations();
        switch (input) {
            case null:
            case INPUT.NONE:
                return;
            case INPUT.UP:
                dy = -1;
                break;
            case INPUT.RIGHT:
                dx = 1;
                break;
            case INPUT.DOWN:
                dy = 1;
                break;
            case INPUT.LEFT:
                dx = -1;
                break;
            case INPUT.SPACE:
                // attack
                break;
            default:
                // not recognized
        }

        x += dx;
        y += dy;

        const attacked = this.attackIfMonsterExists(x, y);
        
        if (dx > 0 || dy > 0) {
            this.scene.moveHistory.push(x, y, attacked);
        }

        if (!attacked) {
            super.moveTileXY(x, y);
        }
    } 

    attackIfMonsterExists(x: number, y: number) {
        // check if the desired player movement points to
        // an enemy. do damage to the enemy if so.
        let attacked = false;
        this.scene.enemies.forEach(enemy => {
            const ex = enemy.tileX();
            const ey = enemy.tileY();

            if (ex === x && ey === y) {
                // damage the monster
                this.attack(enemy);
                attacked = true;
            }
        });

        return attacked;
    }

    initStatsFromAvatar(avatar: Avatar) {
        this.hp = avatar.fields.attributes[0].value;
        this.ap = avatar.fields.attributes[1].value;
        this.dp = avatar.fields.attributes[2].value;
    }

    animateDamage(received: number, blocked: number) {
        super.animateDamage(received, blocked);
        this.scene.cameras.main.shake(500, 0.01);
    }
}