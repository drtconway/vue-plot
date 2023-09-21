import {
  AbstractAesthetics,
  applyDataToAesthetics,
  ConcreteAesthetics,
} from "./aesthetics";
import { Data, Value, Values } from "./data";

export type AestheticScale =
  | { axis: "x" }
  | { axis: "y" }
  | { axis: "legend"; aes: string };

export const xAxis: AestheticScale = { axis: "x" };
export const yAxis: AestheticScale = { axis: "y" };
export function legendAxis(aes: string): AestheticScale {
  return { axis: "legend", aes: aes };
}

export interface GeomAestheticProperties {
  required: boolean;
  inheritable: boolean;
  axis: AestheticScale;
  continuous?: boolean;
  default?: Value;
}

export interface GeomSpecifier {
  geom: string;
  aes: { [name: string]: GeomAestheticProperties };
  stat: string;
  position: string;
}

export interface AbstractGeom {
  geom: GeomSpecifier;
  data?: Data;
  aes?: AbstractAesthetics;
  props: { [property: string]: Value };
}

export interface ConcreteGeom {
  geom: GeomSpecifier;
  aes: ConcreteAesthetics;
  props: { [property: string]: Value };
}

export interface AbstractGeomComponent {
  kind: "geom";
  value: AbstractGeom;
}

export function materializeGeom(
  data: Data,
  globalAes: ConcreteAesthetics,
  orig: AbstractGeom
): ConcreteGeom {
  const geom: ConcreteGeom = {
    geom: orig.geom,
    aes: {},
    props: { ...orig.props },
  };
  console.log(orig.aes == undefined);
  if (orig.aes != undefined) {
    geom.aes = applyDataToAesthetics(data, orig.aes);
  }
  console.log(geom.aes);
  for (const aesName in orig.geom.aes) {
    const aesSpec = orig.geom.aes[aesName];
    if (aesName in geom.aes) {
      continue;
    }
    if (aesName in geom.props) {
      continue;
    }
    if (aesName in globalAes && aesSpec.inheritable) {
      geom.aes[aesName] = globalAes[aesName];
      continue;
    }
    if (aesSpec.required) {
      throw new Error(
        `geom ${orig.geom.geom} requires the aesthetic ${aesName}`
      );
    }
    if (aesSpec.default != undefined) {
      geom.props[aesName] = aesSpec.default;
    }
  }
  return geom;
}

const point_geom_specifier: GeomSpecifier = {
  geom: "point",
  aes: {
    x: { required: true, inheritable: true, axis: xAxis },
    y: { required: true, inheritable: true, axis: yAxis },
    colour: {
      required: false,
      inheritable: true,
      axis: legendAxis("colour"),
      default: "black",
    },
    alpha: {
      required: false,
      inheritable: true,
      axis: legendAxis("alpha"),
      default: 1.0,
    },
    shape: {
      required: false,
      inheritable: true,
      axis: legendAxis("shape"),
      default: 19,
    },
    size: {
      required: false,
      inheritable: true,
      axis: legendAxis("size"),
      default: 1.5,
    },
  },
  stat: "identity",
  position: "identity",
};

export interface GeomPointOptions {
  data?: Data;
  aes?: AbstractAesthetics;
  size?: number;
  colour?: string;
  shape?: string | number;
  alpha?: number;
  position?: string;
}

export function geom_point(opts?: GeomPointOptions): AbstractGeomComponent {
  const geom: AbstractGeom = {
    geom: point_geom_specifier,
    props: {},
  };
  if (opts) {
    geom.data = opts.data;
    geom.aes = opts.aes;
    if (opts.size != undefined) {
      geom.props["size"] = opts.size;
    }
    if (opts.colour != undefined) {
      geom.props["colour"] = opts.colour;
    }
    if (opts.shape != undefined) {
      geom.props["shape"] = opts.shape;
    }
    if (opts.alpha != undefined) {
      geom.props["alpha"] = opts.alpha;
    }
    if (opts.position != undefined) {
      geom.props["position"] = opts.position;
    }
  }
  return { kind: "geom", value: geom };
}

const namedShapes: { [name: string]: string } = {
  "square open": "\u25A1",
  "circle open": "\u25CB",
  "triangle open": "\u253B",
  plus: "+",
  cross: "\u2A2F",
  "diamond open": "\u25C7",
  "triangle down open": "\u25BD",
  "square cross": "\u22A0",
  asterisk: "*",
  "diamond plus": "+\u25C7",
  "circle plus": "\u2295",
  star: "\u2606",
  "square plus": "\u229E",
  "circle cross": "\u2297",
  "square triangle": "\u25A1\u25B3",
  "triangle square": "\u25A1\u25B3",
  square: "\u25A0",
  "circle small": "\u00B7",
  triangle: "\u25B2",
  diamond: "\u25C6",
  circle: "\u25CF",
  bullet: "\u2022",
  "circle filled": "\u25CF",
  "square filled": "\u25A3",
  "diamond filled": "\u25C6",
  "triangle filled": "\u25B2",
  "triangle down filled": "\u25BC",
};

const rShapes: string[] = [
  "square open",
  "circle open",
  "triangle open",
  "plus",
  "cross",
  "diamond open",
  "triangle down open",
  "square cross",
  "asterisk",
  "diamond plus",
  "circle plus",
  "star",
  "square plus",
  "circle cross",
  "square triangle",
  "square",
  "circle small",
  "triangle",
  "diamond",
  "circle",
  "bullet",
  "circle filled",
  "square filled",
  "diamond filled",
  "triangle filled",
  "triangle down filled",
];

export interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function drawGeom(
  geom: ConcreteGeom,
  box: ViewBox,
  ctxt: CanvasRenderingContext2D
): void {
  switch (geom.geom.geom) {
    case "point": {
      drawGeomPoints(geom, box, ctxt);
      break;
    }
    default: {
      throw new Error("not implemented.");
    }
  }
}

function drawGeomPoints(
  geom: ConcreteGeom,
  box: ViewBox,
  ctxt: CanvasRenderingContext2D
): void {
  // do nothing
  return;
}

export const textBoundingBox: (
  txt: string,
  font?: string
) => { width: number; height: number } = (() => {
  const canvas = document.createElement("canvas") as HTMLCanvasElement;
  const context = canvas.getContext("2d");
  if (context == null) {
    throw new Error(`textWidth: unable to create context.`);
  }
  return (txt: string, font?: string): { width: number; height: number } => {
    context.save();
    if (font != undefined) {
      context.font = font;
    }
    const m = context.measureText(txt);
    context.restore();
    const height = m.fontBoundingBoxAscent + m.fontBoundingBoxDescent;
    return { width: m.width, height: height };
  };
})();
