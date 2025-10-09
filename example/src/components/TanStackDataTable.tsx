import React, { useState, useMemo } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  useReactTable,
  SortingState,
  ColumnDef,
} from '@tanstack/react-table';

interface TanStackDataTableProps {
  data: any[];
  maxHeight?: string;
}

// Helper to detect if a string is a URL
const isUrl = (str: string): boolean => {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

// Helper to detect if value is a complex object/array
const isComplex = (value: any): boolean => {
  return value !== null && typeof value === 'object';
};

// Component for rendering JSON in a cell
const JsonCell: React.FC<{ data: any }> = ({ data }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (data === null || data === undefined) {
    return <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>null</span>;
  }

  const jsonStr = JSON.stringify(data, null, 2);
  const isLarge = jsonStr.length > 100;

  if (!isLarge || isExpanded) {
    return (
      <div style={{ position: 'relative' }}>
        <pre
          style={{
            margin: 0,
            fontSize: '0.75rem',
            padding: '0.5rem',
            backgroundColor: '#f3f4f6',
            borderRadius: '4px',
            maxWidth: '400px',
            maxHeight: '200px',
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {jsonStr}
        </pre>
        {isLarge && (
          <button
            onClick={() => setIsExpanded(false)}
            style={{
              position: 'absolute',
              top: '0.25rem',
              right: '0.25rem',
              padding: '0.125rem 0.25rem',
              fontSize: '0.625rem',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '2px',
              cursor: 'pointer',
            }}
          >
            Collapse
          </button>
        )}
      </div>
    );
  }

  // Show truncated version with expand button
  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          padding: '0.25rem 0.5rem',
          backgroundColor: '#f3f4f6',
          borderRadius: '4px',
          fontSize: '0.75rem',
          color: '#6b7280',
          cursor: 'pointer',
        }}
        onClick={() => setIsExpanded(true)}
      >
        {Array.isArray(data) ? `Array[${data.length}]` : `Object{${Object.keys(data).length}}`}
        <span style={{ marginLeft: '0.5rem', color: '#3b82f6' }}>Click to expand</span>
      </div>
    </div>
  );
};

