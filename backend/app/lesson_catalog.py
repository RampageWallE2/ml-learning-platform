"""Server-side counterpart of the published frontend catalog.

These are completion records, not evidence of mathematical proficiency.
Future scenarios must be registered explicitly before accepting their progress.
"""

LESSON_IDS = tuple(f"lesson-{number:02d}" for number in range(1, 10))
MAX_CURRENT_STEP = 100  # Transport bound; not an assessment or a lesson step count.


def prerequisites(lesson_id: str) -> tuple[str, ...]:
    return LESSON_IDS[:LESSON_IDS.index(lesson_id)]
