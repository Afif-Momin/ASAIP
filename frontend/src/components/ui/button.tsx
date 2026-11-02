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
  primary: 'bg-indigo-500 text-white shadow-[0_4px_16px_rgba(99,102,241,.2)] hover:bg-indigo-400 focus-visible:ring-indigo-400',
  secondary: 'bg-slate-800/90 text-slate-100 border border-slate-700/80 hover:bg-slate-750 hover:border-slate-600 focus-visible:ring-slate-500',
  ghost: 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.055] focus-visible:ring-slate-500',
  outline: 'border border-slate-700/80 bg-transparent text-slate-300 hover:bg-white/[0.035] hover:text-white focus-visible:ring-slate-500',
  danger: 'bg-rose-500/10 text-rose-300 border border-rose-500/25 hover:bg-rose-500/20 focus-visible:ring-rose-400',
};
const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs rounded-lg gap-1.5',
  md: 'h-10 px-4 text-[13px] rounded-lg gap-2',
  lg: 'h-11 px-5 text-sm rounded-xl gap-2',
  icon: 'h-9 w-9 rounded-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  className, variant = 'primary', size = 'md', loading, disabled, children, type = 'button', ...props
}, ref) => (
  <button
    ref={ref}
    type={type}
    disabled={disabled || loading}
    className={cn('inline-flex shrink-0 items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50', variants[variant], sizes[size], className)}
    {...props}
  >
    {loading && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
    {children}
  </button>
));
Button.displayName = 'Button';
