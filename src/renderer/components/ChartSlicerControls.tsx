import React, { useState, useEffect, useRef } from 'react';
import { Chart, Slicer, ProjectData, ChartSlicer } from '../types';
import {
  getTablesWithColumn,
  getColumnValues,
  createSlicer,
  suggestFilterType
} from '../utils/slicerUtils';

interface ChartSlicerControlsProps {
  chart: Chart;
  projectData: ProjectData;
  onProjectDataChange: (data: ProjectData) => void;
  compact?: boolean;
}

interface CompactFilterDropdownProps {
  slicer: Slicer;
  onValueChange: (values: any[]) => void;
  onRemove: () => void;
}

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
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
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
        <span style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
          textAlign: 'left'
        }}>
          {getDisplayText()}
        </span>
        <span style={{ fontSize: '10px' }}>▼</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          style={{
            background: 'none',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            fontSize: '10px',
            padding: 0,
            marginLeft: '4px'
          }}
        >
          ✕
        </button>
      </button>

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

const ChartSlicerControls: React.FC<ChartSlicerControlsProps> = ({
  chart,
  projectData,
  onProjectDataChange,
  compact = false
}) => {
  const [showAddSlicer, setShowAddSlicer] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState('');

  // Get the table this chart uses
  const chartTableId = chart.config.tableId || 'main';
  const chartTable = chartTableId === 'main'
    ? { id: 'main', columns: projectData.columns, data: projectData.data }
    : projectData.tables.find(t => t.id === chartTableId);

  // Get available columns for this chart's table (excluding numeric columns)
  const availableColumns = chartTable ? chartTable.columns
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
      const existing = deduplicatedSlicers.get(slicer.column);
      if (!existing || new Date(slicer.createdAt || '').getTime() > new Date(existing.createdAt || '').getTime()) {
        deduplicatedSlicers.set(slicer.column, slicer);
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

  // Create a new chart-specific slicer
  const handleCreateSlicer = () => {
    if (!selectedColumn || !chartTable) return;

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
    setShowAddSlicer(false);
  };

  // Toggle a slicer on/off for this chart
  const handleToggleSlicer = (slicerId: string, enabled: boolean) => {
    const maxSlicersPerChart = 4;

    if (enabled && appliedSlicerIds.length >= maxSlicersPerChart) {
      alert(`Maximum of ${maxSlicersPerChart} slicers allowed per chart`);
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>
              🔍 Filters ({appliedSlicers.length})
            </span>

            {/* Show dropdown for each active filter */}
            {appliedSlicers.map(slicer => (
              <CompactFilterDropdown
                key={slicer.id}
                slicer={slicer}
                onValueChange={(values) => handleSlicerValueChange(slicer.id, values)}
                onRemove={() => handleToggleSlicer(slicer.id, false)}
              />
            ))}
          </div>

          <button
            onClick={() => setShowAddSlicer(!showAddSlicer)}
            style={{
              background: '#f3f4f6',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '11px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            {showAddSlicer ? '✕' : '⚙️'}
          </button>
        </div>
        {/* Add Filter Modal */}
        {showAddSlicer && (
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
            zIndex: 1000
          }}>
            <div style={{
              background: 'white',
              borderRadius: '8px',
              padding: '20px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
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
                <div style={{ display: 'flex', gap: '8px', alignItems: 'end' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                      Column to Filter
                    </label>
                    <select
                      value={selectedColumn}
                      onChange={(e) => setSelectedColumn(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '14px',
                        background: 'white'
                      }}
                    >
                      <option value="">Select column...</option>
                      {availableColumns.map(column => (
                        <option key={column} value={column}>{column}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={handleCreateSlicer}
                    disabled={!selectedColumn}
                    style={{
                      background: selectedColumn ? '#10b981' : '#9ca3af',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '8px 16px',
                      fontSize: '14px',
                      cursor: selectedColumn ? 'pointer' : 'not-allowed',
                      fontWeight: '500'
                    }}
                  >
                    Create
                  </button>
                </div>
              </div>

              {/* Active Filters */}
              {appliedSlicers.length > 0 && (
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

              {/* Available Filters */}
              {applicableSlicers.filter(s => !appliedSlicerIds.includes(s.id)).length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
                    Available Filters
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {applicableSlicers
                      .filter(s => !appliedSlicerIds.includes(s.id))
                      .map(slicer => (
                        <button
                          key={slicer.id}
                          onClick={() => handleToggleSlicer(slicer.id, true)}
                          disabled={appliedSlicerIds.length >= 4}
                          style={{
                            background: appliedSlicerIds.length >= 4 ? '#f8fafc' : '#dbeafe',
                            color: appliedSlicerIds.length >= 4 ? '#9ca3af' : '#1e40af',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: '500',
                            cursor: appliedSlicerIds.length >= 4 ? 'not-allowed' : 'pointer'
                          }}
                        >
                          + {slicer.name}
                        </button>
                      ))}
                  </div>
                </div>
              )}
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
            background: '#dbeafe',
            color: '#1e40af',
            padding: '2px 6px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: '500'
          }}>
            {appliedSlicers.length} active
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
          <select
            value={selectedColumn}
            onChange={(e) => setSelectedColumn(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '12px',
              marginBottom: '10px',
              background: 'white',
              cursor: 'pointer'
            }}
          >
            <option value="">🔽 Select column to filter...</option>
            {availableColumns.map(column => (
              <option key={column} value={column}>📊 {column}</option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={handleCreateSlicer}
              disabled={!selectedColumn}
              style={{
                background: selectedColumn ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#9ca3af',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: selectedColumn ? 'pointer' : 'not-allowed',
                flex: 1,
                boxShadow: selectedColumn ? '0 2px 4px rgba(16, 185, 129, 0.2)' : 'none',
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
                    🗑️
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

      {/* Available Filters to Add */}
      {applicableSlicers.filter(s => !appliedSlicerIds.includes(s.id)).length > 0 && (
        <div style={{ marginTop: '12px' }}>
          <div style={{
            fontSize: '12px',
            fontWeight: '600',
            marginBottom: '6px',
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            💡 Quick Add Filters
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {applicableSlicers
              .filter(s => !appliedSlicerIds.includes(s.id))
              .slice(0, 4)
              .map(slicer => (
                <button
                  key={slicer.id}
                  onClick={() => handleToggleSlicer(slicer.id, true)}
                  disabled={appliedSlicerIds.length >= 4}
                  style={{
                    background: appliedSlicerIds.length >= 4 ? '#f8fafc' : 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                    color: appliedSlicerIds.length >= 4 ? '#9ca3af' : '#1e40af',
                    border: `1px solid ${appliedSlicerIds.length >= 4 ? '#e2e8f0' : '#93c5fd'}`,
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: '500',
                    cursor: appliedSlicerIds.length >= 4 ? 'not-allowed' : 'pointer',
                    boxShadow: appliedSlicerIds.length >= 4 ? 'none' : '0 1px 2px rgba(59, 130, 246, 0.1)',
                    transition: 'all 0.2s'
                  }}
                >
                  + {slicer.name}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChartSlicerControls;
