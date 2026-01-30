interface TableShimmerProps {
  rows?: number;
  columns: number;
  hasActionsColumn?: boolean;
}

export function TableShimmer({ rows = 6, columns, hasActionsColumn = true }: TableShimmerProps) {
  // Different widths for different column types
  const getWidth = (colIndex: number, totalColumns: number) => {
    if (colIndex === 0) return 'w-32'; // Name column
    if (colIndex === totalColumns - 1 && !hasActionsColumn) return 'w-32'; // Last column (not actions)
    if (colIndex === totalColumns - 1) return 'w-20'; // Actions column
    if (colIndex === 1 || colIndex === 2) return 'w-28'; // Location/Phone columns
    return 'w-24'; // Other columns
  };

  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex} className="hover:bg-slate-50">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <td key={colIndex} className="px-6 py-4">
              {colIndex === columns - 1 && hasActionsColumn ? (
                // Actions column - show icon placeholders
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 bg-slate-200 rounded animate-shimmer" />
                  <div className="h-5 w-5 bg-slate-200 rounded animate-shimmer" 
                       style={{ animationDelay: '0.2s' }} 
                  />
                </div>
              ) : (
                // Regular columns - show text placeholder with shimmer
                <div 
                  className={`h-4 bg-slate-200 rounded animate-shimmer ${getWidth(colIndex, columns)}`}
                  style={{ animationDelay: `${rowIndex * 0.1 + colIndex * 0.05}s` }}
                />
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
