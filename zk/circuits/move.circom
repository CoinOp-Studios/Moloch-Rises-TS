pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "./util.circom";

template HallMove() {
  signal input boardHash;
  signal input nonce;
  signal input board; // x * 1000 + y
  signal input positions[2]; // x * 1000 + y
  signal input hp[2];
  signal input facing[2];
  signal input move;
  signal input turn;
  signal output playerPosition;
  signal output finalPlayerFacing;
  signal output finalPlayerHP;
  signal output opponentPosition;
  signal output finalOpponentFacing;
  signal output finalOpponentHP;
  signal output boardResult;

  signal areFacing;
  signal isPlayerMove;

  var boardY = board % 1000;
  var boardX = (board - boardY) / 1000;
  var playerY = positions[0] % 1000;
  var playerX = (positions[0] - playerY) / 1000;
  var oppY = positions[1] % 1000;
  var oppX = (positions[1] - oppY) / 1000;

  assert(facing[0] > 0 && facing[0] < 5); // player facing direction.
  assert(facing[1] > 0 && facing[1] < 5); // opponent facing direction.
  assert(hp[0] > 0 && hp[1] > 0); // player and opponent HP.
  assert(boardX > playerX + 1 && playerX > 0); // player position on the board.
  assert(boardY > playerY && playerY > -1); // player position on the board.
  assert(boardX > oppX + 1 && oppX > 0); // opponent position on the board.
  assert(boardY > oppY && oppY > -1); // opponent position on the board.

  isPlayerMove <-- turn % 2 == 0;
  areFacing <-- (
    (isPlayerMove && mover(positions[0], 5, facing[0]) == positions[1])
    || (!isPlayerMove && mover(positions[1], 5, facing[1]) == positions[0])
  );

  assert(areFacing || move != 6); // attack must be facing each other.

  // Verify position
  component poseidon = Poseidon(8);
  poseidon.inputs[0] <== nonce;
  poseidon.inputs[1] <== board;
  poseidon.inputs[2] <== positions[0];
  poseidon.inputs[3] <== facing[0];
  poseidon.inputs[4] <== hp[0];
  poseidon.inputs[5] <== positions[1];
  poseidon.inputs[6] <== facing[1];
  poseidon.inputs[7] <== hp[1];

  assert(boardHash == poseidon.out);
  playerPosition <-- isPlayerMove ? mover(positions[0], move, facing[0]) : positions[0];
  opponentPosition <-- !isPlayerMove ? mover(positions[1], move, facing[1]) : positions[1];
  assert(playerPosition != opponentPosition);
  finalPlayerHP <-- (!isPlayerMove && move == 6) ? hp[0] - 1 : hp[0];
  finalOpponentHP <-- (isPlayerMove && move == 6) ? hp[1] - 1 : hp[1];

  finalPlayerFacing <-- (isPlayerMove && move > 0 && move < 5) ? move : facing[0];
  finalOpponentFacing <-- (!isPlayerMove && move > 0 && move < 5) ? move : facing[1];

  component poseidon2 = Poseidon(8);
  poseidon2.inputs[0] <== nonce;
  poseidon2.inputs[1] <== board;
  poseidon2.inputs[2] <== playerPosition;
  poseidon2.inputs[3] <== finalPlayerFacing;
  poseidon2.inputs[4] <== finalPlayerHP;
  poseidon2.inputs[5] <== opponentPosition;
  poseidon2.inputs[6] <== finalOpponentFacing;
  poseidon2.inputs[7] <== finalOpponentHP;
  boardResult <== poseidon2.out;
}

component main { public [nonce, board, positions, hp, facing, move, turn] } = HallMove();