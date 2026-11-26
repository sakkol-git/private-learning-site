import { completion } from '@ss/lesson-engine';
import { Chip } from '@ss/ui';
import { useEffect } from 'react';
import { Link } from 'react-router';
import { useCourse } from '../config';
import { useProgress } from '../hooks/useProgress';
import styles from './HomePage.module.css';

const LEVEL_KEY = {
  beginner: 'lesson.level.beginner',
  intermediate: 'lesson.level.intermediate',
  advanced: 'lesson.level.advanced',
} as const;

export function HomePage({ chapterNavigation }: { chapterNavigation: boolean }) {
  const { t, siteName, catalog, chapters, home } = useCourse();
  const { progress } = useProgress();
  useEffect(() => {
    document.title = siteName;
  }, [siteName]);

  const lastSlug = progress.lastSlug;
  const last = lastSlug ? catalog.find((e) => e.slug === lastSlug) : undefined;
  const lastProgress = lastSlug ? progress.lessons[lastSlug] : undefined;
  const first = catalog[0];

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.kicker}>{home.kicker}</p>
        <h1 className={styles.title}>{home.title}</h1>
        <p className={styles.intro}>{home.intro}</p>
        {last && lastProgress ? (
          <Link className={styles.continue} to={`/lesson/${last.slug}/${lastProgress.last + 1}`}>
            <span className={styles.continueLabel}>{t('home.continue')}</span>
            <span className={styles.continueTitle}>{last.title}</span>
            <span className={styles.continueStep}>
              {t('home.continueStep', { n: lastProgress.last + 1, total: last.steps.length })} ·{' '}
              {last.steps[lastProgress.last]?.title}
            </span>
          </Link>
        ) : (
          first && (
            <Link className={styles.start} to={`/lesson/${first.slug}/1`}>
              {t('home.start')} →
            </Link>
          )
        )}
      </section>
      <div className={chapterNavigation ? styles.withRail : undefined}>
        {chapterNavigation && (
          <nav className={styles.chapterNav} aria-label={t('home.chapters')}>
            <h2>{t('home.chapters')}</h2>
            <select
              aria-label={t('home.jump')}
              value=""
              onChange={(e) => {
                document.getElementById(e.target.value)?.focus();
              }}
            >
              <option value="" disabled>
                {t('home.jump')}
              </option>
              {chapters.map((ch) => (
                <option key={ch.id} value={'chapter-' + ch.id}>
                  {ch.title}
                </option>
              ))}
            </select>
            <ul>
              {chapters.map((ch) => (
                <li key={ch.id}>
                  <a href={'#chapter-' + ch.id}>
                    {ch.title}
                    <small>
                      {t('home.chapterDone', {
                        done: ch.lessons.filter((slug) => completion(progress.lessons[slug]) === 1)
                          .length,
                        total: ch.lessons.length,
                      })}
                    </small>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
        <div className={styles.chapterList}>
          {chapters.map((chapter, ci) => (
            <section
              key={chapter.id}
              className={styles.chapter}
              aria-labelledby={`chapter-${chapter.id}`}
            >
              <h2 tabIndex={-1} id={`chapter-${chapter.id}`} className={styles.chapterTitle}>
                <span className={styles.chapterNo}>
                  {t('home.chapter', { n: String(ci + 1).padStart(2, '0') })}
                </span>
                {chapter.title}
              </h2>
              <ul className={styles.grid}>
                {chapter.lessons.map((slug) => {
                  const entry = catalog.find((e) => e.slug === slug);
                  if (!entry) return null;
                  const pct = Math.round(completion(progress.lessons[slug]) * 100);
                  return (
                    <li key={slug}>
                      <Link to={`/lesson/${slug}/1`} className={styles.card}>
                        <h3 className={styles.cardTitle}>{entry.title}</h3>
                        <p className={styles.cardSummary}>{entry.summary}</p>
                        <div className={styles.cardMeta}>
                          <Chip>{t('lesson.minutes', { n: entry.minutes })}</Chip>
                          <Chip>{t(LEVEL_KEY[entry.level])}</Chip>
                          <Chip>{t('lesson.steps', { n: entry.steps.length })}</Chip>
                        </div>
                        <div className={styles.progress}>
                          <span className={styles.bar} aria-hidden="true">
                            <span style={{ width: `${pct}%` }} />
                          </span>
                          <span className={styles.pct}>
                            {pct > 0 ? t('home.progress', { pct }) : t('home.notStarted')}
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
