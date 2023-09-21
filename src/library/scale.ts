import { ConcreteAesthetics } from "./aesthetics";
import { Values } from "./data";

export interface AbstractScaleSpecificationBase {
  continuous: boolean;
}

export interface ScaleLimits {
  min: number;
  max: number;
}

export interface Ordering {
  ordinal: (x: string) => number;
}

export interface AbstractContinuousScaleSpecification
  extends AbstractScaleSpecificationBase {
  continuous: true;
  limits?: ScaleLimits;
  breaks?: number[];
  labels?: string[];
  trans?: (x: number) => number;
}

export interface AbstractDiscreteScaleSpecification
  extends AbstractScaleSpecificationBase {
  continuous: false;
  breaks?: number[];
  labels?: string[];
  order?: Ordering;
}

export type AbstractScaleSpecification =
  | AbstractContinuousScaleSpecification
  | AbstractDiscreteScaleSpecification;

export type AbstractScales = { [aes: string]: AbstractScaleSpecification };

export interface AbstractScalesComponent {
  kind: "scale";
  value: AbstractScales;
}

export interface ContinuousScaleArguments {
  limits?: ScaleLimits;
  breaks?: number[];
  labels?: string[];
}

export interface DiscreteScaleArguments {
  labels?: { [name: string]: string };
  ordering?: Ordering;
}

export type ScaleArguments = ContinuousScaleArguments | DiscreteScaleArguments;

export function scale_x_continuous(
  args?: ContinuousScaleArguments
): AbstractScalesComponent {
  return scale_continuous("x", args);
}

export function scale_y_continuous(
  args?: ContinuousScaleArguments
): AbstractScalesComponent {
  return scale_continuous("y", args);
}

export function scale_continuous(
  name: string,
  args?: ContinuousScaleArguments
): AbstractScalesComponent {
  const scale: AbstractContinuousScaleSpecification = { continuous: true };
  if (args != undefined) {
    scale.limits = args.limits;
    scale.breaks = args.breaks;
    scale.labels = args.labels;
  }
  const res: AbstractScales = {};
  res[name] = scale;
  return { kind: "scale", value: res };
}

export function mergeScales(
  lhs: AbstractScales,
  rhs: AbstractScales
): AbstractScales {
  const res: AbstractScales = {};
  const both: string[] = [];
  for (const lhsName in lhs) {
    if (lhsName in rhs) {
      both.push(lhsName);
      continue;
    }
    res[lhsName] = lhs[lhsName];
  }
  for (const rhsName in rhs) {
    if (rhsName in lhs) {
      continue;
    }
    res[rhsName] = rhs[rhsName];
  }
  for (const name of both) {
    const lhsValue = lhs[name];
    const rhsValue = rhs[name];
    if (lhsValue.continuous != rhsValue.continuous) {
      throw new Error(
        `cannot combine continuous and discrete features on scale '${name}'`
      );
    }
    switch (lhsValue.continuous) {
      case true: {
        const lhsCont: AbstractContinuousScaleSpecification = lhsValue;
        const rhsCont: AbstractContinuousScaleSpecification =
          rhsValue as AbstractContinuousScaleSpecification;
        if (lhsCont.limits != undefined && rhsCont.limits != undefined) {
          throw new Error(
            `for scale '${name}', limits specified more than once.`
          );
        }
        let limits = lhsCont.limits;
        if (rhsCont.limits != undefined) {
          limits = rhsCont.limits;
        }
        if (lhsCont.breaks != undefined && rhsCont.breaks != undefined) {
          throw new Error(
            `for scale '${name}', breaks specified more than once.`
          );
        }
        let brks = lhsCont.breaks;
        if (rhsCont.breaks != undefined) {
          brks = rhsCont.breaks;
        }
        if (lhsCont.labels != undefined && rhsCont.labels != undefined) {
          throw new Error(
            `for scale '${name}', labels specified more than once.`
          );
        }
        let labels = lhsCont.labels;
        if (rhsCont.labels != undefined) {
          labels = rhsCont.labels;
        }
        res[name] = {
          continuous: true,
          limits: limits,
          breaks: brks,
          labels: labels,
        };
        break;
      }
      case false: {
        throw new Error(`discrete scales not implemented yet`);
      }
    }
  }
  return res;
}

