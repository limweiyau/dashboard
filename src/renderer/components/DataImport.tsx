import React, { useState } from 'react';
import { processCSV, processExcel, processJSON } from '../utils/dataProcessor';

interface DataImportProps {
  onImport: (data: any[], columns: any[], fileName?: string) => void;
  onCancel: () => void;
}

const DataImport: React.FC<DataImportProps> = ({ onImport, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileSelect = async () => {
    try {
      setLoading(true);
      setError('');

      const filePath = await window.electronAPI.selectFile();
      if (!filePath) return;

      const extension = filePath.toLowerCase().split('.').pop();
      let result;

      switch (extension) {
        case 'csv':
        case 'json': {
          const fileContent = await window.electronAPI.readFile(filePath);
          result = extension === 'csv' ? await processCSV(fileContent) : processJSON(fileContent);
          break;
        }
        case 'xlsx':
        case 'xls': {
          // For Excel files, read as binary buffer
          const arrayBuffer = await window.electronAPI.readFileAsBuffer(filePath);
          result = await processExcel(arrayBuffer);
          break;
        }
        default:
          throw new Error('Unsupported file format. Please use CSV, JSON, or Excel files.');
      }

      if (result.data.length === 0) {
        throw new Error('No data found in the selected file.');
      }

      const fileName = filePath.split('/').pop() || 'imported_file';
      onImport(result.data, result.columns, fileName);

    } catch (err) {
      console.error('Import error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while importing the file.');
    } finally {
      setLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const file = files[0];
    const extension = file.name.toLowerCase().split('.').pop();

    if (!['csv', 'json', 'xlsx', 'xls'].includes(extension || '')) {
      setError('Unsupported file format. Please use CSV, JSON, or Excel files.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          let result;
          
          if (extension === 'csv' || extension === 'json') {
            const content = event.target?.result as string;
            if (extension === 'csv') {
              result = await processCSV(content);
            } else {
              result = processJSON(content);
            }
          } else if (extension === 'xlsx' || extension === 'xls') {
            const buffer = event.target?.result as ArrayBuffer;
            result = processExcel(buffer);
          }

          if (result && result.data.length > 0) {
            onImport(result.data, result.columns, file.name);
          } else {
            throw new Error('No data found in the selected file.');
          }
        } catch (err) {
          console.error('Import error:', err);
          setError(err instanceof Error ? err.message : 'An error occurred while processing the file.');
        } finally {
          setLoading(false);
        }
      };

      if (extension === 'csv' || extension === 'json') {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }

    } catch (err) {
      console.error('File reading error:', err);
      setError('Failed to read the file.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        width: 'min(400px, 90vw)',
        maxHeight: '80vh',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
        textAlign: 'center',
        position: 'relative'
      }}>
        {/* Close Button */}
        <button
          onClick={onCancel}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'none',
            border: 'none',
            fontSize: '20px',
            color: '#6b7280',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
        >
          ×
        </button>

        <h2 style={{
          fontSize: '18px',
          fontWeight: '600',
          margin: '0 0 8px 0',
          color: '#1f2937'
        }}>Import Data</h2>

        <p style={{
          fontSize: '14px',
          color: '#6b7280',
          margin: '0 0 20px 0'
        }}>
          CSV, JSON, Excel files supported
        </p>

        {error && (
          <div style={{
            color: '#dc2626',
            background: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
            fontSize: '13px',
            fontWeight: '500'
          }}>
            {error}
          </div>
        )}

        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleFileSelect}
          style={{
            border: '2px dashed #d1d5db',
            borderRadius: '8px',
            padding: '32px 16px',
            background: '#f9fafb',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            marginBottom: '20px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#3b82f6';
            e.currentTarget.style.background = '#eff6ff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#d1d5db';
            e.currentTarget.style.background = '#f9fafb';
          }}
        >
          {loading ? (
            <div>
              <div style={{ marginBottom: '12px' }}>
                <div className="spinner"></div>
              </div>
              <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                Processing file...
              </p>
            </div>
          ) : (
            <div>
              <div style={{
                marginBottom: '12px',
                color: '#6b7280'
              }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7,10 12,15 17,10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </div>
              <p style={{
                margin: '0 0 4px 0',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151'
              }}>
                Drop files here or click to browse
              </p>
              <p style={{
                margin: 0,
                fontSize: '12px',
                color: '#9ca3af'
              }}>
                CSV, JSON, Excel files up to 100MB
              </p>
            </div>
          )}
        </div>

        <div style={{
          display: 'flex',
          gap: '8px',
          justifyContent: 'center'
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              background: '#f3f4f6',
              color: '#374151',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#e5e7eb'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#f3f4f6'}
          >
            Cancel
          </button>
          <button
            onClick={handleFileSelect}
            disabled={loading}
            style={{
              padding: '8px 16px',
              background: loading ? '#e5e7eb' : '#3b82f6',
              color: loading ? '#9ca3af' : 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.background = '#2563eb';
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.background = '#3b82f6';
            }}
          >
            {loading ? 'Processing...' : 'Browse Files'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataImport;