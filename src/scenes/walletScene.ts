import Phaser from 'phaser';

import { getPublicUrl } from '../assets/helpers';
import { VIEWPORT_HEIGHT, VIEWPORT_WIDTH } from '../constants';
import { getBoardContract, getOwnedAvatars, mintAvatar } from '../contractAbi';
import gameState from '../gameState';
import { Address, Avatar, BoardMeta } from '../types';
import { connect, web3Modal } from '../wallet';

const BUTTON_FRAMES = {
    INACTIVE: 'tiles/icons/target-yellow',
    CONNECTING: 'tiles/icons/lightning-yellow',
    CONNECTED: 'tiles/icons/horns-yellow',
    PLAYER_INACTIVE: 'tiles/icons/meeple-gray',
    OFFLINE: 'tiles/buttons/close-gray',
    OFFLINE_SELECTED: 'tiles/buttons/close-yellow'
};

const BAR_SCALE = 0.8;

console.log(`BUTTON_FRAMES: ${JSON.stringify(BUTTON_FRAMES)}`);

const addAvatar = (avatar: Avatar, index: number, setAvatar: (avatar: any) => void) => {
    console.log('addAvatar', avatar, index);
    const raw = JSON.stringify(avatar);
    const avatars = gameState.getAvatars();
    const ix = avatars.findIndex(a => JSON.stringify(a) === raw);
    if (ix === -1) {
        console.log('added avatar', avatar);
        const avatarsElt = document.getElementById("avatar-list");
        avatars.push(avatar);
        const key = `avatar-${avatar.id}`;
        if (!document.getElementById(key)) {
            const choice = makeAvatarChoice(avatar, index, key, setAvatar);
            console.log('adding', choice);
            avatarsElt?.appendChild(choice);
        }
    } else {
        console.log('updated avatar', avatar);
        avatars[ix] = avatar;
    }
    gameState.setAvatars(avatars);
};

const makeAvatarChoice = (avatar: any, index: number, key: string, callback: (avatar: any) => void) => {
    const choice = document.createElement('li');
    choice.id = key;
    const cid = avatar.fields.image.split('/').pop();
    const image = `http://ipfs.io/ipfs/${cid}`;
    console.log('image', image, avatar.fields.image);
    choice.innerHTML = `<img src="${image}" height="256" width="256" />`;
    choice.addEventListener('click', () => {
        callback(avatar);
    });
    return choice;
}

export class WalletScene extends Phaser.Scene {
    emitters: Record<string, Phaser.GameObjects.Particles.ParticleEmitter> = {};
    sprites: Record<string, Phaser.GameObjects.Sprite> = {};
    texts: Record<string, Phaser.GameObjects.Text> = {};

    preload() {
        this.load.atlas('flares', getPublicUrl('/particles/flares.png'), getPublicUrl('/particles/flares.json'));
        this.load.image('spark', getPublicUrl('/particles/sparkle1.png'));
        this.load.image('scientist', getPublicUrl('/sprites/scientist_game.png'));
        this.load.multiatlas('ui', getPublicUrl('/atlases/ui/moloch.json'), getPublicUrl('/atlases/ui/'));
    }

