import { ToastProvider } from '@/components/common/Toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Workbench } from '@/components/layout/Workbench';
import { UpdateProvider } from '@/state/update-store';
import { WorkspaceProvider } from '@/state/workspace-store';

/** `main.tsx` already wraps this tree in an error boundary. */
export default function App() {
  return (
    <TooltipProvider delayDuration={250} skipDelayDuration={300}>
      <ToastProvider>
        <WorkspaceProvider>
          <UpdateProvider>
            <Workbench />
          </UpdateProvider>
        </WorkspaceProvider>
      </ToastProvider>
    </TooltipProvider>
  );
}
