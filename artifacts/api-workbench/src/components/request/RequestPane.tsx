import { useEffect, useState } from 'react';
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
import { KeyValueTable } from '@/components/request/KeyValueTable';
import { ScriptEditor } from '@/components/request/ScriptEditor';
import { UrlBar } from '@/components/request/UrlBar';
import { useToast } from '@/components/common/Toaster';
import { toCurl } from '@/lib/curl';
import { prepareRequest } from '@/lib/http';
import { paramsMatchUrl, splitQuery, syncUrlParams } from '@/lib/query';
import { folderPath } from '@/state/selectors';
import { useWorkspace } from '@/state/workspace-store';
import { resolveAuth } from '@/lib/inherit';
import type { Auth, HttpMethod, KeyValue, RequestRecord } from '@/types';

type RequestTab = 'params' | 'body' | 'headers' | 'auth' | 'scripts' | 'docs';

/** Long enough to finish a word, short enough to feel like the table follows. */
const URL_PARAM_DEBOUNCE_MS = 500;

const TABS: Array<{ id: RequestTab; label: string }> = [
  { id: 'params', label: 'Params' },
  { id: 'body', label: 'Body' },
  { id: 'headers', label: 'Headers' },
  { id: 'auth', label: 'Auth' },
  { id: 'scripts', label: 'Scripts' },
  { id: 'docs', label: 'Docs' },
];

type RequestPaneProps = {
  request: RequestRecord;
  sending: boolean;
  onSend: () => void;
  onCancel: () => void;
};

export function RequestPane({ request, sending, onSend, onCancel }: RequestPaneProps) {
  const { state, dispatch, variables, variableTable, chainFor } = useWorkspace();
  const { toast } = useToast();
  const [tab, setTab] = useState<RequestTab>('params');

  const patch = (changes: Partial<RequestRecord>) => dispatch({ type: 'request/update', id: request.id, patch: changes });

  // Mirror the URL's query string into the Params table, a beat after typing
  // stops. Doing it on every keystroke would add a row for `?p`, then replace
  // it for `?pa`, and so on down the word.
  //
  // The URL keeps its query; `prepareRequest` takes the query from the table
  // instead of the URL so nothing is sent twice.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const { params } = splitQuery(request.url);
      if (paramsMatchUrl(request.params, params)) return;
      patch({ params: syncUrlParams(request.params, params) });
    }, URL_PARAM_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
    // `patch` closes over the id, which is what the other dependencies pin.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request.id, request.url, request.params]);
  const setRows = (field: 'params' | 'headers') => (items: KeyValue[]) => patch({ [field]: items });

  const activeCount = (items: KeyValue[]) => items.filter((item) => item.enabled && item.key.trim()).length;
  const badges: Partial<Record<RequestTab, number>> = {
    params: activeCount(request.params),
    headers: activeCount(request.headers),
  };

  // What this request actually authenticates with, which may come from a
  // folder rather than the request itself.
  const chain = chainFor(request.folderId);
  const authSource = resolveAuth(request.auth, chain);

  const copyAsCurl = async () => {
    try {
      await navigator.clipboard.writeText(toCurl(prepareRequest(request, variables, { folders: chain })));
      toast({ title: 'Copied as curl', kind: 'success' });
    } catch (error) {
      toast({
        title: 'Could not copy',
        description: error instanceof Error ? error.message : undefined,
        kind: 'error',
      });
    }
  };

  const path = folderPath(state, request.folderId);

  return (
    <section className="pane" aria-label="Request">
      <UrlBar
        method={request.method}
        url={request.url}
        variables={variableTable}
        sending={sending}
        onMethodChange={(method: HttpMethod) => patch({ method })}
        onUrlChange={(url) => patch({ url })}
        onSend={onSend}
        onCancel={onCancel}
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
                {item.label}
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
                      <TooltipContent>Inherited from {authSource.folder.name}</TooltipContent>
                    </Tooltip>
                  ) : (
                    <Badge variant="accent">{authSource.auth.type}</Badge>
                  )
                ) : null}
                {item.id === 'scripts' && (request.preScript.trim() || request.postScript.trim()) ? (
                  <Badge variant="accent">on</Badge>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>
          <span className="flex-1" />
          <IconButton label="Copy as curl" onClick={copyAsCurl} testId="button-copy-curl">
            <Terminal />
          </IconButton>
          <IconButton
            label="Copy resolved URL"
            hint="variables applied"
            onClick={() => {
              navigator.clipboard?.writeText(prepareRequest(request, variables, { folders: chain }).url);
              toast({ title: 'URL copied', kind: 'success' });
            }}
            testId="button-copy-url"
          >
            <Copy />
          </IconButton>
        </div>

        <div className="pane-body">
        <TabsContent value="params" className="contents">
          <div className="pane-pad stack">
            <div className="section-label">Query parameters</div>
            <KeyValueTable items={request.params} onChange={setRows('params')} testPrefix="params" />
            <p className="hint">Parameters are appended to the URL when the request is sent, after variables resolve.</p>
          </div>
        </TabsContent>

        <TabsContent value="headers" className="contents">
          <div className="pane-pad stack">
            <div className="section-label">Request headers</div>
            <KeyValueTable items={request.headers} onChange={setRows('headers')} testPrefix="headers" keyPlaceholder="Header" />
            <p className="hint">
              A <code>Content-Type</code> matching the body type is added automatically unless you set one here.
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
            <div className="section-label">Name</div>
            <Input
              value={request.name}
              onChange={(event) => patch({ name: event.target.value })}
              aria-label="Request name"
              data-testid="input-request-name"
            />
            <div className="section-label">Description</div>
            <Textarea
              className="min-h-[150px] font-sans"
              value={request.description}
              placeholder="What is this request for? Who owns the endpoint?"
              onChange={(event) => patch({ description: event.target.value })}
              aria-label="Request description"
              data-testid="textarea-request-description"
            />
            <DocFieldsTable request={request} onChange={(fields) => patch({ docs: { fields } })} />

            <p className="hint">
              {path.length > 0 ? `In ${path.join(' / ')} · ` : ''}Saved locally in this browser. Exporting to OpenAPI
              turns what is above into an operation, its parameters and its body schema.
            </p>
          </div>
        </TabsContent>
        </div>
      </Tabs>
    </section>
  );
}
