import { Data, Value, Values } from "./data";

export type ConcreteAesthetics = { [aesthetic: string]: Values };
export type AbstractAesthetic = ((data: Data) => Values) | Values | Value;
export type AbstractAesthetics = { [aesthetic: string]: AbstractAesthetic };

export interface AbstractAestheticsComponent {
  kind: "aes";
  value: AbstractAesthetics;
}

export function mergeAesthetics(
  lhs: AbstractAesthetics,
  rhs: AbstractAesthetics
): AbstractAesthetics {
  const res: AbstractAesthetics = {};
  for (const name in lhs) {
    if (name in rhs) {
      throw new Error(`more than 1 specification for aesthetic ${name}`);
    }
    res[name] = lhs[name];
  }
  for (const name in rhs) {
    if (name in lhs) {
      throw new Error(`more than 1 specification for aesthetic ${name}`);
    }
    res[name] = rhs[name];
  }
  return res;
}

export function applyDataToAesthetics(
  data: Data,
  aes: AbstractAesthetics
): ConcreteAesthetics {
  console.log(aes);
  const res: ConcreteAesthetics = {};
  const tmp: { [name: string]: Value } = {};
  for (const name in aes) {
    const ab = aes[name];
    console.log(`name=${name}, type=${typeof ab}`);
    if (ab == null) {
      continue;
    }
    if (typeof ab == "function") {
      res[name] = ab(data);
      continue;
    }
    if (typeof ab == "object") {
      res[name] = ab;
      continue;
    }
    tmp[name] = ab;
  }
  let N = 0;
  for (const name in res) {
    N = Math.max(N, res[name].values.length);
  }
  for (const name in tmp) {
    const val = tmp[name];
    if (typeof val == "string") {
      const arr: string[] = [];
      for (let i = 0; i < N; ++i) {
        arr.push(val);
      }
      res[name] = { type: "string", values: arr };
      continue;
    }
    if (typeof val == "number") {
      const arr: number[] = [];
      for (let i = 0; i < N; ++i) {
        arr.push(val);
      }
      res[name] = { type: "number", values: arr };
      continue;
    }
  }
  console.log(res);
  return res;
}
