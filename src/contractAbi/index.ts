import { ethers } from "ethers";
import { parseEther } from "ethers/lib/utils";

import { AVATAR_CONTRACTS, BOARD_CONTRACTS } from "../config";
import { BLOCK_CONFIRMS, GAME_ALREADY_STARTED_ERROR_MESSAGE } from "../constants";
import { avatar } from './avatar';
import { board } from './board';
import { getTokens } from './queries';
import { Address, BoardMeta } from '../types';


export async function getAvatarContract(provider: any) {
  const network = await provider.getNetwork();
  const chainId = `0x${network.chainId.toString(16)}`;
  return new ethers.Contract(AVATAR_CONTRACTS[chainId], avatar.abi, provider);
}

export async function getBoardContract(provider: any) {
  const network = await provider.getNetwork();
  const chainId = `0x${network.chainId.toString(16)}`;
  return new ethers.Contract(BOARD_CONTRACTS[chainId], board.abi, provider);
}

export async function getOwnedAvatars(provider: any, address: Address) {
  const avatars = await getTokens(provider, address);
  console.log(`getOwnedAvatars(${address}) =>`, avatars);
  return avatars;
}

export async function mintAvatar(provider: any, address: Address) {
  const contract = await getAvatarContract(provider);
  const signer = provider.getSigner(0);
  const gwei = parseEther('0.001');
  console.log('minting', address);
  const tx = await contract.connect(signer).mint(address, "OG Player", {
    value: gwei,
  });
  console.log(`mintAvatar(${address}) =>`, tx);
  return tx;
}

let waitingForStartBoard = false;
let gameStarted = false;
export async function startAndRetrieveGame(provider: any, board: BoardMeta, avatarId: number) {  
  if(!board.contract) {
    console.log('contract is not defined for board. game is in offline mode');
    return null;
  }

  if (!waitingForStartBoard && !gameStarted) {
    const signer = provider.getSigner(0);
    const gwei = parseEther('0.001');

    // perform call before transaction to check for errors
    await board.contract.connect(signer).callStatic.start(avatarId, {
      value: gwei
    }).then((result) => {
      console.log("contract start static call ok: ", result);
    }, (error) => {
      // Expecting 3 posssible reverts:
      // player in-game <- handled
      // insufficient MATIC sent <- throws
      // player does not own avatarId <- throw
      if (error.reason === GAME_ALREADY_STARTED_ERROR_MESSAGE) {
        console.log("game already started");
        gameStarted = true;
        return; 
      }
      
      console.log("error in start static call: ", error);
      throw error;
    });

    if (!gameStarted) {
      waitingForStartBoard = true;
      const tx = await board.contract.connect(signer).start(avatarId, {
        value: gwei
      });
      const rc = await tx.wait(BLOCK_CONFIRMS);
      console.log("game started on-chain for avatar %d in tx ", avatarId, rc);
      waitingForStartBoard = false;
      gameStarted = true;
    }
  }

  // retrieve game data for this avatar
  const gameId = await board.contract.avatarGame(avatarId);
  const gameInfo = await board.contract.gameInfo(gameId);
  return [gameId, gameInfo];
}

let waitingForCompleteBoard = false;
export async function completeBoard(provider: any, board: BoardMeta, gameId: number, gameData: any) {
  if (!board.contract) {
    console.log('contract is not defined for board. game is in offline mode');
    return;
  }

  if (!waitingForCompleteBoard && gameStarted) {
    const signer = provider.getSigner(0);
    board.contract.connect(signer).callStatic.complete(gameId, gameData)
      .then((result) => {
        console.log("contract complete call ok:", result);
      }, (error) => {
        console.log("error in contract complete call: ", error);
        throw error;
      });

    waitingForCompleteBoard = true;
    const tx = await board.contract.connect(signer).complete(gameId, gameData);
    const rc = await tx.wait(BLOCK_CONFIRMS);
    console.log("game completed on-chain for game %d, info %s, in rc %s", gameId, gameData, rc);
    gameStarted = false;
    waitingForCompleteBoard = false;
  }
}