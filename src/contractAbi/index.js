import { ethers } from "ethers";
import { parseEther } from "ethers/lib/utils";

import { AVATAR_CONTRACTS, BOARD_CONTRACTS } from "../config";
import { avatar } from './avatar';
import { board } from './board';
import { getTokens } from './queries';
import { BLOCK_CONFIRMS } from "../constants";

export async function getAvatarContract(provider) {
  const network = await provider.getNetwork();
  const chainId = `0x${network.chainId.toString(16)}`;
  return new ethers.Contract(AVATAR_CONTRACTS[chainId], avatar.abi, provider);
}

export async function getBoardContract(provider) {
  const network = await provider.getNetwork();
  const chainId = `0x${network.chainId.toString(16)}`;
  return new ethers.Contract(BOARD_CONTRACTS[chainId], board.abi, provider);
}

export async function getOwnedAvatars(provider, address) {
  const avatars = await getTokens(provider, address);
  console.log(`getOwnedAvatars(${address}) =>`, avatars);
  return avatars;
}

export async function mintAvatar(provider, address) {
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
export async function startBoard(provider, boardContract, avatarId) {
  // start game with selected avatar
  const signer = provider.getSigner(0);
  const gwei = parseEther('0.001');

  // perform call before transaction to check for errors
  await boardContract.callStatic.start(avatarId, {
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
    const tx = await boardContract.connect(signer).start(avatarId, {
        value: gwei
    });
    var rc = await tx.wait(BLOCK_CONFIRMS);
    console.log("game started on-chain for avatar %d in tx ", avatarId, rc);
      
    // retrieve game data for this avatar
    const gameId = boardContract.avatarGame(avararId);
    waitingForStartBoard = false;
    return [gameId, boardContract.gameInfo(gameId)];
  }
}

let waitingForCompleteBoard = false;
export async function completeBoard(provider, boardContract, gameId, gameData) {
  const signer = provider.getSigner(0);
  boardContract.callStatic.complete(gameId, gameData)
    .then((result) => {
      console.log("contract complete call ok:", result);
    }, (error) => {
      console.log("error in contract complete call: ", error);
      throw error;
    });

  if(!waitingForCompleteBoard) {
    waitingForCompleteBoard = true;
    var tx = await boardContract.connect(signer).complete(gameId, gameData);
    var rc = await tx.wait(BLOCK_CONFIRMS);
    console.log("game completed on-chain for game %d, info %s, in rc %s", gameId, gameData, rc);
    waitingForCompleteBoard = false;
  }
}