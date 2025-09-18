import React, { useState } from 'react';
import { DateRange } from '../types';

interface DateRangeManagerProps {
  dateRanges: DateRange[];
  onDateRangeAdd: (dateRange: DateRange) => void;
  onDateRangeUpdate: (dateRange: DateRange) => void;
  onDateRangeDelete: (id: string) => void;
}

interface PresetRange {
  name: string;
  startDate: string;
  endDate: string;
  description: string;
}

const DateRangeManager: React.FC<DateRangeManagerProps> = ({
  dateRanges,
  onDateRangeAdd,
  onDateRangeUpdate,
  onDateRangeDelete
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const [newRange, setNewRange] = useState({
    name: '',
    startDate: '',
    endDate: ''
  });

  // Generate preset date ranges
  const generatePresets = (): PresetRange[] => {
    const currentYear = new Date().getFullYear();
    const presets: PresetRange[] = [];

    // Current and recent years
    for (let year = currentYear; year >= currentYear - 5; year--) {
      presets.push({
        name: year.toString(),
        startDate: `${year}-01-01`,
        endDate: `${year}-12-31`,
        description: `Full year ${year}`
      });
    }

    // Current year quarters
    const quarters = [
      { name: `Q1 ${currentYear}`, start: `${currentYear}-01-01`, end: `${currentYear}-03-31` },
      { name: `Q2 ${currentYear}`, start: `${currentYear}-04-01`, end: `${currentYear}-06-30` },
      { name: `Q3 ${currentYear}`, start: `${currentYear}-07-01`, end: `${currentYear}-09-30` },
      { name: `Q4 ${currentYear}`, start: `${currentYear}-10-01`, end: `${currentYear}-12-31` }
    ];

    quarters.forEach(quarter => {
      presets.push({
        name: quarter.name,
        startDate: quarter.start,
        endDate: quarter.end,
        description: `Quarter ${quarter.name.charAt(1)} of ${currentYear}`
      });
    });

    // Last 30/90/365 days
    const today = new Date();
    const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last90Days = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
    const last365Days = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);

    presets.push(
      {
        name: 'Last 30 Days',
        startDate: last30Days.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
        description: 'Past month of data'
      },
      {
        name: 'Last 90 Days',
        startDate: last90Days.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
        description: 'Past quarter of data'
      },
      {
        name: 'Last 365 Days',
        startDate: last365Days.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
        description: 'Past year of data'
      }
    );

    return presets;
  };

  const handleCreate = () => {
    if (!newRange.name || !newRange.startDate || !newRange.endDate) return;

    const dateRange: DateRange = {
      id: `range-${Date.now()}`,
      name: newRange.name,
      startDate: newRange.startDate,
      endDate: newRange.endDate,
      createdAt: new Date().toISOString()
    };

    onDateRangeAdd(dateRange);
    setNewRange({ name: '', startDate: '', endDate: '' });
    setIsCreating(false);
  };

  const handleEdit = (dateRange: DateRange) => {
    setEditingId(dateRange.id);
    setNewRange({
      name: dateRange.name,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    });
  };

  const handleUpdate = () => {
    if (!editingId || !newRange.name || !newRange.startDate || !newRange.endDate) return;

    const dateRange: DateRange = {
      id: editingId,
      name: newRange.name,
      startDate: newRange.startDate,
      endDate: newRange.endDate,
      createdAt: dateRanges.find(r => r.id === editingId)?.createdAt || new Date().toISOString()
    };

    onDateRangeUpdate(dateRange);
    setNewRange({ name: '', startDate: '', endDate: '' });
    setEditingId(null);
  };

  const handleCancel = () => {
    setNewRange({ name: '', startDate: '', endDate: '' });
    setIsCreating(false);
    setEditingId(null);
  };

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '16px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
          📅 Date Range Filters
        </h3>
        {!isCreating && !editingId && (
          <button
            onClick={() => setIsCreating(true)}
            style={{
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 12px',
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            + Add Filter
          </button>
        )}
      </div>

      {/* Create/Edit Form */}
      {(isCreating || editingId) && (
        <div style={{
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          padding: '12px',
          marginBottom: '16px'
        }}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
              Filter Name
            </label>
            <input
              type="text"
              value={newRange.name}
              onChange={(e) => setNewRange(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., 2024, Q1 2024, Last Year"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px',
                background: 'white'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                Start Date
              </label>
              <input
                type="date"
                value={newRange.startDate}
                onChange={(e) => setNewRange(prev => ({ ...prev, startDate: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '14px',
                  background: 'white'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                End Date
              </label>
              <input
                type="date"
                value={newRange.endDate}
                onChange={(e) => setNewRange(prev => ({ ...prev, endDate: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '14px',
                  background: 'white'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              onClick={handleCancel}
              style={{
                background: '#f3f4f6',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                padding: '6px 12px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={editingId ? handleUpdate : handleCreate}
              disabled={!newRange.name || !newRange.startDate || !newRange.endDate}
              style={{
                background: (!newRange.name || !newRange.startDate || !newRange.endDate) ? '#9ca3af' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '6px 12px',
                fontSize: '12px',
                cursor: (!newRange.name || !newRange.startDate || !newRange.endDate) ? 'not-allowed' : 'pointer'
              }}
            >
              {editingId ? 'Update' : 'Create'} Filter
            </button>
          </div>
        </div>
      )}

      {/* Existing Date Ranges */}
      {dateRanges.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '24px',
          color: '#6b7280',
          background: '#f9fafb',
          borderRadius: '6px',
          border: '1px dashed #d1d5db'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>📅</div>
          <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>No date filters created</div>
          <div style={{ fontSize: '12px' }}>Create custom date ranges to filter your charts</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {dateRanges.map(range => (
            <div
              key={range.id}
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ fontWeight: '500', fontSize: '14px', color: '#1f2937', marginBottom: '2px' }}>
                  {range.name}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  {new Date(range.startDate).toLocaleDateString()} - {new Date(range.endDate).toLocaleDateString()}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => handleEdit(range)}
                  disabled={isCreating || editingId !== null}
                  style={{
                    background: '#dbeafe',
                    color: '#1e40af',
                    border: '1px solid #93c5fd',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    cursor: (isCreating || editingId !== null) ? 'not-allowed' : 'pointer',
                    opacity: (isCreating || editingId !== null) ? 0.5 : 1
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => onDateRangeDelete(range.id)}
                  disabled={isCreating || editingId !== null}
                  style={{
                    background: '#fef2f2',
                    color: '#dc2626',
                    border: '1px solid #fecaca',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    cursor: (isCreating || editingId !== null) ? 'not-allowed' : 'pointer',
                    opacity: (isCreating || editingId !== null) ? 0.5 : 1
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DateRangeManager;