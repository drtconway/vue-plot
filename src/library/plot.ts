import { Data, Values } from "./data";
import {
  AbstractAesthetics,
  AbstractAestheticsComponent,
  applyDataToAesthetics,
  ConcreteAesthetics,
  mergeAesthetics,
} from "./aesthetics";
import {
  AbstractGeom,
  AbstractGeomComponent,
  ConcreteGeom,
  drawGeom,
  materializeGeom,
  textBoundingBox,
} from "./geom";
import {
  AbstractScales,
  AbstractScalesComponent,
  AbstractScaleSpecification,
  applyScale,
  ConcreteScales,
  dataRange,
  materializeScale,
  materializeScales,
  mergeScales,
  ScaleLimits,
} from "./scale";

export type RelativePosition = "above" | "below" | "left" | "right";

export interface AbstractPlotSpecification {
  data?: Data;
  aes?: AbstractAesthetics;
  scales?: AbstractScales;
  geoms?: AbstractGeom[];
}

export type PlotComponent =
  | AbstractScalesComponent
  | AbstractAestheticsComponent
  | AbstractGeomComponent;

export function merge(components: PlotComponent[]): AbstractPlotSpecification {
  const res: AbstractPlotSpecification = {};
  for (const component of components) {
    switch (component.kind) {
      case "aes": {
        if (res.aes == undefined) {
          res.aes = component.value;
        } else {
          res.aes = mergeAesthetics(res.aes, component.value);
        }
        break;
      }
      case "scale": {
        if (res.scales == undefined) {
          res.scales = component.value;
        } else {
          res.scales = mergeScales(res.scales, component.value);
        }
        break;
      }
      case "geom": {
        if (res.geoms == undefined) {
          res.geoms = [component.value];
        } else {
          res.geoms.push(component.value);
        }
        break;
      }
    }
  }
  return res;
}

function error<T>(): T {
  throw new Error(`error`);
}

export function plot(
  data: Data,
  parts: PlotComponent[],
  canvas: HTMLCanvasElement
): void {
  const abs = merge(parts);
  const globalAesthetics: ConcreteAesthetics = abs.aes
    ? applyDataToAesthetics(data, abs.aes)
    : {};

  const geoms: ConcreteGeom[] = [];
  for (const geom of abs.geoms || []) {
    geoms.push(materializeGeom(data, globalAesthetics, geom));
  }

  const absScales: AbstractScales = {};
  const scaleData: { [aes: string]: Values[] } = {};

  for (const geom of geoms) {
    for (const aesName in geom.aes) {
      if (abs.scales && aesName in abs.scales) {
        absScales[aesName] = abs.scales[aesName];
        continue;
      }
      const values = geom.aes[aesName];
      if (!(aesName in scaleData)) {
        scaleData[aesName] = [];
      }
      scaleData[aesName].push(values);
    }
  }
  for (const aesName in scaleData) {
    if (aesName in absScales) {
      continue;
    }
    const valuesList = scaleData[aesName];
    for (let i = 1; i < valuesList.length; ++i) {
      if (valuesList[i].type != valuesList[i - 1].type) {
        throw new Error(
          `for aesthetic ${aesName}, both discrete and continuous data given.`
        );
      }
    }
    switch (valuesList[0].type) {
      case "number": {
        const limits: ScaleLimits = { min: Infinity, max: -Infinity };
        for (const values of valuesList) {
          if (values.type == "number") {
            const lim0 = dataRange(values.values);
            limits.min = Math.min(limits.min, lim0.min);
            limits.max = Math.max(limits.max, lim0.max);
          }
        }
        const scale: AbstractScaleSpecification = {
          continuous: true,
          limits: limits,
        };
        absScales[aesName] = scale;
        break;
      }
      case "string": {
        throw new Error(`discrete data not implemented yet.`);
      }
    }
  }

  const scales: ConcreteScales = {};
  for (const aesName in absScales) {
    console.log(`materializing ${aesName}`);
    scales[aesName] = materializeScale(absScales[aesName]);
  }

  const scaled: { [aes: string]: number[] } = {};

  const width = canvas.width;
  const height = canvas.height;
  const ctxt: CanvasRenderingContext2D =
    canvas.getContext("2d") || error<CanvasRenderingContext2D>();

  const wholeBox = { x: 0, y: 0, w: width, h: height };
  const bigBox = { x: 10, y: 10, w: width - 20, h: height - 20 };

  const xBreakList = applyScale(scales["x"].breaks, scales["x"]);
  const yBreakList = applyScale(scales["y"].breaks, scales["y"]);

  const xBox = calculateAxisBox(
    "x",
    xBreakList,
    scales["x"].labels,
    bigBox,
    ctxt
  );
  const yBox = calculateAxisBox(
    "y",
    yBreakList,
    scales["y"].labels,
    bigBox,
    ctxt
  );
  xBox.w -= yBox.w;
  xBox.x += yBox.w;
  yBox.h -= xBox.h;
  const innerBox = {
    x: yBox.x + yBox.w,
    y: bigBox.y,
    w: bigBox.w - yBox.w,
    h: bigBox.h - xBox.h,
  };
  showBox(wholeBox, "#c0c000", ctxt);
  showBox(bigBox, "#c0c0c0", ctxt);
  showBox(xBox, "#c00000", ctxt);
  showBox(yBox, "#00c000", ctxt);
  showBox(innerBox, "#0000c0", ctxt);
  for (const geom of geoms) {
      drawGeom(geom, innerBox, ctxt);
  }
}

