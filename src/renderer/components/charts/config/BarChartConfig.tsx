import React from 'react';
import { ChartTypeConfigProps } from './BaseChartConfig';

const BarChartConfig: React.FC<ChartTypeConfigProps> = ({
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

      {/* Bar-specific configurations */}
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
        <div style={{ display: 'flex', gap: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="radio"
              name="orientation"
              checked={config.orientation === 'vertical' || !config.orientation}
              onChange={() => onConfigChange({ orientation: 'vertical' })}
            />
            Vertical
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="radio"
              name="orientation"
              checked={config.orientation === 'horizontal'}
              onChange={() => onConfigChange({ orientation: 'horizontal' })}
            />
            Horizontal
          </label>
        </div>
      </div>

      {/* Data Labels for Bar Charts */}
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
            Show Values on Bars
          </label>

          {config.showDataLabels && (
            <div style={{ marginLeft: '24px' }}>
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
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BarChartConfig;