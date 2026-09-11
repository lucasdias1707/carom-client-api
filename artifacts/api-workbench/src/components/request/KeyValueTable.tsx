import { useRef } from 'react';
import { Paperclip, Trash2, X } from 'lucide-react';
import { row } from '@/lib/factories';
import type { KeyValue } from '@/types';
import { IconButton } from '@/components/common/IconButton';
import { useToast } from '@/components/common/Toaster';
import { useT } from '@/state/workspace-store';
import { describeFile, dropFile, putFile } from '@/lib/files';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';

type KeyValueTableProps = {
  items: KeyValue[];
  onChange: (items: KeyValue[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  testPrefix: string;
  /**
   * Multipart rows can carry a file instead of typed text. Only multipart: a
   * query parameter or a header has nowhere to put one.
   */
  allowFiles?: boolean;
};

/**
 * Editable key/value grid with per-row enable toggles. An empty trailing row is
 * always rendered so adding an entry is just typing, like a spreadsheet.
 *
 * Removing a row raises an Undo toast rather than asking first. These are the
 * app's most frequent deletions — a header, a query parameter — and a modal in
 * front of every one of them would make the table painful to use; what was
 * actually missing is that the row vanished with no way back. Undo is local
 * here on purpose: `use-delete-with-undo` photographs the whole workspace,
 * which is far too much machinery for one line of a table.
 */
export function KeyValueTable({
  items,
  onChange,
  keyPlaceholder: keyLabel,
  valuePlaceholder: valueLabel,
  testPrefix,
  allowFiles = false,
}: KeyValueTableProps) {
  const { toast } = useToast();
  const t = useT();
  // Defaulted here rather than in the signature: the fallbacks are words, and
  // words need the catalogue, which a default parameter cannot reach.
  const keyPlaceholder = keyLabel ?? t('common.name');
  const valuePlaceholder = valueLabel ?? t('common.value');
  const pickerRef = useRef<HTMLInputElement>(null);
  const pickingFor = useRef<number>(-1);
  const rows = [...items, row('', '', true)];

  const attach = (index: number, file: File) => {
    const target = index === items.length ? row('', '', true) : items[index];
    const meta = putFile(target.id, file);
    if (index === items.length) onChange([...items, { ...target, key: target.key || file.name, file: meta }]);
    else update(index, { file: meta, value: '' });
  };

  const detach = (index: number) => {
    dropFile(items[index].id);
    onChange(items.map((item, itemIndex) => (itemIndex === index ? { ...item, file: undefined } : item)));
  };

  const remove = (index: number) => {
    const removed = items[index];
    dropFile(removed.id);
    const previous = items;
    onChange(items.filter((_, itemIndex) => itemIndex !== index));
    toast({
      title: `Removed ${removed.key.trim() || 'the empty row'}`,
      kind: 'info',
      action: { label: t('table.undo'), run: () => onChange(previous) },
    });
  };

  const update = (index: number, patch: Partial<KeyValue>) => {
    if (index === items.length) {
      // Editing the placeholder row promotes it to a real entry.
      onChange([...items, { ...rows[index], ...patch }]);
      return;
    }
    onChange(items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  };

  return (
    <div className="kv" data-testid={`table-${testPrefix}`}>
      <div className="kv-head">
        <span aria-hidden="true" />
        <span>{keyPlaceholder}</span>
        <span>{valuePlaceholder}</span>
        <span aria-hidden="true" />
      </div>
      {rows.map((item, index) => {
        const isPlaceholder = index === items.length;
        return (
          <div className={`kv-row ${!item.enabled && !isPlaceholder ? 'disabled' : ''}`} key={item.id} style={{ display: 'contents' }}>
            <div className="kv-cell center">
              <Checkbox
                checked={item.enabled}
                disabled={isPlaceholder}
                onCheckedChange={(checked) => update(index, { enabled: checked === true })}
                aria-label={`Enable row ${index + 1}`}
                data-testid={`checkbox-${testPrefix}-${index}`}
              />
            </div>
            <div className="kv-cell">
              <Input
                className="h-full rounded-none border-0 bg-transparent px-2 shadow-none focus-visible:ring-0"
                value={item.key}
                spellCheck={false}
                placeholder={isPlaceholder ? keyPlaceholder : ''}
                onChange={(event) => update(index, { key: event.target.value })}
                aria-label={t('table.rowAria', { label: keyPlaceholder, index: index + 1 })}
                data-testid={`input-${testPrefix}-key-${index}`}
              />
            </div>
            <div className="kv-cell">
              {item.file ? (
                <div className="kv-file" data-testid={`file-${testPrefix}-${index}`}>
                  <Paperclip size={12} />
                  <span className="truncate" title={item.file.name}>
                    {item.file.name}
                  </span>
                  <span className="hint mono shrink-0">{describeFile(item.file)}</span>
                  <IconButton
                    label={`Remove the file from row ${index + 1}`}
                    className="ml-auto h-[20px] w-[20px] [&_svg]:size-[12px]"
                    onClick={() => detach(index)}
                    testId={`button-detach-${testPrefix}-${index}`}
                  >
                    <X />
                  </IconButton>
                </div>
              ) : (
                <Input
                  className="h-full rounded-none border-0 bg-transparent px-2 shadow-none focus-visible:ring-0"
                  value={item.value}
                  spellCheck={false}
                  placeholder={isPlaceholder ? valuePlaceholder : ''}
                  onChange={(event) => update(index, { value: event.target.value })}
                  aria-label={t('table.rowAria', { label: valuePlaceholder, index: index + 1 })}
                  data-testid={`input-${testPrefix}-value-${index}`}
                />
              )}
            </div>
            <div className="kv-cell center gap-0.5">
              {allowFiles && !item.file ? (
                <IconButton
                  label={`Attach a file to row ${index + 1}`}
                  className="h-[22px] w-[22px] [&_svg]:size-[13px]"
                  onClick={() => {
                    pickingFor.current = index;
                    pickerRef.current?.click();
                  }}
                  testId={`button-attach-${testPrefix}-${index}`}
                >
                  <Paperclip />
                </IconButton>
              ) : null}
              {isPlaceholder ? null : (
                <IconButton
                  label={`Remove row ${index + 1}`}
                  tone="danger"
                  className="h-[22px] w-[22px] [&_svg]:size-[13px]"
                  onClick={() => remove(index)}
                  testId={`button-remove-${testPrefix}-${index}`}
                >
                  <Trash2 />
                </IconButton>
              )}
            </div>
          </div>
        );
      })}
      {/* One picker for the table rather than one per row; the row that asked
          is remembered while the native dialog is up. */}
      {allowFiles ? (
        <input
          ref={pickerRef}
          type="file"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file && pickingFor.current >= 0) attach(pickingFor.current, file);
            // Clearing lets the same file be picked twice in a row.
            event.target.value = '';
            pickingFor.current = -1;
          }}
          data-testid={`input-file-${testPrefix}`}
        />
      ) : null}
    </div>
  );
}
