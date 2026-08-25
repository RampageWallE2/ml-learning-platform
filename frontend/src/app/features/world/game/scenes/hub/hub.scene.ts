import { BaseWorldScene } from '../../../../../core/base-world.scene';

import { HUB_MAP_CONFIG } from './hub.map.config';

export class HubScene extends BaseWorldScene {
  constructor() {
    super('HubScene', HUB_MAP_CONFIG);
  }
}
