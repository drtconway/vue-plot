export type ValueType = "string" | "number" | "boolean" | "null";
export type Value = string | number | boolean | null;
export type Values =
  | { type: "string"; values: string[] }
  | { type: "number"; values: number[] };

export interface Data {
  length: number;
  columns: string[];
  columnTypes: ValueType[];

  get: (column: number | string) => Values;
}
