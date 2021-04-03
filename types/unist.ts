/* eslint-disable no-use-before-define */

export interface Point {
  line: number;
  column: number;
  offset?: number;
}

export interface Position {
  start: Point;
  end: Point;
  indent?: number;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Data {}

export interface Node {
  type: string;
  data?: Data;
  position?: Position;
}

export interface Parent extends Node {
  children: Node[];
}

export interface Literal extends Node {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
}
