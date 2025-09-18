import React, { useState, useEffect } from 'react';
import { Settings as SettingsType, GEMINI_MODELS } from '../types';
import { GeminiClient } from '../utils/geminiClient';

interface SettingsProps {
  settings: SettingsType;
  onSettingsChange: (settings: SettingsType) => void;
  onBack: () => void;
}

const Settings: React.FC<SettingsProps> = ({
  settings,
  onSettingsChange,
  onBack
}) => {
  const [formData, setFormData] = useState<SettingsType>({
    ...settings,
    selectedModels: settings.selectedModels || { gemini: 'gemini-2.5-flash' }
  });
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResults, setConnectionResults] = useState<{ [key: string]: { success: boolean; error?: string } }>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    const hasChanges = JSON.stringify(formData) !== JSON.stringify({
      ...settings,
      selectedModels: settings.selectedModels || { gemini: 'gemini-2.5-flash' }
    });
    setHasChanges(hasChanges);
  }, [formData, settings]);

  const handleApiKeyChange = (provider: string, apiKey: string) => {
    const updatedFormData = {
      ...formData,
      apiKeys: {
        ...formData.apiKeys,
        [provider]: apiKey
      },
      connectedApis: {
        ...formData.connectedApis,
        [provider]: false
      }
    };
    setFormData(updatedFormData);
    
    setConnectionResults(prev => {
      const newResults = { ...prev };
      delete newResults[provider];
      return newResults;
    });
  };

  const handleModelChange = (provider: string, model: string) => {
    const updatedFormData = {
      ...formData,
      selectedModels: {
        ...formData.selectedModels,
        [provider]: model
      }
    };
    setFormData(updatedFormData);
  };


  const handleTestConnection = async (provider: string) => {
    const apiKey = formData.apiKeys[provider];
    if (!apiKey) {
      setConnectionResults(prev => ({
        ...prev,
        [provider]: { success: false, error: 'API key is required' }
      }));
      return;
    }

    setTestingConnection(true);
    setConnectionResults(prev => {
      const newResults = { ...prev };
      delete newResults[provider];
      return newResults;
    });

    try {
      const client = new GeminiClient(apiKey);
      const selectedModel = formData.selectedModels[provider] || 'gemini-1.5-pro';
      const result = await client.testConnection(selectedModel);
      
      setConnectionResults(prev => ({
        ...prev,
        [provider]: result
      }));

      const updatedFormData = {
        ...formData,
        connectedApis: {
          ...formData.connectedApis,
          [provider]: result.success
        }
      };
      setFormData(updatedFormData);

    } catch (error: any) {
      console.error('Connection test failed:', error);
      setConnectionResults(prev => ({
        ...prev,
        [provider]: { success: false, error: error.message || 'Connection test failed' }
      }));
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSave = () => {
    onSettingsChange(formData);
    setHasChanges(false);
  };

  const handleReset = () => {
    setFormData({
      ...settings,
      selectedModels: settings.selectedModels || { gemini: 'gemini-2.5-flash' }
    });
    setConnectionResults({});
    setHasChanges(false);
  };

  const selectedModel = GEMINI_MODELS.find(m => m.name === (formData.selectedModels?.gemini || 'gemini-2.5-flash'));

  return (
    <div style={{ 
      background: '#f8f9fa',
      minHeight: '100vh',
      width: '100%'
    }}>
      <div style={{
        width: '100%',
        height: '100vh',
        overflowY: 'auto',
        padding: '24px'
      }}>
        {/* Header */}
      <div style={{ 
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)'
      }}>
        <button 
          className="btn btn-secondary btn-sm" 
          onClick={onBack}
          style={{ marginBottom: '16px' }}
        >
          ← Back to Projects
        </button>
        
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h1 style={{ 
              margin: '0', 
              fontSize: '32px', 
              fontWeight: '700',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Settings
            </h1>
            <p style={{ 
              margin: '8px 0 0 0', 
              color: '#6b7280',
              fontSize: '16px'
            }}>
              Configure your AI integrations and preferences
            </p>
          </div>
          
          <div className="d-flex gap-3">
            {hasChanges && (
              <button 
                className="btn"
                onClick={handleReset}
                style={{
                  background: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  fontWeight: '500'
                }}
              >
                Reset Changes
              </button>
            )}
            <button 
              className="btn"
              onClick={handleSave}
              disabled={!hasChanges}
              style={{
                background: hasChanges ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#e5e7eb',
                color: hasChanges ? 'white' : '#9ca3af',
                border: 'none',
                fontWeight: '600',
                padding: '12px 24px'
              }}
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '24px',
        alignItems: 'start'
      }}>
        {/* Left Column - Configuration */}
        <div>
          {/* AI Configuration Card */}
      <div style={{ 
        background: 'white',
        borderRadius: '16px',
        padding: '32px',
        marginBottom: '24px',
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)'
      }}>
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ 
            fontSize: '24px', 
            fontWeight: '600', 
            margin: '0 0 8px 0',
            color: '#1f2937'
          }}>
            🤖 AI Configuration
          </h2>
          <p style={{ 
            color: '#6b7280',
            fontSize: '16px',
            margin: '0'
          }}>
            Configure your Google Gemini API for intelligent data insights and chart suggestions
          </p>
        </div>

        {/* Gemini API Section */}
        <div style={{ 
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '24px',
          background: '#f9fafb'
        }}>
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              margin: '0 0 8px 0',
              color: '#1f2937'
            }}>
              Google Gemini API
            </h3>
            <p style={{ 
              color: '#6b7280',
              fontSize: '14px',
              margin: '0'
            }}>
              Get your API key from{' '}
              <a 
                href="https://makersuite.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: '#4f46e5', textDecoration: 'none', fontWeight: '500' }}
              >
                Google AI Studio →
              </a>
            </p>
          </div>
          
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: '500', color: '#374151' }}>
              API Key
            </label>
            <form onSubmit={(e) => e.preventDefault()}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={formData.apiKeys.gemini || ''}
                  onChange={(e) => handleApiKeyChange('gemini', e.target.value)}
                  onPaste={(e) => e.stopPropagation()}
                  placeholder="Paste your Gemini API key here (AIzaSy...)"
                  autoComplete="off"
                  spellCheck={false}
                  style={{
                    width: '100%',
                    padding: '12px 45px 12px 16px',
                    fontSize: '14px',
                    borderRadius: '8px',
                    border: '2px solid #e5e7eb',
                    transition: 'border-color 0.2s',
                    fontFamily: 'Monaco, "SF Mono", Consolas, monospace',
                    backgroundColor: 'white'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    fontSize: '16px',
                    cursor: 'pointer',
                    padding: '4px',
                    color: '#6b7280'
                  }}
                  title={showApiKey ? 'Hide API key' : 'Show API key'}
                >
                  {showApiKey ? '👁️' : '🙈'}
                </button>
              </div>
              <button
                className="btn"
                onClick={() => handleTestConnection('gemini')}
                disabled={testingConnection || !formData.apiKeys.gemini}
                style={{
                  background: testingConnection ? '#e5e7eb' : '#10b981',
                  color: testingConnection ? '#9ca3af' : 'white',
                  border: 'none',
                  padding: '12px 20px',
                  fontWeight: '500',
                  whiteSpace: 'nowrap',
                  minWidth: '140px'
                }}
              >
                {testingConnection ? (
                  <>
                    <div className="spinner" style={{ marginRight: '8px' }}></div>
                    Testing...
                  </>
                ) : (
                  '🔌 Test Connection'
                )}
              </button>
            </div>
            </form>
            
            {connectionResults.gemini && (
              <div 
                style={{ 
                  marginTop: '12px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  background: connectionResults.gemini.success ? '#dcfce7' : '#fee2e2',
                  color: connectionResults.gemini.success ? '#166534' : '#dc2626',
                  border: `1px solid ${connectionResults.gemini.success ? '#bbf7d0' : '#fecaca'}`
                }}
              >
                {connectionResults.gemini.success ? (
                  <>✅ Connection successful! Using {selectedModel?.displayName}</>
                ) : (
                  <>❌ {connectionResults.gemini.error}</>
                )}
              </div>
            )}
          </div>

          {/* Model Selection */}
          {formData.apiKeys.gemini && (
            <div className="form-group" style={{ marginTop: '24px' }}>
              <label className="form-label" style={{ fontWeight: '500', color: '#374151' }}>
                Model Selection
              </label>
              <select
                className="form-select"
                value={formData.selectedModels?.gemini || 'gemini-2.5-flash'}
                onChange={(e) => handleModelChange('gemini', e.target.value)}
                style={{
                  padding: '12px 16px',
                  fontSize: '14px',
                  borderRadius: '8px',
                  border: '2px solid #e5e7eb',
                  background: 'white'
                }}
              >
                {GEMINI_MODELS.map((model) => (
                  <option key={model.name} value={model.name}>
                    {model.displayName} - {model.description}
                  </option>
                ))}
              </select>
              
              {selectedModel && (
                <div style={{ 
                  marginTop: '12px',
                  padding: '16px',
                  background: 'white',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ fontWeight: '500', marginBottom: '8px', color: '#1f2937' }}>
                    {selectedModel.displayName}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>
                    {selectedModel.description}
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    gap: '16px', 
                    fontSize: '12px', 
                    color: '#9ca3af',
                    fontFamily: 'Monaco, monospace'
                  }}>
                    <span>Input: {selectedModel.inputTokenLimit.toLocaleString()} tokens</span>
                    <span>Output: {selectedModel.outputTokenLimit.toLocaleString()} tokens</span>
                    <span>Temperature: {selectedModel.temperature}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

        </div>

        {/* Right Column - Privacy & Usage */}
        <div>
          {/* Privacy & Usage Card */}
      <div style={{ 
        background: 'white',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)'
      }}>
        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: '600', 
          margin: '0 0 8px 0',
          color: '#1f2937'
        }}>
          🔒 Privacy & Usage
        </h2>
        <p style={{ 
          color: '#6b7280',
          fontSize: '16px',
          margin: '0 0 20px 0'
        }}>
          How your data and API keys are handled
        </p>

        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '16px'
        }}>
          {[
            { icon: '🔐', title: 'Local Storage', desc: 'API keys stored securely on your device only' },
            { icon: '🚫', title: 'No Data Upload', desc: 'Your data never leaves your computer' },
            { icon: '⚡', title: 'Direct API Calls', desc: 'DB Studio connects directly to Google AI' },
            { icon: '🔄', title: 'Revocable Access', desc: 'Clear API keys anytime to revoke access' }
          ].map((item, index) => (
            <div key={index} style={{ 
              padding: '16px',
              background: '#f9fafb',
              borderRadius: '8px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>{item.icon}</div>
              <div style={{ fontWeight: '600', marginBottom: '4px', color: '#1f2937' }}>
                {item.title}
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.4' }}>
                {item.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
        </div>
      </div>

      {/* Floating Save Notification */}
      {hasChanges && (
        <div style={{ 
          position: 'fixed', 
          bottom: '24px', 
          right: '24px', 
          padding: '16px 24px',
          background: 'white',
          border: '2px solid #fbbf24',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          fontSize: '14px',
          fontWeight: '500',
          color: '#92400e',
          zIndex: 1000
        }}>
          ⚠️ You have unsaved changes
        </div>
      )}
      </div>
    </div>
  );
};

export default Settings;