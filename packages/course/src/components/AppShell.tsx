import { isSearchShortcut } from '@ss/lesson-engine';
import { Button, Dialog, Icon, TopBar } from '@ss/ui';
import { useEffect, useState } from 'react';
import { Link, Outlet, useParams } from 'react-router';
import { useCourse } from '../config';
import { useTheme } from '../hooks/useTheme';
import styles from './AppShell.module.css';
import { LessonList } from './LessonList';
import { Logo } from './Logo';
import { SearchDialog } from './SearchDialog';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

export function AppShell() {
  const { t, authorName } = useCourse();
  const [drawer, setDrawer] = useState(false);
  const [searching, setSearching] = useState(false);
  const [theme, toggleTheme] = useTheme();
  const { slug } = useParams();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isSearchShortcut(e)) {
        e.preventDefault();
        setSearching(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className={styles.shell}>
      <a className={styles.skip} href="#main">
        {t('nav.skip')}
      </a>
      <TopBar
        start={
          <>
            <Button
              variant="ghost"
              icon="menu"
              aria-label={t('nav.menu')}
              onClick={() => setDrawer(true)}
            />
            <Link to="/" className={styles.brand}>
              <Logo />
            </Link>
          </>
        }
        end={
          <>
            <button
              type="button"
              className={styles.searchTrigger}
              onClick={() => setSearching(true)}
            >
              <Icon name="search" size={16} />
              <span className={styles.searchLabel}>{t('nav.search')}</span>
              <kbd className={styles.kbd}>{isMac ? '⌘K' : 'Ctrl K'}</kbd>
            </button>
            <label className={styles.lang}>
              <span className="visually-hidden">{t('nav.language')}</span>
              <select defaultValue="en">
                <option value="en">EN</option>
                <option value="km" disabled>
                  {t('nav.languageSoon')}
                </option>
              </select>
            </label>
            <Button
              variant="ghost"
              icon={theme === 'dark' ? 'sun' : 'moon'}
              aria-label={theme === 'dark' ? t('nav.themeToLight') : t('nav.themeToDark')}
              onClick={toggleTheme}
            />
            <span className={styles.credit}>{t('nav.madeBy', { name: authorName })}</span>
          </>
        }
      />
      <Dialog
        open={drawer}
        onClose={() => setDrawer(false)}
        label={t('nav.lessons')}
        variant="drawer"
      >
        <div className={styles.drawerHead}>
          <Logo />
          <Button
            variant="ghost"
            icon="close"
            aria-label={t('nav.close')}
            onClick={() => setDrawer(false)}
          />
        </div>
        <LessonList {...(slug ? { current: slug } : {})} onNavigate={() => setDrawer(false)} />
      </Dialog>
      <SearchDialog open={searching} onClose={() => setSearching(false)} />
      <main id="main" className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
