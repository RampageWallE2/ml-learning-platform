import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-learning-scene',
  template: `
    <div class="scene">
      <span class="scene-label">EL ESCENARIO · MINERÍA</span>
      <div class="landscape" aria-hidden="true"><span></span></div>
      <img
        class="hero-scene__truck"
        src="assets/game/tilesets/vehicles/dump_truck_2.png"
        alt="Camión minero del mundo interactivo"
        loading="lazy"
        width="224"
        height="160"
      />
      <p>Un contexto real.<br /><em>Muchas formas de aprender.</em></p>
    </div>
  `,
  styleUrl: './learning-scene.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LearningScene {}
