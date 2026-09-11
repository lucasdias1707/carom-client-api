import { useMemo, useState } from 'react';
import { Check, Copy, Shuffle, Trash2, Undo2, X } from 'lucide-react';
import { SelectField } from '@/components/common/SelectField';
import { IconButton } from '@/components/common/IconButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DEFAULT_PALETTE,
  DRAFT_PALETTE,
  TOKEN_GROUPS,
  accentHover,
  allPalettes,
  expandHex,
  duplicatePalette,
  isBuiltInPalette,
  paletteById,
  readTokens,
  withDerived,
  type DraftPalette,
  type Palette,
  type PaletteTokens,
} from '@/lib/themes';
import { randomPalette } from '@/lib/palette-random';
import { createId } from '@/lib/id';
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
 *
 * Generating is a draft, for the same reason a request edit is. Every shuffle
 * used to save a palette, so hunting for one you liked left a dropdown full of
 * the ones you had already rejected. Now the shuffle repaints a single record
 * and only Save keeps it.
 */
export function PaletteEditor() {
  const { state, dispatch } = useWorkspace();
  const settings = state.settings;
  const palettes = allPalettes(settings);
  const current = paletteById(settings, settings.palette ?? DEFAULT_PALETTE);
  /** What "Back to the last one" goes back to after switching palettes. */
  const [undoable, setUndoable] = useState<string | undefined>(undefined);
  const draft = settings.draftPalette;
  /** True while the draft is the palette being previewed, not merely stored. */
  const drafting = Boolean(draft) && current.id === DRAFT_PALETTE;

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
    // The draft is left where it is rather than thrown away: choosing another
    // palette to compare against is not the same as rejecting the generated
    // one, and losing it to a click would be the worst way to find that out.
    // The notice above offers it back.
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
    /** The one token change, with everything that follows from it. */
    const repaint = (palette: Palette): Palette => {
      const half = { ...(palette[mode] as PaletteTokens), [token]: value };
      // A new accent brings a new hover with it, so the pair never drifts
      // into "the button changed but hovering it did not". Setting the hover
      // by hand afterwards still wins; this only moves it when the accent
      // moves out from under it.
      if (token === '--accent') half['--accent-hover'] = accentHover(value, mode);
      return { ...palette, [mode]: withDerived(half, mode) };
    };

    // The draft lives in its own slot rather than in the list, so an edit
    // aimed at the list would have found nothing to change — the same silent
    // no-op the built-ins used to have. Adjusting a generated colour by hand
    // before saving it has to work.
    if (drafting && draft) {
      dispatch({ type: 'settings/update', patch: { draftPalette: { ...draft, ...repaint(draft) } } });
      return;
    }

    const built = isBuiltInPalette(current.id);
    const target = built ? duplicatePalette(current, mode) : current;
    const owned = built ? [...(settings.palettes ?? []), target] : (settings.palettes ?? []);

    save(
      owned.map((palette) => (palette.id === target.id ? repaint(palette) : palette)),
      target.id,
    );
  };

  const rename = (name: string) => {
    if (drafting && draft) {
      dispatch({ type: 'settings/update', patch: { draftPalette: { ...draft, name } } });
      return;
    }
    save((settings.palettes ?? []).map((palette) => (palette.id === current.id ? { ...palette, name } : palette)));
  };

  const duplicate = () => {
    const copy = duplicatePalette(current, mode);
    save([...(settings.palettes ?? []), copy], copy.id);
  };

  /**
   * Generate, into the one draft slot.
   *
   * `from` is only written the first time: shuffling again is still the same
   * decision in progress, so Discard should go back to where you were before
   * any of it, not to the previous roll.
   */
  const surprise = () => {
    const from = draft?.from ?? settings.palette ?? DEFAULT_PALETTE;
    const generated: DraftPalette = { ...randomPalette(Math.random, DRAFT_PALETTE), from };
    dispatch({ type: 'settings/update', patch: { draftPalette: generated, palette: DRAFT_PALETTE } });
    setUndoable(undefined);
  };

  /** Keep it: a real id, into the list, and the slot is free again. */
  const keepDraft = () => {
    if (!draft) return;
    const kept: Palette = {
      id: createId('pal'),
      name: draft.name,
      note: draft.note,
      dark: draft.dark,
      light: draft.light,
    };
    dispatch({
      type: 'settings/update',
      patch: { palettes: [...(settings.palettes ?? []), kept], palette: kept.id, draftPalette: undefined },
    });
  };

  const discardDraft = () => {
    dispatch({
      type: 'settings/update',
      patch: { palette: draft?.from ?? DEFAULT_PALETTE, draftPalette: undefined },
    });
  };

  const resumeDraft = () => dispatch({ type: 'settings/update', patch: { palette: DRAFT_PALETTE } });

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
  /**
   * What the built-ins with no tokens of their own look like — Carom, which
   * is the stylesheet itself. Read once per half rather than per swatch.
   */
  const shipped = useMemo(() => readTokens(mode), [mode]);
  const owned = !isBuiltInPalette(current.id);

  return (
    <div className="stack" style={{ gap: 8 }}>
      <Label className="section-label m-0">Colours</Label>

      {draft && !drafting ? (
        <div className="palette-notice" data-testid="notice-palette-draft">
          <span>
            <strong>{draft.name}</strong> was generated and never saved.
          </span>
          <span className="spacer" />
          <Button variant="ghost" size="sm" onClick={resumeDraft} data-testid="button-resume-palette">
            Back to it
          </Button>
          <Button variant="ghost" size="sm" onClick={discardDraft} data-testid="button-drop-palette">
            Discard
          </Button>
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <SelectField
          value={current.id}
          onChange={(id) => (id === DRAFT_PALETTE ? resumeDraft() : select(id))}
          options={[
            ...palettes.map((palette) => ({ value: palette.id, label: `${palette.name} — ${palette.note}` })),
            // While a draft exists it has to be listed, or the field shows
            // nothing at all whenever the generated palette is the one on
            // screen. It leaves the list again the moment it is saved or
            // dropped.
            ...(draft ? [{ value: DRAFT_PALETTE, label: `${draft.name} — not saved` }] : []),
          ]}
          ariaLabel="Colour palette"
          testId="select-palette"
          block
          className="flex-1"
        />
        <IconButton label="Duplicate this palette" onClick={duplicate} testId="button-duplicate-palette">
          <Copy />
        </IconButton>
        {owned && !drafting ? (
          <IconButton label="Delete this palette" tone="danger" onClick={remove} testId="button-delete-palette">
            <Trash2 />
          </IconButton>
        ) : null}
      </div>

      <div className="palette-swatches" data-testid="palette-swatches">
        {palettes.map((palette) => {
          const preview = palette[mode] ?? palette.dark ?? palette.light ?? shipped;
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
              {/* The default carries no tokens of its own, so it previews with
                  what the stylesheet says. It used to preview with `var(...)`
                  — the colours *in force* — which made Carom's swatch take on
                  the appearance of whichever palette you had chosen instead. */}
              <span style={{ background: preview['--bg-app'] }} />
              <span style={{ background: preview['--bg-raised'] }} />
              <span style={{ background: preview['--accent'] }} />
            </button>
          );
        })}
        {/* The one on trial, dashed so it does not read as one of the kept. */}
        {draft ? (
          <button
            className={`palette-swatch draft ${drafting ? 'active' : ''}`}
            onClick={resumeDraft}
            aria-label={`${draft.name}, not saved`}
            aria-pressed={drafting}
            title={`${draft.name} — not saved`}
            data-testid="button-palette-draft"
          >
            <span style={{ background: draft[mode]?.['--bg-app'] }} />
            <span style={{ background: draft[mode]?.['--bg-raised'] }} />
            <span style={{ background: draft[mode]?.['--accent'] }} />
          </button>
        ) : null}
      </div>

      {drafting ? (
        /*
          Everything the generated palette needs while it is being judged, and
          nothing that would save it by accident. Shuffling again lands in the
          same slot, so this strip never becomes a list.
        */
        <div className="palette-draft" data-testid="palette-draft">
          <Input
            value={draft?.name ?? ''}
            onChange={(event) => rename(event.target.value)}
            aria-label="Name for the generated palette"
            data-testid="input-draft-name"
          />
          <div className="palette-draft-actions">
            <Button variant="secondary" size="sm" onClick={surprise} data-testid="button-random-palette">
              <Shuffle size={12} /> Shuffle again
            </Button>
            <span className="spacer" />
            <Button variant="ghost" size="sm" onClick={discardDraft} data-testid="button-discard-palette">
              <X size={12} /> Discard
            </Button>
            <Button size="sm" onClick={keepDraft} data-testid="button-save-palette">
              <Check size={12} /> Save
            </Button>
          </div>
          <p className="hint">
            Nothing is kept until you press Save. Shuffling again replaces this one rather than adding another.
          </p>
        </div>
      ) : (
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
      )}

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

      {drafting ? null : owned ? (
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