// Custom cell renderer based on data type
const renderCell = (value: any, columnKey: string) => {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>-</span>;
  }

  // Handle booleans
  if (typeof value === 'boolean') {
    return (
      <span
        style={{
          padding: '0.125rem 0.5rem',
          borderRadius: '4px',
          fontSize: '0.75rem',
          fontWeight: 600,
          backgroundColor: value ? '#dcfce7' : '#fee2e2',
          color: value ? '#166534' : '#991b1b',
        }}
      >
        {value ? 'Yes' : 'No'}
      </span>
    );
  }

  // Handle URLs
  if (typeof value === 'string' && isUrl(value)) {
    // Special handling for image URLs
    if (columnKey.toLowerCase().includes('image') || value.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
      return (
        <img
          src={value}
          alt="Preview"
          style={{
            maxWidth: '100px',
            maxHeight: '60px',
            borderRadius: '4px',
            cursor: 'pointer',
            objectFit: 'cover',
          }}
          onClick={() => window.open(value, '_blank')}
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            img.style.display = 'none';
            img.insertAdjacentHTML('afterend', '<span style="color: #9ca3af; font-size: 0.75rem;">Image failed to load</span>');
          }}
        />
      );
    }

    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: '#3b82f6',
          textDecoration: 'none',
          fontSize: '0.875rem',
          wordBreak: 'break-all',
          display: 'inline-block',
          maxWidth: '300px',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
        onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
      >
        {value.length > 50 ? `${value.substring(0, 50)}...` : value}
      </a>
    );
  }

  // Handle dates
  if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/) && !isNaN(Date.parse(value))) {
    const date = new Date(value);
    return (
      <span style={{ fontSize: '0.875rem', color: '#374151', whiteSpace: 'nowrap' }}>
        {date.toLocaleDateString()} {value.includes('T') ? date.toLocaleTimeString() : ''}
      </span>
    );
  }

  // Handle numbers
  if (typeof value === 'number') {
    return (
      <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
        {value.toLocaleString()}
      </span>
    );
  }

  // Handle complex objects/arrays
  if (isComplex(value)) {
    return <JsonCell data={value} />;
  }

  // Handle regular strings
  if (typeof value === 'string') {
    // Truncate long strings
    if (value.length > 100) {
      return (
        <span
          title={value}
          style={{
            fontSize: '0.875rem',
            color: '#374151',
            display: 'block',
            maxWidth: '300px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {value}
        </span>
      );
    }
    return <span style={{ fontSize: '0.875rem', color: '#374151' }}>{value}</span>;
  }

  // Fallback for any other type
  return <span style={{ fontSize: '0.875rem', color: '#374151' }}>{String(value)}</span>;
};

const TanStackDataTable: React.FC<TanStackDataTableProps> = ({ data, maxHeight = '600px' }) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  // Format column header
  const formatColumnHeader = (key: string): string => {
    // Convert camelCase to Title Case
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  // Generate columns dynamically based on data
  const columns = useMemo<ColumnDef<any>[]>(() => {
    if (!data || data.length === 0) return [];

    // Extract all unique keys from the data
    const keysSet = new Set<string>();
    data.forEach((item) => {
      Object.keys(item).forEach((key) => keysSet.add(key));
    });

    // Order columns: id first, then others, complex objects last
    const allKeys = Array.from(keysSet).sort((a, b) => {
      if (a === 'id') return -1;
      if (b === 'id') return 1;

      const aIsComplex = data.some((item) => isComplex(item[a]));
      const bIsComplex = data.some((item) => isComplex(item[b]));

      if (aIsComplex && !bIsComplex) return 1;
      if (!aIsComplex && bIsComplex) return -1;

      return a.localeCompare(b);
    });

    return allKeys.map((key) => ({
      accessorKey: key,
      header: formatColumnHeader(key),
      cell: ({ getValue }) => renderCell(getValue(), key),
      enableSorting: !data.some((item) => isComplex(item[key])),
      size: key === 'id' ? 100 : undefined,
    }));
  }, [data]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  });

  if (!data || data.length === 0) {
    return (
      <div
        style={{
          padding: '2rem',
          textAlign: 'center',
          color: '#6b7280',
          fontSize: '0.875rem',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          backgroundColor: 'white',
        }}
      >
        No data available
      </div>
    );
  }

  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: 'white',
      }}
    >
      {/* Search bar */}
      <div
        style={{
          padding: '0.75rem 1rem',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb',
        }}
      >
        <input
          type="text"
          value={globalFilter ?? ''}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Search all columns..."
          style={{
            width: '100%',
            padding: '0.5rem',
            fontSize: '0.875rem',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            backgroundColor: 'white',
          }}
        />
      </div>

      {/* Table */}
      <div
        style={{
          maxHeight,
          overflow: 'auto',
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.875rem',
          }}
        >
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} style={{ backgroundColor: '#f9fafb' }}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontWeight: 600,
                      color: '#374151',
                      borderBottom: '1px solid #e5e7eb',
                      position: 'sticky',
                      top: 0,
                      backgroundColor: '#f9fafb',
                      cursor: header.column.getCanSort() ? 'pointer' : 'default',
                      userSelect: 'none',
                      whiteSpace: 'nowrap',
                      minWidth: header.column.columnDef.size || 'auto',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                          {{
                            asc: ' ▲',
                            desc: ' ▼',
                          }[header.column.getIsSorted() as string] ?? ' ⇅'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, index) => (
              <tr
                key={row.id}
                style={{
                  borderBottom: '1px solid #e5e7eb',
                  backgroundColor: index % 2 === 0 ? 'white' : '#fafafa',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'white' : '#fafafa')
                }
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    style={{
                      padding: '0.75rem 1rem',
                      verticalAlign: 'top',
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div
        style={{
          padding: '0.75rem 1rem',
          borderTop: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.75rem',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              backgroundColor: 'white',
              cursor: !table.getCanPreviousPage() ? 'not-allowed' : 'pointer',
              opacity: !table.getCanPreviousPage() ? 0.5 : 1,
            }}
          >
            {'<<'}
          </button>
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.75rem',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              backgroundColor: 'white',
              cursor: !table.getCanPreviousPage() ? 'not-allowed' : 'pointer',
              opacity: !table.getCanPreviousPage() ? 0.5 : 1,
            }}
          >
            Previous
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.75rem',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              backgroundColor: 'white',
              cursor: !table.getCanNextPage() ? 'not-allowed' : 'pointer',
              opacity: !table.getCanNextPage() ? 0.5 : 1,
            }}
          >
            Next
          </button>
          <button
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.75rem',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              backgroundColor: 'white',
              cursor: !table.getCanNextPage() ? 'not-allowed' : 'pointer',
              opacity: !table.getCanNextPage() ? 0.5 : 1,
            }}
          >
            {'>>'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', fontSize: '0.875rem' }}>
          <span style={{ color: '#6b7280' }}>
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ color: '#6b7280' }}>Show:</span>
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              style={{
                padding: '0.25rem 0.5rem',
                fontSize: '0.875rem',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                backgroundColor: 'white',
              }}
            >
              {[10, 20, 30, 50, 100].map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  {pageSize} rows
                </option>
              ))}
            </select>
          </div>
          <span style={{ color: '#6b7280' }}>
            Total: {table.getFilteredRowModel().rows.length} items
          </span>
        </div>
      </div>
    </div>
  );
};

export default TanStackDataTable;