import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.css';
import { Icon, type IconName } from './Icon';

type Variant = 'default' | 'primary' | 'danger' | 'ghost';

interface BaseProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: Variant;
  size?: 'normal' | 'small';
  icon?: IconName;
}

type ButtonProps = BaseProps &
  ({ children: ReactNode } | { children?: undefined; 'aria-label': string });

export function Button({
  variant = 'default',
  size = 'normal',
  icon,
  children,
  className,
  type,
  ...rest
}: ButtonProps) {
  const classes = [
    styles.button,
    variant !== 'default' && styles[variant],
    size === 'small' && styles.small,
    !children && styles.icon,
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button type={type ?? 'button'} className={classes} {...rest}>
      {icon && <Icon name={icon} size={size === 'small' ? 16 : 18} />}
      {children}
    </button>
  );
}
