import { BaseWorldScene } from '../../../../../core/base-world.scene';

import { ZONE_01_MAP_CONFIG } from './zone-01.map.config';

export class Zone01Scene extends BaseWorldScene {
  constructor() {
    super('Zone01Scene', ZONE_01_MAP_CONFIG);
  }
}
