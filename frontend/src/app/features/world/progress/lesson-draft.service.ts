import { inject, Injectable } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { AuthenticatedUser } from '../../../core/auth/auth.types';
import { C6Draft, C6DraftContent, clearLessonDraft, DraftContentFor, DraftFor, DraftLessonId, DraftReadResult,
  isDraftLessonId, loadLessonDraft, saveLessonDraft } from './lesson-draft.storage';

@Injectable({ providedIn: 'root' })
export class LessonDraftService {
  private readonly auth = inject(AuthService);

  currentUser(): AuthenticatedUser | null { return this.auth.user(); }

  load(owner: AuthenticatedUser, lessonId?: 'lesson-06'): DraftReadResult<C6Draft>;
  load<Id extends DraftLessonId>(owner: AuthenticatedUser, lessonId: Id): DraftReadResult<DraftFor<Id>>;
  load(owner: AuthenticatedUser, lessonId: DraftLessonId = 'lesson-06'): DraftReadResult<DraftFor<DraftLessonId>> {
    return this.currentUser() === owner ? loadLessonDraft(owner.id, lessonId)
      : { draft: null, available: false, discarded: false };
  }

  save(owner: AuthenticatedUser, content: C6DraftContent, lessonId?: 'lesson-06'): boolean;
  save<Id extends DraftLessonId>(owner: AuthenticatedUser, content: DraftContentFor<Id>, lessonId: Id): boolean;
  save(owner: AuthenticatedUser, content: DraftContentFor<DraftLessonId>, lessonId: DraftLessonId = 'lesson-06'): boolean {
    return this.currentUser() === owner && saveLessonDraft(owner.id, lessonId, content);
  }

  clearConfirmed(lessonId: string, owner: AuthenticatedUser | null): void {
    if (isDraftLessonId(lessonId) && owner && this.currentUser() === owner) clearLessonDraft(owner.id, lessonId);
  }
}
