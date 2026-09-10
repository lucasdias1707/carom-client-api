import { useMemo, useState } from 'react';
import { Copy, Download, History, Search, Trash2, Waypoints } from 'lucide-react';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { IconButton } from '@/components/common/IconButton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { JsonTree } from '@/components/response/JsonTree';
import { SyntaxText } from '@/components/response/SyntaxText';
import { useToast } from '@/components/common/Toaster';
import { byteLength, contentTypeLabel, formatBytes, formatDuration, formatRelative, statusFamily, tryPrettyJson } from '@/lib/format';
import { useWorkspace } from '@/state/workspace-store';
import type { ScriptLogEntry, ScriptTest } from '@/lib/scripts';
import { prettyXml } from '@/lib/xml';
import type { ResponseRecord } from '@/types';

type ResponseTab = 'pretty' | 'raw' | 'preview' | 'headers' | 'cookies' | 'console' | 'history';

type ResponsePaneProps = {
  requestId: string;
  sending: boolean;
  /** What the last run's scripts printed and asserted. */
  scriptLogs?: ScriptLogEntry[];
  scriptTests?: ScriptTest[];
};

function headerValue(response: ResponseRecord, name: string): string | undefined {
  return response.headers.find((header) => header.key.toLowerCase() === name)?.value;
}

/**
 * Whether to read this body as XML.
 *
 * Deliberately narrow: the server has to say so, or the body has to open with
 * a prolog. Anything that merely starts with `<` would drag HTML in too, and
 * HTML's void elements (`<br>`, `<img>`) never close, so indenting it by depth
 * would walk off to the right. HTML has the Preview tab for that.
 */
function looksLikeXml(body: string, contentType: string | undefined): boolean {
  if (contentType && /xml/i.test(contentType)) return true;
  return body.trimStart().startsWith('<?xml');
}

/** Split a `set-cookie` header into its name, value and attributes. */
function parseCookie(raw: string): { name: string; value: string; attributes: string } {
  const [pair, ...rest] = raw.split(';');
  const separator = pair.indexOf('=');
  return {
    name: separator === -1 ? pair.trim() : pair.slice(0, separator).trim(),
    value: separator === -1 ? '' : pair.slice(separator + 1).trim(),
    attributes: rest.map((part) => part.trim()).join('; '),
  };
}

