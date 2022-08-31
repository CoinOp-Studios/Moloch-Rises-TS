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

// adapated from dark forest https://github.com/darkforest-eth/circuits/blob/master/perlin/perlin.circom
// NB: RangeProof is inclusive.
// input: field element, whose abs is claimed to be <= than max_abs_value
// output: none
// also checks that both max and abs(in) are expressible in `bits` bits
template RangeProof(bits) {
    signal input in; 
    signal input max_abs_value;

    /* check that both max and abs(in) are expressible in `bits` bits  */
    component n2b1 = Num2Bits(bits+1);
    n2b1.in <== in + (1 << bits);
    component n2b2 = Num2Bits(bits);
    n2b2.in <== max_abs_value;

    /* check that in + max is between 0 and 2*max */
    component lowerBound = LessThan(bits+1);
    component upperBound = LessThan(bits+1);

    lowerBound.in[0] <== max_abs_value + in; 
    lowerBound.in[1] <== 0;
    lowerBound.out === 0;

    upperBound.in[0] <== 2 * max_abs_value;
    upperBound.in[1] <== max_abs_value + in; 
    upperBound.out === 0;
}

// input: n field elements, whose abs are claimed to be less than max_abs_value
// output: none
template MultiRangeProof(n, bits) {
    signal input in[n];
    signal input max_abs_value;
    component rangeProofs[n];

    for (var i = 0; i < n; i++) {
        rangeProofs[i] = RangeProof(bits);
        rangeProofs[i].in <== in[i];
        rangeProofs[i].max_abs_value <== max_abs_value;
    }
}

// input: dividend and divisor field elements in [0, sqrt(p))
// output: remainder and quotient field elements in [0, p-1] and [0, sqrt(p)
template Modulo(divisor_bits, SQRT_P) {
    signal input dividend;
    signal input divisor;
    signal output remainder;
    signal output quotient;

    signal output raw_remainder;
    raw_remainder <-- dividend % divisor;
    
    remainder <-- raw_remainder;

    quotient <-- (dividend - remainder) / divisor;

    dividend === divisor * quotient + remainder;

    component rp = MultiRangeProof(3, 128);
    rp.in[0] <== divisor;
    rp.in[1] <== quotient;
    rp.in[2] <== dividend;
    rp.max_abs_value <== SQRT_P;

    // check that 0 <= remainder < divisor
    component remainderUpper = LessThan(divisor_bits);
    remainderUpper.in[0] <== remainder;
    remainderUpper.in[1] <== divisor;
    remainderUpper.out === 1;
}

// adapting from Simple D6 - 3rd ed: https://i.4pcdn.org/tg/1372924544491.pdf
template RollSd6(num_dice, dice_sides) {
    var MAX_VALUE = 1000000000;
    signal input seed;
    signal output result;
    signal maxRoll[num_dice + 1];
    signal numMax[num_dice + 1]; 
    signal roll[num_dice];

    component gb[num_dice];
    component eq[num_dice];
    component mux[num_dice];
    component poseidons[num_dice];
    component mod[num_dice];

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
        mod[i] = Modulo(6, MAX_VALUE);
        mod[i].dividend <== poseidons[i].out;
        mod[i].divisor <== dice_sides; 
        roll[i] <== 1 + mod[i].remainder; // returns [1 to dice sides]

        // UPDATE LARGEST ROLL
        gb[i] = GetBigger(6);
        gb[i].in[0] <== roll[i];
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
