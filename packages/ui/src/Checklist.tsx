import styles from './Checklist.module.css';
import { Icon } from './Icon';

export function Checklist({
  items,
  doneLabel,
}: {
  items: { text: string; done: boolean }[];
  doneLabel: string;
}) {
  return (
    <ul className={styles.list}>
      {items.map((item) => (
        <li
          key={item.text}
          className={[styles.item, item.done && styles.done].filter(Boolean).join(' ')}
        >
          <span className={styles.box} aria-hidden="true">
            <Icon name="check" size={14} />
          </span>
          <span>
            {item.text}
            {item.done && <span className="visually-hidden"> ({doneLabel})</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}
