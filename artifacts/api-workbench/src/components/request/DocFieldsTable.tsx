import { Trash2, Wand2 } from 'lucide-react';
import { IconButton } from '@/components/common/IconButton';
import { SelectField } from '@/components/common/SelectField';
import { useToast } from '@/components/common/Toaster';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { discoverFields, docField, fieldsOf, mergeFields } from '@/lib/docs';
import { DOC_FIELD_LOCATIONS, DOC_FIELD_TYPES, type DocField, type RequestRecord } from '@/types';

/**
 * The field table in the Docs tab.
 *
 * "Read from the request" is the point of it: the params, the headers, the
 * `{{holes}}` in the path and the keys of a JSON body are already there, so
 * the table fills itself and what is left to write is what a field *means*.
 * Pressing it again after adding a parameter adds that one and leaves every
 * description alone.
 */
export function DocFieldsTable({
  request,
  onChange,
}: {
  request: RequestRecord;
  onChange: (fields: DocField[]) => void;
}) {
  const { toast } = useToast();
  const fields = fieldsOf(request);

  const update = (id: string, patch: Partial<DocField>) =>
    onChange(fields.map((field) => (field.id === id ? { ...field, ...patch } : field)));

  const read = () => {
    const { fields: merged, added } = mergeFields(fields, discoverFields(request));
    onChange(merged);
    toast({
      title: added === 0 ? 'Nothing new to add' : `Added ${added} field${added === 1 ? '' : 's'}`,
      description:
        added === 0
          ? 'Every parameter, header and body key is already in the table.'
          : 'Descriptions you had written were left as they are.',
      kind: added === 0 ? 'info' : 'success',
    });
  };

  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="section-label" style={{ flexWrap: 'wrap' }}>
        Fields
        <span className="spacer" />
        <Button variant="ghost" size="sm" onClick={read} data-testid="button-read-fields">
          <Wand2 /> Read from the request
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange([...fields, docField()])}
          data-testid="button-add-field"
        >
          Add
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className="hint" data-testid="text-no-fields">
          No fields described yet. “Read from the request” fills this in from the params, headers and body you already
          have; what you add here is what an OpenAPI export can say and a key/value row cannot — a type, whether it is
          required, and what it is for.
        </p>
      ) : (
        <div className="doc-fields-scroll">
          <div className="doc-fields" data-testid="doc-fields">
          <div className="kv-head">
            <span>In</span>
            <span>Name</span>
            <span>Type</span>
            <span>Req</span>
            <span>Example</span>
            <span>Description</span>
            <span />
          </div>
          {fields.map((field) => (
            <div className="kv-row doc-row" key={field.id} data-testid={`doc-field-${field.id}`}>
              <div className="kv-cell">
                <SelectField
                  value={field.in}
                  onChange={(where) => update(field.id, { in: where })}
                  options={DOC_FIELD_LOCATIONS.map((where) => ({ value: where, label: where }))}
                  ariaLabel={`Where ${field.name || 'this field'} goes`}
                  testId={`select-field-in-${field.id}`}
                  block
                  className="border-0 bg-transparent"
                />
              </div>
              <div className="kv-cell">
                <input
                  value={field.name}
                  placeholder="name"
                  onChange={(event) => update(field.id, { name: event.target.value })}
                  aria-label="Field name"
                  data-testid={`input-field-name-${field.id}`}
                />
              </div>
              <div className="kv-cell">
                <SelectField
                  value={field.type}
                  onChange={(type) => update(field.id, { type })}
                  options={DOC_FIELD_TYPES.map((type) => ({ value: type, label: type }))}
                  ariaLabel={`Type of ${field.name || 'this field'}`}
                  testId={`select-field-type-${field.id}`}
                  block
                  className="border-0 bg-transparent"
                />
              </div>
              <div className="kv-cell center">
                <Checkbox
                  checked={field.required}
                  onCheckedChange={(checked) => update(field.id, { required: checked === true })}
                  aria-label={`${field.name || 'This field'} is required`}
                  data-testid={`checkbox-field-required-${field.id}`}
                />
              </div>
              <div className="kv-cell">
                <input
                  value={field.example}
                  placeholder="example"
                  onChange={(event) => update(field.id, { example: event.target.value })}
                  aria-label="Example value"
                  data-testid={`input-field-example-${field.id}`}
                />
              </div>
              <div className="kv-cell">
                <input
                  value={field.description}
                  placeholder="what it is for"
                  onChange={(event) => update(field.id, { description: event.target.value })}
                  aria-label="Field description"
                  data-testid={`input-field-description-${field.id}`}
                />
              </div>
              <div className="kv-cell center">
                <IconButton
                  label="Remove this field"
                  onClick={() => onChange(fields.filter((item) => item.id !== field.id))}
                  testId={`button-remove-field-${field.id}`}
                >
                  <Trash2 />
                </IconButton>
              </div>
            </div>
          ))}
        </div>
        </div>
      )}
    </div>
  );
}
