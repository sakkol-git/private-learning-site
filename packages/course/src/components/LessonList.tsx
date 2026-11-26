import { completion } from '@ss/lesson-engine';
import { Icon } from '@ss/ui';
import { useState } from 'react';
import { Link } from 'react-router';
import { useCourse } from '../config';
import { useProgress } from '../hooks/useProgress';
import styles from './AppShell.module.css';

/** Chapters as folders: one opens at a time-ish, the current lesson's folder starts open. */
export function LessonList({ current, onNavigate }: { current?: string; onNavigate: () => void }) {
  const { t, catalog, chapters } = useCourse();
  const { progress } = useProgress();
  const home = chapters.find((c) => current && c.lessons.includes(current)) ?? chapters[0];
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set(home ? [home.id] : []));

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <nav aria-label={t('nav.lessons')} className={styles.lessonNav}>
      <Link to="/" className={styles.homeLink} onClick={onNavigate}>
        {t('nav.home')}
      </Link>
      {chapters.map((chapter, ci) => {
        const isOpen = open.has(chapter.id);
        const listId = `nav-${chapter.id}`;
        const done = chapter.lessons.filter(
          (slug) => completion(progress.lessons[slug]) >= 1,
        ).length;
        return (
          <section key={chapter.id} className={styles.folder}>
            <button
              type="button"
              className={styles.folderHead}
              aria-expanded={isOpen}
              aria-controls={listId}
              onClick={() => toggle(chapter.id)}
            >
              <span className={styles.chevron} data-open={isOpen}>
                <Icon name="chevron" size={16} />
              </span>
              <Icon name="folder" size={16} />
              <span className={styles.folderTitle}>
                <span className={styles.folderNo}>{String(ci + 1).padStart(2, '0')}</span>
                {chapter.title}
              </span>
              <span className={styles.folderCount}>
                {done}/{chapter.lessons.length}
              </span>
            </button>
            {isOpen && (
              <ul id={listId} className={styles.navList}>
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
            )}
          </section>
        );
      })}
    </nav>
  );
}
