import { useEffect, useRef, useState } from 'react';
import { Copy, Terminal } from 'lucide-react';
import { IconButton } from '@/components/common/IconButton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AuthEditor } from '@/components/request/AuthEditor';
import { BodyEditor } from '@/components/request/BodyEditor';
import { DocFieldsTable } from '@/components/request/DocFieldsTable';
import { RequestHistory } from '@/components/request/RequestHistory';
import { KeyValueTable } from '@/components/request/KeyValueTable';
import { ScriptEditor } from '@/components/request/ScriptEditor';
import { UrlBar } from '@/components/request/UrlBar';
import { useToast } from '@/components/common/Toaster';
import { toCurl } from '@/lib/curl';
import { prepareRequest } from '@/lib/http';
import { formatBinding, resolveBindings } from '@/lib/shortcuts';
import { versionsFor } from '@/lib/versions';
import { paramsMatchUrl, splitQuery, syncUrlParams, writeUrlParams } from '@/lib/query';
import { folderPath } from '@/state/selectors';
import { useWorkspace } from '@/state/workspace-store';
import { resolveAuth } from '@/lib/inherit';
import type { Auth, HttpMethod, KeyValue, RequestRecord } from '@/types';
import type { MessageKey } from '@/locales/en';

type RequestTab = 'params' | 'body' | 'headers' | 'auth' | 'scripts' | 'docs' | 'history';

/** Long enough to finish a word, short enough to feel like the table follows. */
const URL_PARAM_DEBOUNCE_MS = 500;

const TABS: Array<{ id: RequestTab; label: MessageKey }> = [
  { id: 'params', label: 'request.tab.params' },
  { id: 'body', label: 'request.tab.body' },
  { id: 'headers', label: 'request.tab.headers' },
  { id: 'auth', label: 'request.tab.auth' },
  { id: 'scripts', label: 'request.tab.scripts' },
  { id: 'docs', label: 'request.tab.docs' },
  // "Versions", not "History": the response pane has a History tab of its own,
  // and two tabs with the same name a pane apart is the exact question this was
  // built to answer — "the history of the request, not of the response". The
  // collision is worth keeping an eye on in translation too, which is why both
  // names are keys rather than words typed in twice.
  { id: 'history', label: 'request.tab.history' },
];

type RequestPaneProps = {
  request: RequestRecord;
  sending: boolean;
  onSend: () => void;
  onCancel: () => void;
};

