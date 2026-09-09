import { useRef } from 'react';
import { Download, Upload } from 'lucide-react';
import { AppMark } from '@/components/common/AppMark';
import { Dialog } from '@/components/common/Dialog';
import { useToast } from '@/components/common/Toaster';
import { UpdatesSection } from '@/components/dialogs/UpdatesSection';
import { downloadJson } from '@/lib/download';
import { isSubtreeExport } from '@/lib/export';
import { isDesktop } from '@/lib/http';
import { createSeedState } from '@/lib/seed';
import { JSON_THEME_PRESETS } from '@/lib/settings';
import { useWorkspace } from '@/state/workspace-store';
import type { JsonTheme, PaneLayout, SendMode, ThemeName, WorkspaceState } from '@/types';
import type { ProxyStatus } from '@/hooks/use-proxy-health';
import tauriConfig from '../../../src-tauri/tauri.conf.json';
import { SelectField } from '@/components/common/SelectField';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const PROXY_COPY: Record<ProxyStatus, string> = {
  checking: 'Checking whether the companion server is running…',
  available: 'The companion server is running, so requests can bypass browser CORS like a desktop client.',
  unavailable: 'The companion server is not reachable, so requests are sent straight from the browser and are subject to CORS.',
};

/**
 * Read from the file that also names the installers, rather than copied. The
 * copy had drifted a release behind, and a version this dialog states wrongly
 * is worse than no version at all.
 */
const APP_VERSION = tauriConfig.version;

const JSON_COLOR_FIELDS: Array<{ field: keyof JsonTheme; label: string; sample: string }> = [
  { field: 'key', label: 'Keys', sample: '"name"' },
  { field: 'string', label: 'Strings', sample: '"ditto"' },
  { field: 'number', label: 'Numbers', sample: '132' },
  { field: 'boolean', label: 'Booleans', sample: 'true' },
  { field: 'null', label: 'Null', sample: 'null' },
  { field: 'punctuation', label: 'Punctuation', sample: '{ } [ ] ,' },
];

