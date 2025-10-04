import React from 'react';
import { ChartTypeConfigProps } from './BaseChartConfig';
import CustomSelect from '../../shared/CustomSelect';

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
        <CustomSelect
          value={config.categoryField || ''}
          onChange={(value) => {
            if (isDataSelection) {
              // Animation trigger logic would go here
            }
            onConfigChange({ categoryField: value as string });
          }}
          options={columns.map(col => ({ value: col.name, label: col.name }))}
          placeholder="Select field..."
        />
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
        <CustomSelect
          value={config.valueField || ''}
          onChange={(value) => {
            if (isDataSelection) {
              // Animation trigger logic would go here
            }
            onConfigChange({ valueField: value as string });
          }}
          options={numericColumns.map(col => ({ value: col.name, label: col.name }))}
          placeholder="Select field..."
        />
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
              <CustomSelect
                value={config.dataLabelsFormat || 'percentage'}
                onChange={(value) => onConfigChange({ dataLabelsFormat: value as string })}
                options={[
                  { value: 'percentage', label: 'Percentage (%)' },
                  { value: 'value', label: 'Values' },
                  { value: 'label', label: 'Labels Only' },
                  { value: 'both', label: 'Label + Percentage' },
                  { value: 'label-value', label: 'Label + Value' }
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