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


export type StoredLessonProgressStatus =
  | 'in_progress'
  | 'completed';


export type StoredLessonProgress = Readonly<{
  lessonId: string;
  status: StoredLessonProgressStatus;
  currentStep: number;
  startedAt: string;
  completedAt: string | null;
  updatedAt: string;
}>;


export type ProgressApiResponse = Readonly<{
  profileId: string;
  lessons: StoredLessonProgress[];
}>;


export type SaveLessonProgressResponse = Readonly<{
  progress: StoredLessonProgress;
}>;