export function SettingsDialog({ onClose, proxyStatus }: { onClose: () => void; proxyStatus: ProxyStatus }) {
  const { state, dispatch } = useWorkspace();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const settings = state.settings;

  const exportWorkspace = () => downloadJson('workspace.json', { ...state, responses: [] });

  const importWorkspace = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as WorkspaceState;
      if (isSubtreeExport(parsed)) {
        // Naming what it is beats "not a valid export" for someone who just
        // exported a folder and reached for the only import button there is.
        throw new Error('That is a folder or request export. Only whole workspaces can be imported here.');
      }
      if (!Array.isArray(parsed.requests) || !Array.isArray(parsed.environments)) {
        throw new Error('That file is not a workspace export.');
      }
      dispatch({ type: 'state/replace', state: { ...parsed, responses: parsed.responses ?? [] } });
      toast({ title: 'Workspace imported', description: `${parsed.requests.length} requests loaded.`, kind: 'success' });
      onClose();
    } catch (error) {
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : undefined,
        kind: 'error',
      });
    }
  };

  return (
    <Dialog title="Settings" onClose={onClose} testId="dialog-settings" footer={<Button onClick={onClose}>Done</Button>}>
      <div className="stack" style={{ gap: 16 }}>
        <div className="stack" style={{ gap: 6 }}>
          <Label className="section-label m-0">Theme</Label>
          <SelectField
            value={settings.theme}
            onChange={(theme: ThemeName) => dispatch({ type: 'settings/update', patch: { theme } })}
            options={[
              { value: 'dark', label: 'Dark' },
              { value: 'light', label: 'Light' },
              { value: 'system', label: 'Match system' },
            ]}
            ariaLabel="Theme"
            testId="select-theme"
            block
          />
        </div>

        <div className="stack" style={{ gap: 6 }}>
          <Label className="section-label m-0">Pane layout</Label>
          <SelectField
            value={settings.layout}
            onChange={(layout: PaneLayout) => dispatch({ type: 'settings/update', patch: { layout } })}
            options={[
              { value: 'horizontal', label: 'Side by side' },
              { value: 'vertical', label: 'Stacked' },
            ]}
            ariaLabel="Pane layout"
            testId="select-layout"
            block
          />
        </div>

        <div className="stack" style={{ gap: 6 }}>
          <Label className="section-label m-0">Send requests through</Label>
          <SelectField
            value={settings.sendMode}
            onChange={(sendMode: SendMode) => dispatch({ type: 'settings/update', patch: { sendMode } })}
            options={[
              { value: 'auto', label: isDesktop() ? 'Auto — native (recommended)' : 'Auto — server when available' },
              { value: 'proxy', label: 'Companion server only' },
              { value: 'browser', label: 'Browser only' },
            ]}
            ariaLabel="Send requests through"
            testId="select-send-mode"
            block
          />
          <span className="hint">
            {isDesktop()
              ? 'Running as a desktop app: requests are made natively, so CORS does not apply and private hosts are reachable. The companion server is not needed here.'
              : PROXY_COPY[proxyStatus]}
          </span>
        </div>

        <div className="stack" style={{ gap: 6 }}>
          <Label className="section-label m-0" htmlFor="settings-timeout">Timeout (seconds)</Label>
          <Input
            id="settings-timeout"
            type="number"
            min={1}
            max={300}
            value={Math.round(settings.timeoutMs / 1000)}
            onChange={(event) =>
              dispatch({ type: 'settings/update', patch: { timeoutMs: Math.max(1, Number(event.target.value) || 30) * 1000 } })
            }
            data-testid="input-timeout"
          />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="checkbox-follow-redirects"
            checked={settings.followRedirects}
            onCheckedChange={(checked) => dispatch({ type: 'settings/update', patch: { followRedirects: checked === true } })}
            data-testid="checkbox-follow-redirects"
          />
          <Label htmlFor="checkbox-follow-redirects" className="font-normal">Follow redirects</Label>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="checkbox-persist-responses"
            checked={settings.persistResponses}
            onCheckedChange={(checked) => dispatch({ type: 'settings/update', patch: { persistResponses: checked === true } })}
            data-testid="checkbox-persist-responses"
          />
          <Label htmlFor="checkbox-persist-responses" className="font-normal">Keep response bodies between reloads</Label>
        </div>

        <div>
          <div className="section-label">
            JSON colours
            <span className="spacer" />
            <SelectField
              value=""
              onChange={(name) => {
                const preset = JSON_THEME_PRESETS[name];
                if (preset) dispatch({ type: 'settings/update', patch: { jsonTheme: { ...preset } } });
              }}
              options={Object.keys(JSON_THEME_PRESETS).map((name) => ({ value: name, label: name }))}
              placeholder="Presets…"
              ariaLabel="Colour preset"
              testId="select-json-preset"
            />
          </div>
          <div className="color-rows">
            {JSON_COLOR_FIELDS.map(({ field, label, sample }) => (
              <div className="color-row" key={field}>
                <Label htmlFor={`json-color-${field}`} className="font-normal">{label}</Label>
                <input
                  id={`json-color-${field}`}
                  type="color"
                  value={settings.jsonTheme[field]}
                  onChange={(event) =>
                    dispatch({
                      type: 'settings/update',
                      patch: { jsonTheme: { ...settings.jsonTheme, [field]: event.target.value } },
                    })
                  }
                  data-testid={`input-json-color-${field}`}
                />
                <span className="color-sample" style={{ color: settings.jsonTheme[field] }}>
                  {sample}
                </span>
              </div>
            ))}
          </div>
          <p className="hint" style={{ marginTop: 8 }}>
            Applies to the Pretty tab of the response viewer.
          </p>
        </div>

        {isDesktop() ? <UpdatesSection /> : null}

        <div>
          <div className="section-label">Workspace data</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button variant="secondary" onClick={exportWorkspace} data-testid="button-export-workspace">
              <Download /> Export JSON
            </Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()} data-testid="button-import-workspace">
              <Upload /> Import JSON
            </Button>
            <Button variant="destructive"
              onClick={() => {
                dispatch({ type: 'state/replace', state: createSeedState() });
                toast({ title: 'Workspace reset', kind: 'info' });
                onClose();
              }}
              data-testid="button-reset-workspace"
            >
              Reset to sample workspace
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importWorkspace(file);
              event.target.value = '';
            }}
          />
          <p className="hint" style={{ marginTop: 8 }}>
            Everything is stored in this browser only. Export before clearing site data, and keep real secrets in an
            environment you do not share.
          </p>
        </div>

        <div className="about-line">
          <span className="brand-mark" style={{ width: 18, height: 18 }}>
            <AppMark size={11} />
          </span>
          <strong>Carom</strong>
          <span className="mono">{APP_VERSION}</span>
          <span className="spacer" />
          <span>{isDesktop() ? 'desktop' : 'web'}</span>
        </div>
      </div>
    </Dialog>
  );
}
