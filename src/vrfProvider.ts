import Srand from 'seeded-rand';

export class VrfProvider {
    constructor() {
        this.rng = null;
    }

    setSeed(seed) {
        this.rng = new Srand(seed);
    }

    // i.e., rolling a 'sided' die
    // returns a value between 1 + 'sides', inlusive
    roll(sides) {
        return this.rng.intInRange(1, sides);
    }
}