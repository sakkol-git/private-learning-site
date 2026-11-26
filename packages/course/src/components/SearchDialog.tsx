import { Dialog, Icon } from '@ss/ui';
import { useId, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useCourse } from '../config';
import { buildIndex, search } from '../search';
import styles from './AppShell.module.css';

export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useCourse();
  return (
    <Dialog open={open} onClose={onClose} label={t('nav.search')}>
      <SearchPanel onClose={onClose} />
    </Dialog>
  );
}

function SearchPanel({ onClose }: { onClose: () => void }) {
  const { catalog, t } = useCourse();
  const index = useMemo(() => buildIndex(catalog), [catalog]);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const listId = useId();
  const hits = search(index, query);

  const go = (i: number) => {
    const hit = hits[i];
    if (!hit) return;
    onClose();
    navigate(`/lesson/${hit.slug}/${hit.step ?? 1}`);
  };

  return (
    <div className={styles.search}>
      <div className={styles.searchField}>
        <Icon name="search" />
        <input
          autoFocus
          type="search"
          role="combobox"
          aria-expanded={hits.length > 0}
          aria-controls={listId}
          aria-activedescendant={hits[active] ? `${listId}-${active}` : undefined}
          aria-label={t('nav.search')}
          placeholder={t('nav.searchPlaceholder')}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((a) => Math.min(hits.length - 1, a + 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              go(active);
            }
          }}
        />
      </div>
      <ul id={listId} role="listbox" className={styles.results} aria-label={t('nav.search')}>
        {hits.map((hit, i) => (
          <li
            key={`${hit.slug}-${hit.step ?? 0}`}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={i === active}
            className={styles.result}
            onMouseEnter={() => setActive(i)}
            onClick={() => go(i)}
          >
            <span className={styles.resultTitle}>{hit.title}</span>
            <span className={styles.resultDetail}>
              {hit.step
                ? `${t('search.step', { n: hit.step })} · ${hit.detail}`
                : `${t('search.lesson')} · ${hit.detail}`}
            </span>
          </li>
        ))}
      </ul>
      {query.trim() && hits.length === 0 && (
        <p className={styles.searchNote}>{t('search.empty', { query })}</p>
      )}
      {!query.trim() && <p className={styles.searchNote}>{t('search.hint')}</p>}
    </div>
  );
}
