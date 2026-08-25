import { BaseWorldScene } from '../../../../../core/base-world.scene';

import { QUARRIES_MAP_CONFIG } from './quarries.map.config';

export class QuarriesScene extends BaseWorldScene {
  constructor() {
    super('QuarriesScene', QUARRIES_MAP_CONFIG);
  }
}