export function ResponsePane({ requestId, sending, scriptLogs = [], scriptTests = [] }: ResponsePaneProps) {
  const { responsesFor, dispatch } = useWorkspace();
  const { toast } = useToast();
  const [tab, setTab] = useState<ResponseTab>('pretty');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [wrap, setWrap] = useState(true);
  const [clearing, setClearing] = useState(false);

  const responses = responsesFor(requestId);
  const response = responses.find((item) => item.id === selectedId) ?? responses[0] ?? null;

  const contentType = response ? headerValue(response, 'content-type') : undefined;
  const parsed = useMemo(() => {
    if (!response || response.error) return null;
    try {
      return JSON.parse(response.body) as unknown;
    } catch {
      return null;
    }
  }, [response]);

  const cookies = useMemo(
    () => (response?.headers ?? []).filter((header) => header.key.toLowerCase() === 'set-cookie').map((header) => parseCookie(header.value)),
    [response],
  );

  if (!response) {
    return (
      <section className="pane" aria-label="Response">
        <div className="empty" data-testid="empty-response">
          <div>
            <div className="empty-icon">
              <Waypoints size={19} />
            </div>
            <h3>{sending ? 'Sending…' : 'No response yet'}</h3>
            <p>Send the request and the status, timing, headers and payload will land here.</p>
          </div>
        </div>
      </section>
    );
  }

  const family = statusFamily(response.status);
  const xml = parsed === null && !response.error && looksLikeXml(response.body, contentType);
  const prettyText =
    parsed !== null ? tryPrettyJson(response.body).text
    : xml ? prettyXml(response.body).text
    : response.body;
  const filteredHeaders = response.headers.filter((header) =>
    `${header.key} ${header.value}`.toLowerCase().includes(filter.toLowerCase()),
  );

  const download = () => {
    const blob = new Blob([response.body], { type: contentType ?? 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `response-${response.status}.${parsed !== null ? 'json' : xml ? 'xml' : 'txt'}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const tabs: Array<{ id: ResponseTab; label: string; count?: number }> = [
    { id: 'pretty', label: 'Pretty' },
    { id: 'raw', label: 'Raw' },
    { id: 'preview', label: 'Preview' },
    { id: 'headers', label: 'Headers', count: response.headers.length },
    { id: 'cookies', label: 'Cookies', count: cookies.length },
    { id: 'console', label: 'Console', count: scriptLogs.length + scriptTests.length },
    { id: 'history', label: 'History', count: responses.length },
  ];

  return (
    <section className="pane" aria-label="Response">
      <div className="status-line">
        <span className={`status-code ${response.error ? 'none' : family}`} data-testid="status-response">
          {response.error ? 'FAILED' : `${response.status} ${response.statusText}`}
        </span>
        <span className="status-meta" data-testid="text-response-duration">
          {formatDuration(response.durationMs)}
        </span>
        <span className="status-meta" data-testid="text-response-size">
          {formatBytes(response.size)}
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="chip">{contentTypeLabel(contentType)}</Badge>
          </TooltipTrigger>
          <TooltipContent>{contentType ?? 'No content type'}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="chip">{response.via}</Badge>
          </TooltipTrigger>
          <TooltipContent>Sent through the {response.via}</TooltipContent>
        </Tooltip>
        <span className="spacer" />
        <IconButton
          label={wrap ? 'Stop wrapping long lines' : 'Wrap long lines'}
          onClick={() => setWrap((current) => !current)}
          tone={wrap ? 'accent' : 'default'}
        >
          <Waypoints />
        </IconButton>
        <IconButton
          label="Copy response body"
          onClick={() => {
            navigator.clipboard?.writeText(response.body);
            toast({ title: 'Response copied', kind: 'success' });
          }}
          testId="button-copy-response"
        >
          <Copy />
        </IconButton>
        <IconButton label="Download response body" onClick={download}>
          <Download />
        </IconButton>
        <IconButton
          label="Clear responses"
          hint={responses.length > 1 ? `all ${responses.length}` : undefined}
          tone="danger"
          onClick={() => setClearing(true)}
          testId="button-clear-response"
        >
          <Trash2 />
        </IconButton>
      </div>

      {/*
        The one deletion in the app that used to fire straight from the click,
        with no confirmation and no undo: the history is not stored anywhere
        else, so a mis-aimed click threw away every response for this request.
      */}
      {clearing ? (
        <ConfirmDialog
          title="Clear the response history?"
          message={
            responses.length > 1
              ? `All ${responses.length} saved responses for this request go away. This one cannot be undone.`
              : 'The saved response for this request goes away. This one cannot be undone.'
          }
          confirmLabel="Clear"
          onCancel={() => setClearing(false)}
          onConfirm={() => {
            dispatch({ type: 'response/clear', requestId });
            setSelectedId(null);
            setClearing(false);
          }}
        />
      ) : null}

      {response.error ? (
        <div className="error-box" data-testid="status-network-error">
          <strong>Could not reach this endpoint</strong>
          {/* The reason first, then why this transport tends to fail that way;
              run together they read as one confused sentence. */}
          {response.error.split('\n\n').map((paragraph, index) => (
            <p key={index} className={index > 0 ? 'error-note' : undefined}>
              {paragraph}
            </p>
          ))}
        </div>
      ) : null}

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as ResponseTab)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="pane-tabbar">
          <TabsList className="pane-tabs">
            {tabs.map((item) => (
              <TabsTrigger key={item.id} value={item.id} data-testid={`tab-response-${item.id}`}>
                {item.label}
                {item.count ? <Badge variant="accent">{item.count}</Badge> : null}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {tab === 'pretty' || tab === 'headers' ? (
          <div className="pane-toolbar">
            <Search size={13} style={{ color: 'var(--text-faint)' }} />
            <Input
              className="h-6 border-0 bg-transparent px-1"
              value={filter}
              placeholder={tab === 'headers' ? 'Filter headers' : 'Highlight in body'}
              onChange={(event) => setFilter(event.target.value)}
              aria-label="Filter response"
              data-testid="input-response-filter"
            />
          </div>
        ) : null}

        <div className="pane-body">
        <TabsContent value="pretty" className="contents">
          {parsed !== null ? (
            <JsonTree data={parsed} term={filter} />
          ) : xml ? (
            <SyntaxText text={prettyText} language="xml" wrap={wrap} testId="display-response-body" />
          ) : (
            <pre className={`code fill ${wrap ? 'wrap' : ''}`} data-testid="display-response-body">
              {prettyText || '(empty response body)'}
            </pre>
          )}
        </TabsContent>

        <TabsContent value="console" className="contents">
          <div className="pane-pad stack" data-testid="script-console">
            {scriptTests.length === 0 && scriptLogs.length === 0 ? (
              <p className="hint">
                Nothing was printed. <code>console.log</code> and <code>pm.test</code> from this request&rsquo;s scripts,
                and from the folders around it, show up here after a send.
              </p>
            ) : null}
            {scriptTests.map((test, index) => (
              <div key={`test-${index}`} className="script-line" data-testid="script-test">
                <span className={`status-code ${test.passed ? 'success' : 'client'}`}>
                  {test.passed ? 'PASS' : 'FAIL'}
                </span>
                <span className="truncate">{test.name}</span>
                {test.error ? <span className="status-meta">{test.error}</span> : null}
                <span className="status-meta">{test.source}</span>
              </div>
            ))}
            {scriptLogs.map((entry, index) => (
              <div key={`log-${index}`} className="script-line" data-testid="script-log">
                <span className={`chip ${entry.level === 'error' ? 'danger' : ''}`}>{entry.source}</span>
                <pre className="code wrap" style={{ padding: 0, background: 'none', border: 'none' }}>
                  {entry.text}
                </pre>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="raw" className="contents">
          <pre className={`code fill ${wrap ? 'wrap' : ''}`} data-testid="display-response-raw">
            {response.body || '(empty response body)'}
          </pre>
        </TabsContent>

        <TabsContent value="preview" className="contents">
          <Preview body={response.body} contentType={contentType} />
        </TabsContent>

        <TabsContent value="headers" className="contents">
          <Table className="headers-table" data-testid="table-response-headers">
            <TableHeader>
              <TableRow>
                <TableHead>Header</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHeaders.map((header) => (
                <TableRow key={header.id}>
                  <TableCell>{header.key}</TableCell>
                  <TableCell>{header.value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="cookies" className="contents">
          {cookies.length === 0 ? (
            <div className="empty">
              <div>
                <p>This response did not set any cookies.</p>
              </div>
            </div>
          ) : (
            <Table className="headers-table" data-testid="table-response-cookies">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Attributes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cookies.map((cookie) => (
                  <TableRow key={`${cookie.name}-${cookie.value}`}>
                    <TableCell>{cookie.name}</TableCell>
                    <TableCell>{cookie.value}</TableCell>
                    <TableCell>{cookie.attributes}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="history" className="contents">
          <div data-testid="list-response-history">
            {responses.map((item) => (
              <button
                key={item.id}
                className={`history-row ${item.id === response.id ? 'active' : ''}`}
                // Selecting alone changed the response behind the tab you are
                // looking at, so picking a row appeared to do nothing at all.
                // Choosing one from the history means wanting to read it.
                onClick={() => {
                  setSelectedId(item.id);
                  setTab('pretty');
                }}
                data-testid={`button-history-${item.id}`}
              >
                <span className={`status-code ${item.error ? 'none' : statusFamily(item.status)}`} style={{ width: 34 }}>
                  {item.error ? 'ERR' : item.status}
                </span>
                <span className="mono truncate" style={{ flex: 1, fontSize: 'var(--fs-11)' }}>
                  {item.url}
                </span>
                <span className="status-meta">{formatDuration(item.durationMs)}</span>
                <span className="status-meta">{formatBytes(item.size)}</span>
                <span className="status-meta" style={{ width: 66, textAlign: 'right' }}>
                  {formatRelative(item.sentAt)}
                </span>
              </button>
            ))}
          </div>
        </TabsContent>

        {response.truncated ? (
          <p className="hint" style={{ padding: '8px 12px' }}>
            <History size={11} /> This body was truncated to {formatBytes(byteLength(response.body))} when it was saved.
          </p>
        ) : null}
        </div>
      </Tabs>
    </section>
  );
}

/** Render HTML and images inline; everything else falls back to plain text. */
function Preview({ body, contentType }: { body: string; contentType: string | undefined }) {
  if (contentType && /html/i.test(contentType)) {
    return (
      <iframe
        title="Response preview"
        sandbox=""
        srcDoc={body}
        style={{ width: '100%', height: '100%', border: 0, background: 'white' }}
        data-testid="frame-response-preview"
      />
    );
  }
  if (contentType && /^image\//i.test(contentType)) {
    return (
      <div className="empty">
        <p>Binary image responses are not rendered yet.</p>
      </div>
    );
  }
  return (
    <pre className="code wrap fill" data-testid="display-response-preview">
      {body || '(empty response body)'}
    </pre>
  );
}
