import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Copy, Crosshair, Plus, Search, X, XCircle } from 'lucide-react';
import { ContextMenu, type MenuEntry } from '@/components/common/ContextMenu';
import { IconButton } from '@/components/common/IconButton';
import { useWorkspace } from '@/state/workspace-store';

type TabStripProps = {
  /** Reveal this request in the sidebar: expand its folders and scroll to it. */
  onLocate: (id: string) => void;
  /**
   * Close these tabs, asking first about anything unsaved. The asking lives in
   * `Workbench` so ⌘W, the middle click and the menu all go through one prompt.
   */
  onClose: (ids: string[]) => void;
  /** Start a new request, and search the open ones. */
  onNew: () => void;
  onSearch: () => void;
  newHint?: string;
  searchHint?: string;
};

/** How far one press of an arrow moves the strip: half of what is on screen. */
const SCROLL_FRACTION = 0.5;

/** Open-request tabs, mirroring how a desktop client keeps several in flight. */
export function TabStrip({ onLocate, onClose, onNew, onSearch, newHint, searchHint }: TabStripProps) {
  const { state, dispatch } = useWorkspace();
  const [menu, setMenu] = useState<{ x: number; y: number; entries: MenuEntry[] } | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  /** Whether there is anything left to scroll to, on each side. */
  const [more, setMore] = useState({ left: false, right: false });

  const tabs = state.openTabIds
    .map((id) => state.requests.find((request) => request.id === id))
    .filter((request): request is NonNullable<typeof request> => Boolean(request));

  /*
    Tabs no longer shrink to fit, so the strip can genuinely run out of room —
    and a strip that scrolls without saying so is a strip whose last tab does
    not exist as far as anyone can tell. The arrows appear only when there is
    something past the edge.
  */
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const measure = () =>
      setMore({
        left: strip.scrollLeft > 1,
        right: strip.scrollLeft + strip.clientWidth < strip.scrollWidth - 1,
      });
    measure();
    strip.addEventListener('scroll', measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(strip);
    return () => {
      strip.removeEventListener('scroll', measure);
      observer.disconnect();
    };
  }, [tabs.length]);

  // Switching to a tab with the palette or ⌘W has to bring it into view, or
  // the pane changes and the strip appears not to have noticed.
  useEffect(() => {
    if (!state.activeRequestId) return;
    stripRef.current
      ?.querySelector(`[data-testid="tab-${state.activeRequestId}"]`)
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [state.activeRequestId]);

  const scrollBy = (direction: -1 | 1) => {
    const strip = stripRef.current;
    if (!strip) return;
    strip.scrollBy({ left: direction * strip.clientWidth * SCROLL_FRACTION, behavior: 'smooth' });
  };

  /**
   * Right-click a tab, act on that tab. "Close others" keeps the one that was
   * right-clicked, not the one that happens to be focused — otherwise the menu
   * would act on something the pointer is nowhere near.
   */
  const tabMenu = (id: string): MenuEntry[] => [
    {
      kind: 'item',
      label: 'Locate in the sidebar',
      icon: <Crosshair size={13} />,
      onSelect: () => onLocate(id),
    },
    {
      kind: 'item',
      label: 'Duplicate',
      icon: <Copy size={13} />,
      // The same action the sidebar's own menu dispatches, so the copy is made
      // one way rather than two.
      onSelect: () => dispatch({ type: 'request/duplicate', id }),
    },
    { kind: 'separator' },
    { kind: 'item', label: 'Close', icon: <X size={13} />, onSelect: () => onClose([id]) },
    {
      kind: 'item',
      label: 'Close others',
      icon: <XCircle size={13} />,
      onSelect: () => onClose(state.openTabIds.filter((tabId) => tabId !== id)),
    },
    { kind: 'separator' },
    {
      kind: 'item',
      label: 'Close all',
      icon: <XCircle size={13} />,
      onSelect: () => onClose(state.openTabIds),
    },
  ];

  return (
    <div className="tabstrip-bar">
      {more.left ? (
        <button className="tabstrip-arrow" onClick={() => scrollBy(-1)} aria-label="Scroll tabs left" data-testid="button-tabs-left">
          <ChevronLeft size={13} />
        </button>
      ) : null}

      <div
        className="tabstrip"
        role="tablist"
        aria-label="Open requests"
        ref={stripRef}
        // A trackpad swipes sideways on its own; a wheel only goes up and down,
        // and over a horizontal strip that is what it means to do.
        onWheel={(event) => {
          if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
          stripRef.current?.scrollBy({ left: event.deltaY });
        }}
      >
        {tabs.map((request) => {
          const active = request.id === state.activeRequestId;
          const unsaved = Boolean(state.drafts[request.id]);
          return (
            <div
              key={request.id}
              className={`tab ${active ? 'active' : ''} ${unsaved ? 'unsaved' : ''}`}
              role="tab"
              aria-selected={active}
              tabIndex={0}
              onClick={() => dispatch({ type: 'request/open', id: request.id })}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  dispatch({ type: 'request/open', id: request.id });
                }
              }}
              onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setMenu({ x: event.clientX, y: event.clientY, entries: tabMenu(request.id) });
              }}
              onAuxClick={(event) => {
                // Middle click closes, as in a browser.
                if (event.button === 1) onClose([request.id]);
              }}
              data-testid={`tab-${request.id}`}
            >
              <span className={`tab-method m-${request.method.toLowerCase()}`}>{request.method}</span>
              {/*
                The dot is the editor convention for "not saved yet". It goes
                beside the method rather than in the close button's place: the
                whole point of the width floor below is that the X is always
                there to click, and a dot that hid it would put back the thing
                it was added to fix.
              */}
              {unsaved ? (
                <span className="tab-dot" aria-label="Unsaved changes" data-testid={`dot-unsaved-${request.id}`} />
              ) : null}
              <span className="truncate">{request.name}</span>
              <button
                className="tab-close"
                onClick={(event) => {
                  event.stopPropagation();
                  onClose([request.id]);
                }}
                aria-label={`Close ${request.name}`}
                data-testid={`button-close-tab-${request.id}`}
              >
                <X size={11} />
              </button>
            </div>
          );
        })}
      </div>

      {more.right ? (
        <button className="tabstrip-arrow" onClick={() => scrollBy(1)} aria-label="Scroll tabs right" data-testid="button-tabs-right">
          <ChevronRight size={13} />
        </button>
      ) : null}

      {tabs.length > 1 ? (
        <IconButton label="Search the open tabs" hint={searchHint} onClick={onSearch} testId="button-search-tabs">
          <Search />
        </IconButton>
      ) : null}
      <IconButton label="New request" hint={newHint} onClick={onNew} testId="button-new-tab">
        <Plus />
      </IconButton>
    </div>
  );
}
