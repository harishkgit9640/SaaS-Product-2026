import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}

export default function Card({ children, className, padding = true }: CardProps) {
  return (
    <div className={clsx('card', !padding && 'p-0', className)}>
      {children}
    </div>
  );
}
