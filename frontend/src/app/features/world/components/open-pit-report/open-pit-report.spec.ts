import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LESSON_NAMES } from '../../lessons/lesson-catalog';
import { C4_WORKSHOP_RECORDS, C5_CRUSHING_RECORDS, C6_SAG_RECORDS, C7_BALLS_RECORDS, C9_THICKENERS_RECORDS } from '../../lessons/data/open-pit-original-records';
import { C8_ORIGINAL } from '../../lessons/lesson-08-flotation/lesson-08-flotation.state';
import { OpenPitReport } from './open-pit-report';
import { OPEN_PIT_REPORT_NOTES } from './open-pit-report.data';

describe('OpenPitReport — original investigation notes', () => {
  let fixture: ComponentFixture<OpenPitReport>;
  let root: HTMLElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(OpenPitReport);
    fixture.detectChanges();
    root = fixture.nativeElement;
  });

  function confirm(ids: string[]) {
    fixture.componentRef.setInput('confirmedLessonIds', ids);
    fixture.detectChanges();
  }

  function select(index: number) {
    const control = root.querySelector<HTMLSelectElement>('.report-select')!;
    control.value = OPEN_PIT_REPORT_NOTES[index].lessonId;
    control.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
  }

  it('shows pending states without revealing findings, records or graphs', () => {
    expect(root.querySelectorAll('.report-select')).toHaveLength(1);
    expect(root.querySelectorAll('.report-select option')).toHaveLength(9);
    for (let index = 0; index < 9; index++) {
      select(index);
      expect(root.querySelector('.report-finding')).toBeNull();
      expect(root.querySelector('svg')).toBeNull();
      expect(root.querySelector('.report-records')).toBeNull();
      expect(root.querySelector('.report-empty')?.textContent).toContain('cuando completes la clase');
    }
    expect(root.querySelectorAll('.report-note')).toHaveLength(1);
    expect(root.querySelector<HTMLSelectElement>('.report-select')?.value).toBe('lesson-09');
    OPEN_PIT_REPORT_NOTES.forEach((note, index) => {
      expect(root.querySelectorAll('option')[index].textContent).toBe(`C${note.number} · ${note.title} · Pendiente`);
    });
    expect(root.querySelector('label')?.textContent).toContain('Consultar clase');
  });

  it('uses C1 originals on a shared scale without introducing a mean or practice values', () => {
    confirm(['lesson-01']);
    expect(root.querySelector('h2')?.textContent).toContain(LESSON_NAMES['lesson-01']);
    expect(root.querySelectorAll('circle')).toHaveLength(10);
    expect(root.querySelector('.report-mean')).toBeNull();
    expect(root.querySelector('.report-records')?.textContent).toContain('98, 102, 100, 101, 99');
    expect(root.querySelector('.report-records')?.textContent).toContain('82, 116, 95, 111, 96');
    expect(root.querySelector('svg')?.getAttribute('aria-label')).toContain('de 80 a 120 toneladas');
    expect(root.textContent).not.toContain('Grupo C');
    expect(root.textContent).not.toContain('Grupo D');
    expect(fixture.componentInstance.loadPosition(80)).toBe(72);
    expect(fixture.componentInstance.loadPosition(120)).toBe(380);
  });

  it('uses C2 truck records and the same 100-tonne mean for both turns', () => {
    confirm(['lesson-01', 'lesson-02']);
    const graph = fixture.componentInstance.loadGraph()!;
    expect(graph.series.map(series => series.values.reduce((sum, value) => sum + value, 0) / series.values.length)).toEqual([100, 100]);
    expect(root.querySelectorAll('circle')).toHaveLength(10);
    expect(root.querySelector('.report-records')?.textContent).toContain('98, 101, 100, 99, 102');
    expect(root.querySelector('.report-records')?.textContent).toContain('80, 120, 90, 110, 100');
    expect(root.querySelector('.report-mean')?.getAttribute('x1')).toBe('226');
    expect(root.querySelector('.report-finding')?.textContent).toContain('100 toneladas por camión');
    select(2);
    expect(root.querySelector('svg')).toBeNull();
  });

  it('preserves C3 repeated times and describes only the observed seven-minute range', () => {
    confirm(['lesson-03']);
    expect(root.querySelector('h2')?.textContent).toContain(LESSON_NAMES['lesson-03']);
    expect(root.querySelectorAll('circle')).toHaveLength(5);
    expect(fixture.componentInstance.rangeGraph()).toEqual({ kind: 'range', values: [11, 12, 11, 18, 12], min: 11, max: 18, range: 7 });
    const points = fixture.componentInstance.rangePoints();
    expect(points[0].x).toBe(points[2].x);
    expect(points[0].y).not.toBe(points[2].y);
    expect(points[1].x).toBe(points[4].x);
    expect(points[1].y).not.toBe(points[4].y);
    expect(root.querySelector('.report-range-label')?.textContent).toBe('7 min de diferencia');
    expect(root.querySelector('.report-reminder')?.textContent).toContain('Las próximas descargas pueden durar distinto');
  });

  it('uses C4 originals on a common time scale and stacks all three ten-minute reviews in A', () => {
    confirm(['lesson-04']);
    const graph = fixture.componentInstance.workshopGraph()!;
    expect(graph.series.map(series => series.range)).toEqual([4, 4]);
    graph.series.forEach((series, index) => expect(series.values).toBe(C4_WORKSHOP_RECORDS[index].values));
    expect(root.querySelectorAll('circle')).toHaveLength(10);
    const plots = fixture.componentInstance.workshopPlots();
    expect(plots[0].points.slice(1, 4).map(point => point.x)).toEqual([230, 230, 230]);
    expect(new Set(plots[0].points.slice(1, 4).map(point => point.y)).size).toBe(3);
    expect(plots[0].points[0].x).toBe(plots[1].points[0].x);
    expect(root.querySelector('svg')?.getAttribute('aria-label')).toContain('Escala común de 8 a 12 minutos');
    expect(root.querySelector('.report-finding')?.textContent).toContain('3 revisiones de 10 minutos y en B, 1');
    expect(root.querySelector('.report-records')?.textContent).toContain('8, 10, 10, 10, 12');
    expect(root.querySelector('.report-records')?.textContent).toContain('8, 8, 10, 12, 12');
    expect(root.textContent).not.toContain('Equipo C');
    expect(root.textContent).not.toContain('Copia de A');
  });

  it('shows the four original C5 hours and equal separations on opposite sides of the mean', () => {
    confirm(['lesson-05']);
    const graph = fixture.componentInstance.deviationGraph()!;
    expect(graph.values).toBe(C5_CRUSHING_RECORDS); expect(graph.mean).toBe(100);
    expect(root.querySelectorAll('circle')).toHaveLength(4);
    expect(root.querySelector('.report-mean')?.getAttribute('x1')).toBe('200');
    const points = fixture.componentInstance.deviationPoints();
    expect(points.map(point => point.x)).toEqual([32, 32, 368, 368]);
    expect(points.map(point => point.y)).toEqual([48, 32, 48, 32]);
    expect(200 - points[0].x).toBe(points[2].x - 200);
    expect(root.querySelectorAll('.report-range')).toHaveLength(2);
    expect(root.textContent).toContain('20 t/h debajo'); expect(root.textContent).toContain('20 t/h encima');
    expect(root.querySelector('.report-reminder')?.textContent).toContain('ni una meta de producción');
    expect(root.querySelector('.report-reminder')?.textContent).toContain('no demuestran una falla');
    expect(root.querySelector('.report-figure')?.textContent).toContain('80, 80, 120, 120');
  });

  it('uses every original C6 record, including zeros, to show eight cells divided by four', () => {
    confirm(['lesson-06']);
    const graph = fixture.componentInstance.varianceGraph()!;
    expect(graph.values).toBe(C6_SAG_RECORDS);
    expect(graph.mean).toBe(100); expect(graph.squares).toEqual([4, 0, 0, 4]);
    expect(graph.sum).toBe(8); expect(graph.variance).toBe(2);
    expect(fixture.componentInstance.varianceRecords().map(record => record.cells.length)).toEqual([4, 0, 0, 4]);
    expect(root.querySelectorAll('rect')).toHaveLength(8);
    expect(root.querySelectorAll('.report-zero')).toHaveLength(2);
    expect(root.querySelector('.report-calculation')?.textContent).toBe('8 ÷ 4 registros = 2 (t/h)²');
    expect(root.querySelector('.report-figure')?.textContent).toContain('4 + 0 + 0 + 4 = 8');
    expect(root.querySelector('.report-reminder')?.textContent).toContain('no significa una separación de 2 t/h');
    expect(root.querySelector('svg')?.getAttribute('aria-label')).toContain('Los dos registros que aportan cero también se cuentan');
    expect(root.querySelector('.report-figure')?.textContent).toContain('no toneladas de material');
  });

  it('compares C7 originals, equal means and ranges without treating lower variance as better', () => {
    confirm(['lesson-07']);
    const graph = fixture.componentInstance.comparisonGraph()!;
    expect(graph.kind).toBe('variance-comparison'); expect(graph.goal).toBeNull();
    graph.series.forEach((series, index) => expect(series.values).toBe(C7_BALLS_RECORDS[index]));
    expect(graph.series.map(series => [series.mean, series.range, series.squareSum, series.variance])).toEqual([[100, 6, 18, 3], [100, 6, 36, 6]]);
    expect(root.querySelectorAll('circle')).toHaveLength(12);
    const [a, b] = fixture.componentInstance.comparisonPlots();
    expect(a.points.slice(1, 5).map(point => point.x)).toEqual([230, 230, 230, 230]);
    expect(new Set(a.points.slice(1, 5).map(point => point.y)).size).toBe(4);
    expect(a.points[0].x).toBe(b.points[0].x); expect(a.points[5].x).toBe(b.points[5].x);
    expect(root.querySelector('.report-calculation')?.textContent).toBe('Varianza: A = 3 · B = 6 (t/h)²');
    expect(root.querySelector('.report-records')?.textContent).toContain('18 ÷ 6 registros = 3 (t/h)²');
    expect(root.querySelector('.report-records')?.textContent).toContain('36 ÷ 6 registros = 6 (t/h)²');
    expect(root.querySelector('.report-reminder')?.textContent).toContain('no demuestra que A trabajó mejor');
    expect(root.querySelector('svg')?.getAttribute('aria-label')).toContain('Escala común de 97 a 103 t/h');
  });

  it('shows C8 original hours, converts the variance back to t/h and includes both band boundaries', () => {
    confirm(['lesson-08']);
    const graph = fixture.componentInstance.standardDeviationGraph()!;
    expect(graph.values).toBe(C8_ORIGINAL);
    expect([graph.mean, graph.variance, graph.standardDeviation, graph.lower, graph.upper]).toEqual([100, 4, 2, 98, 102]);
    expect(root.querySelectorAll('circle')).toHaveLength(6);
    expect(root.querySelectorAll('.report-point--outside')).toHaveLength(1);
    const points = fixture.componentInstance.standardDeviationPoints();
    expect(points.map(point => point.outside)).toEqual([true, false, false, false, false, false]);
    expect(new Set(points.slice(1, 4).map(point => point.y)).size).toBe(3);
    expect(new Set(points.slice(4).map(point => point.y)).size).toBe(2);
    expect(root.querySelector('.report-band')?.getAttribute('x')).toBe('144');
    expect(root.querySelector('.report-band')?.getAttribute('width')).toBe('224');
    expect(fixture.componentInstance.standardDeviationPosition(98)).toBe(144);
    expect(root.querySelector('.report-calculation')?.textContent).toContain('√4 = 2 → 2 t/h');
    expect(root.querySelector('.report-reminder')?.textContent).toContain('no es un límite de seguridad');
    expect(root.querySelector('svg')?.getAttribute('aria-label')).toContain('incluyendo los extremos; 96 está fuera');
    expect(root.querySelector('.report-figure')?.textContent).toContain('96, 100, 100, 100, 102, 102');
    expect(root.querySelector('.report-figure')?.textContent).not.toContain('98, 98, 98, 102, 102, 102');
  });

  it('uses C9 original evidence and the mean goal, not the equal-goal transfer case', () => {
    confirm(['lesson-09']);
    const graph = fixture.componentInstance.comparisonGraph()!;
    expect(graph.kind).toBe('goal-comparison'); expect(graph.goal).toBe(100);
    expect(graph.series[0].values).toBe(C9_THICKENERS_RECORDS.A);
    expect(graph.series[1].values).toBe(C9_THICKENERS_RECORDS.B);
    expect(graph.series.map(series => [series.mean, series.variance, series.standardDeviation])).toEqual([[80, 0, 0], [100, 4, 2]]);
    const [a, b] = fixture.componentInstance.comparisonPlots();
    expect(root.querySelectorAll('circle')).toHaveLength(12);
    expect(a.points.map(point => point.x)).toEqual([84, 84, 84, 84, 84, 84]);
    expect(new Set(a.points.map(point => point.y)).size).toBe(6);
    expect(Math.min(...a.points.map(point => point.y))).toBe(24);
    expect(new Set(b.points.slice(0, 3).map(point => point.y)).size).toBe(3);
    expect(root.querySelector('.report-mean')?.getAttribute('x1')).toBe(String(fixture.componentInstance.comparisonPosition(100)));
    expect(root.querySelectorAll('.report-stat')).toHaveLength(2);
    expect(root.querySelector('.report-finding')?.textContent).toContain('B alcanzó la meta de promedio');
    expect(root.querySelector('.report-reminder')?.textContent).toContain('Usar B como referencia y revisar qué ocurrió en A');
    expect(root.querySelector('.report-reminder')?.textContent).toContain('Antes de cambiar ajustes');
    expect(root.querySelector('.report-figure')?.textContent).toContain('La meta es del promedio, no de cada registro');
    expect(root.querySelector('.report-records')?.textContent).not.toContain('99, 99, 99, 101, 101, 101');
    expect(root.querySelector('svg')?.getAttribute('aria-label')).toContain('Escala común de 80 a 110 t/h');
  });

  it.each([3, 4, 5, 6, 7, 8])('hides an unconfirmed new note at index %s, even if another note is confirmed', index => {
    const id = OPEN_PIT_REPORT_NOTES[index].lessonId;
    confirm(['lesson-01']); fixture.componentRef.setInput('pendingLessonIds', [id]); select(index);
    expect(root.querySelector('.report-empty')?.textContent).toContain('no necesitas repetirla');
    expect(root.querySelector('.report-finding')).toBeNull(); expect(root.querySelector('svg')).toBeNull();
    expect(root.querySelector('.report-calculation')).toBeNull();
    expect(fixture.componentInstance.graphDescription()).toBe('');
    confirm(['lesson-01', id]);
    expect(root.querySelector('.report-finding')).not.toBeNull(); expect(root.querySelector('svg')).not.toBeNull();
  });

  it('defaults to the latest confirmed note, not a later pending class, without changing data', () => {
    const originals = [C4_WORKSHOP_RECORDS, C5_CRUSHING_RECORDS, C6_SAG_RECORDS];
    const before = JSON.stringify(originals);
    confirm(['lesson-06', 'lesson-04', 'lesson-05']);
    expect(fixture.componentInstance.selectedLessonId()).toBe('lesson-06');
    expect(root.querySelector('h2')?.textContent).toContain(LESSON_NAMES['lesson-06']);
    select(3); select(4); select(5);
    expect(root.querySelectorAll('.report-note')).toHaveLength(1);
    expect(root.querySelectorAll('.report-finding')).toHaveLength(1);
    expect(root.querySelectorAll('.report-select option')).toHaveLength(9);
    expect(JSON.stringify(originals)).toBe(before);
  });

  it('opens the latest available note but preserves an explicit selection as progress changes', () => {
    confirm(['lesson-01', 'lesson-02']);
    expect(fixture.componentInstance.selectedLessonId()).toBe('lesson-02');
    select(0); confirm(['lesson-01', 'lesson-02', 'lesson-03']);
    expect(fixture.componentInstance.selectedLessonId()).toBe('lesson-01');
    expect(root.querySelectorAll('.report-finding')).toHaveLength(1);
  });

  it('does not treat an unconfirmed local completion as an available note', () => {
    fixture.componentRef.setInput('pendingLessonIds', ['lesson-01']); fixture.detectChanges();
    expect(root.querySelector('.report-empty')?.textContent).toContain('no necesitas repetirla');
    expect(root.querySelector('.report-selection-status')?.textContent).toContain('Pendiente de guardar');
    expect(root.querySelector('svg')).toBeNull();
    confirm(['lesson-01']);
    expect(root.querySelector('.report-finding')).not.toBeNull();
    expect(root.querySelector('.report-selection-status')?.textContent).toContain('Nota disponible');
  });

  it('hides all conclusions while confirmed progress is being consulted', () => {
    confirm(OPEN_PIT_REPORT_NOTES.map(note => note.lessonId));
    fixture.componentRef.setInput('loadingProgress', true); fixture.detectChanges();
    for (let index = 0; index < 9; index++) {
      select(index);
      expect(root.querySelector('.report-finding')).toBeNull();
      expect(root.querySelector('svg')).toBeNull();
      expect(root.querySelector('.report-empty')?.textContent).toContain('Consultando tu progreso');
    }
    fixture.componentRef.setInput('loadingProgress', false); fixture.detectChanges();
    expect(root.querySelectorAll('circle')).toHaveLength(12);
    expect(fixture.componentInstance.selectedLessonId()).toBe('lesson-09');
  });

  it('opens C9 for a completed route and safely ignores invalid selector events', () => {
    const originals = [C7_BALLS_RECORDS, C8_ORIGINAL, C9_THICKENERS_RECORDS];
    const before = JSON.stringify(originals);
    confirm(OPEN_PIT_REPORT_NOTES.map(note => note.lessonId));
    expect(root.querySelector<HTMLSelectElement>('.report-select')?.value).toBe('lesson-09');
    const control = root.querySelector<HTMLSelectElement>('.report-select')!;
    control.value = 'unknown'; control.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.componentInstance.onLessonChange(new Event('change'));
    expect(fixture.componentInstance.selectedLessonId()).toBe('lesson-09');
    select(6); select(7); select(8);
    expect(root.querySelectorAll('.report-note')).toHaveLength(1);
    expect(root.querySelectorAll('svg')).toHaveLength(1);
    expect(JSON.stringify(originals)).toBe(before);
  });

  it('selects the latest note when confirmed progress is present before the first render', () => {
    const initial = TestBed.createComponent(OpenPitReport);
    initial.componentRef.setInput('confirmedLessonIds', ['lesson-07', 'lesson-08', 'lesson-09']);
    initial.detectChanges();
    const initialRoot: HTMLElement = initial.nativeElement;
    expect(initialRoot.querySelector<HTMLSelectElement>('.report-select')?.value).toBe('lesson-09');
    expect(initialRoot.querySelector('h2')?.textContent).toContain('C9');
    initial.destroy();
  });

  it('closes with a native button without changing data or completing a class', () => {
    const ids = ['lesson-01']; const before = JSON.stringify(OPEN_PIT_REPORT_NOTES);
    confirm(ids); select(2); select(0);
    const closed = vi.fn(); fixture.componentInstance.closed.subscribe(closed);
    const button = root.querySelector<HTMLButtonElement>('.report-footer button')!;
    expect(button.type).toBe('button'); button.click();
    expect(closed).toHaveBeenCalledOnce();
    expect(ids).toEqual(['lesson-01']);
    expect(JSON.stringify(OPEN_PIT_REPORT_NOTES)).toBe(before);
  });
});
