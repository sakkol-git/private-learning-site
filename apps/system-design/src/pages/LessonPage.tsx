import type { BreakAction, Metrics } from '@ss/diagram-engine';
import { keyToCommand, type Lesson } from '@ss/lesson-engine';
import {
  Button,
  Card,
  Checklist,
  Chip,
  DiagramStage,
  MetricsStrip,
  StepCard,
  Stepper,
  type DiagramStageHandle,
} from '@ss/ui';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { SITE_NAME } from '../config';
import { useProgress } from '../hooks/useProgress';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { t } from '../i18n';
import { loadLesson, placeOf, type LessonPlace } from '../lessons';
import styles from './LessonPage.module.css';

export function LessonPage() {
  const { slug = '', step = '1' } = useParams();
  const place = placeOf(slug);
  const [loaded, setLoaded] = useState<Lesson | null>(null);
  const lesson = loaded?.slug === slug ? loaded : null;

  useEffect(() => {
    let live = true;
    loadLesson(slug)?.then((l) => {
      if (live) setLoaded(l);
    });
    return () => {
      live = false;
    };
  }, [slug]);

  if (!place) return <p className={styles.status}>{t('lesson.notFound')}</p>;
  if (!lesson) return <p className={styles.status}>{t('lesson.loading')}</p>;
  const index = Number.parseInt(step, 10) - 1;
  if (!Number.isInteger(index) || index < 0 || index >= lesson.steps.length) {
    return <Navigate to={`/lesson/${slug}/1`} replace />;
  }
  return <LessonView key={lesson.slug} lesson={lesson} place={place} index={index} />;
}

const LEVEL_KEY = {
  beginner: 'lesson.level.beginner',
  intermediate: 'lesson.level.intermediate',
  advanced: 'lesson.level.advanced',
} as const;

