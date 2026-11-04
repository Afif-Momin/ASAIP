import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
type Size = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-primary-foreground border border-primary/70 hover:bg-primary/90 focus-visible:ring-primary',
  secondary: 'bg-white text-foreground border border-slate-300 hover:bg-slate-50 focus-visible:ring-primary',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-foreground focus-visible:ring-primary',
  outline: 'border border-slate-300 bg-transparent text-slate-700 hover:bg-slate-50 hover:text-foreground focus-visible:ring-primary',
  danger: 'bg-destructive text-destructive-foreground border border-destructive/70 hover:bg-destructive/90 focus-visible:ring-destructive',
};
const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-[13px] rounded-lg gap-1.5',
  md: 'h-10 px-4 text-[14px] rounded-lg gap-2',
  lg: 'h-11 px-5 text-[15px] rounded-lg gap-2',
  icon: 'h-9 w-9 rounded-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  className, variant = 'primary', size = 'md', loading, disabled, children, type = 'button', ...props
}, ref) => (
  <button
    ref={ref}
    type={type}
    disabled={disabled || loading}
    className={cn('inline-flex shrink-0 items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50', variants[variant], sizes[size], className)}
    {...props}
  >
    {loading && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
    {children}
  </button>
));
Button.displayName = 'Button';
