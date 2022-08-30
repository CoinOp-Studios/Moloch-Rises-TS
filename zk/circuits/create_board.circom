pragma circom 2.0.0;

include "../../node_modules/circomlib/circuits/poseidon.circom";

template HallFightCreate2() {
  signal input nonce;
  signal input board; // x * 1000 + y
  signal input positions[2]; // x * 1000 + y
  signal input hp[2];
  signal output boardHash;

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

  // Verify position
  component poseidon = Poseidon(6);
  poseidon.inputs[0] <== nonce;
  poseidon.inputs[1] <== board;
  poseidon.inputs[2] <== positions[0];
  poseidon.inputs[3] <== hp[0];
  poseidon.inputs[4] <== positions[1];
  poseidon.inputs[5] <== hp[1];

  boardHash <-- poseidon.out;
}

component main = HallFightCreate2();