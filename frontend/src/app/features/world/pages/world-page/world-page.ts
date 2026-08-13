import { signal, AfterViewInit, Component, OnDestroy } from '@angular/core';
import Phaser from 'phaser';
import { gameConfig } from '../../game/config/game.config'; 
import { gameEvents, GameEvents } from '../../game/events/game-events'


@Component({
  selector: 'app-world-page',
  imports: [],
  templateUrl: './world-page.html',
  styleUrl: './world-page.scss',
})
export class WorldPage implements AfterViewInit, OnDestroy{
  lessonActive = signal<string | null>(null);

  closeLesson(): void {
    this.lessonActive.set(null);
  }

  private readonly handlerOpenLesson = ( lessonId: string ): void =>{
    this.lessonActive.set(lessonId)
    // console.log('Angular recibio la leccion')
  }

  private game?: Phaser.Game; 

  ngAfterViewInit(): void {
    gameEvents.on(
      GameEvents.OPEN_LESSON,
      this.handlerOpenLesson
    )
    
    this.game = new Phaser.Game(gameConfig);
  }

  ngOnDestroy(): void {
    gameEvents.off(
      GameEvents.OPEN_LESSON,
      this.handlerOpenLesson
    )
    this.game?.destroy(true);
  }
}
