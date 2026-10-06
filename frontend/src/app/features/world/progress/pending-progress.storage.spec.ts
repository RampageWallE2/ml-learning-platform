import { loadPendingProgress, savePendingProgress } from './pending-progress.storage';

describe('Pending progress storage', () => {
  const known = ['lesson-01', 'lesson-02'];
  const key = 'exploralab.pending-progress.v1.student-a';
  let storage: Storage;

  beforeEach(() => {
    const values = new Map<string, string>();
    storage = {
      getItem: vi.fn(id => values.get(id) ?? null),
      setItem: vi.fn((id, value) => { values.set(id, value); }),
      removeItem: vi.fn(id => { values.delete(id); }),
    } as unknown as Storage;
  });

  it('stores only account and lesson identifiers and deduplicates completions', () => {
    expect(savePendingProgress('student-a', ['lesson-01', 'lesson-01'], storage)).toBe(true);
    expect(JSON.parse(storage.getItem(key)!)).toEqual({
      version: 1, userId: 'student-a', lessonIds: ['lesson-01'],
    });
    expect(loadPendingProgress('student-a', known, storage)).toEqual({ lessonIds: ['lesson-01'], available: true });
  });

  it('keeps accounts independent and removes only the confirmed account record', () => {
    savePendingProgress('student-a', ['lesson-01'], storage);
    savePendingProgress('student-b', ['lesson-02'], storage);
    savePendingProgress('student-a', [], storage);
    expect(loadPendingProgress('student-a', known, storage).lessonIds).toEqual([]);
    expect(loadPendingProgress('student-b', known, storage).lessonIds).toEqual(['lesson-02']);
  });

  it('ignores unknown lesson ids and duplicate entries when restoring', () => {
    storage.setItem(key, JSON.stringify({ version: 1, userId: 'student-a',
      lessonIds: ['removed-lesson', 'lesson-02', 'lesson-02'] }));
    expect(loadPendingProgress('student-a', known, storage).lessonIds).toEqual(['lesson-02']);
  });

  it.each([
    { version: 2, userId: 'student-a', lessonIds: ['lesson-01'] },
    { version: 1, userId: 'student-b', lessonIds: ['lesson-01'] },
    { version: 1, userId: 'student-a', lessonIds: [1] },
    null,
  ])('rejects malformed or mismatched snapshots: %j', value => {
    storage.setItem(key, JSON.stringify(value));
    expect(loadPendingProgress('student-a', known, storage).lessonIds).toEqual([]);
    expect(storage.getItem(key)).toBeNull();
  });

  it('survives invalid JSON without preventing server recovery', () => {
    storage.setItem(key, '{invalid');
    expect(loadPendingProgress('student-a', known, storage).lessonIds).toEqual([]);
    expect(storage.getItem(key)).toBeNull();
  });

  it('reports unavailable storage instead of claiming recovery is guaranteed', () => {
    expect(savePendingProgress('student-a', ['lesson-01'], null)).toBe(false);
    expect(loadPendingProgress('student-a', known, null).available).toBe(false);
    vi.mocked(storage.setItem).mockImplementation(() => { throw new Error('Quota exceeded'); });
    expect(savePendingProgress('student-a', ['lesson-01'], storage)).toBe(false);
    vi.mocked(storage.getItem).mockImplementation(() => { throw new Error('Storage blocked'); });
    expect(loadPendingProgress('student-a', known, storage)).toEqual({ lessonIds: [], available: false });
  });
});
