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
  const { state, dispatch } = useWorkspace();
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
    const copy = duplicateFont(current);
    saveThemes([...(settings.fontThemes ?? []), copy], copy.id);
    setEditing(true);
  };

  const remove = () => {
    saveThemes((settings.fontThemes ?? []).filter((theme) => theme.id !== current.id), DEFAULT_FONT);
    setEditing(false);
  };

  return (
    <div className="stack" style={{ gap: 6 }}>
      <Label className="section-label m-0">Fonts</Label>
      <div className="flex items-center gap-2">
        <SelectField
          value={current.id}
          onChange={(id) => {
            dispatch({ type: 'settings/update', patch: { fontTheme: id } });
            setEditing(false);
          }}
          options={themes.map((theme) => ({
            value: theme.id,
            label: `${theme.name}${theme.scale === 1 ? '' : ` · ${Math.round(theme.scale * 100)}%`}`,
          }))}
          ariaLabel="Font theme"
          testId="select-font-theme"
          block
          className="flex-1"
        />
        <IconButton label="Duplicate and edit" onClick={duplicate} testId="button-duplicate-font">
          <Copy />
        </IconButton>
        {editable ? (
          <IconButton label="Delete this font theme" tone="danger" onClick={remove} testId="button-delete-font">
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
          {editing ? 'Done editing' : 'Edit'}
        </Button>
      ) : (
        <p className="hint" data-testid="text-font-builtin">
          Built in, so it cannot be edited. Duplicate it to make one you can.
        </p>
      )}

      {editable && editing ? (
        <div className="stack" style={{ gap: 6 }} data-testid="font-editor">
          <Label className="section-label m-0" htmlFor="font-name">Name</Label>
          <Input
            id="font-name"
            value={current.name}
            onChange={(event) => patchCurrent({ name: event.target.value })}
            data-testid="input-font-name"
          />

          <Label className="section-label m-0" htmlFor="font-sans">Interface font</Label>
          <Input
            id="font-sans"
            className="font-mono text-[12.5px]"
            value={current.sans}
            spellCheck={false}
            onChange={(event) => patchCurrent({ sans: event.target.value })}
            data-testid="input-font-sans"
          />

          <Label className="section-label m-0" htmlFor="font-mono">Code font</Label>
          <Input
            id="font-mono"
            className="font-mono text-[12.5px]"
            value={current.mono}
            spellCheck={false}
            onChange={(event) => patchCurrent({ mono: event.target.value })}
            data-testid="input-font-mono"
          />

          <Label className="section-label m-0">Size</Label>
          <SelectField
            value={String(current.scale)}
            onChange={(value) => patchCurrent({ scale: Number(value) })}
            options={FONT_SCALES.map((scale) => ({
              value: String(scale),
              label: `${Math.round(scale * 100)}%${scale === 1 ? ' — as drawn' : ''}`,
            }))}
            ariaLabel="Interface size"
            testId="select-font-scale"
            block
          />

          <p className="hint">
            A CSS font stack: names separated by commas, quoted when they contain a space, with a family the system is
            sure to have at the end. Only fonts installed on this machine are available — nothing is downloaded.
          </p>
        </div>
      ) : null}
    </div>
  );
}
