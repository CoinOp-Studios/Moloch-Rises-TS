import { ethers } from "ethers";
import { parseEther } from "ethers/lib/utils";

import { AVATAR_CONTRACTS, BOARD_CONTRACTS } from "../config";
import { BLOCK_CONFIRMS } from "../constants";
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
export async function startBoard(provider: any, board: BoardMeta, avatarId: number) {
  // start game with selected avatar
  const signer = provider.getSigner(0);
  const gwei = parseEther('0.001');
  
  if(!board.contract) {
    console.log('contract is not defined for board. game is in offline mode');
    return;
  }
  // perform call before transaction to check for errors
  await board.contract.callStatic.start(avatarId, {
    value: gwei
  }).then((result) => {
    console.log("contract start call ok: ", result);
  }, (error) => {
    console.log("error in start call: ", error);
    // don't attempt tx if call fails
    // TODO:
    //  check if avatar is currently in-game
    //  end game if avatar is already in game?
    throw error;
  });

  if (!waitingForStartBoard) {
    waitingForStartBoard = true;
    const tx = await board.contract.connect(signer).start(avatarId, {
      value: gwei
    });
    var rc = await tx.wait(BLOCK_CONFIRMS);
    console.log("game started on-chain for avatar %d in tx ", avatarId, rc);

    // retrieve game data for this avatar
    const gameId = board.contract.avatarGame(avatarId);
    waitingForStartBoard = false;
    return [gameId, board.contract.gameInfo(gameId)];
  }
}

let waitingForCompleteBoard = false;
export async function completeBoard(provider: any, board: BoardMeta, gameId: number, gameData: any) {
  const signer = provider.getSigner(0);
  if(!board.contract) {
    console.log('contract is not defined for board. game is in offline mode');
    return;
  }

  board.contract.callStatic.complete(gameId, gameData)
    .then((result) => {
      console.log("contract complete call ok:", result);
    }, (error) => {
      console.log("error in contract complete call: ", error);
      throw error;
    });

  if (!waitingForCompleteBoard) {
    waitingForCompleteBoard = true;
    var tx = await board.contract.connect(signer).complete(gameId, gameData);
    var rc = await tx.wait(BLOCK_CONFIRMS);
    console.log("game completed on-chain for game %d, info %s, in rc %s", gameId, gameData, rc);
    waitingForCompleteBoard = false;
  }
}