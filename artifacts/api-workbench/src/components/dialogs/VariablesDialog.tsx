import { useState } from 'react';
import { Dialog } from '@/components/common/Dialog';
import { GeneratedVariables, Reroll } from '@/components/dialogs/GeneratedVariables';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DYNAMIC_VARIABLES } from '@/lib/dynamic';
import { LOCAL_VARIABLE_COLOR } from '@/lib/template';
import { useWorkspace } from '@/state/workspace-store';

/**
 * One place to learn what goes between the braces.
 *
 * It exists because the answer was spread across three screens that each
 * assumed you already knew: the environments editor shows values without
 * saying how they are reached, a red chip says a name is undefined without
 * saying what "defined" means here, and the generator list is only useful once
 * you know generators exist. Someone arriving from Postman knows the syntax
 * and not the scoping; someone arriving from nothing knows neither.
 *
 * Two tabs, not one long page: the prose is read once and the list is come
 * back to, and putting them in one scroll means scrolling past what you have
 * already read every time you want the list.
 */
export function VariablesDialog({ onClose, tab: initialTab = 'guide' }: { onClose: () => void; tab?: Tab }) {
  const { t } = useWorkspace();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [seed, setSeed] = useState(0);

  return (
    <Dialog
      title={t('vars.title')}
      description={t('vars.description')}
      onClose={onClose}
      wide
      testId="dialog-variables"
      footer={
        <>
          {tab === 'generated' ? <Reroll onReroll={() => setSeed((current) => current + 1)} /> : null}
          <span className="flex-1" />
          {tab === 'generated' ? (
            <span className="hint">{t('dynamic.count', { count: DYNAMIC_VARIABLES.length })}</span>
          ) : null}
          <Button onClick={onClose}>{t('common.done')}</Button>
        </>
      }
    >
      <Tabs value={tab} onValueChange={(next) => setTab(next as Tab)} className="stack" style={{ gap: 12 }}>
        <TabsList className="w-full">
          <TabsTrigger value="guide" className="flex-1" data-testid="tab-vars-guide">
            {t('vars.tab.guide')}
          </TabsTrigger>
          <TabsTrigger value="generated" className="flex-1" data-testid="tab-vars-generated">
            {t('vars.tab.generated')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="guide">
          <Guide onSeeGenerated={() => setTab('generated')} />
        </TabsContent>

        <TabsContent value="generated">
          <GeneratedVariables seed={seed} />
        </TabsContent>
      </Tabs>
    </Dialog>
  );
}

export type Tab = 'guide' | 'generated';

/**
 * The prose half.
 *
 * Every example is a real string that would work if pasted, and the chips are
 * the same classes the composer draws, so what is described here looks like
 * what happens there. A screenshot would drift; a chip cannot.
 */
function Guide({ onSeeGenerated }: { onSeeGenerated: () => void }) {
  const { t, tNodes } = useWorkspace();

  return (
    <div className="vars-guide" data-testid="vars-guide">
      <section>
        <h3>{t('vars.write.title')}</h3>
        <p>{t('vars.write.body')}</p>
        <pre className="vars-example mono">
          <span className="vars-plain">https://api.example.com/</span>
          <span className="var-chip">{'{{version}}'}</span>
          <span className="vars-plain">/bookings</span>
        </pre>
        <p>{t('vars.write.json')}</p>
        <pre className="vars-example mono">
          {'{\n  "nome": "'}
          <span className="var-chip dynamic">{'{{$randomFirstName}}'}</span>
          {'",\n  "adultos": '}
          <span className="var-chip">{'{{adultos}}'}</span>
          {'\n}'}
        </pre>
        <p className="hint">
          {tNodes('vars.write.spaces', {
            loose: <code>{'{{ token }}'}</code>,
            tight: <code>{'{{token}}'}</code>,
          })}
        </p>
      </section>

      <section>
        <h3>{t('vars.scope.title')}</h3>
        <p>{t('vars.scope.body')}</p>
        {/* Ordered as they are resolved, and dotted with the colour each scope
            actually draws in, so the list doubles as a legend for the chips. */}
        <ol className="vars-scopes">
          <li>
            <span className="var-dot" style={{ background: LOCAL_VARIABLE_COLOR }} />
            <strong>{t('vars.scope.folder')}</strong>
            <span className="hint">{t('vars.scope.folderNote')}</span>
          </li>
          <li>
            <span className="var-dot" style={{ background: 'var(--accent)' }} />
            <strong>{t('vars.scope.environment')}</strong>
            <span className="hint">{t('vars.scope.environmentNote')}</span>
          </li>
          <li>
            <span className="var-dot" style={{ background: 'var(--text-faint)' }} />
            <strong>{t('vars.scope.base')}</strong>
            <span className="hint">{t('vars.scope.baseNote')}</span>
          </li>
        </ol>
        <p className="hint">{t('vars.scope.hover')}</p>
      </section>

      <section>
        <h3>{t('vars.missing.title')}</h3>
        <pre className="vars-example mono">
          <span className="vars-plain">Authorization: Bearer </span>
          <span className="var-chip missing">{'{{tokne}}'}</span>
        </pre>
        <p>{t('vars.missing.body')}</p>
        <p className="hint">{t('vars.missing.define')}</p>
      </section>

      <section>
        <h3>{t('vars.generated.title')}</h3>
        <p>{tNodes('vars.generated.body', { dollar: <code>$</code> })}</p>
        <pre className="vars-example mono">
          {'[\n  { "nome": "'}
          <span className="var-chip dynamic">{'{{$randomFullName}}'}</span>
          {'" },\n  { "nome": "'}
          <span className="var-chip dynamic">{'{{$randomFullName}}'}</span>
          {'" }\n]'}
        </pre>
        <p>{t('vars.generated.each')}</p>
        <p className="hint">{t('vars.generated.wins')}</p>
        <Button
          variant="secondary"
          size="sm"
          className="justify-self-start"
          onClick={onSeeGenerated}
          data-testid="button-see-generated"
        >
          {t('vars.generated.see', { count: DYNAMIC_VARIABLES.length })}
        </Button>
      </section>

      <section>
        <h3>{t('vars.scripts.title')}</h3>
        <p>{t('vars.scripts.body')}</p>
        <pre className="vars-example mono">
          {"pm.environment.set('token', pm.response.json().token);"}
        </pre>
        <p className="hint">{t('vars.scripts.note')}</p>
      </section>
    </div>
  );
}
