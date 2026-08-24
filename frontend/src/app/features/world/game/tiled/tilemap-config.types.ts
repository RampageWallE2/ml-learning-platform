import Phaser from 'phaser';


export type TilesetConfig = {

  /*
   * Identificador interno que usaremos
   * dentro de nuestra configuración.
   */
  id: string;


  /*
   * Nombre que tiene el tileset
   * dentro de Tiled.
   */
  tiledName: string;


  /*
   * Key utilizada por Phaser.
   */
  textureKey: string;


  /*
   * Archivo de imagen.
   */
  imagePath: string;
};


export type TileLayerConfig = {

  /*
   * Nombre exacto de la capa en Tiled.
   *
   * Ej:
   * Terrain/Ground
   */
  name: string;


  /*
   * IDs de tilesets que puede utilizar
   * esta capa.
   */
  tilesets: readonly string[];


  depth: number;
};


export type TilemapSceneConfig = {

  mapKey: string;

  mapPath: string;


  tilesets:
    readonly TilesetConfig[];


  layers:
    readonly TileLayerConfig[];
};


export type CreatedTileLayer =
  | Phaser.Tilemaps.TilemapLayer
  | Phaser.Tilemaps.TilemapGPULayer;


export type TilemapBuildResult = {

  map:
    Phaser.Tilemaps.Tilemap;


  tilesets:
    Map<
      string,
      Phaser.Tilemaps.Tileset
    >;


  layers:
    Map<
      string,
      CreatedTileLayer
    >;
};