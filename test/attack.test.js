const chai = require("chai");
const path = require("path");
const tester = require("circom_tester").wasm;

const assert = chai.assert;

const DEFAULT_PARAMS = {
  seed: 17,
  attackerAtk: 1,
  defenderHp: 10,
  defenderDef: 10,
};

// bug in circom_tester's getDecoratedOutput, rolling our own here
async function getDecoratedOutput(circuit, witness) {
  const decoratedWitness = {}
  if (!circuit.symbols) await circuit.loadSymbols();
  for (let n in circuit.symbols) {
    let v;
    if (circuit.symbols[n].varIdx !== -1) {
      v = witness[circuit.symbols[n].varIdx].toString();
    } else {
      v = "undefined";
    }
    decoratedWitness[n] = v;   
  }
  return decoratedWitness;
}

describe("Attack Circuit", function () {
  this.timeout(100000);

  let attackCircuit;

  before(async () => {
    const circuitFile = path.join(__dirname, "..", "zk/circuits", "attack.circom");
    attackCircuit = await tester(circuitFile, { output: "./zk/circom" });
  });

  it("Should setup on happy path", async () => {
    const witness = await attackCircuit.calculateWitness(DEFAULT_PARAMS);

    await attackCircuit.checkConstraints(witness);
  });

  it("Should always deal damage", async () => {
    const params = {
        seed: 17,
        attackerAtk: 1,
        defenderHp: 10,
        defenderDef: 0
    };
    return await attackCircuit.calculateWitness(
      params
    )
    .then(async (witness) => {
      await attackCircuit.checkConstraints(witness);
      const output = await getDecoratedOutput(attackCircuit, witness);
      const endHpEntry = Object.entries(output)
        .filter(([k ,v]) => k.includes("defenderEndingHp"))[0];
      const endHp = parseInt(endHpEntry[1]);
      assert(params.defenderHp > endHp, "Defender HP should decrease!")
    });
  });
  
  it("Should never deal damage", async () => {
    // DEF is always greater than the max raw damage 
    return await attackCircuit.calculateWitness(
      {
        seed: 17,
        attackerAtk: 1,
        defenderHp: 10,
        defenderDef: 11
      },
    )
    .then(async (witness) => {
      await attackCircuit.checkConstraints(witness);
      await attackCircuit.assertOut(witness, {
        defenderEndingHp: 10
      });
    });
  });

  /*
  it("Should fail with invalid starting location", async () => {
    let errored = false;
    return createCircuit
      .calculateWitness({
        ...DEFAULT_PARAMS,
        positions: [11004, 8002],
      })
      .then((witness) => {
        return createCircuit.checkConstraints(witness);
      })
      .catch((err) => {
        errored = true;
      })
      .finally(() => {
        assert(errored, "Should have errored");
      });
  });
  */
});