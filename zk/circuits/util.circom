pragma circom 2.0.0;

function mover(position, move, facing) {
  if (move != 5) {
    return position;
  }
  var y = position % 1000;
  var x = (position - y) / 1000;
  if (facing == 1) {
    return x * 1000 + y + 1;
  } else if (facing == 2) {
    return (x + 1) * 1000 + y;
  } else if (facing == 3) {
    return x * 1000 + y - 1;
  } else {
    return (x - 1) * 1000 + y;
  }
}