import { relatedDestinations } from '../directory';
import { Experiment } from './Experiment';
import { keyToCommand, type Lesson } from '@ss/lesson-engine';
import {
  Button,
  Card,
  Checklist,
  Chip,
  MetricsStrip,
  StepCard,
  Stepper,
  SceneStage,
  type SceneStageHandle,
} from '@ss/ui';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { placeOf, useCourse, type CourseConfig, type LessonPlace } from '../config';
import { useProgress } from '../hooks/useProgress';
import { useReducedMotion } from '../hooks/useReducedMotion';
import styles from './LessonPage.module.css';

export function LessonPage<M, A extends string, I, C>({
  config,
}: {
  config: CourseConfig<M, A, I, C>;
}) {
  const course = useCourse();
  const { t } = course;
  const { slug = '', step = '1' } = useParams();
  const place = placeOf(course, slug);
  const [loaded, setLoaded] = useState<Lesson<I, C, A> | null>(null);
  const lesson = loaded?.slug === slug ? loaded : null;

  useEffect(() => {
    let live = true;
    config.loadLesson(slug)?.then((l) => {
      if (live) setLoaded(l);
    });
    return () => {
      live = false;
    };
  }, [config, slug]);

  if (!place) return <p className={styles.status}>{t('lesson.notFound')}</p>;
  if (!lesson) return <p className={styles.status}>{t('lesson.loading')}</p>;
  const index = Number.parseInt(step, 10) - 1;
  if (!Number.isInteger(index) || index < 0 || index >= lesson.steps.length) {
    return <Navigate to={`/lesson/${slug}/1`} replace />;
  }
  return (
    <LessonView key={lesson.slug} config={config} lesson={lesson} place={place} index={index} />
  );
}

const LEVEL_KEY = {
  beginner: 'lesson.level.beginner',
  intermediate: 'lesson.level.intermediate',
  advanced: 'lesson.level.advanced',
} as const;

