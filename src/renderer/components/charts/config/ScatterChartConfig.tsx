import React from 'react';
import { ChartTypeConfigProps } from './BaseChartConfig';

const ScatterChartConfig: React.FC<ChartTypeConfigProps> = ({
  config,
  onConfigChange,
  columns,
  numericColumns,
  isDataSelection = false
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* X-Axis Field Selection */}
      <div>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '8px'
        }}>
          X-Axis (Numeric Values)
        </label>
        <select
          value={config.xAxisField || ''}
          onChange={(e) => {
            if (isDataSelection) {
              // Animation trigger logic would go here
            }
            onConfigChange({ xAxisField: e.target.value });
          }}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            fontSize: '14px'
          }}
        >
          <option value="">Select field...</option>
          {numericColumns.map(col => (
            <option key={col.name} value={col.name}>{col.name}</option>
          ))}
        </select>
      </div>

      {/* Y-Axis Field Selection */}
      <div>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '8px'
        }}>
          Y-Axis (Numeric Values)
        </label>
        <select
          value={config.yAxisField || ''}
          onChange={(e) => {
            if (isDataSelection) {
              // Animation trigger logic would go here
            }
            onConfigChange({ yAxisField: e.target.value });
          }}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            fontSize: '14px'
          }}
        >
          <option value="">Select field...</option>
          {numericColumns.map(col => (
            <option key={col.name} value={col.name}>{col.name}</option>
          ))}
        </select>
      </div>

      {/* Series Field (for colored groups) */}
      <div>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '8px'
        }}>
          Color By (Optional - for grouped scatter)
        </label>
        <select
          value={config.seriesField || ''}
          onChange={(e) => {
            if (isDataSelection) {
              // Animation trigger logic would go here
            }
            onConfigChange({ seriesField: e.target.value });
          }}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            fontSize: '14px'
          }}
        >
          <option value="">Single color</option>
          {columns.map(col => (
            <option key={col.name} value={col.name}>{col.name}</option>
          ))}
        </select>
      </div>

      {/* Size Field (for bubble effect) */}
      <div>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '8px'
        }}>
          Size By (Optional - for bubble chart effect)
        </label>
        <select
          value={config.sizeField || ''}
          onChange={(e) => onConfigChange({ sizeField: e.target.value })}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            fontSize: '14px'
          }}
        >
          <option value="">Fixed size</option>
          {numericColumns.map(col => (
            <option key={col.name} value={col.name}>{col.name}</option>
          ))}
        </select>
      </div>

      {/* Point Style Options */}
      <div>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '8px'
        }}>
          Point Style
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: '500',
              color: '#6b7280',
              marginBottom: '4px'
            }}>
              Point Size
            </label>
            <select
              value={config.pointSize || '4'}
              onChange={(e) => onConfigChange({ pointSize: parseInt(e.target.value) })}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid #d1d5db',
                fontSize: '12px'
              }}
            >
              <option value="2">Small (2px)</option>
              <option value="4">Normal (4px)</option>
              <option value="6">Large (6px)</option>
              <option value="8">Extra Large (8px)</option>
            </select>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="checkbox"
              checked={config.showDataLabels || false}
              onChange={(e) => onConfigChange({ showDataLabels: e.target.checked })}
            />
            Show coordinate labels
          </label>

          {config.showDataLabels && (
            <div style={{ marginLeft: '24px', marginTop: '8px' }}>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '500',
                color: '#6b7280',
                marginBottom: '4px'
              }}>
                Label Format
              </label>
              <select
                value={config.dataLabelsFormat || 'coordinates'}
                onChange={(e) => onConfigChange({ dataLabelsFormat: e.target.value })}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  border: '1px solid #d1d5db',
                  fontSize: '12px'
                }}
              >
                <option value="coordinates">Coordinates (X, Y)</option>
                <option value="x-only">X Value Only</option>
                <option value="y-only">Y Value Only</option>
                <option value="series-name">Series Name Only</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Correlation Analysis Helper */}
      <div style={{
        padding: '12px',
        background: '#f0f9ff',
        borderRadius: '6px',
        border: '1px solid #bfdbfe'
      }}>
        <div style={{
          fontSize: '12px',
          fontWeight: '600',
          color: '#1e40af',
          marginBottom: '4px'
        }}>
          💡 Scatter Chart Tips
        </div>
        <div style={{
          fontSize: '11px',
          color: '#1e3a8a',
          lineHeight: '1.4'
        }}>
          Use scatter plots to identify correlations between two numeric variables.
          Add a "Color By" field to group data points, or "Size By" for bubble charts.
        </div>
      </div>
    </div>
  );
};

export default ScatterChartConfig;