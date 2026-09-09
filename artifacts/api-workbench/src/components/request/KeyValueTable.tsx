import { Trash2 } from 'lucide-react';
import { row } from '@/lib/factories';
import type { KeyValue } from '@/types';
import { IconButton } from '@/components/common/IconButton';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';

type KeyValueTableProps = {
  items: KeyValue[];
  onChange: (items: KeyValue[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  testPrefix: string;
};

/**
 * Editable key/value grid with per-row enable toggles. An empty trailing row is
 * always rendered so adding an entry is just typing, like a spreadsheet.
 */
export function KeyValueTable({
  items,
  onChange,
  keyPlaceholder = 'Name',
  valuePlaceholder = 'Value',
  testPrefix,
}: KeyValueTableProps) {
  const rows = [...items, row('', '', true)];

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
                aria-label={`${keyPlaceholder} ${index + 1}`}
                data-testid={`input-${testPrefix}-key-${index}`}
              />
            </div>
            <div className="kv-cell">
              <Input
                className="h-full rounded-none border-0 bg-transparent px-2 shadow-none focus-visible:ring-0"
                value={item.value}
                spellCheck={false}
                placeholder={isPlaceholder ? valuePlaceholder : ''}
                onChange={(event) => update(index, { value: event.target.value })}
                aria-label={`${valuePlaceholder} ${index + 1}`}
                data-testid={`input-${testPrefix}-value-${index}`}
              />
            </div>
            <div className="kv-cell center">
              {isPlaceholder ? null : (
                <IconButton
                  label={`Remove row ${index + 1}`}
                  tone="danger"
                  className="h-[22px] w-[22px] [&_svg]:size-[13px]"
                  onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
                  testId={`button-remove-${testPrefix}-${index}`}
                >
                  <Trash2 />
                </IconButton>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
