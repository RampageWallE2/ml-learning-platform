export type DialogueSpeaker = 'player' | 'npc';

export type DialogueCharacterId =
  | 'player'
  | 'loading-supervisor'
  | 'ramp-controller'
  | 'haulage-controller'
  | 'npc-default';

export type DialogueExpression =
  | 'neutral'
  | 'concerned'
  | 'happy';

export type DialogueMessage = {
  speaker: DialogueSpeaker;
  characterId?: DialogueCharacterId;
  expression?: DialogueExpression;
  name: string;
  text: string;
  portrait?: string;
};

export type DialogueData = {
  id: string;
  messages: DialogueMessage[];
};

export type DialogueRequest = {
  npcId: string;
  dialogueId: string;
};
