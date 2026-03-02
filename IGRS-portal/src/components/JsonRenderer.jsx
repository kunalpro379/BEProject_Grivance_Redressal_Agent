import React from 'react';
import './JsonRenderer.css';

/**
 * JsonRenderer - Displays JSON data in a beautiful document-style format
 * Handles nested objects, arrays, and all data types
 * Skips null/undefined values automatically
 */
const JsonRenderer = ({ data, title = null, depth = 0, skipNulls = true }) => {
  if (data === null || data === undefined) {
    return skipNulls ? null : <span className="json-null">null</span>;
  }

  // Handle primitive types
  if (typeof data === 'string') {
    return <span className="json-string">"{data}"</span>;
  }
  
  if (typeof data === 'number') {
    return <span className="json-number">{data}</span>;
  }
  
  if (typeof data === 'boolean') {
    return <span className="json-boolean">{data.toString()}</span>;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    // Skip empty arrays if skipNulls is true
    if (data.length === 0 && skipNulls) {
      return null;
    }
    
    if (data.length === 0) {
      return <span className="json-empty">[]</span>;
    }

    return (
      <div className={`json-array depth-${depth}`}>
        {data.map((item, index) => {
          // Skip null items in arrays if skipNulls is true
          if ((item === null || item === undefined) && skipNulls) {
            return null;
          }
          
          return (
            <div key={index} className="json-array-item">
              <span className="json-array-index">[{index}]</span>
              <div className="json-array-value">
                <JsonRenderer data={item} depth={depth + 1} skipNulls={skipNulls} />
              </div>
            </div>
          );
        }).filter(Boolean)}
      </div>
    );
  }

  // Handle objects
  if (typeof data === 'object') {
    const entries = Object.entries(data).filter(([key, value]) => {
      // Skip null/undefined values if skipNulls is true
      if (skipNulls && (value === null || value === undefined)) {
        return false;
      }
      // Skip empty arrays if skipNulls is true
      if (skipNulls && Array.isArray(value) && value.length === 0) {
        return false;
      }
      // Skip empty objects if skipNulls is true
      if (skipNulls && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) {
        return false;
      }
      return true;
    });
    
    if (entries.length === 0) {
      return skipNulls ? null : <span className="json-empty">{'{}'}</span>;
    }

    return (
      <div className={`json-object depth-${depth}`}>
        {title && depth === 0 && (
          <div className="json-title">{title}</div>
        )}
        {entries.map(([key, value]) => (
          <div key={key} className="json-field">
            <div className="json-key-row">
              <span className="json-key">{formatKey(key)}</span>
              {isPrimitive(value) && (
                <span className="json-inline-value">
                  <JsonRenderer data={value} depth={depth + 1} skipNulls={skipNulls} />
                </span>
              )}
            </div>
            {!isPrimitive(value) && (
              <div className="json-value">
                <JsonRenderer data={value} depth={depth + 1} skipNulls={skipNulls} />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  return <span className="json-unknown">{String(data)}</span>;
};

// Helper: Check if value is primitive (can be displayed inline)
const isPrimitive = (value) => {
  if (value === null || value === undefined) return true;
  const type = typeof value;
  if (type === 'string' || type === 'number' || type === 'boolean') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (type === 'object' && Object.keys(value).length === 0) return true;
  return false;
};

// Helper: Format key names (convert snake_case to Title Case)
const formatKey = (key) => {
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default JsonRenderer;
