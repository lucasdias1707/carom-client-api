import { useMemo } from 'react';
import { Wand2 } from 'lucide-react';
import { SelectField } from '@/components/common/SelectField';
import { Button } from '@/components/ui/button';
import { CodeEditor } from '@/components/request/CodeEditor';
import { useWorkspace } from '@/state/workspace-store';
import { KeyValueTable } from '@/components/request/KeyValueTable';
import { tryPrettyJson } from '@/lib/format';
import type { MirrorLanguage } from '@/lib/mirror-tokens';
import { prettyXml, xmlError } from '@/lib/xml';
import type { BodyType, KeyValue, RequestRecord } from '@/types';
import { BODY_TYPES } from '@/types';

const BODY_LABELS: Record<BodyType, string> = {
  none: 'No body',
  json: 'JSON',
  text: 'Plain text',
  xml: 'XML',
  form: 'Form URL encoded',
  multipart: 'Multipart form',
  graphql: 'GraphQL',
};

/** Body types that are one text document rather than a table of rows. */
const TEXT_BODIES: BodyType[] = ['json', 'text', 'xml'];

/** Plain text has no structure to colour, and no brackets worth closing. */
const LANGUAGES: Partial<Record<BodyType, MirrorLanguage>> = { json: 'json', xml: 'xml' };

/**
 * A body that is a document fills the tab; one that is a table of rows does
 * not, because a form with three fields in a full-height box is just three
 * fields and a lot of nothing.
 */
const FILLS: BodyType[] = ['json', 'text', 'xml', 'graphql'];

type BodyEditorProps = {
  request: RequestRecord;
  onChange: (patch: Partial<RequestRecord>) => void;
};

export function BodyEditor({ request, onChange }: BodyEditorProps) {
  const { variableTable } = useWorkspace();

  // Why the body will not parse, in the language it is written in. Shown under
  // the editor and as a red border, so a stray comma or an unclosed tag is
  // caught here rather than by the server.
  const bodyError = useMemo(() => {
    if (!request.body.trim()) return null;
    if (request.bodyType === 'xml') return xmlError(request.body);
    if (request.bodyType !== 'json') return null;
    try {
      JSON.parse(request.body);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'Invalid JSON';
    }
  }, [request.body, request.bodyType]);

  const setRows = (field: 'form' | 'multipart') => (items: KeyValue[]) => onChange({ [field]: items });

  // GraphQL formats its variables, which are JSON; the query is left alone,
  // since re-indenting a query means understanding it.
  const formats = request.bodyType === 'json' || request.bodyType === 'xml' || request.bodyType === 'graphql';
  const formatSubject = request.bodyType === 'graphql' ? request.graphql.variables : request.body;
  const format = () => {
    if (request.bodyType === 'json') onChange({ body: tryPrettyJson(request.body).text });
    else if (request.bodyType === 'xml') onChange({ body: prettyXml(request.body).text });
    else if (request.bodyType === 'graphql') {
      onChange({ graphql: { ...request.graphql, variables: tryPrettyJson(request.graphql.variables).text } });
    }
  };

  return (
    <div className={`pane-pad stack ${FILLS.includes(request.bodyType) ? 'fills' : ''}`}>
      <div className="section-label">
        Body
        <span className="spacer" />
        <SelectField
          value={request.bodyType}
          onChange={(bodyType) => onChange({ bodyType })}
          options={BODY_TYPES.map((type) => ({ value: type, label: BODY_LABELS[type] }))}
          ariaLabel="Body type"
          testId="select-body-type"
          className="min-w-[150px]"
        />
        {formats ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={format}
            disabled={!formatSubject.trim()}
            title={
              request.bodyType === 'graphql'
                ? 'Re-indent the variables'
                : `Re-indent this ${BODY_LABELS[request.bodyType]} body`
            }
            data-testid="button-format-body"
          >
            <Wand2 /> Format
          </Button>
        ) : null}
      </div>

      {request.bodyType === 'none' ? (
        <p className="hint">
          This request is sent without a body. Pick a body type above to send JSON, a form, or a GraphQL query.
        </p>
      ) : null}

      {request.bodyType === 'form' ? (
        <KeyValueTable items={request.form} onChange={setRows('form')} testPrefix="form" keyPlaceholder="Field" />
      ) : null}

      {request.bodyType === 'multipart' ? (
        <>
          <KeyValueTable
            items={request.multipart}
            onChange={setRows('multipart')}
            testPrefix="multipart"
            keyPlaceholder="Field"
            valuePlaceholder="Value or file"
            allowFiles
          />
          <p className="hint">
            A field takes typed text or a file — use the paperclip to attach one. Files are kept for this session
            rather than saved with the workspace, so a reload asks for them again: the whole workspace lives in
            the browser&rsquo;s storage, and one attachment could evict everything else in it.
          </p>
        </>
      ) : null}

      {request.bodyType === 'graphql' ? (
        <>
          <div className="editor-fill">
            <div className="section-label">Query</div>
            <CodeEditor
              variables={variableTable}
              value={request.graphql.query}
              onChange={(query) => onChange({ graphql: { ...request.graphql, query } })}
              ariaLabel="GraphQL query"
              testId="textarea-graphql-query"
            />
          </div>
          <div>
            <div className="section-label">Variables (JSON)</div>
            <CodeEditor
              variables={variableTable}
              value={request.graphql.variables}
              onChange={(variables) => onChange({ graphql: { ...request.graphql, variables } })}
              language="json"
              style={{ minHeight: 110 }}
              ariaLabel="GraphQL variables"
              testId="textarea-graphql-variables"
            />
          </div>
        </>
      ) : null}

      {TEXT_BODIES.includes(request.bodyType) ? (
        <div className="editor-fill">
          <CodeEditor
            variables={variableTable}
            value={request.body}
            onChange={(body) => onChange({ body })}
            language={LANGUAGES[request.bodyType] ?? 'plain'}
            invalid={Boolean(bodyError)}
            placeholder={
              request.bodyType === 'json' ? '{\n  "key": "value"\n}'
              : request.bodyType === 'xml' ? '<request>\n  <field>value</field>\n</request>'
              : 'Request payload'
            }
            ariaLabel="Request body"
            testId="textarea-request-body"
          />
          {bodyError ? (
            <div className="hint" style={{ color: 'var(--red)', marginTop: 6 }} data-testid="text-body-error">
              {bodyError}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