export interface ConcreteContinuousScaleSpecification
  extends AbstractScaleSpecificationBase {
  continuous: true;
  limits: ScaleLimits;
  breaks: number[];
  labels: string[];
  trans?: (x: number) => number;
}

export interface ConcreteDiscreteScaleSpecification
  extends AbstractScaleSpecificationBase {
  continuous: false;
  breaks: number[];
  labels: string[];
  order: Ordering;
}

export type ConcreteScaleSpecification =
  | ConcreteContinuousScaleSpecification
  | ConcreteDiscreteScaleSpecification;

export type ConcreteScales = { [aes: string]: ConcreteScaleSpecification };

export function materializeScales(
  aes: ConcreteAesthetics,
  wanted: string[],
  given: AbstractScales
): ConcreteScales {
  const scales: ConcreteScales = {};
  for (const key of wanted) {
    let scale: AbstractScaleSpecification;
    if (key in given) {
      scale = given[key];
    } else {
      scale = { continuous: true };
    }
    const values = aes[key];
    scales[key] = materializeScale(scale, values);
  }
  return scales;
}

export function materializeScale(
  orig: AbstractScaleSpecification,
  values?: Values
): ConcreteScaleSpecification {
  switch (orig.continuous) {
    case true: {
      let limits: ScaleLimits;
      if (orig.limits == undefined) {
        if (values == undefined) {
          throw new Error(`cannot compute limits without values.`);
        }
        if (values.type != "number") {
          throw new Error(`cannot compute continuous scale on discrete data.`);
        }
        limits = dataRange(values.values, 0.05);
      } else {
        limits = orig.limits;
      }
      let brks: number[];
      if (orig.breaks == undefined) {
        const b = breaks(limits.min, limits.max, 5);
        brks = expandBreaks(b);
      } else {
        brks = orig.breaks;
      }
      let labels: string[];
      if (orig.labels == undefined) {
        labels = brks.map((x: number): string => x.toString());
      } else {
        labels = orig.labels;
      }
      if (brks.length > 0) {
        limits.min = Math.min(limits.min, brks[0]);
        limits.max = Math.max(limits.max, brks[brks.length - 1]);
      }
      return { continuous: true, limits: limits, breaks: brks, labels: labels };
    }
    case false: {
      throw new Error(`discrete scales not implemented.`);
    }
  }
}

export function applyScale(
  x: number,
  scale: ConcreteScaleSpecification
): number;
export function applyScale(
  xs: number[],
  scale: ConcreteScaleSpecification
): number[];
export function applyScale(
  xs: number | number[],
  scale: ConcreteScaleSpecification
): number | number[] {
  switch (scale.continuous) {
    case true: {
      const m = scale.limits.min;
      const r = scale.limits.max - scale.limits.min;
      if (typeof xs == "number") {
        return (xs - m) / r;
      }
      return xs.map((x: number): number => (x - m) / r);
    }
    case false: {
      throw new Error(`discrete scales not implemented.`);
    }
  }
}

export function dataRange(xs: number[], margin = 0): ScaleLimits {
  if (xs.length == 0) {
    return { min: Number.NaN, max: Number.NaN };
  }
  let xMin = xs[0];
  let xMax = xs[0];
  for (let i = 1; i < xs.length; ++i) {
    const x = xs[i];
    if (x > xMax) {
      xMax = x;
    }
    if (x < xMin) {
      xMin = x;
    }
  }
  const r = xMax - xMin;
  const m = r * margin;
  xMin -= m;
  xMax += m;
  return { min: xMin, max: xMax };
}

export interface ScaleContinuous {
  limits: ScaleLimits;
  trans?: (x: number) => number;
  breaks: number[];
}

export function scalePosition(
  x: number,
  limits: ScaleLimits,
  flip: boolean
): number {
  const r = limits.max - limits.min;
  const v = (x - limits.min) / r;
  return flip ? 1 - v : v;
}

export function scalePositions(
  xs: number[],
  limits: ScaleLimits,
  flip: boolean
): number[] {
  const r = limits.max - limits.min;
  return xs.map((x: number): number => {
    const v = (x - limits.min) / r;
    return flip ? 1 - v : v;
  });
}

export function scaleDistance(d: number, limits: ScaleLimits): number {
  const r = limits.max - limits.min;
  return d / r;
}

