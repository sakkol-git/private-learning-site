import { completion } from '@ss/lesson-engine';
import { Link } from 'react-router';
import { useCourse } from '../config';
import { useProgress } from '../hooks/useProgress';
import styles from './AppShell.module.css';

export function LessonList({ current, onNavigate }: { current?: string; onNavigate: () => void }) {
  const { t, catalog, chapters } = useCourse();
  const { progress } = useProgress();
  return (
    <nav aria-label={t('nav.lessons')} className={styles.lessonNav}>
      <Link to="/" className={styles.homeLink} onClick={onNavigate}>
        {t('nav.home')}
      </Link>
      {chapters.map((chapter, ci) => (
        <section key={chapter.id}>
          <h2 className={styles.navChapter}>
            {String(ci + 1).padStart(2, '0')} · {chapter.title}
          </h2>
          <ul className={styles.navList}>
            {chapter.lessons.map((slug) => {
              const entry = catalog.find((e) => e.slug === slug);
              if (!entry) return null;
              const pct = Math.round(completion(progress.lessons[slug]) * 100);
              return (
                <li key={slug}>
                  <Link
                    to={`/lesson/${slug}/1`}
                    className={styles.navLesson}
                    aria-current={current === slug ? 'page' : undefined}
                    onClick={onNavigate}
                  >
                    <span>{entry.title}</span>
                    <span className={styles.navPct}>{pct > 0 ? `${pct}%` : ''}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </nav>
  );
}
