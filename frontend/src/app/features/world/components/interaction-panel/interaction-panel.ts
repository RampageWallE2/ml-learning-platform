import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export type InteractionPanelMode = 'dialogue' | 'activity';

@Component({
  selector: 'app-interaction-panel',
  imports: [],
  templateUrl: './interaction-panel.html',
  styleUrl: './interaction-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InteractionPanel {
  readonly mode = input<InteractionPanelMode>('activity');
  readonly closed = output<void>();
}
