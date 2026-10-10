export type DialogueSpeaker = 'player' | 'npc';

export type DialogueCharacterId =
  | 'player'
  | 'loading-supervisor'
  | 'ramp-controller'
  | 'haulage-controller'
  | 'open-pit-guide'
  | 'npc-default';

export type DialogueExpression = 'neutral' | 'concerned' | 'happy';

export type DialogueMessageKind = 'context' | 'task' | 'finding' | 'reminder';

export type DialogueFact = Readonly<{
  label: string;
  value: string;
}>;

export type DialogueMessage = {
  speaker: DialogueSpeaker;
  characterId?: DialogueCharacterId;
  expression?: DialogueExpression;
  name: string;
  text: string;
  portrait?: string;
  /** Optional reading hierarchy; plain messages remain compatible. */
  kind?: DialogueMessageKind;
  facts?: readonly DialogueFact[];
};

export type DialogueData = {
  id: string;
  messages: DialogueMessage[];
  /** Completion copy only; navigation remains owned by the parent. */
  nextDestination?: string;
  completionLabel?: string;
};

export type DialogueRequest = {
  npcId?: string;
  dialogueId: string;
};
