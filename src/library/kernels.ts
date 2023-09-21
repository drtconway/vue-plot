export function uniform(u: number): number {
  return Math.abs(u) <= 1 ? 0.5 : 0;
}

export function triangular(u: number): number {
  return Math.abs(u) <= 1 ? 1 - u : 0;
}

export function parabolic(u: number): number {
  return Math.abs(u) <= 1 ? 0.75 * (1 - u ** 2) : 0;
}

export function quartic(u: number): number {
  return Math.abs(u) <= 1 ? (15 / 16) * (1 - u ** 2) ** 2 : 0;
}

export function tricubic(u: number): number {
  return Math.abs(u) <= 1 ? (70 / 81) * (1 - Math.abs(u) ** 3) ** 3 : 0;
}

export function loess(
  x: readonly number[],
  y: readonly number[],
  alpha: number
): number[] {
  const N = x.length;
  if (y.length != N) {
    throw new Error(`loess: x and y vectors must have the same length.`);
  }
  const D = Math.floor(N * alpha);

  const p: number[] = [];
  for (let i = 0; i < N; ++i) {
    p.push(i);
  }
  p.sort((i, j) => {
    return x[i] - x[j];
  });

  const X: number[] = [];
  const Y: number[] = [];
  for (const i of p) {
    X.push(x[i]);
    Y.push(y[i]);
  }

  const Yhat: number[] = [];
  for (let i = 0; i < N; ++i) {
    const xi = x[i];

    let d = 0;
    let lo = i;
    let hi = i + 1;
    while (d < D && lo >= 0 && hi < N) {
      const dLo = xi - x[lo];
      const dHi = x[hi] - xi;
      if (dLo <= dHi) {
        lo -= 1;
      } else {
        hi += 1;
      }
      d += 1;
    }
    while (d < D && lo >= 0) {
      lo -= 1;
      d += 1;
    }
    while (d > D && hi < N) {
      hi += 1;
      d += 1;
    }
    lo += 1;
    hi -= 1;
    const dMax = Math.max(xi - X[lo], X[hi] - xi);

    let wSum = 0;
    let wxSum = 0;
    let wySum = 0;
    let wxySum = 0;
    let wx2Sum = 0;
    for (let j = lo; j <= hi; ++j) {
      const xj = X[j];
      const yj = Y[j];
      const u = (X[j] - xi) / dMax;
      const w = tricubic(u);
      wSum += w;
      wxSum += w * xj;
      wx2Sum += w * xj ** 2;
      wySum += w * yj;
      wxySum += w * xj * yj;
    }
    const xBar = wxSum / wSum;
    const yBar = wySum / wSum;
    const b1 = (wxySum - xBar * yBar * wSum) / (wx2Sum - xBar ** 2 * wSum);
    const b0 = yBar - b1 * xBar;
    const yhat = b0 + b1 * xi;
    Yhat.push(yhat);
  }
  return Yhat;
}
