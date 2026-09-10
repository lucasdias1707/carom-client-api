import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type SelectOption<T extends string> = { value: T; label: string; className?: string };

type SelectFieldProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: Array<SelectOption<T>>;
  ariaLabel: string;
  testId?: string;
  className?: string;
  /** Full width, for the stacked fields in a dialog. */
  block?: boolean;
  /** Shown while nothing is selected — a menu that acts as a one-shot picker. */
  placeholder?: string;
  disabled?: boolean;
};

/**
 * The app's dropdowns, over Radix's listbox.
 *
 * A wrapper rather than the raw parts at ten call sites: each of those was a
 * `<select>` with a `.map` inside it, and repeating the trigger, the value and
 * the content around every one would be more shadcn than it is readable.
 *
 * What the native element could not do is why this exists at all — its popup
 * is drawn by the operating system, so it ignored the theme entirely: a light
 * menu dropping out of a dark toolbar.
 */
export function SelectField<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  testId,
  className,
  block,
  placeholder,
  disabled,
}: SelectFieldProps<T>) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as T)} disabled={disabled}>
      <SelectTrigger
        aria-label={ariaLabel}
        data-testid={testId}
        className={cn('h-7 gap-1.5 px-2 text-[length:var(--fs-13)]', block ? 'w-full' : 'w-auto', className)}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} className={cn('text-[length:var(--fs-13)]', option.className)}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
