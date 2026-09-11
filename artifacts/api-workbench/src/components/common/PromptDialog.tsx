import { useState } from 'react';
import { useT } from '@/state/workspace-store';
import { Dialog } from '@/components/common/Dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type PromptDialogProps = {
  title: string;
  description?: string;
  label: string;
  initialValue?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: (value: string) => void;
};

/** One-field dialog used for creating and renaming folders and requests. */
export function PromptDialog({
  title,
  description,
  label,
  initialValue = '',
  confirmLabel,
  onCancel,
  onConfirm,
}: PromptDialogProps) {
  const t = useT();
  const [value, setValue] = useState(initialValue);
  const submit = () => {
    const trimmed = value.trim();
    if (trimmed) onConfirm(trimmed);
  };

  return (
    <Dialog
      title={title}
      description={description}
      onClose={onCancel}
      testId="dialog-prompt"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} data-testid="button-prompt-cancel">
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} disabled={!value.trim()} data-testid="button-prompt-confirm">
            {confirmLabel ?? t('common.save')}
          </Button>
        </>
      }
    >
      <Label className="section-label" htmlFor="prompt-value">
        {label}
      </Label>
      <Input
        id="prompt-value"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') submit();
        }}
        data-testid="input-prompt-value"
        data-autofocus
      />
    </Dialog>
  );
}
