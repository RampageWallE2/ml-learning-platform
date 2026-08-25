import { BaseWorldScene } from '../../../../../core/base-world.scene';

import { ZONE_03_MAP_CONFIG } from './zone-03.map.config';

export class Zone03Scene extends BaseWorldScene {
  constructor() {
    super('Zone03Scene', ZONE_03_MAP_CONFIG);
  }
}
