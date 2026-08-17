import { computed, Injectable, signal } from '@angular/core';

import { ZoneProgress } from './progress.types';

type ZoneDefinition = {
    id: string;
    name: string; 
    topic: string;

    lessons: {
        lessonId: string;
        name: string;
    }[];
}

@Injectable({providedIn: 'root'})
export class ProgressService {
    private readonly zones:ZoneDefinition[] = [
        {
            id: 'zone-01',
            name: 'Zona 1', 
            topic: 'Dispersion',

            lessons: [
                {
                    lessonId: 'lesson-01',
                    name: 'El vivero'
                },
                {
                    lessonId: 'lesson-02',
                    name: 'La granja'
                },
                {
                    lessonId: 'lesson-03',
                    name: 'EL granero'
                },
                {
                    lessonId: 'lesson-04',
                    name: 'La plaza'
                },
            ]
        }
    ];
    private readonly  completedLessonIds = signal<string[]>([]);

    readonly currentZone = computed<ZoneProgress | null>(() => {
        const zones = this.zones.map( zone => 
            this.buildZoneProgress(zone)
        );

        return (
            zones.find(zone => !zone.completed) ??
            zones.at(-1) ??
            null
        )
    });

    completeLesson(lessonId: string): void{
        if(this.completedLessonIds().includes(lessonId)){
            return;
        }

        this.completedLessonIds.update(
            completed => [
                ...completed,
                lessonId
            ]
        );   
    }

    isLessonCompleted(lessonId:string): boolean {
        return this.completedLessonIds().includes(lessonId)
    }

    private buildZoneProgress(zone: ZoneDefinition) : ZoneProgress {
        const completed = this.completedLessonIds();

        const firstPending = zone.lessons.find(
            lesson => !completed.includes(
                lesson.lessonId
            )
        );
        const lessons = zone.lessons.map(lesson => {
            const isCompleted = completed.includes(lesson.lessonId);
            const isCurrent = firstPending?.lessonId;

            return {
                ...lesson,
                
                status : isCompleted
                    ? 'completed' as const 
                    : isCurrent
                        ? 'current' as const 
                        : 'pending' as const
            }
        });

        const completedLessons = lessons.filter(
            lesson => lesson.status === 'completed'
        ).length;

        const totalLessons = lessons.length;

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
                        completedLessons / totalLessons
                    ) * 100
                ),
            completed : completedLessons === totalLessons
        }
    }
}