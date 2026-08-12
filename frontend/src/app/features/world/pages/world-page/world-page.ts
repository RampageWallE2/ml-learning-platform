import { AfterViewInit, Component, OnDestroy } from '@angular/core';
import Phaser from 'phaser';
import { gameConfig } from '../../game/config/game.config'; 

@Component({
  selector: 'app-world-page',
  imports: [],
  templateUrl: './world-page.html',
  styleUrl: './world-page.scss',
})
export class WorldPage implements AfterViewInit, OnDestroy{

  private game?: Phaser.Game; 

  ngAfterViewInit(): void {
    this.game = new Phaser.Game(gameConfig);
  }

  ngOnDestroy(): void {
    this.game?.destroy(true);
    this.game = undefined;
  }
}