export function draw(aes: ConcreteAesthetics, canvas: HTMLCanvasElement): void {
  const width = canvas.width;
  const height = canvas.height;

  if (!("x" in aes)) {
    return error<void>();
  }
  const xAes = aes["x"];
  if (xAes.type != "number") {
    return error<void>();
  }
  const x = xAes.values;

  if (!("y" in aes)) {
    return error<void>();
  }
  const yAes = aes["y"];
  if (yAes.type != "number") {
    return error<void>();
  }
  const y = yAes.values;
  if (x.length != y.length) {
    return error<void>();
  }
  const N = x.length;
  if (N == 0) {
    return error<void>();
  }

  let group: string[] | number[] | null = null;
  if ("group" in aes) {
    const groupAes = aes["group"];
    group = groupAes.values;
  }

  const scales = materializeScales(aes, ["x", "y"], {});

  const xBreakList = applyScale(scales["x"].breaks, scales["x"]);
  const X: number[] = applyScale(x, scales["x"]);

  const yBreakList = applyScale(scales["y"].breaks, scales["y"]);
  const Y: number[] = applyScale(y, scales["y"]);

  const ctxt: CanvasRenderingContext2D =
    canvas.getContext("2d") || error<CanvasRenderingContext2D>();

  const wholeBox = { x: 0, y: 0, w: width, h: height };
  const bigBox = { x: 10, y: 10, w: width - 20, h: height - 20 };
  const xBox = calculateAxisBox(
    "x",
    xBreakList,
    scales["x"].labels,
    bigBox,
    ctxt
  );
  const yBox = calculateAxisBox(
    "y",
    yBreakList,
    scales["y"].labels,
    bigBox,
    ctxt
  );
  xBox.w -= yBox.w;
  xBox.x += yBox.w;
  yBox.h -= xBox.h;
  const innerBox = {
    x: yBox.x + yBox.w,
    y: bigBox.y,
    w: bigBox.w - yBox.w,
    h: bigBox.h - xBox.h,
  };
  showBox(wholeBox, "#c0c000", ctxt);
  showBox(bigBox, "#c0c0c0", ctxt);
  showBox(xBox, "#c00000", ctxt);
  showBox(yBox, "#00c000", ctxt);
  showBox(innerBox, "#0000c0", ctxt);

  ctxt.save();
  ctxt.fillStyle = "black";
  //ctxt.scale(1 / width, -1 / height);
  //ctxt.translate(0, 1);
  plotGuidesInBox(xBreakList, yBreakList, innerBox, ctxt);
  plotLinesInBox(X, Y, group, innerBox, ctxt);
  plotAxis("x", xBreakList, scales["x"].labels || [], xBox, ctxt);
  plotAxis("y", yBreakList, scales["y"].labels || [], yBox, ctxt);
  ctxt.restore();
}

interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

function plotGuidesInBox(
  xBreakList: number[],
  yBreakList: number[],
  box: ViewBox,
  ctxt: CanvasRenderingContext2D
): void {
  ctxt.save();
  ctxt.strokeStyle = "#C0C0C0";
  for (const x of xBreakList) {
    ctxt.beginPath();
    ctxt.moveTo(box.x + x * box.w, box.y);
    ctxt.lineTo(box.x + x * box.w, box.y + box.h);
    ctxt.stroke();
  }
  for (const y of yBreakList) {
    ctxt.beginPath();
    ctxt.moveTo(box.x, box.y + y * box.h);
    ctxt.lineTo(box.x + box.w, box.y + y * box.h);
    ctxt.stroke();
  }
  ctxt.restore();
}

