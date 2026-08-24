import Phaser from 'phaser';

import {
  TilemapBuildResult,
  TilemapSceneConfig
} from './tilemap-config.types';


/* =========================
   PRELOAD
   ========================= */

export function preloadTilemap(
  scene: Phaser.Scene,
  config: TilemapSceneConfig
): void {

  /* =========================
     MAPA
     ========================= */

  scene.load.tilemapTiledJSON(
    config.mapKey,
    config.mapPath
  );


  /* =========================
     TILESETS
     ========================= */

  for (
    const tileset
    of config.tilesets
  ) {

    scene.load.image(
      tileset.textureKey,
      tileset.imagePath
    );
  }
}


/* =========================
   CONSTRUIR MAPA
   ========================= */

export function buildTilemap(
  scene: Phaser.Scene,
  config: TilemapSceneConfig
): TilemapBuildResult {

  const map =
    scene.make.tilemap({
      key: config.mapKey
    });


  const tilesets =
    createTilesets(
      map,
      config
    );


  const layers =
    createLayers(
      map,
      config,
      tilesets
    );


  return {
    map,
    tilesets,
    layers
  };
}


/* =========================
   TILESETS
   ========================= */

function createTilesets(
  map: Phaser.Tilemaps.Tilemap,
  config: TilemapSceneConfig
): Map<
  string,
  Phaser.Tilemaps.Tileset
> {

  const result =
    new Map<
      string,
      Phaser.Tilemaps.Tileset
    >();


  for (
    const tilesetConfig
    of config.tilesets
  ) {

    const tileset =
      map.addTilesetImage(
        tilesetConfig.tiledName,
        tilesetConfig.textureKey
      );


    if (!tileset) {

      throw new Error(
        `No se pudo crear el tileset "${tilesetConfig.tiledName}"`
      );
    }


    result.set(
      tilesetConfig.id,
      tileset
    );
  }


  return result;
}


/* =========================
   CAPAS
   ========================= */

function createLayers(
  map: Phaser.Tilemaps.Tilemap,
  config: TilemapSceneConfig,
  tilesets: Map<
    string,
    Phaser.Tilemaps.Tileset
  >
): TilemapBuildResult['layers'] {

  const result:
    TilemapBuildResult['layers'] =
      new Map();


  for (
    const layerConfig
    of config.layers
  ) {

    const layerTilesets =
      layerConfig.tilesets.map(
        tilesetId => {

          const tileset =
            tilesets.get(
              tilesetId
            );


          if (!tileset) {

            throw new Error(
              `La capa "${layerConfig.name}" utiliza el tileset desconocido "${tilesetId}"`
            );
          }


          return tileset;
        }
      );


    const layer =
      map.createLayer(
        layerConfig.name,
        layerTilesets
      );


    if (!layer) {

      throw new Error(
        `No se pudo crear la capa "${layerConfig.name}"`
      );
    }


    layer.setDepth(
      layerConfig.depth
    );


    result.set(
      layerConfig.name,
      layer
    );
  }


  return result;
}