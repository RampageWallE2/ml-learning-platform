import Phaser from 'phaser';

import {
  createStaticZonesFromLayer,
  getTiledCircle
} from './tiled.utils';


describe('tiled.utils', () => {

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
