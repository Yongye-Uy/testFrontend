import { EmptyState } from "@/components/shared/empty-state";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  width?: string;
  align?: "left" | "right" | "center";
  render: (row: T) => React.ReactNode;
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyTitle = "No records to show",
  emptyDescription = "There is nothing to display yet.",
  compact = false,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyTitle?: string;
  emptyDescription?: string;
  compact?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl2 bg-white shadow-soft ring-1 ring-ink-100">
        <EmptyState title={emptyTitle} description={emptyDescription} />
      </div>
    );
  }

  const cellPad = compact ? "px-4 py-2.5" : "px-5 py-3.5";

  return (
    <div className="overflow-hidden rounded-xl2 bg-white shadow-soft ring-1 ring-ink-100">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-ink-200 bg-cream-100/70">
              {columns.map((column) => (
                <th
                  key={column.key}
                  style={{ width: column.width }}
                  className={`${cellPad} text-[11px] font-bold uppercase tracking-wider text-ink-500 ${alignClass(column.align)}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)} className="border-b border-ink-100 transition last:border-b-0 hover:bg-cream-100/70">
                {columns.map((column) => (
                  <td key={column.key} className={`${cellPad} text-ink-800 ${alignClass(column.align)}`}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function alignClass(align?: "left" | "right" | "center") {
  if (align === "right") return "text-right";
  if (align === "center") return "text-center";
  return "text-left";
}