function LessonView({
  lesson,
  place,
  index,
}: {
  lesson: Lesson;
  place: LessonPlace;
  index: number;
}) {
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const { progress, record } = useProgress();
  const stageRef = useRef<DiagramStageHandle>(null);
  const panelRef = useRef<HTMLElement>(null);
  const [metrics, setMetrics] = useState<Metrics>(lesson.initial.metrics);
  const [playing, setPlaying] = useState(true);
  const [broken, setBroken] = useState<{ action: BreakAction; step: number } | null>(null);
  const activeBreak = broken?.step === index ? broken.action : null;
  const [fullscreen, setFullscreen] = useState(false);

  const step = lesson.steps[index] ?? lesson.steps[0];
  const count = lesson.steps.length;
  const diagram = useMemo(
    () => ({ initial: lesson.initial, changes: lesson.steps.map((s) => s.change) }),
    [lesson],
  );

  // The step we are heading to. navigate() updates the URL before React re-renders,
  // so quick repeated key presses must build on this rather than on `index`.
  const targetRef = useRef(index);
  useEffect(() => {
    targetRef.current = index;
  }, [index]);

  const goTo = useCallback(
    (i: number) => {
      if (i < 0) return;
      if (i >= count) {
        navigate(place.next ? `/lesson/${place.next.slug}/1` : '/');
        return;
      }
      targetRef.current = i;
      navigate(`/lesson/${lesson.slug}/${i + 1}`);
    },
    [count, lesson.slug, navigate, place.next],
  );

  useEffect(() => {
    record(lesson.slug, index, count);
    document.title = `${lesson.steps[index]?.title ?? lesson.title} · ${lesson.title} · ${SITE_NAME}`;
  }, [lesson, index, count, record]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const command = keyToCommand(e);
      if (!command) return;
      e.preventDefault();
      if (command === 'next') goTo(targetRef.current + 1);
      if (command === 'prev') goTo(targetRef.current - 1);
      if (command === 'replay') {
        setBroken(null);
        stageRef.current?.replay();
      }
      if (command === 'togglePause') setPlaying((p) => !p);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goTo]);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === panelRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  if (!step) return null;
  const furthest = Math.max(progress.lessons[lesson.slug]?.furthest ?? 0, index);
  const stepIndexById = new Map(lesson.steps.map((s, i) => [s.id, i]));
  const nextStep = lesson.steps[index + 1];

  const onBreak = (action: BreakAction) => {
    if (stageRef.current?.break(action)) {
      setBroken({ action, step: index });
      setPlaying(true);
    }
  };
  const onReset = () => {
    stageRef.current?.reset();
    setBroken(null);
  };
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void panelRef.current?.requestFullscreen();
  };

  return (
    <div className={styles.layout}>
      <div className={styles.main}>
        <section ref={panelRef} className={styles.panel} aria-labelledby="lesson-title">
          <p className={styles.crumb}>
            {t('lesson.breadcrumb', {
              chapterNo: String(place.chapterNo).padStart(2, '0'),
              chapter: lesson.chapter,
              n: place.lessonNo,
              total: place.total,
            })}
          </p>
          <div className={styles.titleRow}>
            <h1 id="lesson-title" className={styles.title}>
              {lesson.title}
            </h1>
            <div className={styles.chips}>
              <Chip>{t('lesson.minutes', { n: lesson.minutes })}</Chip>
              <Chip>{t(LEVEL_KEY[lesson.level])}</Chip>
              <Chip>{t('lesson.steps', { n: count })}</Chip>
            </div>
          </div>
          <p className={styles.summary}>{lesson.summary}</p>
          <MetricsStrip
            metrics={metrics}
            labels={{
              users: t('metrics.users'),
              requestsPerSec: t('metrics.rps'),
              p95: t('metrics.p95'),
              errorRate: t('metrics.errors'),
              healthy: t('metrics.healthy'),
              ms: t('metrics.ms'),
            }}
          />
          <DiagramStage
            ref={stageRef}
            diagram={diagram}
            step={index}
            playing={playing}
            reducedMotion={reducedMotion}
            onMetrics={setMetrics}
            label={t('lesson.diagram')}
          />
          <div className={styles.legendRow}>
            <ul className={styles.legend} aria-label={t('lesson.legend')}>
              <li>
                <span className={`${styles.swatch} ${styles.request}`} aria-hidden="true" />
                {t('lesson.legendRequest')}
              </li>
              <li>
                <span className={`${styles.swatch} ${styles.failed}`} aria-hidden="true" />
                {t('lesson.legendFailed')}
              </li>
              <li>
                <span className={`${styles.swatch} ${styles.check}`} aria-hidden="true" />
                {t('lesson.legendCheck')}
              </li>
            </ul>
            <div className={styles.tools}>
              <Button
                size="small"
                variant="ghost"
                icon={playing ? 'pause' : 'play'}
                aria-label={playing ? t('lesson.pause') : t('lesson.play')}
                aria-pressed={!playing}
                onClick={() => setPlaying((p) => !p)}
              />
              <Button
                size="small"
                icon="replay"
                aria-label={t('lesson.replay')}
                onClick={() => {
                  setBroken(null);
                  stageRef.current?.replay();
                }}
              />
              <Button
                size="small"
                icon={fullscreen ? 'exitFullscreen' : 'fullscreen'}
                aria-label={fullscreen ? t('lesson.exitFullscreen') : t('lesson.fullscreen')}
                onClick={toggleFullscreen}
              />
            </div>
          </div>
        </section>
        <Card
          title={t('lesson.inThisLesson')}
          className={styles.stepper}
          labelledBy="in-this-lesson"
        >
          <Stepper
            steps={lesson.steps}
            current={index}
            furthest={furthest}
            countLabel={t('lesson.stepOf', { n: index + 1, total: count })}
            goToLabel={(i, title) => t('lesson.goToStep', { n: i + 1, title })}
            onSelect={goTo}
          />
        </Card>
      </div>
      <aside className={styles.side}>
        <div className={styles.stepCard}>
          <StepCard
            step={step}
            isFirst={index === 0}
            nextShort={nextStep?.short}
            activeBreak={activeBreak}
            onBack={() => goTo(index - 1)}
            onNext={() => goTo(index + 1)}
            onBreak={onBreak}
            onReset={onReset}
            labels={{
              counter: t('step.counter', { n: index + 1, total: count }),
              keyIdea: t('step.keyIdea'),
              back: t('step.back'),
              next: (short) => t('step.next', { short }),
              finish: place.next ? t('step.nextLesson') : t('step.finish'),
              breakIt: t('step.breakIt'),
              reset: t('step.reset'),
              hint: {
                next: t('step.hintNext'),
                replay: t('step.hintReplay'),
                pause: t('step.hintPause'),
              },
              actions: {
                killServer: t('action.killServer'),
                spikeTraffic: t('action.spikeTraffic'),
                slowDatabase: t('action.slowDatabase'),
              },
            }}
          />
        </div>
        <Card title={t('lesson.youWillLearn')} className={styles.learn} labelledBy="you-will-learn">
          <Checklist
            doneLabel={t('lesson.learned')}
            items={lesson.youWillLearn.map((item) => ({
              text: item.text,
              done: furthest >= (stepIndexById.get(item.stepId) ?? Number.POSITIVE_INFINITY),
            }))}
          />
        </Card>
      </aside>
    </div>
  );
}