    create() {
        const topHUD = this.add.sprite(0, 0, 'ui', 'tiles/frame/Top');
        topHUD.setPosition((VIEWPORT_WIDTH - topHUD.width) / 2, 0);
        const healthBar = this.add.sprite(25, 0, 'ui', 'tiles/hud/section-left-health');
        healthBar.setScale(BAR_SCALE);
        const energyBar = this.add.sprite(VIEWPORT_WIDTH - 200, 0, 'ui', 'tiles/hud/section-right-energy');
        energyBar.setScale(BAR_SCALE);
        energyBar.setPosition(VIEWPORT_WIDTH - (energyBar.width * BAR_SCALE) - 25, 0);
        const walletX = VIEWPORT_WIDTH / 3 * 1.91;
        const wallet = this.add.sprite(walletX, 8, 'ui', BUTTON_FRAMES.INACTIVE);
        wallet.setScale(0.6);
        const playerX = VIEWPORT_WIDTH / 3 * 1.05;
        const playerButton = this.add.sprite(playerX, 8, 'ui', BUTTON_FRAMES.PLAYER_INACTIVE);
        playerButton.setScale(0.5);
        // const infoBar = this.add.sprite(0, 0, 'ui', 'tiles/hud/info');
        // infoBar.setPosition((VIEWPORT_WIDTH - infoBar.width) / 2, (VIEWPORT_HEIGHT - infoBar.height) / 2);
        const offlineButton = this.add.sprite(25, 60, 'ui', 'tiles/buttons/close-gray');
        offlineButton.setScale(0.45);

        this.sprites = {
            energyBar,
            healthBar,
            playerButton,
            topHUD,
            wallet,
            offlineButton
        };

        this.makeOfflineButtonInteractive(offlineButton);

        const particles = this.add.particles('flares');
        this.emitters = {
            wallet: particles.createEmitter({
                frame: { frames: ['red', 'yellow'], cycle: true },
                x: walletX + 10,
                y: 10,
                blendMode: 'ADD',
                scale: { start: 0.15, end: 0.1 },
                speed: { min: -100, max: 100 },
                emitZone: {
                    source: new Phaser.Geom.Circle(0, 0, 10),
                    type: 'edge',
                    quantity: 2,
                    yoyo: false,
                }
            }),
            player: particles.createEmitter({
                active: false,
                frame: { frames: ['red', 'yellow'], cycle: true },
                x: playerX + 10,
                y: 10,
                blendMode: 'ADD',
                scale: { start: 0.15, end: 0.1 },
                speed: { min: -100, max: 100 },
                emitZone: {
                    source: new Phaser.Geom.Circle(0, 0, 10),
                    type: 'edge',
                    quantity: 64,
                    yoyo: false,
                },
            }),
        };

        document.getElementById('avatar-select-close')?.addEventListener('click', () => {
            this.toggleAvatarSelect(false);
        });

        document.getElementById('avatar-mint')?.addEventListener('click', () => {
            this.mintAvatarForUser();
        });

        this.makeWalletButtonInteractive(this.sprites.wallet);
    }

    destroyTooltip() {
        const { sprites: { tooltip }, texts: { tooltiptext } } = this;

        if (tooltip) {
            tooltip.destroy();
            delete this.sprites.tooltip;
        }

        if (tooltiptext) {
            tooltiptext.destroy();
            delete this.texts.tooltiptext;
        }
    }

    toggleAvatarSelect(state: boolean) {
        const element = document.getElementById("avatar-select");
        if (element) {
            element.style.display = state ? "block" : "none";
        }
    }

    mintAvatarForUser() {
        const provider = gameState.getProvider();
        provider.listAccounts().then((network: any) => {
            const account = network[0];
            mintAvatar(provider, account).then(() => {
                this.updateOwnedAvatars(provider, account);
            });
        });
    }

    makePlayerButtonInteractive(button: Phaser.GameObjects.Sprite) {
        const hitArea = new Phaser.Geom.Circle(50, 50, 100);
        button.setInteractive(hitArea, Phaser.Geom.Circle.Contains);
        button.on('pointerover', this.onPlayerOver, this);
        button.on('pointerout', this.onPlayerOut, this);
        button.on('pointerdown', this.onPlayerClick, this);
        console.log('make player button interactive', button);
    }

    makeWalletButtonInteractive(button: Phaser.GameObjects.Sprite) {
        const hitArea = new Phaser.Geom.Circle(50, 50, 100);
        button.setInteractive(hitArea, Phaser.Geom.Circle.Contains);
        button.on('pointerover', this.onOver, this);
        button.on('pointerout', this.onOut, this);
        button.on('pointerdown', this.onClick, this);
    }

