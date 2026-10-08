import {
  computed,
  effect,
  Injectable,
  inject,
  signal,
  untracked
} from '@angular/core';

import {
  HttpClient
} from '@angular/common/http';

import {
  Observable,
  EMPTY,
  catchError,
  concatMap,
  defer,
  filter,
  finalize,
  from,
  map,
  of,
  reduce,
  shareReplay,
  switchMap,
  tap,
  throwError,
  timeout
} from 'rxjs';

import {
  AUTH_CONFIG
} from '../../../core/auth/auth.config';

import { AuthService } from '../../../core/auth/auth.service';
import { API_REQUEST_TIMEOUT_MS } from '../../../core/http/request-timeout';
import { AuthenticatedUser } from '../../../core/auth/auth.types';
import { loadPendingProgress, savePendingProgress } from './pending-progress.storage';

import { LEARNING_ZONES } from '../lessons/lesson-catalog';

import {
  LessonProgressItem,
  ProgressApiResponse,
  SaveScenarioIntroResponse,
  SaveLessonProgressResponse,
  ZoneProgress
} from './progress.types';


type LessonDefinition = {
  lessonId: string;
  name: string;
  objective: string;
};


type ZoneDefinition = {
  id: string;
  name: string;
  topic: string;

  lessons: LessonDefinition[];
};


@Injectable({
  providedIn: 'root'
})
export class ProgressService {

  private readonly http =
    inject(HttpClient);


  private readonly authConfig =
    inject(AUTH_CONFIG);


  private readonly auth =
    inject(AuthService);

  /* =========================
     DEFINICIÓN DEL RECORRIDO
     ========================= */

  private readonly zones: ZoneDefinition[] = LEARNING_ZONES.map(zone => ({
    id: zone.id,
    name: zone.name,
    topic: zone.topic,
    lessons: zone.lessons.map(({ lessonId, name, objective }) => ({
      lessonId,
      name,
      objective,
    })),
  }));


  /* =========================
     TODAS LAS LECCIONES
     EN ORDEN PEDAGÓGICO
     ========================= */

  private readonly orderedLessons =
    this.zones.flatMap(
      zone => zone.lessons
    );


  /* =========================
     LECCIONES COMPLETADAS
     ========================= */

  private readonly completedLessonIds =
    signal<string[]>([]);


  private activeUser: AuthenticatedUser | null = null;
  private readonly introState = signal<boolean | null>(null);
  // null means not loaded: never treat a failed read as a confirmed intro.
  readonly openPitIntroCompleted = this.introState.asReadonly();
  private introConfirmationVersion = 0;

  private readonly pendingState = signal<string[]>([]);
  readonly pendingLessonIds = this.pendingState.asReadonly();
  private readonly pendingStorageAvailableState = signal(true);
  readonly pendingStorageAvailable = this.pendingStorageAvailableState.asReadonly();
  private readonly syncingPendingState = signal(false);
  readonly syncingPending = this.syncingPendingState.asReadonly();

  private readonly saveRequests = new Map<string, {
    user: AuthenticatedUser;
    request: Observable<void>;
  }>();


  constructor() {
    this.activateUser(this.auth.user());
    effect(() => {
      const user = this.auth.user();
      untracked(() => this.activateUser(user));
    });
  }


  /* =========================
     CARGAR PROGRESO
     ========================= */

  loadProgress(): Observable<void> {
    return defer(() => {
      const user = this.auth.user();
      this.activateUser(user);
      if (!user) return throwError(() => new Error('Se requiere una sesión para cargar el progreso.'));

      // Keep this session's confirmed progress visible if the refresh fails.
      const completedBeforeLoad = new Set(this.completedLessonIds());
      const introVersionBeforeLoad = this.introConfirmationVersion;
      this.restorePending(user.id);
      return this.http.get<ProgressApiResponse>(
        `${this.authConfig.apiBaseUrl}/me/progress`,
        { withCredentials: true },
      ).pipe(
        timeout({ first: API_REQUEST_TIMEOUT_MS }),
        filter(() => this.auth.user() === user),
        tap(response => {
          if (!Array.isArray(response.scenarios)) {
            throw new Error('El servidor no devolvió el estado de los escenarios.');
          }
          if (introVersionBeforeLoad === this.introConfirmationVersion) {
            this.introState.set(!!response.scenarios.find(item => item.scenarioKey === 'open-pit')?.introCompletedAt);
          }
          // Keep confirmations received while this GET was in flight.
          const confirmed = new Set([
            ...this.completedLessonIds().filter(id => !completedBeforeLoad.has(id)),
            ...response.lessons.filter(item => item.status === 'completed').map(item => item.lessonId),
          ]);
          this.completedLessonIds.set(
            this.orderedLessons.filter(item => confirmed.has(item.lessonId)).map(item => item.lessonId),
          );
          this.pendingState.update(ids => ids.filter(id => !confirmed.has(id)));
          this.persistPending(user.id);
        }),
        switchMap(() => this.syncPending(user)),
        catchError(error => this.auth.user() === user ? throwError(() => error) : EMPTY),
      );
    });
  }


