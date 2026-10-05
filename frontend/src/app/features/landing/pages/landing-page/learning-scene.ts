import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-learning-scene',
  template: `
    <figure class="scene">
      <picture>
        <source
          type="image/webp"
          srcset="
            assets/branding/exploralab-experience-640.webp   640w,
            assets/branding/exploralab-experience-960.webp   960w,
            assets/branding/exploralab-experience-1254.webp 1254w
          "
          sizes="(max-width: 576px) calc(100vw - 36px), (max-width: 760px) 540px, (max-width: 1100px) calc((100vw - 120px) / 2), (max-width: 1250px) calc((100vw - 170px) / 2), 540px"
        />
        <img
          src="assets/branding/exploralab-experience.png"
          alt="Dos exploradores de ExploraLab observan minerales y comparan sus datos"
          loading="lazy"
          decoding="async"
          width="1254"
          height="1254"
        />
      </picture>
    </figure>
  `,
  styleUrl: './learning-scene.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LearningScene {}
