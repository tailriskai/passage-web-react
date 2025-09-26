import React, { useState } from "react";

interface JsonExplorerProps {
  data: any;
  title?: string;
  defaultExpanded?: boolean;
  maxHeight?: string;
}

const JsonExplorer: React.FC<JsonExplorerProps> = ({
  data,
  title = "JSON Data",
  defaultExpanded = true,
  maxHeight = "600px",
}) => {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(
    defaultExpanded ? new Set(["root"]) : new Set()
  );
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
    const allPaths = new Set<string>(["root"]);
    const collectPaths = (obj: any, path: string) => {
      if (obj && typeof obj === "object") {
        allPaths.add(path);
        if (Array.isArray(obj)) {
          obj.forEach((item, index) => {
            collectPaths(item, `${path}[${index}]`);
          });
        } else {
          Object.keys(obj).forEach((key) => {
            collectPaths(obj[key], `${path}.${key}`);
          });
        }
      }
    };
    collectPaths(data, "root");
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
    const isExpanded = expandedKeys.has(path);
    const isHighlighted = shouldHighlight(value, path) || path === highlightPath;
    const indent = depth * 20;

    if (type === "object" || type === "array") {
      const entries = type === "array"
        ? value.map((v: any, i: number) => [i, v])
        : Object.entries(value);

      return (
        <div style={{ marginLeft: `${indent}px` }}>
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
              transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
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
              {path.split(".").pop()?.replace(/^\[|\]$/g, "")}
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
          {isExpanded && (
            <div style={{
              borderLeft: "1px solid #e5e7eb",
              marginLeft: "10px",
              paddingLeft: "8px",
              marginTop: "4px",
            }}>
              {entries.map(([key, val]: [any, any]) => {
                const childPath = type === "array"
                  ? `${path}[${key}]`
                  : `${path}.${key}`;
                return (
                  <div key={key}>
                    {renderValue(val, childPath, depth + 1)}
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

    return (
      <div
        style={{
          marginLeft: `${indent}px`,
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
          {path.split(".").pop()?.replace(/^\[|\]$/g, "")}:
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

  return (
    <div
      style={{
        border: "1px solid #d1d5db",
        borderRadius: "8px",
        backgroundColor: "#fff",
        overflow: "hidden",
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
        }}
      >
        <h4 style={{ margin: 0, flex: 1, color: "#24292f" }}>{title}</h4>
        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: "4px 8px",
            border: "1px solid #d1d5db",
            borderRadius: "4px",
            fontSize: "14px",
            width: "200px",
          }}
        />
        <button
          onClick={expandAll}
          style={{
            padding: "4px 12px",
            fontSize: "13px",
            border: "1px solid #d1d5db",
            borderRadius: "4px",
            backgroundColor: "#fff",
            cursor: "pointer",
          }}
        >
          Expand All
        </button>
        <button
          onClick={collapseAll}
          style={{
            padding: "4px 12px",
            fontSize: "13px",
            border: "1px solid #d1d5db",
            borderRadius: "4px",
            backgroundColor: "#fff",
            cursor: "pointer",
          }}
        >
          Collapse All
        </button>
        <button
          onClick={() => copyToClipboard(data, "root")}
          style={{
            padding: "4px 12px",
            fontSize: "13px",
            border: "1px solid #d1d5db",
            borderRadius: "4px",
            backgroundColor: copiedPath === "root" ? "#10b981" : "#fff",
            color: copiedPath === "root" ? "#fff" : "#24292f",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          {copiedPath === "root" ? "Copied!" : "Copy All"}
        </button>
      </div>
      <div
        style={{
          padding: "16px",
          maxHeight,
          overflowY: "auto",
          fontFamily: "Monaco, Consolas, 'Courier New', monospace",
          fontSize: "13px",
        }}
      >
        {data !== null && data !== undefined ? (
          renderValue(data, "root")
        ) : (
          <div style={{ color: "#6e7781", fontStyle: "italic" }}>No data available</div>
        )}
      </div>
    </div>
  );
};

export default JsonExplorer;