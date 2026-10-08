import Phaser from 'phaser';

import {
  createStaticZonesFromLayer,
  getTiledCircle,
  getTiledProperty,
  getTiledStringProperty,
  getTiledNumberProperty
} from './tiled.utils';


describe('tiled.utils', () => {

  describe('typed property readers', () => {
    it('keeps absent properties optional', () => {
      expect(getTiledStringProperty({}, 'lessonId')).toBeUndefined();
      expect(getTiledNumberProperty({}, 'radius')).toBeUndefined();
      expect(getTiledProperty({}, 'active')).toBeUndefined();
    });

    it('preserves valid text and does not silently trim identifiers', () => {
      const object = { properties: [{ name: 'lessonId', value: ' lesson-01 ' }] };
      expect(getTiledStringProperty(object, 'lessonId')).toBe(' lesson-01 ');
      expect(getTiledStringProperty({ properties: [{ name: 'npcId', value: '' }] }, 'npcId')).toBe('');
    });

    it.each([42, true, false])('rejects non-text identifier %s', value => {
      const object = { name: 'encargado', properties: [{ name: 'lessonId', value }] };
      expect(() => getTiledStringProperty(object, 'lessonId')).toThrow(
        'La propiedad "lessonId" del objeto "encargado" debe ser texto',
      );
    });

    it.each([0, -1, 0.4, 400])('preserves finite number %s for domain validation', value => {
      expect(getTiledNumberProperty({ properties: [{ name: 'radius', value }] }, 'radius')).toBe(value);
    });

    it.each(['400', true, false, NaN, Infinity, -Infinity])('rejects non-finite or non-numeric value %s', value => {
      expect(() => getTiledNumberProperty({ name: 'camión', properties: [{ name: 'radius', value }] }, 'radius'))
        .toThrow('La propiedad "radius" del objeto "camión" debe ser un número finito');
    });

    it('keeps the raw primitive reader available without a generic type assertion', () => {
      expect(getTiledProperty({ properties: [{ name: 'active', value: false }] }, 'active')).toBe(false);
    });
  });

  describe('getTiledCircle', () => {

    it('centers the circle and uses the shortest dimension as its diameter', () => {

      expect(
        getTiledCircle({
          ellipse: true,
          x: 100,
          y: 200,
          width: 80,
          height: 60
        })
      ).toEqual({
        centerX: 140,
        centerY: 230,
        radius: 30,
        diameter: 60
      });
    });


    it('ignores objects that are not ellipses', () => {

      expect(
        getTiledCircle({
          x: 100,
          y: 200,
          width: 60,
          height: 60
        })
      ).toBeNull();
    });


    it('ignores ellipses without valid dimensions', () => {

      expect(
        getTiledCircle({
          ellipse: true,
          x: 100,
          y: 200,
          width: 0,
          height: 60
        })
      ).toBeNull();
    });

  });


  describe('createStaticZonesFromLayer', () => {

    it('creates a centered static circular body for an ellipse from Tiled', () => {

      const setCircle =
        vi.fn();


      const zone = {
        body: {
          setCircle
        }
      } as unknown as Phaser.GameObjects.Zone;


      const scene = {
        add: {
          zone: vi.fn(() => zone)
        },
        physics: {
          add: {
            existing: vi.fn()
          }
        }
      } as unknown as Phaser.Scene;


      const map = {
        getObjectLayer: vi.fn(() => ({
          objects: [{
            ellipse: true,
            x: 10,
            y: 20,
            width: 50,
            height: 40
          }]
        }))
      } as unknown as Phaser.Tilemaps.Tilemap;


      const zones =
        createStaticZonesFromLayer(
          scene,
          map,
          'Collision'
        );


      expect(scene.add.zone)
        .toHaveBeenCalledWith(
          35,
          40,
          40,
          40
        );

      expect(scene.physics.add.existing)
        .toHaveBeenCalledWith(
          zone,
          true
        );

      expect(setCircle)
        .toHaveBeenCalledWith(20);

      expect(zones)
        .toEqual([zone]);
    });

  });

});
