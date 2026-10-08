import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-world-help',
  templateUrl: './world-help.html',
  styleUrl: './world-help.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorldHelp {
  readonly firstVisit = input(false);
  readonly touchControls = input(false);
  readonly nextStep = input.required<string>();
  readonly closed = output<void>();
}
