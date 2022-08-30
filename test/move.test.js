const chai = require("chai");
const path = require("path");
const tester = require("circom_tester").wasm;

const assert = chai.assert;

const DEFAULT_PARAMS = {
  nonce: 1,
  board: 10010,
  positions: [4001, 8009],
  facing: [1, 3],
  hp: [20, 10],
};

async function getCircuit(name) {
  const circuitFile = path.join(__dirname, "..", "circuits", `${name}.circom`);
  return tester(circuitFile, { output: "./circom" });
}

async function getBoardHash(circuit, params = {}) {
  let witness = null;
  return circuit
    .calculateWitness({
      ...DEFAULT_PARAMS,
      ...params,
    })
    .then((w) => {
      witness = w;
      return circuit.checkConstraints(w);
    })
    .then(() => {
      return witness[1];
    });
}

describe("Move Circuit Tests", () => {
  // this.timeout(100000);

  let createCircuit;
  let moveCircuit;

  before(async function () {
    this.timeout(100000);
    createCircuit = await getCircuit("create");
    moveCircuit = await getCircuit("move");
  });

  describe("Basic movement - player", function () {
    it("Should move forward (N)", async () => {
      let witness = null;
      const facing = [1, 3];
      return getBoardHash(createCircuit, {})
        .then((boardHash) => {
          return moveCircuit.calculateWitness({
            ...DEFAULT_PARAMS,
            boardHash,
            move: 5,
            turn: 0,
          });
        })
        .then((w) => {
          witness = w;
          return moveCircuit.checkConstraints(w);
        })
        .then(() => {
          const [
            playerPosition,
            playerFacing,
            playerHP,
            opponentPosition,
            opponentFacing,
            opponentHP,
          ] = witness.slice(1, 7);
          assert.equal(playerPosition, DEFAULT_PARAMS.positions[0] + 1);
          assert.equal(opponentPosition, DEFAULT_PARAMS.positions[1]);
          assert.equal(playerHP, DEFAULT_PARAMS.hp[0]);
          assert.equal(opponentHP, DEFAULT_PARAMS.hp[1]);
          assert.equal(playerFacing, facing[0]);
          assert.equal(opponentFacing, facing[1]);
        });
    });

    it("Should move forward (E)", async () => {
      let witness = null;
      let facing = [2, 3];
      return getBoardHash(createCircuit, {
        facing,
      })
        .then((boardHash) => {
          return moveCircuit.calculateWitness({
            ...DEFAULT_PARAMS,
            boardHash,
            move: 5,
            turn: 0,
            facing,
          });
        })
        .then((w) => {
          witness = w;
          return moveCircuit.checkConstraints(w);
        })
        .then(() => {
          const [
            playerPosition,
            playerFacing,
            playerHP,
            opponentPosition,
            opponentFacing,
            opponentHP,
          ] = witness.slice(1, 7);
          assert.equal(playerPosition, DEFAULT_PARAMS.positions[0] + 1000);
          assert.equal(opponentPosition, DEFAULT_PARAMS.positions[1]);
          assert.equal(playerFacing, facing[0]);
          assert.equal(opponentFacing, facing[1]);
          assert.equal(playerHP, DEFAULT_PARAMS.hp[0]);
          assert.equal(opponentHP, DEFAULT_PARAMS.hp[1]);
        });
    });

    it("Should move forward (S)", async () => {
      let witness = null;
      let facing = [3, 2];
      return getBoardHash(createCircuit, {
        facing,
      })
        .then((boardHash) => {
          return moveCircuit.calculateWitness({
            ...DEFAULT_PARAMS,
            boardHash,
            move: 5,
            turn: 0,
            facing,
          });
        })
        .then((w) => {
          witness = w;
          return moveCircuit.checkConstraints(w);
        })
        .then(() => {
          const [
            playerPosition,
            playerFacing,
            playerHP,
            opponentPosition,
            opponentFacing,
            opponentHP,
          ] = witness.slice(1, 7);
          assert.equal(playerPosition, DEFAULT_PARAMS.positions[0] - 1);
          assert.equal(opponentPosition, DEFAULT_PARAMS.positions[1]);
          assert.equal(playerFacing, facing[0]);
          assert.equal(opponentFacing, facing[1]);
          assert.equal(playerHP, DEFAULT_PARAMS.hp[0]);
          assert.equal(opponentHP, DEFAULT_PARAMS.hp[1]);
        });
    });

    it("Should move forward (W)", async () => {
      let witness = null;
      let facing = [4, 3];
      return getBoardHash(createCircuit, {
        facing,
      })
        .then((boardHash) => {
          return moveCircuit.calculateWitness({
            ...DEFAULT_PARAMS,
            boardHash,
            move: 5,
            turn: 0,
            facing,
          });
        })
        .then((w) => {
          witness = w;
          return moveCircuit.checkConstraints(w);
        })
        .then(() => {
          const [
            playerPosition,
            playerFacing,
            playerHP,
            opponentPosition,
            opponentFacing,
            opponentHP,
          ] = witness.slice(1, 7);
          assert.equal(playerPosition, DEFAULT_PARAMS.positions[0] - 1000);
          assert.equal(opponentPosition, DEFAULT_PARAMS.positions[1]);
          assert.equal(playerFacing, facing[0]);
          assert.equal(opponentFacing, facing[1]);
          assert.equal(playerHP, DEFAULT_PARAMS.hp[0]);
          assert.equal(opponentHP, DEFAULT_PARAMS.hp[1]);
        });
    });
  });

  describe("Basic movement - opponent", function () {
    it("Should move forward (N)", async () => {
      let witness = null;
      let facing = [3, 1];
      return getBoardHash(createCircuit, {
        facing,
      })
        .then((boardHash) => {
          return moveCircuit.calculateWitness({
            ...DEFAULT_PARAMS,
            boardHash,
            move: 5,
            turn: 1,
            facing,
          });
        })
        .then((w) => {
          witness = w;
          return moveCircuit.checkConstraints(w);
        })
        .then(() => {
          const [
            playerPosition,
            playerFacing,
            playerHP,
            opponentPosition,
            opponentFacing,
            opponentHP,
          ] = witness.slice(1, 7);
          assert.equal(playerPosition, DEFAULT_PARAMS.positions[0]);
          assert.equal(opponentPosition, DEFAULT_PARAMS.positions[1] + 1);
          assert.equal(playerFacing, facing[0]);
          assert.equal(opponentFacing, facing[1]);
          assert.equal(playerHP, DEFAULT_PARAMS.hp[0]);
          assert.equal(opponentHP, DEFAULT_PARAMS.hp[1]);
        });
    });

    it("Should move forward (E)", async () => {
      let witness = null;
      let facing = [3, 2];
      return getBoardHash(createCircuit, {
        facing,
      })
        .then((boardHash) => {
          return moveCircuit.calculateWitness({
            ...DEFAULT_PARAMS,
            boardHash,
            move: 5,
            turn: 1,
            facing,
          });
        })
        .then((w) => {
          witness = w;
          return moveCircuit.checkConstraints(w);
        })
        .then(() => {
          const [
            playerPosition,
            playerFacing,
            playerHP,
            opponentPosition,
            opponentFacing,
            opponentHP,
          ] = witness.slice(1, 7);
          assert.equal(playerPosition, DEFAULT_PARAMS.positions[0]);
          assert.equal(opponentPosition, DEFAULT_PARAMS.positions[1] + 1000);
          assert.equal(playerFacing, facing[0]);
          assert.equal(opponentFacing, facing[1]);
          assert.equal(playerHP, DEFAULT_PARAMS.hp[0]);
          assert.equal(opponentHP, DEFAULT_PARAMS.hp[1]);
        });
    });

    it("Should move forward (S)", async () => {
      let witness = null;
      let facing = [3, 3];
      return getBoardHash(createCircuit, {
        facing,
      })
        .then((boardHash) => {
          return moveCircuit.calculateWitness({
            ...DEFAULT_PARAMS,
            boardHash,
            move: 5,
            turn: 1,
            facing,
          });
        })
        .then((w) => {
          witness = w;
          return moveCircuit.checkConstraints(w);
        })
        .then(() => {
          const [
            playerPosition,
            playerFacing,
            playerHP,
            opponentPosition,
            opponentFacing,
            opponentHP,
          ] = witness.slice(1, 7);
          assert.equal(playerPosition, DEFAULT_PARAMS.positions[0]);
          assert.equal(opponentPosition, DEFAULT_PARAMS.positions[1] - 1);
          assert.equal(playerFacing, facing[0]);
          assert.equal(opponentFacing, facing[1]);
          assert.equal(playerHP, DEFAULT_PARAMS.hp[0]);
          assert.equal(opponentHP, DEFAULT_PARAMS.hp[1]);
        });
    });

    it("Should move forward (W)", async () => {
      let witness = null;
      let facing = [3, 4];
      return getBoardHash(createCircuit, {
        facing,
      })
        .then((boardHash) => {
          return moveCircuit.calculateWitness({
            ...DEFAULT_PARAMS,
            boardHash,
            move: 5,
            turn: 1,
            facing,
          });
        })
        .then((w) => {
          witness = w;
          return moveCircuit.checkConstraints(w);
        })
        .then(() => {
          const [
            playerPosition,
            playerFacing,
            playerHP,
            opponentPosition,
            opponentFacing,
            opponentHP,
          ] = witness.slice(1, 7);
          assert.equal(playerPosition, DEFAULT_PARAMS.positions[0]);
          assert.equal(opponentPosition, DEFAULT_PARAMS.positions[1] - 1000);
          assert.equal(playerFacing, facing[0]);
          assert.equal(opponentFacing, facing[1]);
          assert.equal(playerHP, DEFAULT_PARAMS.hp[0]);
          assert.equal(opponentHP, DEFAULT_PARAMS.hp[1]);
        });
    });
  });

  it("Should not allow movement to same location", async () => {
    let errored = false;
    let witness;
    const facing = [1, 3];
    const positions = [2004, 2005];
    return getBoardHash(createCircuit, {
      facing,
      positions,
    })
      .then((boardHash) => {
        return moveCircuit.calculateWitness({
          ...DEFAULT_PARAMS,
          boardHash,
          move: 5,
          turn: 0,
          facing,
          positions,
        });
      })
      .then((w) => {
        return moveCircuit.checkConstraints(w);
      })
      .catch((err) => {
        assert(err.message.indexOf("Assert Failed") > -1);
        errored = true;
      })
      .finally(() => {
        assert.isTrue(errored);
      });
  });

  it("Should not allow an attack unless facing", async () => {
    let witness = null;
    let errored = false;
    const facing = [1, 3];
    const positions = [9005, 2005];
    return getBoardHash(createCircuit, {
      facing,
      positions,
    })
      .then((boardHash) => {
        return moveCircuit.calculateWitness({
          ...DEFAULT_PARAMS,
          boardHash,
          facing,
          positions,
          move: 6,
          turn: 0,
        });
      })
      .then((w) => {
        witness = w;
        return moveCircuit.checkConstraints(w);
      })
      .catch((err) => {
        assert(err.message.indexOf("Assert Failed") > -1);
        errored = true;
      })
      .finally(() => {
        assert.isTrue(errored);
      });
  });

  it("Should do damage on a player attack", async () => {
    let witness = null;
    const facing = [1, 3];
    const positions = [2004, 2005];
    return getBoardHash(createCircuit, {
      facing,
      positions,
    })
      .then((boardHash) => {
        return moveCircuit.calculateWitness({
          ...DEFAULT_PARAMS,
          boardHash,
          facing,
          positions,
          move: 6,
          turn: 0,
        });
      })
      .then((w) => {
        witness = w;
        return moveCircuit.checkConstraints(w);
      })
      .then(() => {
        const [
          playerPosition,
          playerFacing,
          playerHP,
          opponentPosition,
          opponentFacing,
          opponentHP,
        ] = witness.slice(1, 7);
        assert.equal(playerPosition, 2004);
        assert.equal(playerFacing, 1);
        assert.equal(playerHP, DEFAULT_PARAMS.hp[0]);
        assert.equal(opponentPosition, 2005);
        assert.equal(opponentFacing, 3);
        assert.equal(opponentHP, DEFAULT_PARAMS.hp[1] - 1);
      });
  });

  it("should allow chaining using the board result", async () => {
    let witness = null;
    let boardHash = 1;
    return getBoardHash(createCircuit, {})
      .then((bh) => {
        boardHash = bh;
        return moveCircuit.calculateWitness({
          ...DEFAULT_PARAMS,
          boardHash,
          move: 5,
          turn: 0,
        });
      })
      .then((w) => {
        witness = w;
        return moveCircuit.checkConstraints(w);
      })
      .then(() => {
        const playerPosition = witness[1];
        const opponentPosition = witness[4];
        const boardResult = witness[7]; // <-- new board hash
        assert.equal(playerPosition, DEFAULT_PARAMS.positions[0] + 1);
        assert.equal(opponentPosition, DEFAULT_PARAMS.positions[1]); // hasn't moved
        assert.notEqual(boardHash, boardResult);
        return moveCircuit.calculateWitness({
          ...DEFAULT_PARAMS,
          boardHash: boardResult,
          positions: [playerPosition, opponentPosition],
          move: 5,
          turn: 1,
        });
      })
      .then((w) => {
        const playerPosition = w[1];
        const opponentPosition = w[4];
        assert.equal(playerPosition, DEFAULT_PARAMS.positions[0] + 1);
        assert.equal(opponentPosition, DEFAULT_PARAMS.positions[1] - 1); // second move - one S for opponent
      });
  });
});

/*
        console.log(`Results:
          playerPosition: ${playerPosition}
          playerFacing: ${playerFacing}
          playerHP: ${playerHP}
          opponentPosition: ${opponentPosition}
          opponentFacing: ${opponentFacing}
          opponentHP: ${opponentHP}
        `);
*/