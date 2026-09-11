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
  const { state, dispatch, t } = useWorkspace();
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
    const target = built ? duplicatePalette(current, mode, copyLabels()) : current;
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

  /**
   * The words a copy is created with. Written into the palette once, not
   * looked up on every render: from the moment it exists it is yours, and a
   * later change of language renaming something you can rename yourself would
   * be the app editing your data.
   */
  const copyLabels = () => ({
    name: t('palette.copyName', { name: current.name }),
    note: t('palette.note.yours'),
  });

  const duplicate = () => {
    const copy = duplicatePalette(current, mode, copyLabels());
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
      <Label className="section-label m-0">{t('palette.coloursLabel')}</Label>

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
            {t('palette.discard')}
          </Button>
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <SelectField
          value={current.id}
          onChange={(id) => (id === DRAFT_PALETTE ? resumeDraft() : select(id))}
          options={[
            ...palettes.map((palette) => ({
              value: palette.id,
              label: t('palette.option', {
                name: palette.name,
                note: palette.noteKey ? t(palette.noteKey) : (palette.note ?? ''),
              }),
            })),
            // While a draft exists it has to be listed, or the field shows
            // nothing at all whenever the generated palette is the one on
            // screen. It leaves the list again the moment it is saved or
            // dropped.
            ...(draft ? [{ value: DRAFT_PALETTE, label: t('palette.notSaved', { name: draft.name }) }] : []),
          ]}
          ariaLabel={t('palette.label')}
          testId="select-palette"
          block
          className="flex-1"
        />
        <IconButton label={t('palette.duplicate')} onClick={duplicate} testId="button-duplicate-palette">
          <Copy />
        </IconButton>
        {owned && !drafting ? (
          <IconButton label={t('palette.delete')} tone="danger" onClick={remove} testId="button-delete-palette">
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
            aria-label={t('palette.notSavedAria', { name: draft.name })}
            aria-pressed={drafting}
            title={t('palette.notSaved', { name: draft.name })}
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
            aria-label={t('palette.draftName')}
            data-testid="input-draft-name"
          />
          <div className="palette-draft-actions">
            <Button variant="secondary" size="sm" onClick={surprise} data-testid="button-random-palette">
              <Shuffle size={12} /> {t('palette.shuffle')}
            </Button>
            <span className="spacer" />
            <Button variant="ghost" size="sm" onClick={discardDraft} data-testid="button-discard-palette">
              <X size={12} /> {t('palette.discard')}
            </Button>
            <Button size="sm" onClick={keepDraft} data-testid="button-save-palette">
              <Check size={12} /> {t('common.save')}
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
        <div className="palette-sample-row">{t('palette.sample.row')}</div>
        <div className="palette-sample-row hovered">{t('palette.sample.hovered')}</div>
        <div className="palette-sample-row selected">{t('palette.sample.selected')}</div>
        <div className="palette-sample-buttons">
          <span className="palette-sample-button">{t('palette.sample.button')}</span>
          <span className="palette-sample-button hovered">{t('palette.sample.buttonHovered')}</span>
          <span className="palette-sample-soft">{t('palette.sample.soft')}</span>
        </div>
        <div className="palette-sample-text">
          <span style={{ color: 'var(--text-strong)' }}>{t('palette.sample.strong')}</span>
          <span style={{ color: 'var(--text)' }}>{t('palette.sample.body')}</span>
          <span style={{ color: 'var(--text-dim)' }}>{t('palette.sample.dim')}</span>
          <span style={{ color: 'var(--text-faint)' }}>{t('palette.sample.faint')}</span>
        </div>
      </div>

      {drafting ? null : owned ? (
        <>
          <Label className="section-label m-0" htmlFor="palette-name">{t('common.name')}</Label>
          <Input
            id="palette-name"
            value={current.name}
            onChange={(event) => rename(event.target.value)}
            data-testid="input-palette-name"
          />
        </>
      ) : (
        <p className="hint" data-testid="text-palette-builtin">
          {t('palette.builtIn')}
        </p>
      )}

      <div className="section-label" data-testid="text-palette-mode">
        {t(mode === 'dark' ? 'palette.editingDark' : 'palette.editingLight')}
        <span className="spacer" />
        <span>{t('palette.switchTheme')}</span>
      </div>

      {TOKEN_GROUPS.map((group) => (
        <div className="palette-group" key={group.id} data-testid={`palette-group-${group.id}`}>
          <div className="palette-group-head">
            <strong>{t(group.title)}</strong>
            <span>{t(group.note)}</span>
          </div>
          <div className="color-rows">
            {group.tokens.map(({ token, label }) => (
              <div className="color-row" key={token}>
                <Label htmlFor={`token${token}`} className="font-normal">{t(label)}</Label>
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
        {t('palette.derivedHint')}
      </p>
    </div>
  );
}
