import { useState } from 'react';
import { Copy, Trash2 } from 'lucide-react';
import { SelectField } from '@/components/common/SelectField';
import { IconButton } from '@/components/common/IconButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DEFAULT_FONT,
  FONT_SCALES,
  duplicateFont,
  fontById,
  fontThemes,
  isBuiltInFont,
  type FontTheme,
} from '@/lib/themes';
import { useWorkspace } from '@/state/workspace-store';

/**
 * Pick a font theme, or make one.
 *
 * A built-in cannot be edited, and does not need to be: "Duplicate" makes a
 * copy that can, which is both the way to a new theme and the way to a small
 * change to an existing one. The example that ships alongside the default
 * changes all three fields, so duplicating it shows what each one does.
 */
export function FontThemeEditor() {
  const { state, dispatch, t } = useWorkspace();

  /**
   * What a font theme is called on screen.
   *
   * Carom is a name; "System, larger" is a description of what that theme does,
   * and a description belongs in the reader's language. One you made carries
   * whatever you typed.
   */
  const fontName = (theme: FontTheme) => (theme.nameKey ? t(theme.nameKey) : theme.name);
  const settings = state.settings;
  const themes = fontThemes(settings);
  const current = fontById(settings, settings.fontTheme);
  const editable = !isBuiltInFont(current.id);
  const [editing, setEditing] = useState(false);

  const saveThemes = (next: FontTheme[], selected?: string) =>
    dispatch({
      type: 'settings/update',
      patch: { fontThemes: next, ...(selected ? { fontTheme: selected } : {}) },
    });

  const patchCurrent = (patch: Partial<FontTheme>) =>
    saveThemes((settings.fontThemes ?? []).map((theme) => (theme.id === current.id ? { ...theme, ...patch } : theme)));

  const duplicate = () => {
    const copy = duplicateFont(current, t('palette.copyName', { name: fontName(current) }));
    saveThemes([...(settings.fontThemes ?? []), copy], copy.id);
    setEditing(true);
  };

  const remove = () => {
    saveThemes((settings.fontThemes ?? []).filter((theme) => theme.id !== current.id), DEFAULT_FONT);
    setEditing(false);
  };

  return (
    <div className="stack" style={{ gap: 6 }}>
      <Label className="section-label m-0">{t('font.label')}</Label>
      <div className="flex items-center gap-2">
        <SelectField
          value={current.id}
          onChange={(id) => {
            dispatch({ type: 'settings/update', patch: { fontTheme: id } });
            setEditing(false);
          }}
          options={themes.map((theme) => ({
            value: theme.id,
            label:
              theme.scale === 1
                ? fontName(theme)
                : t('font.option', { name: fontName(theme), scale: Math.round(theme.scale * 100) }),
          }))}
          ariaLabel={t('font.themeAria')}
          testId="select-font-theme"
          block
          className="flex-1"
        />
        <IconButton label={t('font.duplicate')} onClick={duplicate} testId="button-duplicate-font">
          <Copy />
        </IconButton>
        {editable ? (
          <IconButton label={t('font.delete')} tone="danger" onClick={remove} testId="button-delete-font">
            <Trash2 />
          </IconButton>
        ) : null}
      </div>

      {editable ? (
        <Button
          variant="ghost"
          size="sm"
          className="justify-self-start"
          onClick={() => setEditing((open) => !open)}
          data-testid="button-edit-font"
        >
          {t(editing ? 'font.doneEditing' : 'font.edit')}
        </Button>
      ) : (
        <p className="hint" data-testid="text-font-builtin">
          {t('font.builtIn')}
        </p>
      )}

      {editable && editing ? (
        <div className="stack" style={{ gap: 6 }} data-testid="font-editor">
          <Label className="section-label m-0" htmlFor="font-name">{t('common.name')}</Label>
          <Input
            id="font-name"
            value={current.name}
            onChange={(event) => patchCurrent({ name: event.target.value })}
            data-testid="input-font-name"
          />

          <Label className="section-label m-0" htmlFor="font-sans">{t('font.interface')}</Label>
          <Input
            id="font-sans"
            className="font-mono text-[length:var(--fs-12-5)]"
            value={current.sans}
            spellCheck={false}
            onChange={(event) => patchCurrent({ sans: event.target.value })}
            data-testid="input-font-sans"
          />

          <Label className="section-label m-0" htmlFor="font-mono">{t('font.code')}</Label>
          <Input
            id="font-mono"
            className="font-mono text-[length:var(--fs-12-5)]"
            value={current.mono}
            spellCheck={false}
            onChange={(event) => patchCurrent({ mono: event.target.value })}
            data-testid="input-font-mono"
          />

          <Label className="section-label m-0">{t('font.size')}</Label>
          <SelectField
            value={String(current.scale)}
            onChange={(value) => patchCurrent({ scale: Number(value) })}
            options={FONT_SCALES.map((scale) => ({
              value: String(scale),
              label: t(scale === 1 ? 'font.scaleDefault' : 'font.scale', { scale: Math.round(scale * 100) }),
            }))}
            ariaLabel={t('font.sizeAria')}
            testId="select-font-scale"
            block
          />

          <p className="hint">
            {t('font.stackHint')}
          </p>
        </div>
      ) : null}
    </div>
  );
}
