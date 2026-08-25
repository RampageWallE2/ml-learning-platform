import { BaseWorldScene } from '../../../../../core/base-world.scene';

import { ZONE_02_MAP_CONFIG } from './zone-02.map.config';

export class Zone02Scene extends BaseWorldScene {
  constructor() {
    super('Zone02Scene', ZONE_02_MAP_CONFIG);
  }
}
