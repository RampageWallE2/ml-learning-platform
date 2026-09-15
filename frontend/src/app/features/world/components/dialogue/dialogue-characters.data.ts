import {
  DialogueCharacterId,
  DialogueExpression,
  DialogueMessage,
  DialogueSpeaker
} from './dialogue.types';

export type DialoguePortraitAsset = Readonly<{
  src: string;
  position: string;
  size: string;
  mobilePosition: string;
  mobileSize: string;
}>;

export type ResolvedDialoguePortrait = DialoguePortraitAsset & Readonly<{
  characterId: DialogueCharacterId | 'custom';
}>;

type DialogueCharacter = Readonly<{
  portraits: Partial<Record<DialogueExpression, DialoguePortraitAsset>> & {
    neutral: DialoguePortraitAsset;
  };
}>;

const SMALL_CHARACTER_PORTRAIT: Omit<DialoguePortraitAsset, 'src'> = {
  position: '-24px 0',
  size: '1152px 1152px',
  mobilePosition: '-9px 0',
  mobileSize: '576px 576px'
};

const POSTMAN_PORTRAIT: Omit<DialoguePortraitAsset, 'src'> = {
  position: '-488px -145px',
  size: '9270px 6560px',
  mobilePosition: '-297px -87px',
  mobileSize: '5562px 3936px'
};

export const DIALOGUE_CHARACTERS: Record<DialogueCharacterId, DialogueCharacter> = {
  player: {
    portraits: {
      neutral: {
        src: '/assets/game/characters/character2.png',
        ...SMALL_CHARACTER_PORTRAIT
      }
    }
  },
  'loading-supervisor': {
    portraits: {
      neutral: {
        src: '/assets/game/characters/character_postman_3.png',
        ...POSTMAN_PORTRAIT
      }
    }
  },
  'ramp-controller': {
    portraits: {
      neutral: {
        src: '/assets/game/characters/character_postman_1.png',
        ...POSTMAN_PORTRAIT
      }
    }
  },
  'haulage-controller': {
    portraits: {
      neutral: {
        src: '/assets/game/characters/character1.png',
        ...SMALL_CHARACTER_PORTRAIT
      }
    }
  },
  'npc-default': {
    portraits: {
      neutral: {
        src: '/assets/game/characters/character_postman_3.png',
        ...POSTMAN_PORTRAIT
      }
    }
  }
};

export function resolveDialoguePortrait(
  message: DialogueMessage | null,
  fallbackSpeaker: DialogueSpeaker
): ResolvedDialoguePortrait {
  if (message?.portrait) {
    return {
      characterId: 'custom',
      src: message.portrait,
      position: 'center',
      size: 'cover',
      mobilePosition: 'center',
      mobileSize: 'cover'
    };
  }

  const characterId = message?.characterId ?? (
    fallbackSpeaker === 'player' ? 'player' : 'npc-default'
  );
  const character = DIALOGUE_CHARACTERS[characterId];
  const portrait = character.portraits[message?.expression ?? 'neutral']
    ?? character.portraits.neutral;

  return { characterId, ...portrait };
}
