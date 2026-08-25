import { BaseWorldScene } from '../../../../../core/base-world.scene';

import { OPEN_PIT_MAP_CONFIG } from './open-pit.map.config';

export class OpenPitScene extends BaseWorldScene {
  constructor() {
    super('OpenPitScene', OPEN_PIT_MAP_CONFIG);
  }
}
