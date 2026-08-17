export type DialogueSpeaker = 'player' | 'npc';

export type DialogueMessage = {
  speaker: DialogueSpeaker;
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