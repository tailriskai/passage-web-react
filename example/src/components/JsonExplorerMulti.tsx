import React, { useState } from "react";

interface JsonExplorerMultiProps {
  data: Array<{
    type: string;
    timestamp: string;
    presentationStyle?: string;
    data: any;
  }>;
  title?: string;
  maxHeight?: string;
}

interface JsonBlockProps {
  entry: {
    type: string;
    timestamp: string;
    presentationStyle?: string;
    data: any;
  };
  index: number;
  defaultExpanded?: boolean;
}

const JsonBlock: React.FC<JsonBlockProps> = ({ entry, index, defaultExpanded = false }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightPath, setHighlightPath] = useState<string | null>(null);

  const toggleExpand = (path: string) => {
    const newExpanded = new Set(expandedKeys);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
      // Also collapse all children
      Array.from(newExpanded).forEach((key) => {
        if (key.startsWith(path + ".")) {
          newExpanded.delete(key);
        }
      });
    } else {
      newExpanded.add(path);
    }
    setExpandedKeys(newExpanded);
  };

  const expandAll = () => {
    const allPaths = new Set<string>();
    const collectPaths = (obj: any, path: string) => {
      if (obj && typeof obj === "object") {
        allPaths.add(path);
        if (Array.isArray(obj)) {
          obj.forEach((item, idx) => {
            collectPaths(item, `${path}[${idx}]`);
          });
        } else {
          Object.keys(obj).forEach((key) => {
            collectPaths(obj[key], `${path}.${key}`);
          });
        }
      }
    };
    collectPaths(entry.data, "");
    setExpandedKeys(allPaths);
  };

  const collapseAll = () => {
    setExpandedKeys(new Set());
  };

  const copyToClipboard = (value: any, path: string) => {
    const textToCopy = typeof value === "string" ? value : JSON.stringify(value, null, 2);
    navigator.clipboard.writeText(textToCopy);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const getValueType = (value: any): string => {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (Array.isArray(value)) return "array";
    return typeof value;
  };

  const getValuePreview = (value: any): string => {
    const type = getValueType(value);
    if (type === "array") return `[${value.length}]`;
    if (type === "object") return `{${Object.keys(value).length}}`;
    if (type === "string") return `"${value}"`;
    if (type === "null") return "null";
    if (type === "undefined") return "undefined";
    return String(value);
  };

  const shouldHighlight = (value: any, path: string): boolean => {
    if (!searchTerm) return false;

    // Check if path contains search term
    if (path.toLowerCase().includes(searchTerm.toLowerCase())) return true;

    // Check if value contains search term
    if (typeof value === "string" && value.toLowerCase().includes(searchTerm.toLowerCase())) return true;
    if (typeof value === "number" && String(value).includes(searchTerm)) return true;

    return false;
  };

  const renderValue = (value: any, path: string, depth: number = 0): JSX.Element => {
    const type = getValueType(value);
    const isNodeExpanded = expandedKeys.has(path);
    const isHighlighted = shouldHighlight(value, path) || path === highlightPath;
    const indent = depth * 20;

    if (type === "object" || type === "array") {
      const entries = type === "array"
        ? value.map((v: any, i: number) => [i, v])
        : Object.entries(value);

      const displayKey = path ? path.split(".").pop()?.replace(/^\[|\]$/g, "") : "";

      return (
        <div style={{ marginLeft: depth > 0 ? `${indent}px` : 0 }}>
          {path && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "2px 4px",
                borderRadius: "4px",
                cursor: "pointer",
                backgroundColor: isHighlighted ? "#fff3cd" : "transparent",
                transition: "background-color 0.2s",
              }}
              onClick={() => toggleExpand(path)}
              onMouseEnter={() => setHighlightPath(path)}
              onMouseLeave={() => setHighlightPath(null)}
            >
              <span style={{
                transform: isNodeExpanded ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
                fontSize: "12px",
                color: "#666",
                display: "inline-block",
              }}>
                ▶
              </span>
              <span style={{
                color: "#0969da",
                fontWeight: 500,
              }}>
                {displayKey}
              </span>
              <span style={{
                color: "#666",
                fontSize: "12px",
              }}>
                {getValuePreview(value)}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(value, path);
                }}
                style={{
                  marginLeft: "auto",
                  padding: "2px 6px",
                  fontSize: "11px",
                  border: "1px solid #d1d5db",
                  borderRadius: "4px",
                  backgroundColor: copiedPath === path ? "#10b981" : "#fff",
                  color: copiedPath === path ? "#fff" : "#666",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {copiedPath === path ? "✓" : "Copy"}
              </button>
            </div>
          )}
          {(isNodeExpanded || !path) && (
            <div style={{
              borderLeft: path ? "1px solid #e5e7eb" : "none",
              marginLeft: path ? "10px" : 0,
              paddingLeft: path ? "8px" : 0,
              marginTop: path ? "4px" : 0,
            }}>
              {entries.map(([key, val]: [any, any]) => {
                const childPath = path
                  ? (type === "array" ? `${path}[${key}]` : `${path}.${key}`)
                  : String(key);
                return (
                  <div key={key}>
                    {renderValue(val, childPath, path ? depth + 1 : 0)}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    // Primitive values
    let valueColor = "#24292f";
    let displayValue = String(value);

    if (type === "string") {
      valueColor = "#0a3069";
      displayValue = `"${value}"`;
    } else if (type === "number") {
      valueColor = "#0969da";
    } else if (type === "boolean") {
      valueColor = "#8250df";
    } else if (type === "null" || type === "undefined") {
      valueColor = "#6e7781";
    }

    const displayKey = path ? path.split(".").pop()?.replace(/^\[|\]$/g, "") : "";

    return (
      <div
        style={{
          marginLeft: depth > 0 ? `${indent}px` : 0,
          padding: "2px 4px",
          borderRadius: "4px",
          backgroundColor: isHighlighted ? "#fff3cd" : "transparent",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
        onMouseEnter={() => setHighlightPath(path)}
        onMouseLeave={() => setHighlightPath(null)}
      >
        <span style={{ color: "#0969da", fontWeight: 500 }}>
          {displayKey}:
        </span>
        <span style={{ color: valueColor, wordBreak: "break-all" }}>
          {displayValue}
        </span>
        <button
          onClick={() => copyToClipboard(value, path)}
          style={{
            marginLeft: "auto",
            padding: "2px 6px",
            fontSize: "11px",
            border: "1px solid #d1d5db",
            borderRadius: "4px",
            backgroundColor: copiedPath === path ? "#10b981" : "#fff",
            color: copiedPath === path ? "#fff" : "#666",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          {copiedPath === path ? "✓" : "Copy"}
        </button>
      </div>
    );
  };

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  // Get event type color
  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'connectionComplete':
        return '#10b981';
      case 'error':
        return '#ef4444';
      case 'dataComplete':
        return '#3b82f6';
      case 'promptComplete':
        return '#8b5cf6';
      case 'exit':
        return '#6b7280';
      case 'done':
        return '#22c55e';
      default:
        return '#6b7280';
    }
  };

  return (
    <div
      style={{
        border: "1px solid #d1d5db",
        borderRadius: "8px",
        backgroundColor: "#fff",
        overflow: "hidden",
        marginBottom: "12px",
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          backgroundColor: "#f6f8fa",
          borderBottom: "1px solid #d1d5db",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          cursor: "pointer",
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span style={{
          transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
          transition: "transform 0.2s",
          fontSize: "14px",
          color: "#666",
          display: "inline-block",
        }}>
          ▶
        </span>
        <span
          style={{
            backgroundColor: getEventTypeColor(entry.type),
            color: "#fff",
            padding: "2px 8px",
            borderRadius: "12px",
            fontSize: "12px",
            fontWeight: 600,
          }}
        >
          {entry.type}
        </span>
        {entry.presentationStyle && (
          <span
            style={{
              backgroundColor: "#e5e7eb",
              color: "#374151",
              padding: "2px 8px",
              borderRadius: "12px",
              fontSize: "12px",
            }}
          >
            {entry.presentationStyle}
          </span>
        )}
        <span style={{ color: "#6b7280", fontSize: "13px" }}>
          {formatTime(entry.timestamp)}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
          {isExpanded && (
            <>
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => {
                  e.stopPropagation();
                  setSearchTerm(e.target.value);
                }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  padding: "4px 8px",
                  border: "1px solid #d1d5db",
                  borderRadius: "4px",
                  fontSize: "12px",
                  width: "150px",
                }}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  expandAll();
                }}
                style={{
                  padding: "4px 8px",
                  fontSize: "12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "4px",
                  backgroundColor: "#fff",
                  cursor: "pointer",
                }}
              >
                Expand
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  collapseAll();
                }}
                style={{
                  padding: "4px 8px",
                  fontSize: "12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "4px",
                  backgroundColor: "#fff",
                  cursor: "pointer",
                }}
              >
                Collapse
              </button>
            </>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              copyToClipboard(entry.data, "");
            }}
            style={{
              padding: "4px 8px",
              fontSize: "12px",
              border: "1px solid #d1d5db",
              borderRadius: "4px",
              backgroundColor: copiedPath === "" ? "#10b981" : "#fff",
              color: copiedPath === "" ? "#fff" : "#24292f",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {copiedPath === "" ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
      {isExpanded && (
        <div
          style={{
            padding: "16px",
            maxHeight: "400px",
            overflowY: "auto",
            fontFamily: "Monaco, Consolas, 'Courier New', monospace",
            fontSize: "13px",
          }}
        >
          {entry.data !== null && entry.data !== undefined ? (
            renderValue(entry.data, "")
          ) : (
            <div style={{ color: "#6e7781", fontStyle: "italic" }}>No data available</div>
          )}
        </div>
      )}
    </div>
  );
};

const JsonExplorerMulti: React.FC<JsonExplorerMultiProps> = ({
  data,
  title = "Connection Results",
  maxHeight = "600px",
}) => {
  const [expandedAll, setExpandedAll] = useState(false);

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <h4 style={{ margin: 0, color: "#24292f" }}>{title}</h4>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => setExpandedAll(!expandedAll)}
            style={{
              padding: "6px 12px",
              fontSize: "13px",
              border: "1px solid #d1d5db",
              borderRadius: "4px",
              backgroundColor: "#fff",
              cursor: "pointer",
            }}
          >
            {expandedAll ? "Collapse All" : "Expand All"}
          </button>
        </div>
      </div>
      <div
        style={{
          maxHeight,
          overflowY: "auto",
        }}
      >
        {data.length > 0 ? (
          data.map((entry, index) => (
            <JsonBlock
              key={`${entry.type}-${entry.timestamp}-${index}`}
              entry={entry}
              index={index}
              defaultExpanded={expandedAll}
            />
          ))
        ) : (
          <div
            style={{
              padding: "20px",
              textAlign: "center",
              color: "#6b7280",
              fontStyle: "italic",
              border: "1px dashed #d1d5db",
              borderRadius: "8px",
            }}
          >
            No connection results yet
          </div>
        )}
      </div>
    </div>
  );
};

export default JsonExplorerMulti;