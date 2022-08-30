pragma circom 2.0.0;

function mover(position, move) {
  assert(move > 0);
  assert(move < 5);

  var y = position % 1000;
  var x = (position - y) / 1000;
  if (move == 1) {
    return x * 1000 + y + 1;
  } else if (move == 2) {
    return (x + 1) * 1000 + y;
  } else if (move == 3) {
    return x * 1000 + y - 1;
  } else {
    return (x - 1) * 1000 + y;
  }
}