type WhichAxis = "x" | "y";

function calculateAxisBox(
  ax: WhichAxis,
  breaks: number[],
  labels: string[],
  box: ViewBox,
  ctxt: CanvasRenderingContext2D
): ViewBox {
  switch (ax) {
    case "y": {
      let w = 0;
      for (let i = 0; i < labels.length; ++i) {
        const tm = ctxt.measureText(labels[i]);
        w = Math.max(w, tm.width);
      }
      w += 5;
      return { x: box.x, y: box.y, w: w, h: box.h };
    }
    case "x": {
      let h = 0;
      for (let i = 0; i < labels.length; ++i) {
        const tm = ctxt.measureText(labels[i]);
        const h0 = tm.fontBoundingBoxAscent + tm.fontBoundingBoxDescent;
        h = Math.max(h, h0);
      }
      h += 5;
      return { x: box.x, y: box.y + box.h - h, w: box.w, h: h };
    }
  }
}

function plotAxis(
  ax: WhichAxis,
  breaks: number[],
  labels: string[],
  box: ViewBox,
  ctxt: CanvasRenderingContext2D
): void {
  ctxt.save();
  switch (ax) {
    case "x": {
      ctxt.textAlign = "center";
      ctxt.textBaseline = "top";
      for (let i = 0; i < breaks.length; ++i) {
        ctxt.fillText(labels[i], box.x + breaks[i] * box.w, box.y + 5);
      }
      break;
    }
    case "y": {
      ctxt.textAlign = "right";
      ctxt.textBaseline = "middle";
      for (let i = 0; i < breaks.length; ++i) {
        ctxt.fillText(
          labels[i],
          box.x + box.w - 5,
          box.y + (1 - breaks[i]) * box.h
        );
      }
      break;
    }
  }
  ctxt.restore();
}

function plotPointsInBox(
  x: number[],
  y: number[],
  box: ViewBox,
  ctxt: CanvasRenderingContext2D
) {
  const N = x.length;
  ctxt.save();
  ctxt.beginPath();
  ctxt.rect(box.x, box.y, box.w, box.h);
  ctxt.clip();
  ctxt.beginPath();
  ctxt.rect(box.x, box.y, box.w, box.h);
  ctxt.stroke();
  for (let i = 0; i < N; ++i) {
    ctxt.fillText("\u2022", box.x + box.w * x[i], box.y + box.h * y[i]);
  }
  ctxt.restore();
}

function plotLinesInBox(
  x: number[],
  y: number[],
  groups: string[] | number[] | null,
  box: ViewBox,
  ctxt: CanvasRenderingContext2D
) {
  const idx: { [group: string]: { x: number[]; y: number[] } } = {};
  if (groups == null) {
    idx[""] = { x: x, y: y };
  } else {
    const N = x.length;
    for (let i = 0; i < N; ++i) {
      let g: string | number = groups[i];
      if (typeof g == "number") {
        g = g.toString();
      }
      if (!(g in idx)) {
        idx[g] = { x: [], y: [] };
      }
      idx[g].x.push(x[i]);
      idx[g].y.push(y[i]);
    }
  }
  ctxt.save();
  ctxt.beginPath();
  ctxt.rect(box.x, box.y, box.w, box.h);
  ctxt.clip();
  ctxt.beginPath();
  ctxt.rect(box.x, box.y, box.w, box.h);
  ctxt.stroke();
  for (const group in idx) {
    const xy = idx[group];
    ctxt.beginPath();
    ctxt.moveTo(box.x + box.w * xy.x[0], box.y + box.h * (1 - xy.y[0]));
    const N = xy.x.length;
    for (let i = 1; i < N; ++i) {
      ctxt.lineTo(box.x + box.w * xy.x[i], box.y + box.h * (1 - xy.y[i]));
    }
    ctxt.stroke();
  }
  ctxt.restore();
}

function showBox(
  box: ViewBox,
  colour: string,
  ctxt: CanvasRenderingContext2D
): void {
  ctxt.save();
  ctxt.fillStyle = colour;
  ctxt.globalAlpha = 0.25;
  ctxt.fillRect(box.x, box.y, box.w, box.h);
  ctxt.restore();
}