  /* =========================
     ID DE LA LECCIÓN ACTUAL
     ========================= */

  private readonly currentLessonId =
    computed<string | null>(() => {

      const completed =
        this.completedLessonIds();


      const firstPending =
        this.orderedLessons.find(
          lesson =>
            !completed.includes(
              lesson.lessonId
            )
        );


      return (
        firstPending?.lessonId ??
        null
      );
    });


  /* =========================
     ZONAS CON PROGRESO
     ========================= */

  readonly zoneProgress =
    computed<ZoneProgress[]>(() =>

      this.zones.map(
        zone =>
          this.buildZoneProgress(
            zone
          )
      )

    );


  /* =========================
     ZONA ACTUAL
     ========================= */

  readonly currentZone =
    computed<ZoneProgress | null>(() => {

      const zones =
        this.zoneProgress();


      /*
       * Primera zona que todavía
       * no ha sido completada.
       */
      return (
        zones.find(
          zone => !zone.completed
        ) ??
        zones.at(-1) ??
        null
      );
    });


  /* =========================
     LECCIÓN ACTUAL
     ========================= */

  readonly currentLesson =
    computed<LessonProgressItem | null>(() => {

      const lessonId =
        this.currentLessonId();


      if (!lessonId) {
        return null;
      }


      for (
        const zone of this.zoneProgress()
      ) {

        const lesson =
          zone.lessons.find(
            item =>
              item.lessonId ===
              lessonId
          );


        if (lesson) {
          return lesson;
        }

      }


      return null;
    });


  /* =========================
     OBJETIVO ACTUAL
     ========================= */

  readonly currentObjective =
    computed<string | null>(() =>

      this.currentLesson()?.objective ??
      null

    );


  /* =========================
     COMPLETAR LECCIÓN
     ========================= */

  completeLesson(
    lessonId: string
  ): Observable<void> {
    return defer(() => {
      const user = this.auth.user();
      this.activateUser(user);
      if (!user) return throwError(() => new Error('Se requiere una sesión para guardar el progreso.'));
      if (this.isLessonCompleted(lessonId)) return of(undefined);
      if (!this.isLessonAvailable(lessonId)) {
        return throwError(() => new Error(`Lección no disponible: ${lessonId}`));
      }

      // Persist before the request: reload or navigation must not lose the result.
      this.pendingState.update(ids => ids.includes(lessonId) ? ids : [...ids, lessonId]);
      this.persistPending(user.id);
      return this.sendCompletion(lessonId, user);
    });
  }

  private activateUser(user: AuthenticatedUser | null): void {
    if (user === this.activeUser) return;
    this.activeUser = user;
    this.reset();
    this.pendingState.set([]);
    this.syncingPendingState.set(false);
    this.pendingStorageAvailableState.set(true);
    if (user) this.restorePending(user.id);
  }

