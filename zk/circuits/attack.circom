pragma circom 2.0.0;

include "../../node_modules/circomlib/circuits/poseidon.circom";
include "../../node_modules/circomlib/circuits/comparators.circom";
include "../../node_modules/circomlib/circuits/mux1.circom";
include "./util.circom";

template Attack() {
    signal input seed;
    signal input attackerAtk;
    signal input defenderHp;
    signal input defenderDef;

    signal output dmgRaw;
    signal output defenderEndingHp;

    component poseidon = Poseidon(4);
    // roll 1d6
    component rollSd6 = RollSd6(1, 6);
    // max 6 bits in input
    component gt = GreaterThan(6);
    component mux = Mux1();

    poseidon.inputs[0] <== seed;
    poseidon.inputs[1] <== attackerAtk;
    poseidon.inputs[2] <== defenderHp;
    poseidon.inputs[3] <== defenderDef;

    // TODO: integrate atk, ap
    rollSd6.seed <== poseidon.out;
    dmgRaw <== rollSd6.result;
    
    // gt.out == dmgRaw > defenderDef
    gt.in[0] <== dmgRaw;
    gt.in[1] <== defenderDef;
    mux.c[0] <== defenderHp;
    mux.c[1] <== defenderHp - dmgRaw;
    mux.s <== gt.out;
    defenderEndingHp <== mux.out;
}

component main = Attack();