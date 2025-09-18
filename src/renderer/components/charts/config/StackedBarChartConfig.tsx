import React from 'react';
import { ChartTypeConfigProps } from './BaseChartConfig';

const StackedBarChartConfig: React.FC<ChartTypeConfigProps> = ({
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
          X-Axis (Categories)
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
          {columns.map(col => (
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
          Y-Axis (Values)
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

      {/* Series Field (Required for Stacking) */}
      <div>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '8px'
        }}>
          Series Field (Required - what to stack)
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
          <option value="">Select field...</option>
          {columns.map(col => (
            <option key={col.name} value={col.name}>{col.name}</option>
          ))}
        </select>
      </div>

      {/* Stack Type */}
      <div>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '8px'
        }}>
          Stack Type
        </label>
        <select
          value={config.stackType || 'normal'}
          onChange={(e) => onConfigChange({ stackType: e.target.value })}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            fontSize: '14px'
          }}
        >
          <option value="normal">Normal (absolute values)</option>
          <option value="percent">100% Stacked (percentage)</option>
        </select>
      </div>

      {/* Bar Orientation */}
      <div>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '8px'
        }}>
          Bar Orientation
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="radio"
              name="stackedOrientation"
              checked={config.orientation === 'vertical' || !config.orientation}
              onChange={(e) => onConfigChange({ orientation: 'vertical' })}
            />
            Vertical
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="radio"
              name="stackedOrientation"
              checked={config.orientation === 'horizontal'}
              onChange={(e) => onConfigChange({ orientation: 'horizontal' })}
            />
            Horizontal
          </label>
        </div>
      </div>

      {/* Data Labels */}
      <div>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '8px'
        }}>
          Data Labels
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="checkbox"
              checked={config.showDataLabels || false}
              onChange={(e) => onConfigChange({ showDataLabels: e.target.checked })}
            />
            Show data labels
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
                value={config.dataLabelsFormat || 'value'}
                onChange={(e) => onConfigChange({ dataLabelsFormat: e.target.value })}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  border: '1px solid #d1d5db',
                  fontSize: '12px'
                }}
              >
                <option value="value">Raw Values (123)</option>
                <option value="comma">Comma Format (1,234)</option>
                <option value="thousands">Thousands (1.2K)</option>
                <option value="millions">Millions (1.2M)</option>
                <option value="currency">Currency ($123)</option>
                <option value="decimal">Decimal (123.45)</option>
                {config.stackType === 'percent' && (
                  <option value="percentage">Percentage (%)</option>
                )}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Stacked Chart Tips */}
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
          💡 Stacked Chart Tips
        </div>
        <div style={{
          fontSize: '11px',
          color: '#1e3a8a',
          lineHeight: '1.4'
        }}>
          Use stacked bars to show parts of a whole across categories.
          The "Series Field" determines what gets stacked within each category.
        </div>
      </div>
    </div>
  );
};

export default StackedBarChartConfig;