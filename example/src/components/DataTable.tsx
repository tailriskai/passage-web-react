import React, { useState, useMemo } from 'react';

interface DataTableProps {
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

// Component for rendering a cell based on its type
const DataCell: React.FC<{ value: any; columnKey: string }> = ({ value, columnKey }) => {
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
          }}
          onClick={() => window.open(value, '_blank')}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
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
      <span style={{ fontSize: '0.875rem', color: '#374151' }}>
        {date.toLocaleDateString()} {date.toLocaleTimeString()}
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

const DataTable: React.FC<DataTableProps> = ({ data, maxHeight = '600px' }) => {
  const [sortConfig, setSortConfig] = useState<{
    key: string | null;
    direction: 'asc' | 'desc';
  }>({ key: null, direction: 'asc' });

  // Extract all unique keys from the data
  const columns = useMemo(() => {
    if (!data || data.length === 0) return [];

    const keysSet = new Set<string>();
    data.forEach((item) => {
      Object.keys(item).forEach((key) => keysSet.add(key));
    });

    // Order columns: id first, then others, complex objects last
    const allKeys = Array.from(keysSet);
    return allKeys.sort((a, b) => {
      // id column first
      if (a === 'id') return -1;
      if (b === 'id') return 1;

      // Check if values are complex
      const aIsComplex = data.some((item) => isComplex(item[a]));
      const bIsComplex = data.some((item) => isComplex(item[b]));

      // Complex columns last
      if (aIsComplex && !bIsComplex) return 1;
      if (!aIsComplex && bIsComplex) return -1;

      // Alphabetical for the rest
      return a.localeCompare(b);
    });
  }, [data]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key!];
      const bValue = b[sortConfig.key!];

      // Handle null/undefined
      if (aValue == null) return sortConfig.direction === 'asc' ? 1 : -1;
      if (bValue == null) return sortConfig.direction === 'asc' ? -1 : 1;

      // Handle complex objects (don't sort them)
      if (isComplex(aValue) || isComplex(bValue)) return 0;

      // Handle strings
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const result = aValue.localeCompare(bValue);
        return sortConfig.direction === 'asc' ? result : -result;
      }

      // Handle numbers/dates
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig((current) => {
      if (current.key === key) {
        return {
          key,
          direction: current.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { key, direction: 'asc' };
    });
  };

  // Format column header
  const formatColumnHeader = (key: string): string => {
    // Convert camelCase to Title Case
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  if (!data || data.length === 0) {
    return (
      <div
        style={{
          padding: '2rem',
          textAlign: 'center',
          color: '#6b7280',
          fontSize: '0.875rem',
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
            <tr style={{ backgroundColor: '#f9fafb' }}>
              {columns.map((column) => {
                const isComplexColumn = data.some((item) => isComplex(item[column]));
                return (
                  <th
                    key={column}
                    onClick={() => !isComplexColumn && handleSort(column)}
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontWeight: 600,
                      color: '#374151',
                      borderBottom: '1px solid #e5e7eb',
                      position: 'sticky',
                      top: 0,
                      backgroundColor: '#f9fafb',
                      cursor: isComplexColumn ? 'default' : 'pointer',
                      userSelect: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span>{formatColumnHeader(column)}</span>
                      {!isComplexColumn && sortConfig.key === column && (
                        <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                          {sortConfig.direction === 'asc' ? '▲' : '▼'}
                        </span>
                      )}
                      {!isComplexColumn && sortConfig.key !== column && (
                        <span style={{ color: '#d1d5db', fontSize: '0.75rem' }}>⇅</span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                style={{
                  borderBottom: '1px solid #e5e7eb',
                  backgroundColor: rowIndex % 2 === 0 ? 'white' : '#f9fafb',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = rowIndex % 2 === 0 ? 'white' : '#f9fafb')
                }
              >
                {columns.map((column) => (
                  <td
                    key={column}
                    style={{
                      padding: '0.75rem 1rem',
                      borderBottom: '1px solid #e5e7eb',
                      verticalAlign: 'top',
                    }}
                  >
                    <DataCell value={row[column]} columnKey={column} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;