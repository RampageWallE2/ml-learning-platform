export type TiledPropertyValue =
  | string
  | number
  | boolean;


export type TiledProperty = {
  name: string;
  value: TiledPropertyValue;
};


export type TiledObjectLike = {
  name?: string;

  x?: number;
  y?: number;

  width?: number;
  height?: number;

  ellipse?: boolean;

  properties?: TiledProperty[];
};


export type TiledRectangle = {
  x: number;
  y: number;

  width: number;
  height: number;

  centerX: number;
  centerY: number;
};


export type TiledPoint = {
  x: number;
  y: number;
};


export type TiledCircle = {
  centerX: number;
  centerY: number;

  radius: number;
  diameter: number;
};
