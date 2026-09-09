import { Loader2, Send, Square } from 'lucide-react';
import { TemplateField } from '@/components/request/TemplateField';
import { HTTP_METHODS, type HttpMethod, type VariableTable } from '@/types';
import { Button } from '@/components/ui/button';
import { SelectField } from '@/components/common/SelectField';

type UrlBarProps = {
  method: HttpMethod;
  url: string;
  variables: VariableTable;
  sending: boolean;
  onMethodChange: (method: HttpMethod) => void;
  onUrlChange: (url: string) => void;
  onSend: () => void;
  onCancel: () => void;
};

export function UrlBar({
  method,
  url,
  variables,
  sending,
  onMethodChange,
  onUrlChange,
  onSend,
  onCancel,
}: UrlBarProps) {
  return (
    <div className="urlbar">
      <SelectField
        value={method}
        onChange={onMethodChange}
        options={HTTP_METHODS.map((item) => ({ value: item, label: item, className: `m-${item.toLowerCase()}` }))}
        ariaLabel="HTTP method"
        testId="select-request-method"
        className={`method-select m-${method.toLowerCase()}`}
      />

      <TemplateField
        value={url}
        table={variables}
        onChange={onUrlChange}
        onSubmit={onSend}
        placeholder="https://api.example.com/resource"
        ariaLabel="Request URL"
        testId="input-request-url"
        className="url-field"
      />

      {sending ? (
        <Button variant="secondary" onClick={onCancel} data-testid="button-cancel-request">
          <Square /> Cancel
        </Button>
      ) : (
        <Button onClick={onSend} data-testid="button-send-request">
          <Send /> Send
        </Button>
      )}
      {sending ? <Loader2 size={14} className="spin" aria-hidden="true" /> : null}
    </div>
  );
}
