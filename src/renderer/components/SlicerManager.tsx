import React, { useState, useEffect } from 'react';
import { Slicer, ProjectData, ChartSlicer } from '../types';
import {
  detectUniversalSlicers,
  getColumnValues,
  createSlicer,
  suggestFilterType,
  getTablesWithColumn
} from '../utils/slicerUtils';

interface SlicerManagerProps {
  projectData: ProjectData;
  onProjectDataChange: (data: ProjectData) => void;
}

const SlicerManager: React.FC<SlicerManagerProps> = ({
  projectData,
  onProjectDataChange
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [universalCandidates, setUniversalCandidates] = useState<string[]>([]);
  const [newSlicerType, setNewSlicerType] = useState<'universal' | 'table-specific'>('universal');
  const [selectedTable, setSelectedTable] = useState<string>('main');
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [slicerName, setSlicerName] = useState<string>('');

  useEffect(() => {
    const candidates = detectUniversalSlicers(projectData);
    setUniversalCandidates(candidates);
  }, [projectData]);

  const handleCreateSlicer = () => {
    if (!selectedColumn || !slicerName.trim()) return;

    const allTables = [
      { id: 'main', name: projectData.name || 'Main Dataset', columns: projectData.columns, data: projectData.data },
      ...projectData.tables
    ];

    const relevantTables = allTables.filter(table =>
      table.columns.some(col => col.name === selectedColumn)
    );

    const availableValues = getColumnValues(selectedColumn, relevantTables);
    const filterType = suggestFilterType(selectedColumn, relevantTables);

    const newSlicer = createSlicer(
      slicerName.trim(),
      selectedColumn,
      'universal',
      undefined,
      availableValues,
      filterType
    );

    const updatedData = {
      ...projectData,
      slicers: [...projectData.slicers, newSlicer]
    };

    onProjectDataChange(updatedData);

    // Reset form
    setSlicerName('');
    setSelectedColumn('');
    setShowAddModal(false);
  };

  const handleDeleteSlicer = (slicerId: string) => {
    const updatedData = {
      ...projectData,
      slicers: projectData.slicers.filter(s => s.id !== slicerId),
      chartSlicers: projectData.chartSlicers.filter(cs => cs.slicerId !== slicerId)
    };
    onProjectDataChange(updatedData);
  };

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

  const getAvailableColumns = () => {
    return universalCandidates;
  };

  const universalSlicers = projectData.slicers.filter(s => s.type === 'universal');
  const tableSpecificSlicers = projectData.slicers.filter(s => s.type === 'table-specific');

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
      marginBottom: '24px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#1f2937' }}>
          🌐 Global Filters
        </h3>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 16px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          ➕ Add Global Filter
        </button>
      </div>

      {/* Universal Slicers Section */}
      {universalSlicers.length > 0 ? (
        <div style={{ display: 'grid', gap: '12px' }}>
          {universalSlicers.map(slicer => (
            <SlicerCard
              key={slicer.id}
              slicer={slicer}
              projectData={projectData}
              onValueChange={handleSlicerValueChange}
              onDelete={handleDeleteSlicer}
            />
          ))}
        </div>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          color: '#6b7280',
          background: '#f9fafb',
          borderRadius: '8px',
          border: '2px dashed #e5e7eb'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🌐</div>
          <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '4px' }}>No global filters yet</div>
          <div style={{ fontSize: '14px' }}>Global filters apply to all charts that have the selected column</div>
        </div>
      )}

      {/* Add Slicer Modal */}
      {showAddModal && (
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
            borderRadius: '12px',
            padding: '24px',
            width: '500px',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: '600' }}>
              Create Global Filter
            </h3>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                Select Column
              </label>
              <select
                value={selectedColumn}
                onChange={(e) => {
                  setSelectedColumn(e.target.value);
                  if (!slicerName.trim() && e.target.value) {
                    setSlicerName(e.target.value);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="">Select a column...</option>
                {getAvailableColumns().map(column => (
                  <option key={column} value={column}>{column}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                Slicer Name
              </label>
              <input
                type="text"
                value={slicerName}
                onChange={(e) => setSlicerName(e.target.value)}
                placeholder="Enter slicer name..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  padding: '8px 16px',
                  background: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSlicer}
                disabled={!selectedColumn || !slicerName.trim()}
                style={{
                  padding: '8px 16px',
                  background: selectedColumn && slicerName.trim() ? '#10b981' : '#9ca3af',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: selectedColumn && slicerName.trim() ? 'pointer' : 'not-allowed'
                }}
              >
                Create Global Filter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Individual Slicer Card Component
interface SlicerCardProps {
  slicer: Slicer;
  projectData: ProjectData;
  onValueChange: (slicerId: string, selectedValues: any[]) => void;
  onDelete: (slicerId: string) => void;
}

const SlicerCard: React.FC<SlicerCardProps> = ({
  slicer,
  projectData,
  onValueChange,
  onDelete
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const tableName = slicer.type === 'universal'
    ? 'Universal'
    : slicer.tableId === 'main'
      ? projectData.name || 'Main Dataset'
      : projectData.tables.find(t => t.id === slicer.tableId)?.name || 'Unknown Table';

  const affectedChartsCount = slicer.type === 'universal'
    ? projectData.charts.filter(chart =>
        getTablesWithColumn(slicer.columnName, projectData).includes(chart.config.tableId || 'main')
      ).length
    : projectData.charts.filter(chart =>
        (chart.config.tableId || 'main') === slicer.tableId
      ).length;

  const renderFilterControl = () => {
    switch (slicer.filterType) {
      case 'multi-select':
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
            {slicer.availableValues.slice(0, 10).map(value => (
              <label key={value} style={{ display: 'flex', alignItems: 'center', fontSize: '13px' }}>
                <input
                  type="checkbox"
                  checked={slicer.selectedValues.includes(value)}
                  onChange={(e) => {
                    const newSelected = e.target.checked
                      ? [...slicer.selectedValues, value]
                      : slicer.selectedValues.filter(v => v !== value);
                    onValueChange(slicer.id, newSelected);
                  }}
                  style={{ marginRight: '4px' }}
                />
                {String(value)}
              </label>
            ))}
            {slicer.availableValues.length > 10 && (
              <span style={{ fontSize: '12px', color: '#6b7280' }}>
                +{slicer.availableValues.length - 10} more...
              </span>
            )}
          </div>
        );

      case 'dropdown':
        return (
          <select
            value={slicer.selectedValues[0] || ''}
            onChange={(e) => onValueChange(slicer.id, e.target.value ? [e.target.value] : [])}
            style={{
              marginTop: '8px',
              padding: '4px 8px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '13px'
            }}
          >
            <option value="">All values</option>
            {slicer.availableValues.map(value => (
              <option key={value} value={value}>{String(value)}</option>
            ))}
          </select>
        );

      default:
        return (
          <div style={{ marginTop: '8px', fontSize: '13px', color: '#6b7280' }}>
            {slicer.filterType} filter (not yet implemented)
          </div>
        );
    }
  };

  return (
    <div style={{
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '16px',
      background: '#fafafa'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h5 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
              {slicer.name}
            </h5>
            <span style={{
              background: slicer.type === 'universal' ? '#dbeafe' : '#fef3c7',
              color: slicer.type === 'universal' ? '#1e40af' : '#92400e',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '500'
            }}>
              {slicer.type === 'universal' ? 'Universal' : 'Table-Specific'}
            </span>
          </div>

          <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '6px' }}>
            Column: <strong>{slicer.columnName}</strong> • Table: <strong>{tableName}</strong>
          </div>

          <div style={{ fontSize: '13px', color: '#6b7280' }}>
            Affects {affectedChartsCount} chart{affectedChartsCount !== 1 ? 's' : ''} •
            {slicer.selectedValues.length > 0
              ? ` ${slicer.selectedValues.length} value${slicer.selectedValues.length !== 1 ? 's' : ''} selected`
              : ' All values'
            }
          </div>

          {isExpanded && renderFilterControl()}
        </div>

        <div style={{ display: 'flex', gap: '6px', marginLeft: '12px' }}>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            {isExpanded ? 'Collapse' : 'Filter'}
          </button>
          <button
            onClick={() => onDelete(slicer.id)}
            style={{
              background: '#fee2e2',
              color: '#dc2626',
              border: '1px solid #fecaca',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default SlicerManager;