export function RequestPane({ request, sending, onSend, onCancel }: RequestPaneProps) {
  const { state, dispatch, variables, variableTable, chainFor, unsavedIn, t, tNodes, language } = useWorkspace();
  const { toast } = useToast();
  const [tab, setTab] = useState<RequestTab>('params');

  const patch = (changes: Partial<RequestRecord>) => dispatch({ type: 'request/update', id: request.id, patch: changes });
  /** The same, for a change nobody typed — see `request/update`'s `mirror`. */
  const mirror = (changes: Partial<RequestRecord>) =>
    dispatch({ type: 'request/update', id: request.id, patch: changes, mirror: true });

  /**
   * The URL this pane last wrote out of the table, and for which request.
   *
   * The request id travels with it because two requests can hold the same URL,
   * and one of them having written it must not silence the mirror for the
   * other.
   */
  const written = useRef<{ id: string; url: string } | null>(null);

  // Mirror the URL's query string into the Params table, a beat after typing
  // stops. Doing it on every keystroke would add a row for `?p`, then replace
  // it for `?pa`, and so on down the word.
  //
  // The URL keeps its query; `prepareRequest` takes the query from the table
  // instead of the URL so nothing is sent twice.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      // A URL this pane wrote from the table is not a URL somebody typed, and
      // reading it back would undo the edit that produced it — rows claimed by
      // the URL are rewritten, and the unticked ones would jump to the top of
      // the table while you were still typing in it.
      if (written.current?.id === request.id && written.current.url === request.url) return;
      const { params } = splitQuery(request.url);
      if (paramsMatchUrl(request.params, params)) return;
      mirror({ params: syncUrlParams(request.params, params) });
    }, URL_PARAM_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
    // `patch` closes over the id, which is what the other dependencies pin.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request.id, request.url, request.params]);

  const setRows = (field: 'params' | 'headers') => (items: KeyValue[]) => patch({ [field]: items });

  /**
   * Editing the table rewrites the URL's query, immediately.
   *
   * Immediately rather than on a debounce because this direction has nothing
   * to wait for: you are not building a word a letter at a time that would
   * each make their own row — the row already exists, and the address should
   * follow it as you type, the way it does in every other client.
   */
  const setParams = (items: KeyValue[]) => {
    const url = writeUrlParams(request.url, items);
    written.current = { id: request.id, url };
    patch({ params: items, url });
  };

  const activeCount = (items: KeyValue[]) => items.filter((item) => item.enabled && item.key.trim()).length;
  const badges: Partial<Record<RequestTab, number>> = {
    params: activeCount(request.params),
    headers: activeCount(request.headers),
    history: versionsFor(state.versions, request.id).length,
  };

  // What this request actually authenticates with, which may come from a
  // folder rather than the request itself.
  const chain = chainFor(request.folderId);
  const authSource = resolveAuth(request.auth, chain);

  const copyAsCurl = async () => {
    try {
      await navigator.clipboard.writeText(toCurl(prepareRequest(request, variables, { folders: chain, language })));
      toast({ title: t('request.copiedCurl'), kind: 'success' });
    } catch (error) {
      toast({
        title: t('request.copyFailed'),
        description: error instanceof Error ? error.message : undefined,
        kind: 'error',
      });
    }
  };

  const path = folderPath(state, request.folderId);

  // What ⌘S would commit. The list is what the tooltip says, so "unsaved" is
  // never just a dot you have to go hunting for the meaning of.
  const unsaved = unsavedIn(request.id);
  const saveHint = formatBinding(resolveBindings(state.settings).saveRequest);

  return (
    <section className="pane" aria-label={t('pane.request')}>
      <UrlBar
        method={request.method}
        url={request.url}
        variables={variableTable}
        sending={sending}
        onMethodChange={(method: HttpMethod) => patch({ method })}
        onUrlChange={(url) => patch({ url })}
        onSend={onSend}
        onCancel={onCancel}
        unsaved={unsaved}
        saveHint={saveHint}
        onSave={() => dispatch({ type: 'request/save', id: request.id })}
        onRevert={() => dispatch({ type: 'request/revert', id: request.id })}
      />

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as RequestTab)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="pane-tabbar">
          <TabsList className="pane-tabs">
            {TABS.map((item) => (
              <TabsTrigger key={item.id} value={item.id} className="pane-tab" data-testid={`tab-request-${item.id}`}>
                {t(item.label)}
                {badges[item.id] ? <Badge variant="accent">{badges[item.id]}</Badge> : null}
                {item.id === 'body' && request.bodyType !== 'none' ? (
                  <Badge variant="accent">{request.bodyType}</Badge>
                ) : null}
                {item.id === 'auth' && authSource.auth.type !== 'none' ? (
                  authSource.from === 'folder' ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="accent">{authSource.auth.type} ·</Badge>
                      </TooltipTrigger>
                      <TooltipContent>{t('request.inheritedFrom', { name: authSource.folder.name })}</TooltipContent>
                    </Tooltip>
                  ) : (
                    <Badge variant="accent">{authSource.auth.type}</Badge>
                  )
                ) : null}
                {item.id === 'scripts' && (request.preScript.trim() || request.postScript.trim()) ? (
                  <Badge variant="accent">{t('request.scriptsOn')}</Badge>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>
          <span className="flex-1" />
          <IconButton label={t('request.copyCurl')} onClick={copyAsCurl} testId="button-copy-curl">
            <Terminal />
          </IconButton>
          <IconButton
            label={t('request.copyUrl')}
            hint={t('request.copyUrlHint')}
            onClick={() => {
              navigator.clipboard?.writeText(prepareRequest(request, variables, { folders: chain, language }).url);
              toast({ title: t('request.urlCopied'), kind: 'success' });
            }}
            testId="button-copy-url"
          >
            <Copy />
          </IconButton>
        </div>

        <div className="pane-body">
        <TabsContent value="params" className="contents">
          <div className="pane-pad stack">
            <div className="section-label">{t('request.params.label')}</div>
            <KeyValueTable items={request.params} onChange={setParams} testPrefix="params" />
            <p className="hint">
              {t('request.params.hint')}
            </p>
          </div>
        </TabsContent>

        <TabsContent value="headers" className="contents">
          <div className="pane-pad stack">
            <div className="section-label">{t('request.headers.label')}</div>
            <KeyValueTable items={request.headers} onChange={setRows('headers')} testPrefix="headers" keyPlaceholder={t('request.headers.placeholder')} />
            <p className="hint">
              {tNodes('request.contentTypeNote', { header: <code>Content-Type</code> })}
            </p>
          </div>
        </TabsContent>

        <TabsContent value="body" className="contents">
          <BodyEditor request={request} onChange={patch} />
        </TabsContent>
        <TabsContent value="auth" className="contents">
          <AuthEditor
            auth={request.auth}
            onChange={(auth: Auth) => patch({ auth })}
            chain={chain}
            subject="request"
            variables={variableTable}
          />
        </TabsContent>

        <TabsContent value="scripts" className="contents">
          <ScriptEditor
            preScript={request.preScript}
            postScript={request.postScript}
            onChange={patch}
            subject="request"
            testPrefix="request"
          />
        </TabsContent>

        <TabsContent value="docs" className="contents">
          <div className="pane-pad stack">
            <div className="section-label">{t('common.name')}</div>
            <Input
              value={request.name}
              onChange={(event) => patch({ name: event.target.value })}
              aria-label={t('request.name')}
              data-testid="input-request-name"
            />
            <div className="section-label">{t('common.description')}</div>
            <Textarea
              className="min-h-[150px] font-sans"
              value={request.description}
              placeholder={t('request.descriptionPlaceholder')}
              onChange={(event) => patch({ description: event.target.value })}
              aria-label={t('request.descriptionAria')}
              data-testid="textarea-request-description"
            />
            <DocFieldsTable request={request} onChange={(fields) => patch({ docs: { fields } })} />

            <p className="hint">
              {path.length > 0 ? t('request.docs.hintIn', { path: path.join(' / ') }) : t('request.docs.hint')}
            </p>
          </div>
        </TabsContent>

        <TabsContent value="history" className="contents">
          <RequestHistory request={request} />
        </TabsContent>
        </div>
      </Tabs>
    </section>
  );
}
