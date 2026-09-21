import {
  computed,
  Injectable,
  inject,
  signal
} from '@angular/core';

import {
  HttpClient
} from '@angular/common/http';

import {
  Observable,
  map,
  of,
  throwError
} from 'rxjs';

import {
  AUTH_CONFIG
} from '../../../core/auth/auth.config';

import {
  LessonProgressItem,
  ProgressApiResponse,
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

  /* =========================
     DEFINICIÓN DEL RECORRIDO
     ========================= */

  private readonly zones: ZoneDefinition[] = [

    /* =========================
       ZONA 1
       ========================= */

    {
      id: 'zone-01',
      name: 'Open Pit',
      topic: 'Dispersión',

      lessons: [
        {
          lessonId: 'lesson-01',
          name: 'Carguío en el fondo del tajo',
          objective:
            'Ve al fondo del tajo y habla con el encargado del carguío.'
        },
        {
          lessonId: 'lesson-02',
          name: 'Control de turnos en la rampa',
          objective:
            'Ve a la rampa y habla con el encargado del control.'
        },
        {
          lessonId: 'lesson-03',
          name: 'Puesto de control de acarreo',
          objective:
            'Sigue la ruta hacia ROM/chancado y habla con el encargado del acarreo.'
        }
      ]
    },


    /* =========================
       ZONA 2
       ========================= */

    {
      id: 'zone-02',
      name: 'Zona 2',
      topic: 'Medición de la variabilidad',

      lessons: [
        {
          lessonId: 'lesson-05',
          name: 'Patio de Inspección',
          objective:
            'Ve al Patio de Inspección y habla con el encargado.'
        },
        {
          lessonId: 'lesson-06',
          name: 'Estación Técnica',
          objective:
            'Ve a la Estación Técnica y habla con el encargado.'
        },
        {
          lessonId: 'lesson-07',
          name: 'Taller',
          objective:
            'Ve al Taller y habla con el encargado.'
        },
        {
          lessonId: 'lesson-08',
          name: 'Centro de Control',
          objective:
            'Ve al Centro de Control y habla con el encargado.'
        }
      ]
    }

  ];


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


  /* =========================
     CARGAR PROGRESO
     ========================= */

  loadProgress(): Observable<void> {

    return this.http.get<ProgressApiResponse>(
      `${this.authConfig.apiBaseUrl}/me/progress`,
      {
        withCredentials: true
      }
    ).pipe(
      map(response => {

        const completedFromApi =
          new Set(
            response.lessons
              .filter(
                lesson =>
                  lesson.status ===
                  'completed'
              )
              .map(
                lesson =>
                  lesson.lessonId
              )
          );


        const registeredCompleted =
          this.orderedLessons
            .filter(
              lesson =>
                completedFromApi.has(
                  lesson.lessonId
                )
            )
            .map(
              lesson =>
                lesson.lessonId
            );


        this.completedLessonIds.set(
          registeredCompleted
        );
      })
    );
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

    /*
     * Si ya está completada,
     * no hacemos nada.
     */
    if (
      this.isLessonCompleted(
        lessonId
      )
    ) {
      return of(undefined);
    }


    /*
     * Impide completar una
     * lección futura.
     */
    if (
      !this.isLessonAvailable(
        lessonId
      )
    ) {
      return throwError(
        () =>
          new Error(
            `Lección desconocida: ${lessonId}`
          )
      );
    }


    return this.http.put<SaveLessonProgressResponse>(
      `${this.authConfig.apiBaseUrl}/me/progress/${lessonId}`,
      {
        status: 'completed',
        currentStep: 0
      },
      {
        withCredentials: true
      }
    ).pipe(
      map(response => {

        if (
          response.progress.status !==
          'completed'
        ) {
          throw new Error(
            'El backend no confirmó la finalización de la lección.'
          );
        }


        this.completedLessonIds.update(
          completed =>
            completed.includes(
              lessonId
            )
              ? completed
              : [
                  ...completed,
                  lessonId
                ]
        );
      })
    );
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


    /*
     * Durante el desarrollo todas las lecciones registradas
     * permanecen disponibles para facilitar las pruebas.
     * El objetivo actual conserva el orden pedagógico normal.
     */
    return true;
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
