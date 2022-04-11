import Phaser from 'phaser';

import { GameScene } from '../scenes/gameScene';
import { BoardMeta, EnemyActor, MoveList, Position } from '../types';
import { Character } from './character';

export class Enemy extends Character implements EnemyActor {
    pathfinder: any;

    constructor( scene: GameScene, 
        x: number, 
        y: number, 
        texture: string | Phaser.Textures.Texture, 
        frame: string | number,
        config: Record<string, any>, 
        vrfProvider: any,
    ) {
        super(scene, x, y, texture, frame, config, vrfProvider);
        this.pathfinder = this.scene.pathfinder;
    }

    update (playerMoved: any) {
        this.updateAnimations();
        if (!playerMoved || this.isDead()) return;

        // move toward the player
        const ex = this.tileX();
        const ey = this.tileY();
        const player: Character = (this.scene as any).player;
        const px = player.tileX();
        const py = player.tileY();
        let nextX: number | undefined;
        let nextY: number | undefined;

        this.pathfinder.findPath(ex, ey, px, py, function( path: Position[] | null ) {
            if (path === null) {
                console.warn("Path was not found.");
            } else {
                nextX = path[1].x;
                nextY = path[1].y;
                console.log("nextX %s, nextY %s", nextX, nextY);
            }
        });

        this.pathfinder.calculate();

        const attackPlayer = player.tileX() === nextX && player.tileY() === nextY;

        // this mixes previous (position) and next (attack) turns
        const moveHistory: MoveList = (this.scene as any);
        moveHistory.push([this.tileX(), this.tileY(), attackPlayer]);

        if (attackPlayer) {
            this.attack(player);
            return;
        }

        this.pathfinder.stopAvoidingAdditionalPoint(this.tileX(), this.tileY());

        if (nextX === undefined || nextY === undefined) {
            const shouldMove = this.tileX() !== nextX || this.tileY() !== nextY;
            if (shouldMove) {
                super.moveTileXY(nextX as number, nextY as number);
            }
        }

        this.pathfinder.avoidAdditionalPoint(this.tileX(), this.tileY());
    } 

    initOfflineStats() {
        this.hp = 1;
        this.ap = 1;
        this.dp = 1;
    }
    
    initStats(board: BoardMeta) {
        this.initOfflineStats();
        // TODO
    }
}
