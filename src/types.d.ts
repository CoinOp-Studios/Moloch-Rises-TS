import { Contract } from "ethers";

export type Address = string;
export type AddressMap = Record<string, Address>;
export type Dialogs = Record<string, string[]>

export type MoveList = Array<number, number, boolean>;
export type Position = { x: number, y: number };

export type BoardMeta = {
  maxTurns: number,
  address?: Address,
  contract?: Contract,
};

export type Actor = Phaser.Physics.Arcade.Sprite & {
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
  animateText: (text: string, x: number, y: number, color?: string, size?: number) => void;
  attack: (target: Actor) => void;
  getName: () => string;
  isDead: () => boolean;
  kill: () => void;
  moveTileXY: (x: number, y: number) => void;
  takeDamage: (damage: number) => void;
  tileX: () => number;
  tileY: () => number;
  update: (input: number) => void;
};

export type Avatar = Record<string, any>;

export type EnemyActor = Actor & {
  initOfflineStats: () => void;
  initStats: (board: boardMeta) => void;
};

export type PlayerActor = Actor & {
  attackIfMonsterExists: (x: number, y: number) => boolean;
  initStatsFromAvatar: (avatar: Avatar) => void;
  animateDamage: (received: number, blocked: number) => void;
};
