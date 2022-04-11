import EasyStar from 'easystarjs';
import Phaser from 'phaser';

import { INPUT, TURNS_REMAINING_TEXT } from '../constants';
import { Avatar, BoardMeta, EnemyActor, MoveList, PlayerActor } from '../types';
import { VrfProvider } from '../vrfProvider';

export class GameScene extends Phaser.Scene {
  // map
  map: Phaser.Tilemaps.Tilemap | null = null;
  tileset: Phaser.Tilemaps.Tileset | null = null;

  // ai
  pathfinder: EasyStar.js | null = null;

  // UI / UX elements
  textSprites: Record<string, Phaser.GameObjects.Text> = {};
  debugGraphics: any = null;
  helpText: Phaser.GameObjects.Text | null = null;
  showDebug = false;

  // game lifecycle
  gameData: Record<string, any> = {};
  gameId = '';
  gameMode: number = 0;
  gameStarted = false;
  gameOver = false;
  turnsRemaining = -1;

  // input
  cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  lastInputTime = 0;
  lastInput = 0;
  minInputDelayMs = 50;
  keyPressedLastTick = false;

  // on-chain state
  avatar: Avatar | null = null;
  board: BoardMeta = { maxTurns: 0 };
  currentGame = null;

  // web3 provider
  provider = null;

  // game objects with collision which need to
  // check for one another
  player: PlayerActor | null = null;
  collidingGameObjects: any[] = [];
  enemies: EnemyActor[] = [];

  // move history 
  moveHistory: MoveList = [];

  anyCursorDown(): boolean {
    const { cursors } = this;
    if (!cursors) {
        return false;
    }
    return cursors.left.isDown || cursors.right.isDown || cursors.up.isDown || cursors.down.isDown || cursors.space.isDown;
  }

  vrfProvider: VrfProvider | null = null;

  decrementTurnsRemaining() {
    this.turnsRemaining--;
    const text = this.textSprites.turnsRemaining;
    text.setText(TURNS_REMAINING_TEXT + " " + this.turnsRemaining);
    text.updateText();
  }
  
  getInput(time: number) {
    // game logic is tied to player input; enemies only move when player does
    // keep track of last input and last input time for this purpose
    const anyKeyPressed = this.anyCursorDown();
    let input: number = INPUT.NONE;
    // accept new input if we're x ms ahead of the last input and the player isn't holding a key down
    if (this.lastInputTime + this.minInputDelayMs < time) {
        if (anyKeyPressed) {
            if (!this.keyPressedLastTick && this.cursors) {
                const { cursors } = this;
                if (cursors.left.isDown) {
                    input = INPUT.LEFT;
                }
                else if (cursors.right.isDown) {
                    input = INPUT.RIGHT;
                }
                else if (cursors.up.isDown) {
                    input = INPUT.UP;
                }
                else if (cursors.down.isDown) {
                    input = INPUT.DOWN;
                }
                else if (cursors.space.isDown) {
                    input = INPUT.SPACE;
                }

                this.lastInputTime = time;
            }
            // will need this if we want to animate each turn
            // for now, things will just "teleport" to their next tile
            //this.lastInput = input;
        }
    }
    this.keyPressedLastTick = anyKeyPressed;
    return input;
  }
  
  haveMaxTurnsElapsed() {
      return this.turnsRemaining <= 0;
  }

  resetGame() {
    this.gameMode = 0;
    this.currentGame = null;
    this.gameOver = false;
    this.gameStarted = false;
    // TODO: recreate the scene
    this.scene.restart();
}

}