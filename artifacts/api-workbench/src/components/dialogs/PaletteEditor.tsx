import { useMemo, useState } from 'react';
import { Copy, Shuffle, Trash2, Undo2 } from 'lucide-react';
import { SelectField } from '@/components/common/SelectField';
import { IconButton } from '@/components/common/IconButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DEFAULT_PALETTE,
  TOKEN_GROUPS,
  accentHover,
  allPalettes,
  expandHex,
  duplicatePalette,
  isBuiltInPalette,
  paletteById,
  readTokens,
  withDerived,
  type Palette,
  type PaletteTokens,
} from '@/lib/themes';
import { randomPalette } from '@/lib/palette-random';
import { useWorkspace } from '@/state/workspace-store';

/**
 * Pick a palette, generate one, or work one out by hand.
 *
 * Two things were wrong with the version before this, and both made editing
 * feel like it half worked. The translucent tokens — every hover, every
 * selected row, every dialog backdrop — were copied once and never moved
 * again, so changing a background left them behind; they are derived now. And
 * a built-in could not be edited at all, so dragging a colour while using the
 * palette everybody starts on did nothing whatsoever: the first edit now makes
 * the copy for you and carries on into it.
 */
export function PaletteEditor() {
  const { state, dispatch } = useWorkspace();
  const settings = state.settings;
  const palettes = allPalettes(settings);
  const current = paletteById(settings, settings.palette ?? DEFAULT_PALETTE);
  /** What "Back to the last one" goes back to, after a shuffle or a switch. */
  const [undoable, setUndoable] = useState<string | undefined>(undefined);

  /**
   * Which half is edited: always the one on screen. Editing colours you cannot
   * see was the old behaviour, and it needed a paragraph of explanation.
   */
  const mode: 'dark' | 'light' =
    (document.documentElement.dataset.theme as 'dark' | 'light' | undefined) ?? 'dark';

  const save = (next: Palette[], selected?: string) =>
    dispatch({
      type: 'settings/update',
      patch: { palettes: next, ...(selected ? { palette: selected } : {}) },
    });

  const select = (id: string) => {
    setUndoable(settings.palette ?? DEFAULT_PALETTE);
    dispatch({ type: 'settings/update', patch: { palette: id } });
  };

  /**
   * Apply one colour, to a palette that can hold it.
   *
   * On a built-in that means making the copy first — the alternative is a
   * colour picker that moves and changes nothing, which is what people
   * reasonably read as broken.
   */
  const patchToken = (token: keyof PaletteTokens, value: string) => {
    const built = isBuiltInPalette(current.id);
    const target = built ? duplicatePalette(current, mode) : current;
    const owned = built ? [...(settings.palettes ?? []), target] : (settings.palettes ?? []);

    save(
      owned.map((palette) => {
        if (palette.id !== target.id) return palette;
        const half = { ...(palette[mode] as PaletteTokens), [token]: value };
        // A new accent brings a new hover with it, so the pair never drifts
        // into "the button changed but hovering it did not". Setting the hover
        // by hand afterwards still wins; this only moves it when the accent
        // moves out from under it.
        if (token === '--accent') half['--accent-hover'] = accentHover(value, mode);
        return { ...palette, [mode]: withDerived(half, mode) };
      }),
      target.id,
    );
  };

  const rename = (name: string) =>
    save((settings.palettes ?? []).map((palette) => (palette.id === current.id ? { ...palette, name } : palette)));

  const duplicate = () => {
    const copy = duplicatePalette(current, mode);
    save([...(settings.palettes ?? []), copy], copy.id);
  };

  const surprise = () => {
    const generated = randomPalette();
    setUndoable(settings.palette ?? DEFAULT_PALETTE);
    save([...(settings.palettes ?? []), generated], generated.id);
  };

  const undo = () => {
    if (!undoable) return;
    dispatch({ type: 'settings/update', patch: { palette: undoable } });
    setUndoable(undefined);
  };

  const remove = () => {
    save((settings.palettes ?? []).filter((palette) => palette.id !== current.id), DEFAULT_PALETTE);
    setUndoable(undefined);
  };

  /*
    The default palette carries no tokens of its own — that is what keeps it in
    step with the stylesheet — so the pickers have to ask the browser what the
    stylesheet currently says. Without this, the one palette everybody starts
    on offered nothing to edit.
  */
  const tokens = useMemo(() => current[mode] ?? readTokens(mode), [current, mode]);
  const owned = !isBuiltInPalette(current.id);

  return (
    <div className="stack" style={{ gap: 8 }}>
      <Label className="section-label m-0">Colours</Label>
      <div className="flex items-center gap-2">
        <SelectField
          value={current.id}
          onChange={select}
          options={palettes.map((palette) => ({ value: palette.id, label: `${palette.name} — ${palette.note}` }))}
          ariaLabel="Colour palette"
          testId="select-palette"
          block
          className="flex-1"
        />
        <IconButton label="Duplicate this palette" onClick={duplicate} testId="button-duplicate-palette">
          <Copy />
        </IconButton>
        {owned ? (
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
              onClick={() => select(palette.id)}
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

      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={surprise} data-testid="button-random-palette">
          <Shuffle size={12} /> Surprise me
        </Button>
        {undoable ? (
          <Button variant="ghost" size="sm" onClick={undo} data-testid="button-undo-palette">
            <Undo2 size={12} /> Back to the last one
          </Button>
        ) : null}
      </div>

      {/*
        The states you cannot check by looking at the screen you are on: what a
        row looks like under the pointer, what a selected one looks like, and
        what the accent does when hovered. Those are exactly the tokens an edit
        used to leave behind, so this is where you see that it no longer does.
      */}
      <div className="palette-sample" data-testid="palette-sample">
        <div className="palette-sample-row">Ordinary row</div>
        <div className="palette-sample-row hovered">Under the pointer</div>
        <div className="palette-sample-row selected">Selected</div>
        <div className="palette-sample-buttons">
          <span className="palette-sample-button">Button</span>
          <span className="palette-sample-button hovered">Hovered</span>
          <span className="palette-sample-soft">Soft wash</span>
        </div>
        <div className="palette-sample-text">
          <span style={{ color: 'var(--text-strong)' }}>Strong</span>
          <span style={{ color: 'var(--text)' }}>Body</span>
          <span style={{ color: 'var(--text-dim)' }}>Dim</span>
          <span style={{ color: 'var(--text-faint)' }}>Faint</span>
        </div>
      </div>

      {owned ? (
        <>
          <Label className="section-label m-0" htmlFor="palette-name">Name</Label>
          <Input
            id="palette-name"
            value={current.name}
            onChange={(event) => rename(event.target.value)}
            data-testid="input-palette-name"
          />
        </>
      ) : (
        <p className="hint" data-testid="text-palette-builtin">
          This one is built in. Change any colour below and it becomes a copy you own — the built-in stays as it was.
        </p>
      )}

      <div className="section-label" data-testid="text-palette-mode">
        Editing the {mode} colours
        <span className="spacer" />
        <span>switch the theme above for the other half</span>
      </div>

      {TOKEN_GROUPS.map((group) => (
        <div className="palette-group" key={group.title} data-testid={`palette-group-${group.title.toLowerCase()}`}>
          <div className="palette-group-head">
            <strong>{group.title}</strong>
            <span>{group.note}</span>
          </div>
          <div className="color-rows">
            {group.tokens.map(({ token, label }) => (
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
        </div>
      ))}

      <p className="hint">
        Hovers, selections and the dialog backdrop are worked out from these rather than picked: they are
        see-through, and a colour picker has no transparency to give them. That is why they now follow a change of
        background instead of staying behind.
      </p>
    </div>
  );
}
