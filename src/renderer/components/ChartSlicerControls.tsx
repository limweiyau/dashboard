import React, { useState, useEffect, useRef } from 'react';
import { Chart, Slicer, ProjectData, ChartSlicer } from '../types';
import { getColumnValues, createSlicer, suggestFilterType } from '../utils/slicerUtils';

interface ChartSlicerControlsProps {
  chart: Chart;
  projectData: ProjectData;
  onProjectDataChange: (data: ProjectData) => void;
  compact?: boolean;
  compactShowLabel?: boolean;
}

interface CompactFilterDropdownProps {
  slicer: Slicer;
  onValueChange: (values: any[]) => void;
  onRemove: () => void;
}

const MAX_SLICERS_PER_CHART = 3;

const CompactFilterDropdown: React.FC<CompactFilterDropdownProps> = ({
  slicer,
  onValueChange,
  onRemove
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDisplayText = () => {
    if (slicer.selectedValues.length === 0) {
      return `${slicer.name}: All`;
    }

    if (slicer.selectedValues.length === 1) {
      return `${slicer.name}: ${slicer.selectedValues[0]}`;
    }
    return `${slicer.name}: ${slicer.selectedValues.length} selected`;
  };

  const handleValueToggle = (value: any) => {
    const newValues = slicer.selectedValues.includes(value)
      ? slicer.selectedValues.filter(v => v !== value)
      : [...slicer.selectedValues, value];
    onValueChange(newValues);
  };

  return (
    <div
      ref={dropdownRef}
      style={{
        position: 'relative',
        display: 'inline-block'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          style={{
            background: slicer.selectedValues.length > 0 ? '#dbeafe' : '#f8fafc',
            color: slicer.selectedValues.length > 0 ? '#1e40af' : '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            maxWidth: '200px',
            minWidth: '120px'
          }}
        >
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
              textAlign: 'left'
            }}
          >
            {getDisplayText()}
          </span>
          <span style={{ fontSize: '10px' }}>▼</span>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(false);
            onRemove();
          }}
          style={{
            background: 'none',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            color: '#6b7280',
            cursor: 'pointer',
            fontSize: '10px',
            padding: '4px 6px',
            lineHeight: 1
          }}
        >
          ✕
        </button>
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'white',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          zIndex: 1000,
          maxHeight: '200px',
          overflowY: 'auto',
          minWidth: '200px'
        }}>
          <div style={{ padding: '8px' }}>
            <div style={{
              fontSize: '11px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '6px',
              padding: '4px 0',
              borderBottom: '1px solid #e5e7eb'
            }}>
              📊 {slicer.name}
            </div>

            <div>
              {/* Select All option */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px 0',
                  cursor: 'pointer',
                  fontSize: '12px',
                  gap: '6px',
                  borderBottom: '1px solid #e5e7eb',
                  marginBottom: '4px',
                  paddingBottom: '8px'
                }}
              >
                <input
                  type="checkbox"
                  checked={slicer.selectedValues.length === 0}
                  onChange={() => onValueChange([])}
                  style={{
                    margin: 0,
                    accentColor: '#3b82f6'
                  }}
                />
                <span style={{ color: '#374151', fontWeight: '500' }}>
                  All Values (No Filter)
                </span>
              </label>

              {/* Regular value checkboxes */}
              {slicer.availableValues.map(value => (
                <label
                  key={value}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px 0',
                    cursor: 'pointer',
                    fontSize: '12px',
                    gap: '6px'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={slicer.selectedValues.includes(value)}
                    onChange={() => handleValueToggle(value)}
                    style={{
                      margin: 0,
                      accentColor: '#3b82f6'
                    }}
                  />
                  <span style={{
                    color: '#374151',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {String(value)}
                  </span>
                </label>
              ))}
            </div>

            {slicer.availableValues.length === 0 && (
              <div style={{
                fontSize: '11px',
                color: '#6b7280',
                textAlign: 'center',
                padding: '8px'
              }}>
                No values available
              </div>
            )}

            {slicer.selectedValues.length > 0 && (
              <button
                onClick={() => onValueChange([])}
                style={{
                  background: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  width: '100%',
                  marginTop: '8px'
                }}
              >
                Clear All
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface ColumnSelectProps {
  value: string;
  options: string[];
  placeholder: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const ColumnSelect: React.FC<ColumnSelectProps> = ({ value, options, placeholder, onChange, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    // Close dropdown if value was reset programmatically
    setIsOpen(false);
  }, [value, disabled]);

  const isDisabled = disabled || options.length === 0;

  useEffect(() => {
    if (isDisabled) {
      setIsOpen(false);
    }
  }, [isDisabled]);

  const selectedLabel = value || placeholder;

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        onClick={() => {
          if (isDisabled) return;
          setIsOpen(prev => !prev);
        }}
        style={{
          width: '100%',
          padding: '8px 12px',
          border: '1px solid #d1d5db',
          borderRadius: '4px',
          fontSize: '14px',
          background: 'white',
          color: isDisabled ? '#9ca3af' : (value ? '#111827' : '#6b7280'),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          opacity: isDisabled ? 0.6 : 1
        }}
      >
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
            textAlign: 'left'
          }}
        >
          {selectedLabel}
        </span>
        <span style={{ marginLeft: '8px', fontSize: '12px', color: isDisabled ? '#9ca3af' : '#6b7280' }}>
          {isDisabled ? '─' : (isOpen ? '▲' : '▼')}
        </span>
      </button>

      {isOpen && !isDisabled && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: 'white',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.08)',
            zIndex: 20,
            maxHeight: '180px',
            overflowY: 'auto'
          }}
        >
          <button
            type="button"
            onClick={() => {
              onChange('');
              setIsOpen(false);
            }}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '8px 12px',
              background: value === '' ? '#eff6ff' : 'white',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              color: '#111827',
              transition: 'background 0.15s'
            }}
            onMouseEnter={(e) => {
              if (value !== '') e.currentTarget.style.background = '#f3f4f6';
            }}
            onMouseLeave={(e) => {
              if (value !== '') e.currentTarget.style.background = 'white';
            }}
          >
            Select column...
          </button>
          {options.map(option => {
            const isActive = value === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  background: isActive ? '#eff6ff' : 'white',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#111827',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = '#f3f4f6';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'white';
                }}
              >
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {option}
                </span>
              </button>
            );
          })}

          {options.length === 0 && (
            <div
              style={{
                padding: '12px',
                fontSize: '12px',
                color: '#6b7280',
                textAlign: 'center'
              }}
            >
              No columns available
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ChartSlicerControls: React.FC<ChartSlicerControlsProps> = ({
  chart,
  projectData,
  onProjectDataChange,
  compact = false,
  compactShowLabel = true
}) => {
  const [showAddSlicer, setShowAddSlicer] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState('');

  // Get the table this chart uses
  const chartTableId = chart.config.tableId || 'main';
  const chartTable = chartTableId === 'main'
    ? { id: 'main', columns: projectData.columns, data: projectData.data }
    : projectData.tables.find(t => t.id === chartTableId);

  // Get all filterable columns for this chart's table (excluding numeric columns)
  const filterableColumns = chartTable ? chartTable.columns
    .filter(col => {
      const values = getColumnValues(col.name, [chartTable]);
      const filterType = suggestFilterType(col.name, [chartTable]);
      return filterType !== null; // Only include columns that can be filtered
    })
    .map(col => col.name) : [];

  // Get slicers that are applicable to this chart (only chart-specific ones)
  const getApplicableSlicers = (): Slicer[] => {
    const slicers = projectData.slicers.filter(slicer => {
      // Only show slicers that are specifically created for this chart
      // or slicers that belong to the same table and aren't chart-specific to other charts
      if (slicer.type === 'table-specific') {
        // Check if this is a chart-specific slicer
        if (slicer.id.includes('-chart-')) {
          // Only include if it belongs to this specific chart
          return slicer.id.endsWith(`-chart-${chart.id}`);
        }
        // If it's not chart-specific, include if it's from the same table
        return slicer.tableId === chartTableId;
      }
      return false; // No universal slicers since we removed global filters
    });

    // Deduplicate by column name - keep the most recent one for each column
    const deduplicatedSlicers = new Map<string, Slicer>();
    slicers.forEach(slicer => {
      const existing = deduplicatedSlicers.get(slicer.columnName);
      if (!existing || new Date(slicer.createdAt || '').getTime() > new Date(existing.createdAt || '').getTime()) {
        deduplicatedSlicers.set(slicer.columnName, slicer);
      }
    });

    return Array.from(deduplicatedSlicers.values());
  };

  // Get currently applied slicers for this chart
  const getAppliedSlicers = (): string[] => {
    return chart.config.appliedSlicers || [];
  };

  const applicableSlicers = getApplicableSlicers();
  const appliedSlicerIds = getAppliedSlicers();
  const appliedSlicers = projectData.slicers.filter(s => appliedSlicerIds.includes(s.id));

  const activeColumns = new Set(appliedSlicers.map(slicer => slicer.columnName));
  const availableColumns = filterableColumns.filter(column => !activeColumns.has(column));

  const selectedColumnExistingSlicer = selectedColumn
    ? applicableSlicers.find(slicer => slicer.columnName === selectedColumn)
    : undefined;
  const selectedColumnIsActive = selectedColumn
    ? appliedSlicers.some(slicer => slicer.columnName === selectedColumn)
    : false;
  const limitReached = appliedSlicers.length >= MAX_SLICERS_PER_CHART;

  const canSubmitSelectedColumn = Boolean(selectedColumn) && !selectedColumnIsActive && !limitReached && Boolean(chartTable);

  const helperMessage = (() => {
    if (!selectedColumn) {
      return { text: '', color: '#6b7280' };
    }

    if (selectedColumnIsActive) {
      return {
        text: 'This column already has an active filter. Remove it before adding another.',
        color: '#dc2626'
      };
    }

    if (limitReached) {
      return {
        text: `Maximum of ${MAX_SLICERS_PER_CHART} filters reached. Remove one to add another.`,
        color: '#dc2626'
      };
    }

    if (selectedColumnExistingSlicer) {
      return {
        text: '',
        color: '#1d4ed8'
      };
    }

    return { text: '', color: '#6b7280' };
  })();

  // Create a new chart-specific slicer
  const handleCreateSlicer = () => {
    if (!selectedColumn || !chartTable) return;

    if (limitReached) {
      alert(`You can only have ${MAX_SLICERS_PER_CHART} filters active per chart. Remove one before adding another.`);
      return;
    }

    if (selectedColumnIsActive) {
      alert(`A filter for "${selectedColumn}" is already active on this chart.`);
      return;
    }

    if (selectedColumnExistingSlicer) {
      const existingSlicerId = selectedColumnExistingSlicer.id;

      if (appliedSlicerIds.includes(existingSlicerId)) {
        alert(`A filter for "${selectedColumn}" is already active on this chart.`);
        return;
      }

      if (appliedSlicers.some(slicer => slicer.columnName === selectedColumn)) {
        alert(`A filter for "${selectedColumn}" is already active on this chart.`);
        return;
      }

      handleToggleSlicer(existingSlicerId, true);
      setSelectedColumn('');
      return;
    }

    // Generate a simple slicer name without chart details for compactness
    const slicerName = selectedColumn;
    const availableValues = getColumnValues(selectedColumn, [chartTable]);
    const filterType = suggestFilterType(selectedColumn, [chartTable]);

    // Skip if this is a numeric column (filterType will be null)
    if (!filterType) {
      alert('Numeric columns cannot be used as filters. Please select a text or date column.');
      return;
    }

    // Create a chart-specific slicer with unique ID to avoid conflicts
    const newSlicer = createSlicer(
      slicerName,
      selectedColumn,
      'table-specific',
      chartTableId,
      availableValues,
      filterType
    );

    // Ensure the slicer ID is unique by appending chart ID
    newSlicer.id = `${newSlicer.id}-chart-${chart.id}`;

    // Add the slicer to project data
    const updatedData = {
      ...projectData,
      slicers: [...projectData.slicers, newSlicer]
    };

    // Automatically apply this slicer ONLY to the current chart
    const updatedChart = {
      ...chart,
      config: {
        ...chart.config,
        appliedSlicers: [...appliedSlicerIds, newSlicer.id]
      }
    };

    const updatedCharts = projectData.charts.map(c =>
      c.id === chart.id ? updatedChart : c
    );

    // Add chart-slicer relationship - this ensures isolation
    const newChartSlicer: ChartSlicer = {
      chartId: chart.id,
      slicerId: newSlicer.id,
      enabled: true
    };

    const finalData = {
      ...updatedData,
      charts: updatedCharts,
      chartSlicers: [...projectData.chartSlicers, newChartSlicer]
    };

    onProjectDataChange(finalData);

    // Reset form
    setSelectedColumn('');
  };

  // Toggle a slicer on/off for this chart
  const handleToggleSlicer = (slicerId: string, enabled: boolean) => {
    if (enabled && appliedSlicerIds.length >= MAX_SLICERS_PER_CHART) {
      alert(`Maximum of ${MAX_SLICERS_PER_CHART} filters allowed per chart`);
      return;
    }

    let updatedChartSlicers = [...projectData.chartSlicers];
    let updatedAppliedSlicers = [...appliedSlicerIds];

    if (enabled) {
      // Add slicer
      updatedAppliedSlicers.push(slicerId);

      // Check if relationship already exists
      const existingIndex = updatedChartSlicers.findIndex(
        cs => cs.chartId === chart.id && cs.slicerId === slicerId
      );

      if (existingIndex >= 0) {
        updatedChartSlicers[existingIndex].enabled = true;
      } else {
        updatedChartSlicers.push({
          chartId: chart.id,
          slicerId,
          enabled: true
        });
      }
    } else {
      // Remove slicer
      updatedAppliedSlicers = updatedAppliedSlicers.filter(id => id !== slicerId);

      const existingIndex = updatedChartSlicers.findIndex(
        cs => cs.chartId === chart.id && cs.slicerId === slicerId
      );

      if (existingIndex >= 0) {
        updatedChartSlicers[existingIndex].enabled = false;
      }
    }

    // Update the chart's appliedSlicers array
    const updatedCharts = projectData.charts.map(c =>
      c.id === chart.id
        ? { ...c, config: { ...c.config, appliedSlicers: updatedAppliedSlicers } }
        : c
    );

    const updatedData = {
      ...projectData,
      charts: updatedCharts,
      chartSlicers: updatedChartSlicers
    };

    onProjectDataChange(updatedData);
  };

  // Handle slicer value changes (this will trigger chart updates)
  const handleSlicerValueChange = (slicerId: string, selectedValues: any[]) => {
    const updatedSlicers = projectData.slicers.map(slicer =>
      slicer.id === slicerId
        ? { ...slicer, selectedValues, updatedAt: new Date().toISOString() }
        : slicer
    );

    const updatedData = {
      ...projectData,
      slicers: updatedSlicers
    };

    onProjectDataChange(updatedData);
  };

  // Delete a slicer
  const handleDeleteSlicer = (slicerId: string) => {
    const updatedData = {
      ...projectData,
      slicers: projectData.slicers.filter(s => s.id !== slicerId),
      chartSlicers: projectData.chartSlicers.filter(cs => cs.slicerId !== slicerId),
      charts: projectData.charts.map(c => ({
        ...c,
        config: {
          ...c.config,
          appliedSlicers: (c.config.appliedSlicers || []).filter(id => id !== slicerId)
        }
      }))
    };
    onProjectDataChange(updatedData);
  };

  const renderFilterControl = (slicer: Slicer) => {
    switch (slicer.filterType) {
      case 'multi-select':
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
            {slicer.availableValues.slice(0, 8).map(value => (
              <label key={value} style={{
                display: 'flex',
                alignItems: 'center',
                fontSize: '11px',
                padding: '4px 8px',
                background: slicer.selectedValues.includes(value)
                  ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
                  : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                color: slicer.selectedValues.includes(value) ? 'white' : '#475569',
                borderRadius: '6px',
                border: `1px solid ${slicer.selectedValues.includes(value) ? '#3b82f6' : '#e2e8f0'}`,
                cursor: 'pointer',
                fontWeight: '500',
                boxShadow: slicer.selectedValues.includes(value)
                  ? '0 2px 4px rgba(59, 130, 246, 0.2)'
                  : '0 1px 2px rgba(0, 0, 0, 0.05)',
                transition: 'all 0.2s'
              }}>
                <input
                  type="checkbox"
                  checked={slicer.selectedValues.includes(value)}
                  onChange={(e) => {
                    const newSelected = e.target.checked
                      ? [...slicer.selectedValues, value]
                      : slicer.selectedValues.filter(v => v !== value);
                    handleSlicerValueChange(slicer.id, newSelected);
                  }}
                  style={{ display: 'none' }}
                />
                {slicer.selectedValues.includes(value) ? '✓ ' : ''}
                {String(value)}
              </label>
            ))}
            {slicer.availableValues.length > 8 && (
              <span style={{
                fontSize: '10px',
                color: '#64748b',
                alignSelf: 'center',
                padding: '4px 6px',
                background: '#f1f5f9',
                borderRadius: '4px',
                fontWeight: '500'
              }}>
                +{slicer.availableValues.length - 8} more...
              </span>
            )}
          </div>
        );

      case 'dropdown':
        return (
          <select
            value={slicer.selectedValues[0] || ''}
            onChange={(e) => handleSlicerValueChange(slicer.id, e.target.value ? [e.target.value] : [])}
            style={{
              marginTop: '8px',
              padding: '6px 10px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '12px',
              width: '100%',
              background: 'white',
              cursor: 'pointer'
            }}
          >
            <option value="">🔽 All values</option>
            {slicer.availableValues.map(value => (
              <option key={value} value={value}>📊 {String(value)}</option>
            ))}
          </select>
        );

      case 'date-range':
        const startDate = slicer.selectedValues[0] || '';
        const endDate = slicer.selectedValues[1] || '';

        return (
          <div style={{ marginTop: '8px' }}>
            <div style={{ display: 'flex', gap: '6px', flexDirection: 'column' }}>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <label style={{ fontSize: '10px', color: '#64748b', minWidth: '30px' }}>From:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    const newValues = [e.target.value, endDate].filter(Boolean);
                    handleSlicerValueChange(slicer.id, newValues);
                  }}
                  style={{
                    padding: '4px 6px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    fontSize: '11px',
                    flex: 1,
                    background: 'white'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <label style={{ fontSize: '10px', color: '#64748b', minWidth: '30px' }}>To:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    const newValues = [startDate, e.target.value].filter(Boolean);
                    handleSlicerValueChange(slicer.id, newValues);
                  }}
                  style={{
                    padding: '4px 6px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    fontSize: '11px',
                    flex: 1,
                    background: 'white'
                  }}
                />
              </div>
              {(startDate || endDate) && (
                <button
                  onClick={() => handleSlicerValueChange(slicer.id, [])}
                  style={{
                    padding: '3px 6px',
                    background: '#f3f4f6',
                    color: '#6b7280',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '10px',
                    cursor: 'pointer',
                    alignSelf: 'flex-start'
                  }}
                >
                  Clear Range
                </button>
              )}
            </div>
          </div>
        );



      default:
        return (
          <div style={{
            marginTop: '8px',
            fontSize: '11px',
            color: '#64748b',
            padding: '6px',
            background: '#f8fafc',
            borderRadius: '4px',
            textAlign: 'center'
          }}>
            {slicer.filterType} filter (coming soon)
          </div>
        );
    }
  };

  if (!chartTable) {
    return (
      <div style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>
        No table data available
      </div>
    );
  }

  if (compact) {
    return (
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', width: '100%' }}>
          {compactShowLabel && (
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>
              🔍 Filters ({appliedSlicers.length}/{MAX_SLICERS_PER_CHART})
            </span>
          )}

          {/* Show dropdown for each active filter */}
          {appliedSlicers.map(slicer => (
            <CompactFilterDropdown
              key={slicer.id}
              slicer={slicer}
              onValueChange={(values) => handleSlicerValueChange(slicer.id, values)}
              onRemove={() => handleToggleSlicer(slicer.id, false)}
            />
          ))}

          <button
            onClick={() => setShowAddSlicer(!showAddSlicer)}
            style={{
              background: (appliedSlicers.length >= MAX_SLICERS_PER_CHART && !showAddSlicer) ? '#f8fafc' : '#f3f4f6',
              color: (appliedSlicers.length >= MAX_SLICERS_PER_CHART && !showAddSlicer) ? '#9ca3af' : '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              padding: '3px 7px',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#e5e7eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = (appliedSlicers.length >= MAX_SLICERS_PER_CHART && !showAddSlicer) ? '#f8fafc' : '#f3f4f6';
            }}
            title={appliedSlicers.length >= MAX_SLICERS_PER_CHART ? `Maximum filters reached (${MAX_SLICERS_PER_CHART}/${MAX_SLICERS_PER_CHART}). Open to edit or remove filters.` : 'Manage filters'}
          >
            {showAddSlicer ? '✕' : '⚙️'}
          </button>
        </div>
        {/* Add Filter Modal */}
        {showAddSlicer && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2000
            }}
          >
            <div
              style={{
                background: 'white',
                borderRadius: '8px',
                padding: '20px',
                maxWidth: '600px',
                width: '90%',
                maxHeight: '95vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              {/* Header - fixed at top */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                borderBottom: '1px solid #e5e7eb',
                paddingBottom: '12px'
              }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                  🔍 Manage Chart Filters
                </h3>
                <button
                  onClick={() => {
                    setShowAddSlicer(false);
                    setSelectedColumn('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '20px',
                    cursor: 'pointer',
                    color: '#6b7280'
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Scrollable content area */}
              <div style={{
                flex: '0 1 auto',
                overflowY: 'auto',
                paddingRight: '4px', // Space for scrollbar
                maxHeight: 'calc(95vh - 140px)'
              }}>
                {/* Create New Filter */}
              <div style={{
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                padding: '16px',
                marginBottom: '16px'
              }}>
                <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
                  Create New Filter
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'end', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                      Column to Filter
                    </label>
                    <ColumnSelect
                      value={selectedColumn}
                      options={availableColumns}
                      placeholder="Select column..."
                      onChange={setSelectedColumn}
                      disabled={availableColumns.length === 0}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                    <button
                      onClick={handleCreateSlicer}
                      disabled={!canSubmitSelectedColumn}
                      style={{
                        background: canSubmitSelectedColumn ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#9ca3af',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '8px 8px',
                        height: '34px',
                        fontSize: '12px',
                        fontWeight: '500',
                        cursor: canSubmitSelectedColumn ? 'pointer' : 'not-allowed',
                        minWidth: '120px',
                        boxShadow: canSubmitSelectedColumn ? '0 2px 4px rgba(16, 185, 129, 0.2)' : 'none',
                        transition: 'all 0.2s'
                      }}
                    >
                      Create
                    </button>
                  </div>
                </div>
                {helperMessage.text && (
                  <div style={{
                    marginTop: '6px',
                    fontSize: '11px',
                    color: helperMessage.color,
                    lineHeight: 1.4
                  }}>
                    {helperMessage.text}
                  </div>
                )}
              </div>

              {/* Active Filters */}
              {appliedSlicers.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: '#6b7280',
                  fontSize: '14px',
                  background: '#f9fafb',
                  borderRadius: '6px',
                  border: '1px dashed #d1d5db'
                }}>
                  Select a filter to get started
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
                    Active Filters
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {appliedSlicers.map(slicer => (
                      <div key={slicer.id} style={{
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: '6px',
                        padding: '12px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div style={{ fontWeight: '500', fontSize: '14px', color: '#065f46' }}>
                            📊 {slicer.name}
                          </div>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              onClick={() => handleDeleteSlicer(slicer.id)}
                              style={{
                                background: '#fef2f2',
                                color: '#dc2626',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => handleToggleSlicer(slicer.id, false)}
                              style={{
                                background: '#f3f4f6',
                                color: '#374151',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
                          Column: <strong>{slicer.columnName}</strong> • Type: {slicer.filterType}
                          {slicer.selectedValues.length > 0 && (
                            <span> • {slicer.selectedValues.length} selected</span>
                          )}
                        </div>
                        {renderFilterControl(slicer)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              </div> {/* End scrollable content area */}
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div style={{
      background: '#fefefe',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '12px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: '600', color: '#1f2937', fontSize: '14px' }}>
            🔍 Chart Filters
          </span>
          <span style={{
            background: appliedSlicers.length >= MAX_SLICERS_PER_CHART ? '#fef2f2' : '#dbeafe',
            color: appliedSlicers.length >= MAX_SLICERS_PER_CHART ? '#dc2626' : '#1e40af',
            padding: '2px 6px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: '500'
          }}>
            {appliedSlicers.length}/{MAX_SLICERS_PER_CHART} active
          </span>
        </div>
        <button
          onClick={() => setShowAddSlicer(!showAddSlicer)}
          style={{
            background: showAddSlicer ? '#f3f4f6' : '#3b82f6',
            color: showAddSlicer ? '#374151' : 'white',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            padding: '6px 10px',
            fontSize: '12px',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s'
          }}
        >
          {showAddSlicer ? '✕ Cancel' : '⚙️ Manage Filters'}
        </button>
      </div>

      {/* Create New Filter Section */}
      {showAddSlicer && (
        <div style={{
          background: 'linear-gradient(135deg, #f0f9ff 0%, #f8fafc 100%)',
          border: '1px solid #bfdbfe',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '12px'
        }}>
          <div style={{
            fontSize: '13px',
            fontWeight: '600',
            marginBottom: '8px',
            color: '#1e40af',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            ⚙️ Create New Filter
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: helperMessage.text ? '4px' : '12px' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <ColumnSelect
                value={selectedColumn}
                options={availableColumns}
                placeholder="Select column to filter..."
                onChange={setSelectedColumn}
                disabled={availableColumns.length === 0}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={handleCreateSlicer}
                disabled={!canSubmitSelectedColumn}
                style={{
                  background: canSubmitSelectedColumn ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#9ca3af',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: canSubmitSelectedColumn ? 'pointer' : 'not-allowed',
                  minWidth: '120px',
                  boxShadow: canSubmitSelectedColumn ? '0 2px 4px rgba(16, 185, 129, 0.2)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                ✨ Create Filter
              </button>
              <button
                onClick={() => {
                  setShowAddSlicer(false);
                  setSelectedColumn('');
                }}
                style={{
                  background: '#f8fafc',
                  color: '#64748b',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
          {helperMessage.text && (
            <div style={{
              marginBottom: '8px',
              fontSize: '11px',
              color: helperMessage.color,
              lineHeight: 1.4
            }}>
              {helperMessage.text}
            </div>
          )}
        </div>
      )}

      {/* Applied Filters */}
      {appliedSlicers.length > 0 ? (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          {appliedSlicers.map(slicer => (
            <div
              key={slicer.id}
              style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #f8fafc 100%)',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                padding: '10px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                width: 'calc(50% - 4px)',
                minWidth: '280px',
                flex: '0 0 auto'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '600', fontSize: '13px', color: '#065f46' }}>
                      📊 {slicer.name}
                    </span>
                    <span style={{
                      background: '#10b981',
                      color: 'white',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: '500'
                    }}>
                      LOCAL
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px' }}>
                    Column: <strong>{slicer.columnName}</strong>
                    {slicer.selectedValues.length > 0 && (
                      <span> • {slicer.selectedValues.length} value{slicer.selectedValues.length !== 1 ? 's' : ''} selected</span>
                    )}
                  </div>
                  {renderFilterControl(slicer)}
                </div>
                <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
                  <button
                    onClick={() => handleDeleteSlicer(slicer.id)}
                    style={{
                      background: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)',
                      color: '#dc2626',
                      border: '1px solid #f87171',
                      borderRadius: '4px',
                      padding: '4px 6px',
                      fontSize: '10px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px rgba(220, 38, 38, 0.1)'
                    }}
                    title="Delete filter"
                  >
                    ×
                  </button>
                  <button
                    onClick={() => handleToggleSlicer(slicer.id, false)}
                    style={{
                      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                      color: '#475569',
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                      padding: '4px 6px',
                      fontSize: '10px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                    title="Remove from chart"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '16px',
          color: '#64748b',
          fontSize: '12px',
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          border: '1px dashed #cbd5e1',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔍</div>
          <div style={{ fontWeight: '500', marginBottom: '4px' }}>No filters applied</div>
          <div style={{ fontSize: '11px' }}>Add filters to narrow down chart data</div>
        </div>
      )}

    </div>
  );
};

export default ChartSlicerControls;
