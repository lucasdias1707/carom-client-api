import { format, resolveLanguage, LANGUAGES, type Language, type Translate } from '@/lib/i18n';
import { catalogueFor } from '@/locales';
import { STORAGE_KEY } from '@/lib/storage';
import {
  Component,
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
} from 'react';

export interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  FallbackComponent?: ComponentType<ErrorFallbackProps>;
  /** Changing this clears a caught error. Pass the route to recover on navigation. */
  resetKey?: unknown;
}

interface ErrorBoundaryState {
  error: Error | null;
}

function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  if (typeof value === 'string') {
    return new Error(value);
  }
  try {
    return new Error(JSON.stringify(value));
  } catch {
    return new Error(String(value));
  }
}

/**
 * A translator that needs nothing but `localStorage` and the browser.
 *
 * The error screen is the one place that must keep working when the app does
 * not, so it reaches past the store for the stored language and falls back to
 * the system's. Every step is guarded: a private window, blocked site data or
 * a state written by a newer build all end at English rather than at a second
 * crash inside the screen that reports the first.
 */
function fallbackTranslator(): Translate {
  let chosen: Language | undefined;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const stored = raw ? (JSON.parse(raw) as { settings?: { language?: Language } }) : null;
    const language = stored?.settings?.language;
    if (language && LANGUAGES.includes(language)) chosen = language;
  } catch {
    // Unreadable storage is not a reason to fail again here.
  }
  const catalogue = catalogueFor(resolveLanguage(chosen));
  return (key, vars) => format(catalogue[key], vars);
}

function DefaultFallback({ error, resetError }: ErrorFallbackProps) {
  /*
    Read straight from storage rather than from the store. This screen is drawn
    outside every provider, and what it is drawn for is the app having failed —
    so it cannot depend on the app's state being usable. If the read fails, or
    nobody has chosen, the machine's own language is the best guess left.
  */
  const t = fallbackTranslator();
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-lg w-full text-center">
        <h1 className="text-xl font-semibold text-gray-900">{t('error.title')}</h1>
        <p className="mt-2 text-sm text-gray-600">{t('error.body')}</p>
        {/* Dev only: messages can carry API responses and other internals. */}
        {import.meta.env.DEV ? (
          <pre className="mt-4 overflow-x-auto rounded bg-gray-100 p-3 text-left text-xs text-gray-800">
            {error.message || String(error)}
          </pre>
        ) : null}
        <button
          type="button"
          onClick={resetError}
          className="mt-4 rounded bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700"
        >
          {t('error.retry')}
        </button>
      </div>
    </div>
  );
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: toError(error) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error(
      'ErrorBoundary caught an error:',
      toError(error),
      info.componentStack,
    );
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (
      this.state.error !== null &&
      prevProps.resetKey !== this.props.resetKey
    ) {
      this.resetError();
    }
  }

  resetError = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (error === null) {
      return this.props.children;
    }
    const Fallback = this.props.FallbackComponent ?? DefaultFallback;
    return <Fallback error={error} resetError={this.resetError} />;
  }
}
