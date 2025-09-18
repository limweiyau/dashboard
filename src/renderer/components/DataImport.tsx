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

      const fileContent = await window.electronAPI.readFile(filePath);
      const extension = filePath.toLowerCase().split('.').pop();

      let result;

      switch (extension) {
        case 'csv':
          result = await processCSV(fileContent);
          break;
        case 'json':
          result = processJSON(fileContent);
          break;
        case 'xlsx':
        case 'xls':
          // For Excel files, we need to read as binary - skip for now
          throw new Error('Excel files not supported in file path mode. Please drag and drop the file instead.');
          break;
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
    <div className="empty-state">
      <div className="empty-state-icon">📊</div>
      <h2 className="empty-state-title">Import Your Data</h2>
      <p className="empty-state-description">
        Upload a CSV, JSON, or Excel file to get started with your visualizations.
        Supported formats: .csv, .json, .xlsx, .xls
      </p>

      {error && (
        <div style={{ 
          color: '#dc3545', 
          background: '#f8d7da', 
          border: '1px solid #f5c6cb',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '16px',
          maxWidth: '500px'
        }}>
          {error}
        </div>
      )}

      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{
          border: '2px dashed #d1d1d6',
          borderRadius: '12px',
          padding: '40px',
          margin: '20px 0',
          background: '#f8f9fa',
          cursor: 'pointer',
          transition: 'all 0.2s',
          maxWidth: '500px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#007aff';
          e.currentTarget.style.background = '#f0f8ff';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#d1d1d6';
          e.currentTarget.style.background = '#f8f9fa';
        }}
        onClick={handleFileSelect}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
          <p style={{ margin: '0 0 8px 0', fontWeight: '500' }}>
            Drop your file here or click to browse
          </p>
          <p style={{ margin: '0', fontSize: '14px', color: '#86868b' }}>
            CSV, JSON, or Excel files up to 100MB
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
        <button
          onClick={onCancel}
          style={{
            padding: '8px 16px',
            background: 'white',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Cancel
        </button>
        <button
          className={`btn ${loading ? 'btn-secondary' : 'btn-primary'}`}
          onClick={handleFileSelect}
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="spinner"></div>
              Processing...
            </>
          ) : (
            'Browse Files'
          )}
        </button>
      </div>
    </div>
  );
};

export default DataImport;