import React from 'react';
import { ChartTypeConfigProps } from './BaseChartConfig';

const PieChartConfig: React.FC<ChartTypeConfigProps> = ({
  config,
  onConfigChange,
  columns,
  numericColumns,
  isDataSelection = false
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Category Field Selection */}
      <div>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '8px'
        }}>
          Category Field
        </label>
        <select
          value={config.categoryField || ''}
          onChange={(e) => {
            if (isDataSelection) {
              // Animation trigger logic would go here
            }
            onConfigChange({ categoryField: e.target.value });
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

      {/* Value Field Selection */}
      <div>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '8px'
        }}>
          Value Field
        </label>
        <select
          value={config.valueField || ''}
          onChange={(e) => {
            if (isDataSelection) {
              // Animation trigger logic would go here
            }
            onConfigChange({ valueField: e.target.value });
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

      {/* Pie-specific Data Labels */}
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
            Show Labels
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
                value={config.dataLabelsFormat || 'percentage'}
                onChange={(e) => onConfigChange({ dataLabelsFormat: e.target.value })}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  border: '1px solid #d1d5db',
                  fontSize: '12px'
                }}
              >
                <option value="percentage">Percentage (%)</option>
                <option value="value">Values</option>
                <option value="label">Labels Only</option>
                <option value="both">Label + Percentage</option>
                <option value="label-value">Label + Value</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Pie Chart Style */}
      <div>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '8px'
        }}>
          Chart Style
        </label>
        <div style={{ display: 'flex', gap: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="radio"
              name="pieStyle"
              checked={config.pieStyle !== 'doughnut'}
              onChange={() => onConfigChange({ pieStyle: 'pie' })}
            />
            Pie
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="radio"
              name="pieStyle"
              checked={config.pieStyle === 'doughnut'}
              onChange={() => onConfigChange({ pieStyle: 'doughnut' })}
            />
            Doughnut
          </label>
        </div>
      </div>
    </div>
  );
};

export default PieChartConfig;