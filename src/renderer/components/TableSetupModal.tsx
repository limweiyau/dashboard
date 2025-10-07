import React, { useState } from 'react';
import { GeminiClient } from '../utils/geminiClient';
import { Settings } from '../types';

interface TableSetupModalProps {
  fileName: string;
  data: any[];
  columns: any[];
  onSave: (title: string, description: string, isAIGenerated: boolean) => void;
  onCancel: () => void;
  settings?: Settings;
}

const TableSetupModal: React.FC<TableSetupModalProps> = ({
  fileName,
  data,
  columns,
  onSave,
  onCancel,
  settings
}) => {
  const defaultTitle = fileName ? fileName.replace(/\.[^/.]+$/, '') : 'Untitled Table';
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [isDescriptionAI, setIsDescriptionAI] = useState(false);
  const MAX_DESCRIPTION_LENGTH = 175;

  const handleGenerateDescription = async () => {
    const geminiApiKey = settings?.apiKeys?.['gemini'];

    if (!geminiApiKey) {
      setError('Please set up your Gemini API key in Settings first.');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const geminiClient = new GeminiClient(geminiApiKey);

      // Use the same concise prompt as table row generation
      const columnInfo = columns.map(col => `${col.name} (${col.type})`).join(', ');
      const prompt = `Write a professional, business-focused description of this data table in one sentence. Table: "${title}" with ${data.length} records. Fields: ${columnInfo}. Focus on what this data tracks or measures. Keep it under 175 characters. No quotes. Be concise and clear.`;

      const selectedModel = settings?.selectedModels?.['gemini'] || 'gemini-2.5-flash';
      const result = await geminiClient.generateContent(prompt, selectedModel);
      const generatedDescription = result.trim().slice(0, MAX_DESCRIPTION_LENGTH);

      setDescription(generatedDescription);
      setIsDescriptionAI(true);
    } catch (err) {
      console.error('Error generating description:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate description');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    if (title.trim()) {
      onSave(title, description, isDescriptionAI);
    }
  };

  const handleDescriptionChange = (value: string) => {
    // Limit to MAX_DESCRIPTION_LENGTH characters
    const truncated = value.slice(0, MAX_DESCRIPTION_LENGTH);
    setDescription(truncated);
    // If user manually edits, it's no longer AI-generated
    if (isDescriptionAI && truncated !== description) {
      setIsDescriptionAI(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #e2e8f0'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: '600',
            color: '#0f172a'
          }}>
            Table Setup
          </h2>
          <p style={{
            margin: '8px 0 0 0',
            fontSize: '14px',
            color: '#64748b'
          }}>
            Configure your data table
          </p>
        </div>

        {/* Content */}
        <div style={{
          padding: '24px'
        }}>
          {/* Title */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <label style={{
                fontSize: '13px',
                fontWeight: '600',
                color: '#475569'
              }}>
                Table Title
              </label>
              <div style={{
                fontSize: '11px',
                color: '#64748b',
                fontWeight: '500'
              }}>
                {data.length.toLocaleString()} rows × {columns.length} columns
              </div>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 25))}
              placeholder="Enter table name"
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '14px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
            />
            <div style={{
              fontSize: '11px',
              color: title.length > 20 ? '#dc2626' : '#94a3b8',
              marginTop: '4px'
            }}>
              {title.length}/25
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <label style={{
                fontSize: '13px',
                fontWeight: '600',
                color: '#475569'
              }}>
                Description (Optional)
              </label>
              <button
                onClick={handleGenerateDescription}
                disabled={isGenerating}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: '500',
                  background: isGenerating ? '#94a3b8' : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {isGenerating ? (
                  <>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      borderTopColor: 'white',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite'
                    }} />
                    Generating...
                  </>
                ) : (
                  <>Generate</>
                )}
              </button>
            </div>
            <textarea
              value={description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder="Describe this data table..."
              rows={4}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '14px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
                lineHeight: '1.5',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
            />
            <div style={{
              fontSize: '11px',
              color: description.length > 160 ? '#dc2626' : '#94a3b8',
              marginTop: '4px',
              textAlign: 'right'
            }}>
              {description.length}/{MAX_DESCRIPTION_LENGTH}
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div style={{
              padding: '12px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px'
            }}>
              <p style={{
                margin: 0,
                fontSize: '13px',
                color: '#dc2626'
              }}>
                {error}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '500',
              background: 'white',
              color: '#64748b',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '500',
              background: title.trim() ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' : '#cbd5e1',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: title.trim() ? 'pointer' : 'not-allowed'
            }}
          >
            Save Table
          </button>
        </div>
      </div>

      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default TableSetupModal;