  completeOpenPitIntro(): Observable<void> {
    return defer(() => {
      const user = this.auth.user();
      this.activateUser(user);
      if (!user) return throwError(() => new Error('Se requiere una sesión para guardar la intro.'));
      if (this.introState() === true) return of(undefined);
      const key = `${user.id}:scenario:open-pit:intro`;
      const existing = this.saveRequests.get(key);
      if (existing?.user === user) return existing.request;

      const request = this.http.put<SaveScenarioIntroResponse>(
        `${this.authConfig.apiBaseUrl}/me/scenarios/open-pit/intro`,
        { completed: true },
        { withCredentials: true },
      ).pipe(
        timeout({ first: API_REQUEST_TIMEOUT_MS }),
        filter(() => this.auth.user() === user),
        map(response => {
          const scenario = response.scenario;
          if (scenario?.scenarioKey !== 'open-pit' || !scenario.introCompletedAt
            || !Number.isFinite(Date.parse(scenario.introCompletedAt))) {
            throw new Error('El servidor no confirmó la intro.');
          }
          this.introConfirmationVersion += 1;
          this.introState.set(true);
        }),
        catchError(error => this.auth.user() === user ? throwError(() => error) : EMPTY),
        finalize(() => {
          if (this.saveRequests.get(key)?.request === request) this.saveRequests.delete(key);
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
      this.saveRequests.set(key, { user, request });
      return request;
    });
  }

  private restorePending(userId: string): void {
    const stored = loadPendingProgress(userId, this.orderedLessons.map(item => item.lessonId));
    this.pendingState.update(ids => [...new Set([...ids, ...stored.lessonIds])]);
    this.pendingStorageAvailableState.set(stored.available);
    if (this.pendingState().length) this.persistPending(userId);
  }

  private persistPending(userId: string): void {
    this.pendingStorageAvailableState.set(savePendingProgress(userId, this.pendingState()));
  }

  private syncPending(user: AuthenticatedUser): Observable<void> {
    const pending = this.orderedLessons
      .filter(item => this.pendingState().includes(item.lessonId)).map(item => item.lessonId);
    if (!pending.length) return of(undefined);
    this.syncingPendingState.set(true);
    return from(pending).pipe(
      concatMap(id => {
        if (this.auth.user() !== user) return of(undefined);
        if (this.isLessonCompleted(id)) return of(undefined);
        if (!this.isLessonAvailable(id)) {
          return throwError(() => new Error('Faltan confirmar las lecciones anteriores.'));
        }
        return this.sendCompletion(id, user);
      }),
      reduce(() => undefined, undefined as void),
      filter(() => this.auth.user() === user),
      finalize(() => {
        if (this.auth.user() === user) this.syncingPendingState.set(false);
      }),
    );
  }

  private sendCompletion(lessonId: string, user: AuthenticatedUser): Observable<void> {
    const key = `${user.id}:${lessonId}`;
    const existing = this.saveRequests.get(key);
    if (existing?.user === user) return existing.request;

    const request = this.http.put<SaveLessonProgressResponse>(
      `${this.authConfig.apiBaseUrl}/me/progress/${lessonId}`,
      { status: 'completed', currentStep: 0 },
      { withCredentials: true },
    ).pipe(
      timeout({ first: API_REQUEST_TIMEOUT_MS }),
      filter(() => this.auth.user() === user),
      map(response => {
        if (response.progress.lessonId !== lessonId || response.progress.status !== 'completed') {
          throw new Error('El backend no confirmó la finalización de la lección.');
        }
        this.completedLessonIds.update(ids => ids.includes(lessonId) ? ids : [...ids, lessonId]);
        this.pendingState.update(ids => ids.filter(id => id !== lessonId));
        this.persistPending(user.id);
      }),
      catchError(error => this.auth.user() === user ? throwError(() => error) : EMPTY),
      finalize(() => {
        if (this.saveRequests.get(key)?.request === request) this.saveRequests.delete(key);
      }),
      // Keep a started save alive after the page closes, up to its deadline.
      // The durable pending record still protects against reload or timeout.
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.saveRequests.set(key, { user, request });
    return request;
  }


  /* =========================
     ¿ESTÁ COMPLETADA?
     ========================= */

  isLessonCompleted(
    lessonId: string
  ): boolean {

    return this.completedLessonIds()
      .includes(
        lessonId
      );
  }


  /* =========================
     ¿ESTÁ DISPONIBLE?
     ========================= */

  isLessonAvailable(
    lessonId: string
  ): boolean {

    const lessonIndex =
      this.orderedLessons.findIndex(
        lesson =>
          lesson.lessonId ===
          lessonId
      );


    /*
     * Lección desconocida.
     */
    if (lessonIndex === -1) {
      return false;
    }


    if (lessonIndex === 0) {
      return true;
    }


    const previousLesson =
      this.orderedLessons[
        lessonIndex - 1
      ];


    return previousLesson
      ? this.isLessonCompleted(
          previousLesson.lessonId
        )
      : false;
  }


  reset(): void {
    this.completedLessonIds.set([]);
    this.introState.set(null);
    this.introConfirmationVersion += 1;
  }


  /* =========================
     ¿ES LA LECCIÓN ACTUAL?
     ========================= */

  isCurrentLesson(
    lessonId: string
  ): boolean {

    return (
      this.currentLessonId() ===
      lessonId
    );
  }


  /* =========================
     CONSTRUIR PROGRESO
     ========================= */

  private buildZoneProgress(
    zone: ZoneDefinition
  ): ZoneProgress {

    const completed =
      this.completedLessonIds();


    const currentLessonId =
      this.currentLessonId();


    const lessons =
      zone.lessons.map(
        lesson => {

          const isCompleted =
            completed.includes(
              lesson.lessonId
            );


          const isCurrent =
            lesson.lessonId ===
            currentLessonId;


          return {
            ...lesson,

            status: isCompleted
              ? 'completed' as const
              : isCurrent
                ? 'current' as const
                : 'pending' as const
          };
        }
      );


    const completedLessons =
      lessons.filter(
        lesson =>
          lesson.status ===
          'completed'
      ).length;


    const totalLessons =
      lessons.length;


    return {
      id: zone.id,
      name: zone.name,
      topic: zone.topic,

      lessons,

      completedLessons,
      totalLessons,

      percentage:
        totalLessons === 0
          ? 0
          : Math.round(
              (
                completedLessons /
                totalLessons
              ) * 100
            ),

      completed:
        completedLessons ===
        totalLessons
    };
  }

}
