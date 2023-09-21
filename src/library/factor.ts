export class Factor {
  relaxed: boolean;
  levels: string[];
  index: { [label: string]: number };

  constructor(levels?: string[], relaxed = true) {
    this.relaxed = relaxed;
    if (levels != undefined) {
      this.levels = levels;
    } else {
      this.levels = [];
    }
    this.index = {};
    let j = 0;
    for (let i = 0; i < this.levels.length; ++i) {
      const label = this.levels[i];
      if (label in this.index) {
        if (this.relaxed) {
          continue;
        } else {
          throw new Error(`Factor: levels not unique!`);
        }
      }
      this.index[label] = j;
      j += 1;
    }
  }

  apply(xs: string[]): number[] {
    const ns: number[] = [];
    for (const x of xs) {
      if (x in this.index) {
        ns.push(this.index[x]);
      } else {
        if (this.relaxed) {
          const n = this.levels.length;
          this.levels.push(x);
          this.index[x] = n;
          ns.push(n);
        } else {
          throw new Error(`string '${x}' not in factor.`);
        }
      }
    }
    return ns;
  }

  stringify(xs: number[]): string[] {
    const ys: string[] = [];
    for (const x of xs) {
      ys.push(this.levels[x]);
    }
    return ys;
  }
}