    makeOfflineButtonInteractive(button: Phaser.GameObjects.Sprite) {
        const hitArea = new Phaser.Geom.Circle(50, 50, 100);
        button.setInteractive(hitArea, Phaser.Geom.Circle.Contains);
        button.on('pointerover', this.onOfflineOver, this);
        button.on('pointerout', this.onOfflineOut, this);
        button.on('pointerdown', this.onOfflineClick, this);
    }

    async onClick(button: Phaser.GameObjects.Sprite) {
        this.destroyTooltip();
        if (gameState.isConnected()) {
            this.disconnectWallet();
            return;
        }
        console.log('connecting', button);
        this.sprites.wallet.removeInteractive();
        this.sprites.wallet.setFrame(BUTTON_FRAMES.CONNECTING);
        const provider = await connect();
        console.log('connected');
        this.updateConnectionStatus(provider);
        this.emitters.wallet.stop();

        this.makeWalletButtonInteractive(this.sprites.wallet);
    }

    onPlayerClick(button: Phaser.GameObjects.Sprite) {
        console.log('onPlayerClick');
        this.emitters.player.stop();
        this.destroyTooltip();
        if (gameState.getCurrentAvatar()) {
            gameState.setCurrentAvatar(null);
            this.updateConnectionStatus(gameState.getProvider());
            return;
        }
        this.toggleAvatarSelect(true);
    }

    async onOfflineClick(button: Phaser.Physics.Arcade.Sprite) {
        console.log('click offline', button);
        if (gameState.isOffline()) {
            /*
            this.offline = false;
            this.makePlayerButtonInteractive(this.sprites.playerButton);
            this.makeWalletButtonInteractive(this.sprites.wallet);
            this.spriteFrames.offlineButton = BUTTON_FRAMES.INACTIVE;
            this.walletButtonEmitter.start();
            */
            // if the user opts in to offline, it's locked in until page refresh
            // for now
            return;
        }
        // disable wallet + player select buttons
        console.log('enable offline', button);
        this.sprites.wallet.removeInteractive();
        this.sprites.playerButton.removeInteractive();
        await this.disconnectWallet();
        this.emitters.wallet.stop();
        this.sprites.wallet.setFrame(BUTTON_FRAMES.INACTIVE);
        this.sprites.playerButton.setFrame(BUTTON_FRAMES.INACTIVE);
        this.sprites.offlineButton.setFrame(BUTTON_FRAMES.CONNECTED);
        gameState.setOffline(true);
    }

    onOver() {
        if (!gameState.isConnected()) {
            this.sprites.tooltip = this.add.sprite(-1000, -1000, 'ui', 'tiles/tooltip/top-right-gold');
            const { wallet, tooltip } = this.sprites;
            const tX = wallet.x - tooltip.width + 30;
            const tY = wallet.y + 25;
            tooltip.setPosition(tX, tY);
            this.texts.tooltiptext = this.add.text(
                tX + 20,
                tY + tooltip.height / 2,
                'Connect to wallet',
                { fontSize: '12px', color: '#fff', fontFamily: 'Consolas' }
            );
        }
    }

    onPlayerOver(button: Phaser.GameObjects.Sprite) {
        if (!gameState.isConnected() && !gameState.getCurrentAvatar()) {
            this.sprites.tooltip = this.add.sprite(-1000, -1000, 'ui', 'tiles/tooltip/top-left-gold');
            const { playerButton, tooltip } = this.sprites;
            const tX = playerButton.x + tooltip.width / 3 * 1.25;
            const tY = playerButton.y + tooltip.height;
            this.sprites.tooltip.setPosition(tX, tY);
            this.texts.tooltiptext = this.add.text(
                playerButton.x,
                tY,
                'Select avatar',
                { fontSize: '12px', color: '#fff', fontFamily: 'Consolas' }
            );
        }
    }

