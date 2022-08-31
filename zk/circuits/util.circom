pragma circom 2.0.0;

include "../../node_modules/circomlib/circuits/poseidon.circom";
include "../../node_modules/circomlib/circuits/comparators.circom";
include "../../node_modules/circomlib/circuits/mux1.circom";


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

// TODO: do these need to be templates? aka: do we need the constraints
// these components would generate?

template GetSmaller(n) {
    signal input in[2];
    signal output out;

    component lt = LessThan(n);
    component mux = Mux1();

    lt.in[0] <== in[0];
    lt.in[1] <== in[1];

    mux.c[0] <== in[0];
    mux.c[1] <== in[1];
    mux.s <== lt.out;

    out <== mux.out;
}

template GetBigger(n) {
    signal input in[2];
    signal output out;

    component gs = GetSmaller(n);

    gs.in[0] <== in[1];
    gs.in[1] <== in[0];

    out <== gs.out;
}

template Modulo() {
    signal input dividend;
    signal input divisor;
    signal output quotient;
    signal output remainder;

    // TODO: overflow
    remainder <-- dividend % divisor;
    quotient <-- dividend \ divisor; //where '\' is the integer division operator
    dividend === quotient * divisor + remainder; //this works!
}

// adapting from Simple D6 - 3rd ed: https://i.4pcdn.org/tg/1372924544491.pdf
template RollSd6(num_dice, dice_sides) {
    var MAX_VALUE = 1000000000;
    signal input seed;
    signal output result;
    signal maxRoll[num_dice + 1];
    signal numMax[num_dice + 1]; 
    signal rolls[num_dice];

    component gb[num_dice];
    component eq[num_dice];
    component mux[num_dice];
    component poseidons[num_dice];
    component mods[num_dice];

    // invalid access if this is not set
    maxRoll[0] <== 0;
    numMax[0] <== 0;

    // this is probably costly; 'inline' the roll into a fn (seed + nonce/i)
    for (var i = 0; i < num_dice; i++) {
        // HASH THE SEED
        poseidons[i] = Poseidon(1);
        poseidons[i].inputs[0] <== seed + i;
        // MOD THE RESULT INTO THE DIE RANGE
        // assuming that no dies have more than 2 ^ 6 sides
        mods[i] = Modulo();
        mods[i].dividend <== poseidons[i].out;
        mods[i].divisor <== dice_sides;
        var roll = mods[i].remainder;
        
        rolls[i] <== 1 + roll; // returns [1 to dice sides]

        // UPDATE LARGEST ROLL
        gb[i] = GetBigger(6);
        gb[i].in[0] <== rolls[i];
        gb[i].in[1] <== maxRoll[i];
        maxRoll[i + 1] <== gb[i].out;

        // COUNT CRITICALS
        eq[i] = IsEqual();
        eq[i].in[0] <== numMax[i] + 1;
        eq[i].in[1] <== numMax[i];
        mux[i] = Mux1();
        mux[i].c[0] <== numMax[i];
        mux[i].c[1] <== numMax[i] + 1;
        mux[i].s <== eq[i].out;
        numMax[i + 1] <== mux[i].out;
    }

    result <== maxRoll[num_dice] + numMax[num_dice];
}
