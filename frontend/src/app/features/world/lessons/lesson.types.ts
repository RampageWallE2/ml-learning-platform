import { DialogueData } from "../components/dialogue/dialogue.types"; 

export type DialogueStep = {
  type: 'dialogue';
  dialogue: DialogueData;
};

export type ExerciseStep = {
  type: 'exercise';
  exerciseId: string;
};

export type LessonStep =
  | DialogueStep
  | ExerciseStep;

export type LessonDefinition = {
  id: string;
  steps: LessonStep[];
};