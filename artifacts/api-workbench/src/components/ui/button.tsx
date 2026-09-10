import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[var(--radius)] text-[length:var(--fs-13)] font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-[15px] [&_svg]:shrink-0' +
    ' hover-elevate active-elevate-2',
  {
    variants: {
      variant: {
        default:
          // The accent has its own hover colour, and `--accent-hover` sat in
          // every palette unused until this line: the neutral `hover-elevate`
          // wash was laid over the accent instead, so changing the hover
          // colour did nothing at all. The wash is turned off here so the two
          // are not fighting over the same pixels.
          'bg-primary text-primary-foreground border border-primary-border' +
          ' hover:bg-[var(--accent-hover)] hover:border-[var(--accent-hover)] hover:[&::after]:bg-transparent!',
        destructive:
          'bg-destructive text-destructive-foreground shadow-sm border-destructive-border',
        outline:
          // Shows the background color of whatever card / sidebar / accent background it is inside of.
          // Inherits the current text color. Uses shadow-xs. no shadow on active
          // No hover state
          ' border [border-color:var(--button-outline)] shadow-xs active:shadow-none ',
        secondary:
          // border, no hover, no shadow, secondary border.
          'border bg-secondary text-secondary-foreground border border-secondary-border ',
        // no hover, transparent border
        ghost: 'border border-transparent',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        // Tuned for this app rather than shadcn's defaults: it is a dense
        // tool, and a 36px button next to a 28px row reads as a different
        // product. Changed here so no call site has to override a height.
        default: 'min-h-8 px-3 py-1 text-[length:var(--fs-13)]',
        sm: 'min-h-7 rounded-md px-2.5 text-[length:var(--fs-12-5)]',
        lg: 'min-h-9 rounded-md px-6',
        icon: 'h-7 w-7',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
