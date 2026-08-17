import { Component, output } from '@angular/core';

@Component({
  selector: 'app-interaction-panel',
  imports: [],
  templateUrl: './interaction-panel.html',
  styleUrl: './interaction-panel.scss'
})
export class InteractionPanel {
  closed = output<void>();
}