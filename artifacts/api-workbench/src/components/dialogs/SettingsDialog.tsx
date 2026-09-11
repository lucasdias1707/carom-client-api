import { useRef, useState } from 'react';
import { Dices, Download, Keyboard, Languages, Upload } from 'lucide-react';
import { AppMark } from '@/components/common/AppMark';
import { Dialog } from '@/components/common/Dialog';
import { useToast } from '@/components/common/Toaster';
import { UpdatesSection } from '@/components/dialogs/UpdatesSection';
import { saveJson, saveMessage } from '@/lib/save';
import { formatBinding, resolveBindings } from '@/lib/shortcuts';
import { FontThemeEditor } from '@/components/dialogs/FontThemeEditor';
import { PaletteEditor } from '@/components/dialogs/PaletteEditor';
import { isSubtreeExport } from '@/lib/export';
import { isDesktop } from '@/lib/http';
import {
  FOLLOW_SYSTEM,
  LANGUAGES,
  LANGUAGE_NAMES,
  resolveLanguage,
  systemLanguage,
  type Language,
} from '@/lib/i18n';
import { createSeedState } from '@/lib/seed';
import { JSON_THEME_PRESETS } from '@/lib/settings';
import { useWorkspace } from '@/state/workspace-store';
import type { JsonTheme, PaneLayout, SendMode, ThemeName, WorkspaceState } from '@/types';
import type { ProxyStatus } from '@/hooks/use-proxy-health';
import type { MessageKey } from '@/locales/en';
import tauriConfig from '../../../src-tauri/tauri.conf.json';
import { SelectField } from '@/components/common/SelectField';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const PROXY_COPY: Record<ProxyStatus, MessageKey> = {
  checking: 'settings.proxy.checking',
  available: 'settings.proxy.available',
  unavailable: 'settings.proxy.unavailable',
};

/**
 * Read from the file that also names the installers, rather than copied. The
 * copy had drifted a release behind, and a version this dialog states wrongly
 * is worse than no version at all.
 */
const APP_VERSION = tauriConfig.version;

const JSON_COLOR_FIELDS: Array<{ field: keyof JsonTheme; label: MessageKey; sample: string }> = [
  { field: 'key', label: 'settings.json.keys', sample: '"name"' },
  { field: 'string', label: 'settings.json.strings', sample: '"ditto"' },
  { field: 'number', label: 'settings.json.numbers', sample: '132' },
  { field: 'boolean', label: 'settings.json.booleans', sample: 'true' },
  { field: 'null', label: 'settings.json.null', sample: 'null' },
  { field: 'punctuation', label: 'settings.json.punctuation', sample: '{ } [ ] ,' },
];

