export type LessonProgressStatus =
  | 'completed'
  | 'current'
  | 'pending';


export type LessonProgressItem = {
  lessonId: string;
  name: string;
  objective: string;

  status: LessonProgressStatus;
};


export type ZoneProgress = {
  id: string;
  name: string;
  topic: string;

  lessons: LessonProgressItem[];

  completedLessons: number;
  totalLessons: number;
  percentage: number;

  completed: boolean;
};