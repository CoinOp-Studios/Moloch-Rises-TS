const chai = require("chai");
const path = require("path");
const tester = require("circom_tester").wasm;

const assert = chai.assert;

const DEFAULT_PARAMS = {
  seed: 1,
  attackerAtk: 1,
  defenderHp: 10,
  defenderDef: 10,
}

describe("Attack Circuit Tests", function () {
  this.timeout(100000);

  let createCircuit;

  before(async () => {
    const circuitFile = path.join(__dirname, "..", "zk/circuits", "attack.circom");
    createCircuit = await tester(circuitFile, { output: "./zk/circom" });
  });

  it("Should setup on happy path", async () => {
    const witness = await createCircuit.calculateWitness(DEFAULT_PARAMS);

    await createCircuit.checkConstraints(witness);
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