import React from 'react';
import { ChartTypeConfigProps } from './BaseChartConfig';
import CustomSelect from '../../shared/CustomSelect';

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
        <CustomSelect
          value={config.xAxisField || ''}
          onChange={(value) => {
            if (isDataSelection) {
              // Animation trigger logic would go here
            }
            onConfigChange({ xAxisField: value as string });
          }}
          options={columns.map(col => ({ value: col, label: col }))}
          placeholder="Select field..."
        />
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
        <CustomSelect
          value={config.yAxisField || ''}
          onChange={(value) => {
            if (isDataSelection) {
              // Animation trigger logic would go here
            }
            onConfigChange({ yAxisField: value as string });
          }}
          options={numericColumns.map(col => ({ value: col.name, label: col.name }))}
          placeholder="Select field..."
        />
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
              <CustomSelect
                value={config.dataLabelsFormat || 'value'}
                onChange={(value) => onConfigChange({ dataLabelsFormat: value as string })}
                options={[
                  { value: 'value', label: 'Raw Values (123)' },
                  { value: 'comma', label: 'Comma Format (1,234)' },
                  { value: 'thousands', label: 'Thousands (1.2K)' },
                  { value: 'millions', label: 'Millions (1.2M)' },
                  { value: 'currency', label: 'Currency ($123)' },
                  { value: 'decimal', label: 'Decimal (123.45)' }
                ]}
                style={{
                  padding: '6px 8px',
                  fontSize: '12px'
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BarChartConfig;