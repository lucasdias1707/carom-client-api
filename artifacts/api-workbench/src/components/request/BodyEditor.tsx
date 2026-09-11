import type { MessageKey } from '@/locales/en';
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

const BODY_LABELS: Record<BodyType, MessageKey> = {
  none: 'body.none',
  json: 'body.json',
  text: 'body.text',
  xml: 'body.xml',
  form: 'body.form',
  multipart: 'body.multipart',
  graphql: 'body.graphql',
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
  const { variableTable, t } = useWorkspace();

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
      return error instanceof Error ? error.message : t('body.invalidJson');
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
        {t('request.tab.body')}
        <span className="spacer" />
        <SelectField
          value={request.bodyType}
          onChange={(bodyType) => onChange({ bodyType })}
          options={BODY_TYPES.map((type) => ({ value: type, label: t(BODY_LABELS[type]) }))}
          ariaLabel={t('body.typeAria')}
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
                ? t('body.formatGraphql')
                : t('body.formatBody', { type: t(BODY_LABELS[request.bodyType]) })
            }
            data-testid="button-format-body"
          >
            <Wand2 /> {t('body.format')}
          </Button>
        ) : null}
      </div>

      {request.bodyType === 'none' ? (
        <p className="hint">
          {t('body.noneHint')}
        </p>
      ) : null}

      {request.bodyType === 'form' ? (
        <KeyValueTable items={request.form} onChange={setRows('form')} testPrefix="form" keyPlaceholder={t('body.field')} />
      ) : null}

      {request.bodyType === 'multipart' ? (
        <>
          <KeyValueTable
            items={request.multipart}
            onChange={setRows('multipart')}
            testPrefix="multipart"
            keyPlaceholder={t('body.field')}
            valuePlaceholder={t('body.valueOrFile')}
            allowFiles
          />
          <p className="hint">
            {t('body.multipartHint')}
          </p>
        </>
      ) : null}

      {request.bodyType === 'graphql' ? (
        <>
          <div className="editor-fill">
            <div className="section-label">{t('body.graphqlQuery')}</div>
            <CodeEditor
              variables={variableTable}
              value={request.graphql.query}
              onChange={(query) => onChange({ graphql: { ...request.graphql, query } })}
              ariaLabel={t('body.graphqlQueryAria')}
              testId="textarea-graphql-query"
            />
          </div>
          <div>
            <div className="section-label">{t('body.graphqlVariables')}</div>
            <CodeEditor
              variables={variableTable}
              value={request.graphql.variables}
              onChange={(variables) => onChange({ graphql: { ...request.graphql, variables } })}
              language="json"
              style={{ minHeight: 110 }}
              ariaLabel={t('body.graphqlVariablesAria')}
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
            ariaLabel={t('body.aria')}
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
