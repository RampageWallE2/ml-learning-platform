import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { LandingPage } from './landing-page';

describe('LandingPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandingPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('presents the learning experience and its main call to action', () => {
    const fixture = TestBed.createComponent(LandingPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('h1')?.textContent).toContain('Los datos se entienden');
    expect(element.querySelector('a[href="/login"]')?.textContent).toContain('Iniciar sesión');
    expect(element.querySelector('#como-funciona')).not.toBeNull();
    expect(element.querySelector('#experiencia')).not.toBeNull();
    expect(element.querySelector('#metodologia')).not.toBeNull();
  });

  it('uses an existing game asset in the hero scene', () => {
    const fixture = TestBed.createComponent(LandingPage);
    fixture.detectChanges();
    const image = (fixture.nativeElement as HTMLElement).querySelector<HTMLImageElement>(
      '.hero-scene__truck',
    );

    expect(image?.getAttribute('src')).toBe('assets/game/tilesets/vehicles/dump_truck_2.png');
    expect(image?.alt).toContain('Camión minero');
  });

  it('lets visitors retry the exercise and explains the correct answer', () => {
    const fixture = TestBed.createComponent(LandingPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const buttons = element.querySelectorAll<HTMLButtonElement>('.answers button');
    buttons[0].click();
    fixture.detectChanges();
    expect(element.querySelector('.feedback')?.textContent).toContain('Casi.');
    buttons[1].click();
    fixture.detectChanges();
    expect(element.querySelector('.feedback')?.textContent).toContain('100 toneladas');
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
    expect(element.querySelector('a.button[href="/register"]')).not.toBeNull();
  });

  it('marks sections for scroll reveal and preserves accessible title text', () => {
    const fixture = TestBed.createComponent(LandingPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const animatedTitles = element.querySelectorAll<HTMLElement>('[appTypewriterText]');

    expect(element.querySelectorAll('[appRevealOnScroll]').length).toBeGreaterThan(5);
    expect(animatedTitles.length).toBe(4);
    expect(animatedTitles[0].getAttribute('aria-label')).toBe(
      'Los datos se entienden cuando los exploras.',
    );
    expect(animatedTitles[0].textContent).toContain('cuando los exploras');
  });
});
