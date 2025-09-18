import React from 'react';
import { ChartTypeConfigProps } from './BaseChartConfig';

const LineChartConfig: React.FC<ChartTypeConfigProps> = ({
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
          X-Axis (Categories/Time)
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

      {/* Series Field (Optional for Multi-line) */}
      <div>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '8px'
        }}>
          Series Field (Optional - for multiple lines)
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
          <option value="">Single line chart</option>
          {columns.map(col => (
            <option key={col.name} value={col.name}>{col.name}</option>
          ))}
        </select>
      </div>

      {/* Line Style Options */}
      <div>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '8px'
        }}>
          Line Style
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="checkbox"
              checked={config.lineSmooth || false}
              onChange={(e) => onConfigChange({ lineSmooth: e.target.checked })}
            />
            Smooth curves
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="checkbox"
              checked={config.showPoints || true}
              onChange={(e) => onConfigChange({ showPoints: e.target.checked })}
            />
            Show data points
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="checkbox"
              checked={config.showDataLabels || false}
              onChange={(e) => onConfigChange({ showDataLabels: e.target.checked })}
            />
            Show data labels on points
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
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Line Chart Specific Options */}
      <div>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '8px'
        }}>
          Line Thickness
        </label>
        <select
          value={config.lineWidth || '2'}
          onChange={(e) => onConfigChange({ lineWidth: parseInt(e.target.value) })}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            fontSize: '14px'
          }}
        >
          <option value="1">Thin (1px)</option>
          <option value="2">Normal (2px)</option>
          <option value="3">Thick (3px)</option>
          <option value="4">Extra Thick (4px)</option>
        </select>
      </div>
    </div>
  );
};

export default LineChartConfig;