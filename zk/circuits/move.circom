pragma circom 2.0.0;

include "../../node_modules/circomlib/circuits/poseidon.circom";
include "./util.circom";

template HallMove() {
  signal input boardHash;
  signal input nonce;
  signal input board; // x * 1000 + y
  signal input positions[2]; // x * 1000 + y
  signal input hp[2];
  signal input move;
  signal input turn;
  signal output playerPosition;
  signal output finalPlayerHP;
  signal output opponentPosition;
  signal output finalOpponentHP;
  signal output boardResult;

  signal isPlayerMove;

  var boardY = board % 1000;
  var boardX = (board - boardY) / 1000;
  var playerY = positions[0] % 1000;
  var playerX = (positions[0] - playerY) / 1000;
  var oppY = positions[1] % 1000;
  var oppX = (positions[1] - oppY) / 1000;

  assert(hp[0] > 0 && hp[1] > 0); // player and opponent HP.
  assert(boardX > playerX + 1 && playerX > 0); // player position on the board.
  assert(boardY > playerY && playerY > -1); // player position on the board.
  assert(boardX > oppX + 1 && oppX > 0); // opponent position on the board.
  assert(boardY > oppY && oppY > -1); // opponent position on the board.

  isPlayerMove <-- turn % 2 == 0;

  // Verify position
  component poseidon = Poseidon(6);
  poseidon.inputs[0] <== nonce;
  poseidon.inputs[1] <== board;
  poseidon.inputs[2] <== positions[0];
  poseidon.inputs[3] <== hp[0];
  poseidon.inputs[4] <== positions[1];
  poseidon.inputs[5] <== hp[1];

  assert(boardHash == poseidon.out);

  var playerNextPosition = isPlayerMove ? mover(positions[0], move) : positions[0];
  var opponentNextPosition = !isPlayerMove ? mover(positions[1], move) : positions[1];
  var isAttack = playerNextPosition == opponentNextPosition;  

  playerPosition <-- isAttack ? positions[0] : playerNextPosition;
  opponentPosition <-- isAttack ? positions[1] : opponentNextPosition;

  // TODO: ATK into its own circuit incl. VRF/PRNG w atk def 
  finalPlayerHP <-- (!isPlayerMove && isAttack) ? hp[0] - 1 : hp[0];
  finalOpponentHP <-- (isPlayerMove && isAttack) ? hp[1] - 1 : hp[1];

  component poseidon2 = Poseidon(6);
  poseidon2.inputs[0] <== nonce;
  poseidon2.inputs[1] <== board;
  poseidon2.inputs[2] <== playerPosition;
  poseidon2.inputs[3] <== finalPlayerHP;
  poseidon2.inputs[4] <== opponentPosition;
  poseidon2.inputs[5] <== finalOpponentHP;
  boardResult <== poseidon2.out;
}

component main = HallMove();