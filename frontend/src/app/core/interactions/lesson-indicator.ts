import { LessonProgressSnapshot } from '../../features/world/game/events/game-events';

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

export function getLessonInteractionCopy(
  lessonId: string,
  status: LessonIndicatorStatus,
): string {
  const label = getLessonLabel(lessonId);

  if (status === 'current') {
    return `${label} · Siguiente\nPulsa E para iniciar`;
  }

  if (status === 'completed') {
    return `${label} · Completada\nPulsa E para repetir`;
  }

  return `${label}\nPulsa E para iniciar`;
}
