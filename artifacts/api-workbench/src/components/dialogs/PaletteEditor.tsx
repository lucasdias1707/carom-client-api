import { useState } from 'react';
import { Copy, Trash2 } from 'lucide-react';
import { SelectField } from '@/components/common/SelectField';
import { IconButton } from '@/components/common/IconButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DEFAULT_PALETTE,
  EDITABLE_TOKENS,
  allPalettes,
  expandHex,
  duplicatePalette,
  isBuiltInPalette,
  paletteById,
  softAccent,
  type Palette,
  type PaletteTokens,
} from '@/lib/themes';
import { useWorkspace } from '@/state/workspace-store';

/**
 * Pick a palette, or make one.
 *
 * Same shape as the font themes, for the same reason: a built-in cannot be
 * edited and does not need to be, because Duplicate makes a copy that can.
 *
 * The pickers edit the half that is on screen. A palette carries both, so the
 * copy starts with both filled in — otherwise switching to light would land on
 * a palette that has nothing to say about light.
 */
export function PaletteEditor() {
  const { state, dispatch } = useWorkspace();
  const settings = state.settings;
  const palettes = allPalettes(settings);
  const current = paletteById(settings, settings.palette ?? DEFAULT_PALETTE);
  const editable = !isBuiltInPalette(current.id);
  const [editing, setEditing] = useState(false);

  /** Which half the pickers write to: whatever is being looked at right now. */
  const mode: 'dark' | 'light' =
    (document.documentElement.dataset.theme as 'dark' | 'light' | undefined) ?? 'dark';

  const save = (next: Palette[], selected?: string) =>
    dispatch({
      type: 'settings/update',
      patch: { palettes: next, ...(selected ? { palette: selected } : {}) },
    });

  const patchToken = (token: keyof PaletteTokens, value: string) =>
    save(
      (settings.palettes ?? []).map((palette) => {
        if (palette.id !== current.id) return palette;
        const half = { ...(palette[mode] as PaletteTokens), [token]: value };
        // The soft wash is the accent at 16%; letting it keep the old accent
        // would leave every selected row tinted the colour you just replaced.
        if (token === '--accent') half['--accent-soft'] = softAccent(value);
        return { ...palette, [mode]: half };
      }),
    );

  const duplicate = () => {
    const copy = duplicatePalette(current, mode);
    save([...(settings.palettes ?? []), copy], copy.id);
    setEditing(true);
  };

  const remove = () => {
    save((settings.palettes ?? []).filter((palette) => palette.id !== current.id), DEFAULT_PALETTE);
    setEditing(false);
  };

  const tokens = current[mode];

  return (
    <div className="stack" style={{ gap: 6 }}>
      <Label className="section-label m-0">Colours</Label>
      <div className="flex items-center gap-2">
        <SelectField
          value={current.id}
          onChange={(palette) => {
            dispatch({ type: 'settings/update', patch: { palette } });
            setEditing(false);
          }}
          options={palettes.map((palette) => ({ value: palette.id, label: `${palette.name} — ${palette.note}` }))}
          ariaLabel="Colour palette"
          testId="select-palette"
          block
          className="flex-1"
        />
        <IconButton label="Duplicate and edit" onClick={duplicate} testId="button-duplicate-palette">
          <Copy />
        </IconButton>
        {editable ? (
          <IconButton label="Delete this palette" tone="danger" onClick={remove} testId="button-delete-palette">
            <Trash2 />
          </IconButton>
        ) : null}
      </div>

      <div className="palette-swatches" data-testid="palette-swatches">
        {palettes.map((palette) => {
          const preview = palette[mode] ?? palette.dark ?? palette.light;
          const active = current.id === palette.id;
          return (
            <button
              key={palette.id}
              className={`palette-swatch ${active ? 'active' : ''}`}
              onClick={() => dispatch({ type: 'settings/update', patch: { palette: palette.id } })}
              aria-label={palette.name}
              aria-pressed={active}
              data-testid={`button-palette-${palette.id}`}
            >
              {/* The default carries no tokens of its own; it previews with the
                  ones in force, which is exactly what choosing it applies. */}
              <span style={{ background: preview?.['--bg-app'] ?? 'var(--bg-app)' }} />
              <span style={{ background: preview?.['--bg-raised'] ?? 'var(--bg-raised)' }} />
              <span style={{ background: preview?.['--accent'] ?? 'var(--accent)' }} />
            </button>
          );
        })}
      </div>

      {editable ? (
        <Button
          variant="ghost"
          size="sm"
          className="justify-self-start"
          onClick={() => setEditing((open) => !open)}
          data-testid="button-edit-palette"
        >
          {editing ? 'Done editing' : 'Edit colours'}
        </Button>
      ) : (
        <p className="hint" data-testid="text-palette-builtin">
          Built in, so it cannot be edited. Duplicate it to make one you can.
        </p>
      )}

      {editable && editing && tokens ? (
        <div className="stack" style={{ gap: 6 }} data-testid="palette-editor">
          <Label className="section-label m-0" htmlFor="palette-name">Name</Label>
          <Input
            id="palette-name"
            value={current.name}
            onChange={(event) =>
              save((settings.palettes ?? []).map((p) => (p.id === current.id ? { ...p, name: event.target.value } : p)))
            }
            data-testid="input-palette-name"
          />

          <div className="section-label">Editing the {mode} half</div>
          <div className="color-rows">
            {EDITABLE_TOKENS.map(({ token, label }) => (
              <div className="color-row" key={token}>
                <Label htmlFor={`token${token}`} className="font-normal">{label}</Label>
                <input
                  id={`token${token}`}
                  type="color"
                  value={expandHex(tokens[token])}
                  onChange={(event) => patchToken(token, event.target.value)}
                  data-testid={`input-token-${token.slice(2)}`}
                />
                <span className="color-sample mono">{tokens[token]}</span>
              </div>
            ))}
          </div>
          <p className="hint">
            Switch the theme above to dark or light to edit that half — the pickers write to whichever one is on
            screen. The translucent tokens, the hover and the overlay, come from the palette this was copied from;
            a colour picker has no transparency to give them.
          </p>
        </div>
      ) : null}
    </div>
  );
}