export function SettingsDialog({
  onClose,
  proxyStatus,
  onOpenShortcuts,
}: {
  onClose: () => void;
  proxyStatus: ProxyStatus;
  /** Swaps this dialog for the shortcuts screen — they are one overlay, not two. */
  onOpenShortcuts: () => void;
}) {
  const { state, dispatch, t, tNodes } = useWorkspace();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  // Two tabs rather than one long scroll: everything about how the app looks
  // was scattered between the top of the list and the bottom of it.
  const [tab, setTab] = useState('general');
  const settings = state.settings;

  // Everything, settings included, so it restores rather than merges. On the
  // desktop this asks where to put it; in a browser it lands in Downloads.
  const exportWorkspace = async () => {
    const message = saveMessage(
      await saveJson('workspace.json', { ...state, responses: [] }, t('save.anyFile')),
      t('save.workspaceExported'),
      t('save.downloaded'),
    );
    if (message) toast({ ...message, kind: 'success' });
  };

  const importWorkspace = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as WorkspaceState;
      if (isSubtreeExport(parsed)) {
        // A slice is merged into a workspace rather than replacing one, which
        // is the Import dialog's job — so this points there instead of doing
        // something destructive with a file that means the opposite.
        throw new Error(t('settings.data.isSubtree'));
      }
      if (!Array.isArray(parsed.requests) || !Array.isArray(parsed.environments)) {
        throw new Error(t('settings.data.notWorkspace'));
      }
      dispatch({ type: 'state/replace', state: { ...parsed, responses: parsed.responses ?? [] } });
      toast({
        title: t('settings.data.imported'),
        description: t('settings.data.importedCount', { count: parsed.requests.length }),
        kind: 'success',
      });
      onClose();
    } catch (error) {
      toast({
        title: t('settings.data.importFailed'),
        description: error instanceof Error ? error.message : undefined,
        kind: 'error',
      });
    }
  };

  return (
    <Dialog
      title={t('settings.title')}
      onClose={onClose}
      testId="dialog-settings"
      footer={<Button onClick={onClose}>{t('common.done')}</Button>}
    >
      <Tabs value={tab} onValueChange={setTab} className="stack" style={{ gap: 12 }}>
        <TabsList className="w-full">
          <TabsTrigger value="general" className="flex-1" data-testid="tab-settings-general">
            {t('settings.tab.general')}
          </TabsTrigger>
          <TabsTrigger value="theme" className="flex-1" data-testid="tab-settings-theme">
            {t('settings.tab.theme')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="stack" style={{ gap: 16 }}>

        {/*
          First in General because it decides how everything below it reads.
          The default is not stored: `language` stays absent until someone
          chooses, so the app follows the machine, and the option that does
          that names the language it currently resolves to rather than leaving
          "Match system" to be taken on faith.
        */}
        <div className="stack" style={{ gap: 6 }}>
          <Label className="section-label m-0">
            <Languages size={12} /> {t('settings.language.label')}
          </Label>
          <SelectField
            value={settings.language ?? FOLLOW_SYSTEM}
            onChange={(choice: Language | typeof FOLLOW_SYSTEM) =>
              dispatch({
                type: 'settings/update',
                patch: { language: choice === FOLLOW_SYSTEM ? undefined : choice },
              })
            }
            options={[
              {
                value: FOLLOW_SYSTEM,
                label: t('settings.language.system', { name: LANGUAGE_NAMES[systemLanguage()] }),
              },
              ...LANGUAGES.map((language) => ({ value: language, label: LANGUAGE_NAMES[language] })),
            ]}
            ariaLabel={t('settings.language.label')}
            testId="select-language"
            block
          />
          <span className="hint">{t('settings.language.hint')}</span>
        </div>

        {/*
          Directly under the interface language, because the two are read
          together and the default is "the same as that one". Pinning it is for
          the case the default cannot serve: an API that validates names or
          addresses against a language other than the one you work in.
        */}
        <div className="stack" style={{ gap: 6 }}>
          <Label className="section-label m-0">
            <Dices size={12} /> {t('settings.dataLanguage.label')}
          </Label>
          <SelectField
            value={settings.dataLanguage ?? FOLLOW_SYSTEM}
            onChange={(choice: Language | typeof FOLLOW_SYSTEM) =>
              dispatch({
                type: 'settings/update',
                patch: { dataLanguage: choice === FOLLOW_SYSTEM ? undefined : choice },
              })
            }
            options={[
              {
                value: FOLLOW_SYSTEM,
                label: t('settings.dataLanguage.follow', {
                  name: LANGUAGE_NAMES[resolveLanguage(settings.language)],
                }),
              },
              ...LANGUAGES.map((language) => ({ value: language, label: LANGUAGE_NAMES[language] })),
            ]}
            ariaLabel={t('settings.dataLanguage.label')}
            testId="select-data-language"
            block
          />
          <span className="hint">
            {tNodes('settings.dataLanguage.hint', { example: <code>{'{{$randomFirstName}}'}</code> })}
          </span>
        </div>

        {/*
          The shortcuts screen lives behind the palette, and the palette is
          itself a shortcut — which is fine once you know it and useless when
          you do not. Settings is where someone looks for a setting, so the
          way in is here too.
        */}
        <div className="stack" style={{ gap: 6 }}>
          <Label className="section-label m-0">{t('settings.keyboard.label')}</Label>
          <Button
            variant="secondary"
            className="justify-self-start"
            onClick={onOpenShortcuts}
            data-testid="button-open-shortcuts"
          >
            <Keyboard /> {t('settings.keyboard.open')}
            <span className="kbd ml-1">{formatBinding(resolveBindings(settings).palette)}</span>
          </Button>
        </div>

        <div className="stack" style={{ gap: 6 }}>
          <Label className="section-label m-0">{t('settings.layout.label')}</Label>
          <SelectField
            value={settings.layout}
            onChange={(layout: PaneLayout) => dispatch({ type: 'settings/update', patch: { layout } })}
            options={[
              { value: 'horizontal', label: t('settings.layout.horizontal') },
              { value: 'vertical', label: t('settings.layout.vertical') },
            ]}
            ariaLabel={t('settings.layout.label')}
            testId="select-layout"
            block
          />
        </div>

        <div className="stack" style={{ gap: 6 }}>
          <Label className="section-label m-0">{t('settings.sendMode.label')}</Label>
          <SelectField
            value={settings.sendMode}
            onChange={(sendMode: SendMode) => dispatch({ type: 'settings/update', patch: { sendMode } })}
            options={[
              { value: 'auto', label: t(isDesktop() ? 'settings.sendMode.autoNative' : 'settings.sendMode.autoServer') },
              { value: 'proxy', label: t('settings.sendMode.proxy') },
              { value: 'browser', label: t('settings.sendMode.browser') },
            ]}
            ariaLabel={t('settings.sendMode.label')}
            testId="select-send-mode"
            block
          />
          <span className="hint">
            {t(isDesktop() ? 'settings.sendMode.desktop' : PROXY_COPY[proxyStatus])}
          </span>
        </div>

        <div className="stack" style={{ gap: 6 }}>
          <Label className="section-label m-0" htmlFor="settings-timeout">{t('settings.timeout.label')}</Label>
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
          <Label htmlFor="checkbox-follow-redirects" className="font-normal">{t('settings.followRedirects')}</Label>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="checkbox-persist-responses"
            checked={settings.persistResponses}
            onCheckedChange={(checked) => dispatch({ type: 'settings/update', patch: { persistResponses: checked === true } })}
            data-testid="checkbox-persist-responses"
          />
          <Label htmlFor="checkbox-persist-responses" className="font-normal">{t('settings.persistResponses')}</Label>
        </div>


        {isDesktop() ? <UpdatesSection /> : null}

        <div>
          <div className="section-label">{t('settings.data.label')}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button variant="secondary" onClick={() => void exportWorkspace()} data-testid="button-export-workspace">
              <Download /> {t('settings.data.export')}
            </Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()} data-testid="button-import-workspace">
              <Upload /> {t('settings.data.import')}
            </Button>
            <Button variant="destructive"
              onClick={() => {
                dispatch({ type: 'state/replace', state: createSeedState(t) });
                toast({ title: t('settings.data.resetDone'), kind: 'info' });
                onClose();
              }}
              data-testid="button-reset-workspace"
            >
              {t('settings.data.reset')}
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
            {t('settings.data.hint')}
          </p>
        </div>

        <div className="about-line">
          <span className="brand-mark" style={{ width: 18, height: 18 }}>
            <AppMark size={11} />
          </span>
          <strong>Carom</strong>
          <span className="mono">{APP_VERSION}</span>
          <span className="spacer" />
          <span>{t(isDesktop() ? 'settings.about.desktop' : 'settings.about.web')}</span>
        </div>
        </TabsContent>

        <TabsContent value="theme" className="stack" style={{ gap: 16 }}>
        <div className="stack" style={{ gap: 6 }}>
          <Label className="section-label m-0">{t('settings.theme.label')}</Label>
          <SelectField
            value={settings.theme}
            onChange={(theme: ThemeName) => dispatch({ type: 'settings/update', patch: { theme } })}
            options={[
              { value: 'dark', label: t('settings.theme.dark') },
              { value: 'light', label: t('settings.theme.light') },
              { value: 'system', label: t('settings.theme.system') },
            ]}
            ariaLabel={t('settings.theme.label')}
            testId="select-theme"
            block
          />
        </div>

        <PaletteEditor />

        <FontThemeEditor />

        <div>
          <div className="section-label">
            {t('settings.json.label')}
            <span className="spacer" />
            <SelectField
              value=""
              onChange={(name) => {
                const preset = JSON_THEME_PRESETS[name];
                if (preset) dispatch({ type: 'settings/update', patch: { jsonTheme: { ...preset } } });
              }}
              options={Object.keys(JSON_THEME_PRESETS).map((name) => ({ value: name, label: name }))}
              placeholder={t('settings.json.presets')}
              ariaLabel={t('settings.json.presetAria')}
              testId="select-json-preset"
            />
          </div>
          <div className="color-rows">
            {JSON_COLOR_FIELDS.map(({ field, label, sample }) => (
              <div className="color-row" key={field}>
                <Label htmlFor={`json-color-${field}`} className="font-normal">{t(label)}</Label>
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
            {t('settings.json.hint')}
          </p>
        </div>
        </TabsContent>
      </Tabs>
    </Dialog>
  );
}
