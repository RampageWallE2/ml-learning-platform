import { BaseWorldScene } from '../../../../../core/base-world.scene';

import { SURFACE_SELECTION_MAP_CONFIG } from './surface-selection.map.config';

export class SurfaceSelectionScene extends BaseWorldScene {
  constructor() {
    super('SurfaceSelectionScene', SURFACE_SELECTION_MAP_CONFIG);
  }
}
