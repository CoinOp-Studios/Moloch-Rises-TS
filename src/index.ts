// runs tailwind
import './main.css';

import Phaser from 'phaser';

import { VIEWPORT_HEIGHT, VIEWPORT_WIDTH } from './constants';
import { LabScene } from './scenes/labScene';
import { WalletScene } from './scenes/walletScene';

class GameWrapper extends Phaser.Scene {
    create() {
        this.scene.add('lab', LabScene, true);
        this.scene.add('wallet', WalletScene, true);
    }
}

const wrapperConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: VIEWPORT_WIDTH,
    height: VIEWPORT_HEIGHT,
    backgroundColor: '#2d2d2d',
    parent: 'game',
    pixelArt: true,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 }
        }
    },
    scene: GameWrapper,
};

new Phaser.Game(wrapperConfig);