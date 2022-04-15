/**
 * Common Game state, for easy sharing of data between components
 */

import { Avatar, BoardMeta } from "./types";

type GameState = {
 provider: any | null;
 connected: boolean;
 offline: boolean;
 retrievingBoardState: boolean;
 account: string;
 avatars: Avatar[];
 currentAvatar: Avatar | null;
 board: BoardMeta;
 avatarButtonImage: Phaser.GameObjects.Image | null;
};

class AccessController {
  gameState: GameState;

  constructor(state: GameState) {
    this.gameState = state;
  }

  public getProvider() {
    return this.gameState.provider;
  }

  public setProvider(provider: any) {
    this.gameState.provider = provider;
  }
  public isConnected() {
    return this.gameState.connected;
  }
  public setConnected(connected: boolean) {
    this.gameState.connected = connected;
  }
  public isOffline() {
    return this.gameState.offline;
  }
  public setOffline(offline: boolean) {
    this.gameState.offline = offline;
  }
  public isRetrievingBoard() {
    return this.gameState.retrievingBoardState;
  }
  public setRetrievingBoard(retrievingBoardState: boolean) {
    this.gameState.retrievingBoardState = retrievingBoardState;
  }
  public getAccount() {
    return this.gameState.account;
  }
  public setAccount(account: string) {
    this.gameState.account = account;
  }
  public getAvatars() {
    return this.gameState.avatars;
  }
  public setAvatars(avatars: Avatar[]) {
    this.gameState.avatars = avatars;
  }
  public getCurrentAvatar() {
    return this.gameState.currentAvatar;
  }
  public setCurrentAvatar(currentAvatar: Avatar | null) {
    this.gameState.currentAvatar = currentAvatar;
  }
  public getBoard() {
    return this.gameState.board;
  }
  public setBoard(board: BoardMeta) {
    this.gameState.board = board;
  }
  public getAvatarButtonImage() {
    return this.gameState.avatarButtonImage;
  }
  public setAvatarButtonImage(avatarButtonImage: Phaser.GameObjects.Image | null) {
    this.gameState.avatarButtonImage = avatarButtonImage;
  }
}

const stateController = new AccessController({
  provider: null,
  connected: false,
  offline: false,
  retrievingBoardState: false,
  account: "",
  avatars: [],
  currentAvatar: null,
  board: { maxTurns: 50 },
  avatarButtonImage: null,
});

export default stateController;