    onOfflineOver(button: Phaser.GameObjects.Sprite) {
        if (!gameState.getCurrentAvatar()) {
            this.sprites.tooltip = this.add.sprite(-1000, -1000, 'ui', 'tiles/tooltip/top-left-gold');
            const { offlineButton, tooltip } = this.sprites;
            const tX = offlineButton.x + tooltip.width / 3 * 1.6;
            const tY = offlineButton.y + tooltip.height;
            this.sprites.tooltip.setPosition(tX, tY);
            this.texts.tooltiptext = this.add.text(
                offlineButton.x,
                tY,
                'Play off-chain',
                { fontSize: '12px', color: '#fff', fontFamily: 'Consolas' }
            );
        }
    }

    onOut(button: Phaser.GameObjects.Sprite) {
        // console.log('out', button);
        this.destroyTooltip();
    }

    onPlayerOut(button: Phaser.GameObjects.Sprite) {
        this.destroyTooltip();
    }

    onOfflineOut(button: Phaser.GameObjects.Sprite) {
        this.destroyTooltip();
    }

    updateConnectionStatus(provider: any) {
        if (!provider) {
            gameState.setConnected(false);
            this.sprites.wallet.setFrame(BUTTON_FRAMES.INACTIVE);
            return false;
        }
        console.log('connected', provider);
        this.sprites.wallet.setFrame(BUTTON_FRAMES.CONNECTED);
        gameState.setConnected(true);
        gameState.setProvider(provider);

        // attempt to retrieve board state as soon as wallet is 
        // successfully connected
        const board = gameState.getBoard();
        if (!board?.contract && !gameState.isRetrievingBoard()) {
            gameState.setRetrievingBoard(true);
            console.log('retrieving board');
            getBoardContract(gameState.getProvider()).then(b => {
                console.log('retrieved board contract');
                const currBoard = gameState.getBoard();
                gameState.setBoard({...currBoard, contract: b});
                gameState.setRetrievingBoard(false);
            });
        }

        this.makePlayerButtonInteractive(this.sprites.playerButton);
        provider.listAccounts().then((accounts: string[]) => {
            if (!accounts) {
                console.log('No addresses, cannot find NFTs');
                gameState.setCurrentAvatar(null);
            } else {
                const account = accounts[0];
                gameState.setAccount(account);
                this.updateOwnedAvatars(provider, account);
            }
            if (gameState.getCurrentAvatar()) {
                // for now, this will be a terminal state until page refresh
                // you won't be able to switch avatars until your next game
                this.sprites.wallet.removeInteractive();
                this.sprites.playerButton.removeInteractive();
                this.sprites.offlineButton.removeInteractive();
                this.sprites.playerButton.setFrame(BUTTON_FRAMES.CONNECTED);
            } else {
                this.sprites.playerButton.setFrame(BUTTON_FRAMES.CONNECTING);
                this.emitters.player.active = true;
            }
        });
        //this.gameScene.provider = provider;
        return true;
    }

    setAvatar(avatar: Avatar) {
        console.log('Avatar selected', avatar);
        const width = this.scale.width;
        gameState.setCurrentAvatar(avatar);
        this.toggleAvatarSelect(false);
        gameState.setAvatarButtonImage(this.add.image(width - 150, 50, 'scientist'));
        this.updateConnectionStatus(gameState.getProvider());
    }

    updateOwnedAvatars(provider: any, account: Address) {
        const setAvatar = this.setAvatar.bind(this);
        getOwnedAvatars(provider, account).then((avatars) => {
            avatars.forEach((a: Avatar, ix: number) => addAvatar(a, ix, setAvatar));
        });
    }

    async disconnectWallet() {
        console.log('disconnected');
        this.sprites.wallet.setFrame(BUTTON_FRAMES.INACTIVE);
        this.sprites.playerButton.setFrame(BUTTON_FRAMES.INACTIVE);
        this.emitters.player.stop();
        if (gameState.getProvider() != null && gameState.isConnected()) {
            // If the cached provider is not cleared,
            // WalletConnect will default to the existing session
            // and does not allow to re-scan the QR code with a new wallet.
            web3Modal.clearCachedProvider();
        }
        gameState.setConnected(false);
        this.emitters.wallet.start();
    }
}