export interface ContinuousScaleBreaks {
  min: number;
  max: number;
  step: number;
}

export function breaks(
  dMin: number,
  dMax: number,
  m: number,
  loose = false,
  Q?: number[],
  w?: number[]
): ContinuousScaleBreaks {
  if (Q == undefined) {
    Q = [1, 5, 2, 2.5, 4, 3];
  }
  if (w == undefined) {
    w = [0.2, 0.25, 0.5, 0.05];
  }

  const n = Q.length;

  let best: ContinuousScaleBreaks | null = null;
  let bestScore = -2;

  let j = 1;

  while (j < 100) {
    for (let i = 0; i < Q.length; ++i) {
      const q = Q[i];
      const sm = simplicityMax(n, i, j);
      if (w[0] * sm + w[1] + w[3] + w[4] < bestScore) {
        j = Infinity;
        break;
      }

      let k = 2;
      while (k < 100) {
        const dm = densityMax(k, m);
        if (w[0] * sm + w[1] + w[2] * dm + w[3] < bestScore) {
          break;
        }

        const delta = (dMax - dMin) / (k + 1) / j / q;
        let z = Math.ceil(Math.log10(delta));
        while (z < 100) {
          const step = j * q * 10 ** z;
          const cm = coverageMax(dMin, dMax, step * (k - 1));
          if (w[0] * sm + w[1] * cm + w[2] * dm + w[3] < bestScore) {
            break;
          }

          const minStart = Math.floor(dMax / step) * j - (k - 1) * j;
          const maxStart = Math.ceil(dMin / step) * j;
          if (minStart > maxStart) {
            z += 1;
            continue;
          }

          for (let start = minStart; start <= maxStart; ++start) {
            const lMin = start * (step / j);
            const lMax = lMin + step * (k - 1);
            const lStep = step;
            const c = coverage(dMin, dMax, lMin, lMax);
            const s = simplicity(n, i, j, lMin, lMax, lStep);
            const g = density(k, m, dMin, dMax, lMin, lMax);
            const score = w[0] * c + w[1] * s + w[2] * g + w[3];
            if (
              score > bestScore &&
              (!loose || (lMin <= dMin && lMax >= dMax))
            ) {
              best = { min: lMin, max: lMax, step: lStep };
              bestScore = score;
            }
          }

          z += 1;
        }

        k += 1;
      }
    }

    j += 1;
  }
  if (best == null) {
    throw new Error(`couldn't find a reasonable set of breaks!`);
  }
  return best;
}

export function expandBreaks(breaks: ContinuousScaleBreaks): number[] {
  const res: number[] = [];
  for (let x = breaks.min; x <= breaks.max; x += breaks.step) {
    res.push(x);
  }
  return res;
}

function simplicityMax(n: number, i: number, j: number): number {
  return 1 - i / (n - 1) - j + 1;
}

function densityMax(k: number, m: number): number {
  if (k >= m) {
    return 2 - (k - 1) / (m - 1);
  }
  return 1;
}

function coverageMax(dMin: number, dMax: number, span: number): number {
  const range = dMax - dMin;
  if (span > range) {
    const half = (span - range) / 2;
    return 1 - half ** 2 / (0.1 * range) ** 2;
  }
  return 1;
}

function coverage(
  dMin: number,
  dMax: number,
  lMin: number,
  lMax: number
): number {
  const range = dMax - dMin;
  return (
    1 - (0.5 * ((dMax - lMax) ** 2 + (dMin - lMin) ** 2)) / (0.1 * range) ** 2
  );
}

function density(
  k: number,
  m: number,
  dMin: number,
  dMax: number,
  lMin: number,
  lMax: number
): number {
  const r = (k - 1) / (lMax - lMin);
  const rt = (m - 1) / (Math.max(lMax, dMax) - Math.min(lMin, dMin));
  return 2 - Math.max(r / rt, rt / r);
}

function simplicity(
  n: number,
  i: number,
  j: number,
  lMin: number,
  lMax: number,
  lStep: number
): number {
  const eps = 1e-10;
  const v =
    lMin - lStep * Math.floor(lMin / lStep) < eps && lMin <= 0 && lMax >= 0
      ? 1
      : 0;
  return 1 - (i - 1) / (n - 1) - j + v;
}
