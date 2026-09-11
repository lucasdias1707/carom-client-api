import { useMemo, useState } from 'react';
import { Dices, Search } from 'lucide-react';
import { Dialog } from '@/components/common/Dialog';
import { useToast } from '@/components/common/Toaster';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DYNAMIC_GROUPS, DYNAMIC_VARIABLES, type DynamicGroup } from '@/lib/dynamic';
import { useWorkspace } from '@/state/workspace-store';
import type { MessageKey } from '@/locales/en';

const groupLabel = (group: DynamicGroup): MessageKey => `dynamic.group.${group}` as MessageKey;

/**
 * Everything the app can make up, with a live example of each.
 *
 * The example is the description. A row that says
 * `$randomFirstName → Beatriz` tells you more than a sentence would, in every
 * language at once, and it is the only documentation that cannot drift from
 * what the generator actually does.
 *
 * Clicking a row copies it **with the braces**, because that is what goes into
 * the body — copying the bare name means typing four more characters at the
 * other end, every time.
 */
export function DynamicVariablesDialog({ onClose }: { onClose: () => void }) {
  const { t } = useWorkspace();
  const { toast } = useToast();
  const [filter, setFilter] = useState('');
  /*
    Bumped by the reroll button. The samples are worked out once per seed
    rather than on every render: a list that reshuffled itself whenever React
    repainted would be unreadable, and the point of rerolling is to see the
    shape of the data, not to watch it move.
  */
  const [seed, setSeed] = useState(0);

  const samples = useMemo(
    () => new Map(DYNAMIC_VARIABLES.map((variable) => [variable.name, variable.generate()])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seed],
  );

  const needle = filter.trim().toLowerCase();
  const matches = DYNAMIC_VARIABLES.filter(
    (variable) =>
      !needle ||
      variable.name.toLowerCase().includes(needle) ||
      (samples.get(variable.name) ?? '').toLowerCase().includes(needle),
  );

  const copy = async (name: string) => {
    const text = `{{${name}}}`;
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: t('dynamic.copied', { name: text }), kind: 'success' });
    } catch (error) {
      toast({
        title: t('request.copyFailed'),
        description: error instanceof Error ? error.message : undefined,
        kind: 'error',
      });
    }
  };

  return (
    <Dialog
      title={t('dynamic.title')}
      description={t('dynamic.description')}
      onClose={onClose}
      wide
      testId="dialog-dynamic-variables"
      footer={
        <>
          <Button variant="ghost" onClick={() => setSeed((current) => current + 1)} data-testid="button-reroll-samples">
            <Dices size={13} /> {t('dynamic.reroll')}
          </Button>
          <span className="flex-1" />
          <span className="hint">{t('dynamic.count', { count: DYNAMIC_VARIABLES.length })}</span>
          <Button onClick={onClose}>{t('common.done')}</Button>
        </>
      }
    >
      <div className="stack" style={{ gap: 10 }}>
        <div className="pane-toolbar" style={{ paddingLeft: 6 }}>
          <Search size={13} style={{ color: 'var(--text-faint)' }} />
          <Input
            className="h-6 border-0 bg-transparent px-1"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder={t('dynamic.filter')}
            aria-label={t('dynamic.filter')}
            data-autofocus
            data-testid="input-dynamic-filter"
          />
        </div>

        <p className="hint" style={{ margin: 0 }}>{t('dynamic.copyHint')}</p>

        {matches.length === 0 ? (
          <div className="tree-empty" data-testid="text-dynamic-empty">{t('dynamic.noMatches')}</div>
        ) : (
          DYNAMIC_GROUPS.map((group) => {
            const inGroup = matches.filter((variable) => variable.group === group);
            if (inGroup.length === 0) return null;
            return (
              <div key={group} data-testid={`dynamic-group-${group}`}>
                <div className="section-label">{t(groupLabel(group))}</div>
                <div className="dynamic-rows">
                  {inGroup.map((variable) => (
                    <button
                      key={variable.name}
                      className="dynamic-row"
                      onClick={() => void copy(variable.name)}
                      data-testid={`button-dynamic-${variable.name.slice(1)}`}
                    >
                      <span className="dynamic-name mono">{`{{${variable.name}}}`}</span>
                      <span className="dynamic-sample mono truncate">{samples.get(variable.name)}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </Dialog>
  );
}
