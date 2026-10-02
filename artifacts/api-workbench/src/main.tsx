import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';
import { bootStorage } from '@/lib/storage';

import './index.css';

/*
  The workspace is read before anything is drawn: the store takes its first
  state synchronously, and the database it now comes from is not. `bootStorage`
  never throws — if the database will not open it falls back to what the app
  used before — so a failure here cannot be what keeps the window blank.
*/
void bootStorage().finally(() => {
  createRoot(document.getElementById('root')!, {
    // Keeps caught errors off reportError(), which would raise the dev overlay.
    onCaughtError: (error, errorInfo) => {
      console.error(error, errorInfo.componentStack);
    },
  }).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>,
  );
});
