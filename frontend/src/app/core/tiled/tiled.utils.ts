import Phaser from 'phaser';

import {
  TiledCircle,
  TiledObjectLike,
  TiledPoint,
  TiledPropertyValue,
  TiledRectangle
} from './tiled.types';


/* =========================
   OBJECT LAYER
   ========================= */

/**
 * Obtiene una capa de objetos
 * de Tiled.
 *
 * Si no existe, falla inmediatamente
 * con un mensaje claro.
 */
export function getObjectLayerOrThrow(
  map: Phaser.Tilemaps.Tilemap,
  layerName: string
) {

  const layer =
    map.getObjectLayer(
      layerName
    );


  if (!layer) {

    throw new Error(
      `No se encontró la capa de objetos "${layerName}"`
    );
  }


  return layer;
}


/* =========================
   PROPERTIES
   ========================= */

/**
 * Obtiene una propiedad personalizada
 * de un objeto de Tiled.
 *
 * Ejemplos:
 *
 * interactionType
 * lessonId
 * dialogueId
 * targetScene
 */
export function getTiledProperty<
  T extends TiledPropertyValue =
    TiledPropertyValue
>(
  object: TiledObjectLike,
  propertyName: string
): T | undefined {

  const property =
    object.properties?.find(
      property =>
        property.name ===
        propertyName
    );


  return property?.value as
    T | undefined;
}


/* =========================
   RECTÁNGULOS
   ========================= */

/**
 * Convierte un objeto rectangular
 * de Tiled en datos utilizables
 * dentro de Phaser.
 *
 * Si el objeto no tiene dimensiones
 * válidas devuelve null.
 */
export function getTiledRectangle(
  object: TiledObjectLike
): TiledRectangle | null {

  const width =
    object.width ?? 0;


  const height =
    object.height ?? 0;


  if (
    object.x === undefined ||
    object.y === undefined ||
    width <= 0 ||
    height <= 0
  ) {

    return null;
  }


  return {
    x: object.x,
    y: object.y,

    width,
    height,

    centerX:
      object.x +
      width / 2,

    centerY:
      object.y +
      height / 2
  };
}


/* =========================
   CÍRCULOS
   ========================= */

/**
 * Convierte un objeto elíptico de Tiled
 * en un círculo centrado dentro de sus
 * límites.
 *
 * Arcade Physics no admite elipses. Para
 * evitar que la colisión sobresalga del
 * dibujo usamos la dimensión menor como
 * diámetro.
 */
export function getTiledCircle(
  object: TiledObjectLike
): TiledCircle | null {

  if (!object.ellipse) {
    return null;
  }


  const width =
    object.width ?? 0;


  const height =
    object.height ?? 0;


  if (
    object.x === undefined ||
    object.y === undefined ||
    width <= 0 ||
    height <= 0
  ) {
    return null;
  }


  const diameter =
    Math.min(
      width,
      height
    );


  return {
    centerX:
      object.x +
      width / 2,

    centerY:
      object.y +
      height / 2,

    radius:
      diameter / 2,

    diameter
  };
}


/* =========================
   SPAWN
   ========================= */

/**
 * Busca un punto de spawn dentro
 * de una capa de objetos Tiled.
 */
export function findSpawnPoint(
  map: Phaser.Tilemaps.Tilemap,
  spawnName: string = 'player-start',
  layerName: string = 'SpawnPoints'
): TiledPoint {

  const spawnLayer =
    getObjectLayerOrThrow(
      map,
      layerName
    );


  const spawnObject =
    spawnLayer.objects.find(
      object =>
        object.name ===
        spawnName
    );


  if (
    !spawnObject ||
    spawnObject.x === undefined ||
    spawnObject.y === undefined
  ) {

    throw new Error(
      `No se encontró el spawn "${spawnName}" en "${layerName}"`
    );
  }


  return {
    x: spawnObject.x,
    y: spawnObject.y
  };
}


/* =========================
   ZONAS ESTÁTICAS
   ========================= */

/**
 * Convierte los rectángulos y círculos
 * de una Object Layer de Tiled en zonas
 * físicas estáticas.
 *
 * Principalmente lo utilizaremos
 * para colisiones.
 */
export function createStaticZonesFromLayer(
  scene: Phaser.Scene,
  map: Phaser.Tilemaps.Tilemap,
  layerName: string
): Phaser.GameObjects.Zone[] {

  const objectLayer =
    getObjectLayerOrThrow(
      map,
      layerName
    );


  const zones:
    Phaser.GameObjects.Zone[] =
      [];


  for (
    const object
    of objectLayer.objects
  ) {

    const circle =
      getTiledCircle(
        object
      );


    if (circle) {

      const zone =
        scene.add.zone(
          circle.centerX,
          circle.centerY,
          circle.diameter,
          circle.diameter
        );


      scene.physics.add.existing(
        zone,
        true
      );


      const body =
        zone.body as
          Phaser.Physics.Arcade.StaticBody;


      body.setCircle(
        circle.radius
      );


      zones.push(
        zone
      );


      continue;
    }

    const rectangle =
      getTiledRectangle(
        object
      );


    if (!rectangle) {
      continue;
    }


    const zone =
      scene.add.zone(
        rectangle.centerX,
        rectangle.centerY,
        rectangle.width,
        rectangle.height
      );


    scene.physics.add.existing(
      zone,
      true
    );


    zones.push(
      zone
    );
  }


  return zones;
}
