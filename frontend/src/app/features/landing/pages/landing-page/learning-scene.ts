import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-learning-scene',
  template: `
    <figure class="scene">
      <img
        src="assets/branding/exploralab-experience.png"
        alt="Dos exploradores de ExploraLab observan minerales y comparan sus datos"
        loading="lazy"
        width="1254"
        height="1254"
      />
    </figure>
  `,
  styleUrl: './learning-scene.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LearningScene {}
