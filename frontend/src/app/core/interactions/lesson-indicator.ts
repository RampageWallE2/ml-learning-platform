import { LessonProgressSnapshot } from '../../features/world/game/events/game-events';
import { LESSON_NAMES } from '../../features/world/lessons/lesson-catalog';

export type LessonIndicatorStatus = 'completed' | 'current' | 'pending';

export function getLessonLabel(lessonId: string): string {
  const match = /^lesson-(\d+)$/i.exec(lessonId);

  if (!match) {
    return 'CLASE';
  }

  return `CLASE ${Number(match[1])}`;
}

export function getLessonStatus(
  lessonId: string,
  progress: LessonProgressSnapshot,
): LessonIndicatorStatus {
  if (progress.completedLessonIds.includes(lessonId)) {
    return 'completed';
  }

  return progress.currentLessonId === lessonId
    ? 'current'
    : 'pending';
}

export function getLessonIndicatorCopy(
  lessonId: string,
  status: LessonIndicatorStatus,
): string {
  const label = getLessonLabel(lessonId);

  switch (status) {
    case 'completed':
      return `✓ ${label}`;

    case 'current':
      return `SIGUIENTE\n${label}\n▼`;

    default:
      return label;
  }
}

export function getLessonPromptContent(
  lessonId: string,
  status: LessonIndicatorStatus,
  touch = false,
) {
  return {
    label: getLessonLabel(lessonId),
    status: status === 'current' ? 'Siguiente' : status === 'completed' ? 'Completada' : '',
    topic: LESSON_NAMES[lessonId] ?? 'Actividad',
    action: `${touch ? 'Toca E' : '[E]'} · ${status === 'completed' ? 'Repetir' : 'Iniciar'}`,
  } as const;
}

export function getLessonInteractionCopy(
  lessonId: string,
  status: LessonIndicatorStatus,
): string {
  const content = getLessonPromptContent(lessonId, status);
  const state = content.status ? ` · ${content.status}` : '';
  const topic = LESSON_NAMES[lessonId] ? `\n${content.topic}` : '';
  return `${content.label}${state}${topic}\nPulsa E para ${status === 'completed' ? 'repetir' : 'iniciar'}`;
}
