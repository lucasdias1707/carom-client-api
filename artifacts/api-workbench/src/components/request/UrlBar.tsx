import { Loader2, Save, Send, Square, Undo2 } from 'lucide-react';
import { TemplateField } from '@/components/request/TemplateField';
import { HTTP_METHODS, type HttpMethod, type VariableTable } from '@/types';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/common/IconButton';
import { SelectField } from '@/components/common/SelectField';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useT } from '@/state/workspace-store';
import type { SectionId } from '@/lib/draft';
import type { MessageKey } from '@/locales/en';

type UrlBarProps = {
  method: HttpMethod;
  url: string;
  variables: VariableTable;
  sending: boolean;
  onMethodChange: (method: HttpMethod) => void;
  onUrlChange: (url: string) => void;
  onSend: () => void;
  onCancel: () => void;
  /**
   * Unsaved parts of this request, in composer order. Empty means saved, and
   * the two buttons are not drawn at all — there would be nothing for them to
   * do, and this row is the busiest one in the app.
   */
  unsaved: SectionId[];
  saveHint: string;
  onSave: () => void;
  onRevert: () => void;
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
  unsaved,
  saveHint,
  onSave,
  onRevert,
}: UrlBarProps) {
  const t = useT();
  return (
    <div className="urlbar">
      <SelectField
        value={method}
        onChange={onMethodChange}
        options={HTTP_METHODS.map((item) => ({ value: item, label: item, className: `m-${item.toLowerCase()}` }))}
        ariaLabel={t('url.methodAria')}
        testId="select-request-method"
        className={`method-select m-${method.toLowerCase()}`}
      />

      <TemplateField
        value={url}
        table={variables}
        onChange={onUrlChange}
        onSubmit={onSend}
        placeholder={t('url.placeholder')}
        ariaLabel={t('url.aria')}
        testId="input-request-url"
        className="url-field"
      />

      {/*
        Save sits beside Send rather than in the tab bar below: that bar is a
        row of tabs that already scrolls when the pane is narrow, and a button
        added to it covered the last tab. Here there is room, and the two
        things you do with a request you have just edited are next to each
        other.
      */}
      {unsaved.length > 0 ? (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="secondary" onClick={onSave} data-testid="button-save-request">
                <Save /> {t('common.save')}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {t('url.unsaved', {
                parts: unsaved.map((id) => t(`section.${id}` as MessageKey)).join(', '),
                shortcut: saveHint,
              })}
            </TooltipContent>
          </Tooltip>
          <IconButton label={t('url.revert')} onClick={onRevert} testId="button-revert-request">
            <Undo2 />
          </IconButton>
        </>
      ) : null}

      {sending ? (
        <Button variant="secondary" onClick={onCancel} data-testid="button-cancel-request">
          <Square /> {t('common.cancel')}
        </Button>
      ) : (
        <Button onClick={onSend} data-testid="button-send-request">
          <Send /> {t('url.send')}
        </Button>
      )}
      {sending ? <Loader2 size={14} className="spin" aria-hidden="true" /> : null}
    </div>
  );
}
