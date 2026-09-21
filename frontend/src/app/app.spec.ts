import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AuthService } from './core/auth/auth.service';
import { App } from './app';

describe('App', () => {
  const auth = {
    restoreSession: vi.fn(() => of(false)),
  };

  beforeEach(async () => {
    auth.restoreSession.mockClear();

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [{ provide: AuthService, useValue: auth }],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
    expect(auth.restoreSession).toHaveBeenCalledOnce();
  });

  it('should render the router outlet', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });
});