function LessonView<M, A extends string, I, C>({
  config,
  lesson,
  place,
  index,
}: {
  config: CourseConfig<M, A, I, C>;
  lesson: Lesson<I, C, A>;
  place: LessonPlace;
  index: number;
}) {
  const { t, siteName, notice, directory } = useCourse();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const { progress, record } = useProgress();
  const stageRef = useRef<SceneStageHandle<A>>(null);
  const panelRef = useRef<HTMLElement>(null);
  const [metrics, setMetrics] = useState<M>(() => config.initialMetrics(lesson.initial));
  const [playing, setPlaying] = useState(true);
  const [broken, setBroken] = useState<{ action: A; step: number; baseline: M } | null>(null);
  if (broken && broken.step !== index) setBroken(null);
  const latestMetrics = useRef(metrics);
  const onMetrics = useCallback((next: M) => {
    latestMetrics.current = next;
    setMetrics(() => next);
  }, []);
  const activeBreak = broken?.step === index ? broken.action : null;
  const [detail, setDetail] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const step = lesson.steps[index] ?? lesson.steps[0];
  const count = lesson.steps.length;
  const scene = useMemo(
    () => ({ initial: lesson.initial, changes: lesson.steps.map((s) => s.change) }),
    [lesson],
  );
  const createStage = useCallback(
    (svg: SVGSVGElement, reduced: boolean) => config.createStage(svg, scene, reduced),
    [config, scene],
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
    document.title = `${lesson.steps[index]?.title ?? lesson.title} · ${lesson.title} · ${siteName}`;
  }, [lesson, index, count, record, siteName]);

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

  const companions = relatedDestinations(config.id, lesson.slug).flatMap((destination) => {
    const site = directory.find((course) => course.id === destination.course);
    return site
      ? [{ ...destination, href: site.origin + '/lesson/' + destination.slug + '/1' }]
      : [];
  });
  const chapterLessons = config.catalog.filter(
    (entry) => entry.chapter === lesson.chapter && entry.slug !== lesson.slug,
  );
  const nearest = chapterLessons
    .sort(
      (a, b) =>
        Math.abs(config.catalog.indexOf(a) - place.lessonNo + 1) -
        Math.abs(config.catalog.indexOf(b) - place.lessonNo + 1),
    )
    .slice(0, 2);
  const onBreak = (action: A) => {
    // Capture the settled step, including when a chart is still revealing bars.
    stageRef.current?.reset();
    const baseline = latestMetrics.current;
    if (stageRef.current?.break(action)) {
      setBroken({ action, step: index, baseline });
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
          {notice && <p className={styles.notice}>{notice}</p>}
          <MetricsStrip
            tiles={config.metricTiles(metrics)}
            before={broken && activeBreak ? config.metricTiles(broken.baseline) : []}
            beforeLabel={t('lesson.before')}
          />
          <SceneStage
            ref={stageRef}
            create={createStage}
            sceneKey={scene}
            step={index}
            playing={playing}
            reducedMotion={reducedMotion}
            onMetrics={onMetrics}
            detail={detail}
            inspectionLabels={{
              diagram: t('inspect.diagram'),
              chart: t('inspect.chart'),
              live: t('inspect.live'),
              previous: t('inspect.previous'),
              next: t('inspect.next'),
            }}
            label={t('lesson.diagram')}
          />
          {lesson.experiment?.stepId === step.id && (
            <Experiment key={lesson.slug} experiment={lesson.experiment} />
          )}
          {step.breakActions && step.breakActions.length > 0 && (
            <div className={styles.break} role="group" aria-label={t('step.breakIt')}>
              <span className={styles.breakLabel}>{t('step.breakIt')}</span>
              <div className={styles.breakButtons}>
                {step.breakActions.map((action) => (
                  <Button
                    key={action}
                    variant="danger"
                    size="small"
                    icon="bolt"
                    aria-pressed={activeBreak === action}
                    onClick={() => onBreak(action)}
                  >
                    {config.actionLabels[action] ?? action}
                  </Button>
                ))}
                <Button size="small" icon="reset" onClick={onReset} disabled={activeBreak === null}>
                  {t('step.reset')}
                </Button>
              </div>
            </div>
          )}
          <div className={styles.legendRow}>
            <ul className={styles.legend} aria-label={t('lesson.legend')}>
              {config.legend.map((item) => (
                <li key={item.tone}>
                  <span className={`${styles.swatch} ${styles[item.tone]}`} aria-hidden="true" />
                  {item.label}
                </li>
              ))}
            </ul>
            <div className={styles.tools}>
              <div className={styles.viewModes} role="group" aria-label={t('lesson.view')}>
                <Button size="small" aria-pressed={!detail} onClick={() => setDetail(false)}>
                  {t('lesson.fit')}
                </Button>
                <Button size="small" aria-pressed={detail} onClick={() => setDetail(true)}>
                  {t('lesson.detail')}
                </Button>
              </div>
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
            onBack={() => goTo(index - 1)}
            onNext={() => goTo(index + 1)}
            labels={{
              counter: t('step.counter', { n: index + 1, total: count }),
              keyIdea: t('step.keyIdea'),
              back: t('step.back'),
              next: (short) => t('step.next', { short }),
              finish: place.next ? t('step.nextLesson') : t('step.finish'),
              hint: {
                next: t('step.hintNext'),
                replay: t('step.hintReplay'),
                pause: t('step.hintPause'),
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
        {(companions.length > 0 || nearest.length > 0) && (
          <Card title={t('lesson.related')} labelledBy="related-lessons">
            <nav aria-labelledby="related-lessons" className={styles.related}>
              {companions.map((link) => (
                <a key={link.href} href={link.href}>
                  {link.title} · {t(`course.${link.course}`)}
                </a>
              ))}
              {nearest.map((entry) => (
                <Link key={entry.slug} to={`/lesson/${entry.slug}/1`}>
                  {entry.title}
                </Link>
              ))}
            </nav>
          </Card>
        )}
      </aside>
    </div>
  );
}
