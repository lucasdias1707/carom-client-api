import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { subtreeIds, type TreeNode } from '@/lib/tree';

type TreePickerProps = {
  nodes: TreeNode[];
  selected: ReadonlySet<string>;
  onChange: (next: Set<string>) => void;
  /** Prefixes the test ids, so two pickers on screen stay distinguishable. */
  testPrefix: string;
};

/**
 * "Which of these?" over a folder tree.
 *
 * Written for the import dialog and now shared with export, because the
 * question is the same one in both directions and answering it should feel the
 * same: ticking a folder takes everything under it, unticking gives it all
 * back, and a request can be left out of a folder that is otherwise coming.
 */
export function TreePicker({ nodes, selected, onChange, testPrefix }: TreePickerProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = (node: TreeNode) => {
    const next = new Set(selected);
    const turningOn = !selected.has(node.id);
    for (const id of subtreeIds(node)) {
      if (turningOn) next.add(id);
      else next.delete(id);
    }
    onChange(next);
  };

  const render = (list: TreeNode[]) =>
    list.map((node) => {
      const open = node.kind === 'folder' && !collapsed[node.id];
      return (
        <div key={node.id}>
          <div className="pick-row" style={{ paddingLeft: 4 + node.depth * 14 }}>
            <Checkbox
              checked={selected.has(node.id)}
              onCheckedChange={() => toggle(node)}
              aria-label={node.name}
              data-testid={`checkbox-${testPrefix}-${node.id}`}
            />
            {node.kind === 'folder' ? (
              <button
                className="pick-caret"
                onClick={() => setCollapsed((current) => ({ ...current, [node.id]: open }))}
                aria-label={open ? `Collapse ${node.name}` : `Expand ${node.name}`}
              >
                {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
            ) : (
              <span className={`tree-method m-${node.method.toLowerCase()}`}>{node.method}</span>
            )}
            <span className="truncate">{node.name}</span>
          </div>
          {node.kind === 'folder' && open ? render(node.children) : null}
        </div>
      );
    });

  return (
    <div className="pick-tree" data-testid={`${testPrefix}-tree`}>
      {render(nodes)}
    </div>
  );
}
