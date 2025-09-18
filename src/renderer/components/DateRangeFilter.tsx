import React, { useState, useRef, useEffect } from 'react';
import { DateRange } from '../types';

interface DateRangeFilterProps {
  dateRanges: DateRange[];
  selectedRangeId: string | null;
  onRangeSelect: (rangeId: string | null) => void;
  onDateRangeAdd?: (dateRange: DateRange) => void;
  onDateRangeUpdate?: (dateRange: DateRange) => void;
  onDateRangeDelete?: (id: string) => void;
  compact?: boolean;
  // New props for multi-select
  selectedRangeIds?: string[];
  onRangeMultiSelect?: (rangeIds: string[]) => void;
}

interface CompactDateRangeDropdownProps {
  dateRanges: DateRange[];
  selectedRangeIds: string[];
  onRangeMultiSelect: (rangeIds: string[]) => void;
  onManage?: () => void;
}

const CompactDateRangeDropdown: React.FC<CompactDateRangeDropdownProps> = ({
  dateRanges,
  selectedRangeIds,
  onRangeMultiSelect,
  onManage
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
    if (selectedRangeIds.length === 0) {
      return 'All Data';
    }
    if (selectedRangeIds.length === 1) {
      const range = dateRanges.find(r => r.id === selectedRangeIds[0]);
      return range ? range.name : 'All Data';
    }
    return `${selectedRangeIds.length} date ranges`;
  };

  const handleRangeToggle = (rangeId: string) => {
    const newSelection = selectedRangeIds.includes(rangeId)
      ? selectedRangeIds.filter(id => id !== rangeId)
      : [...selectedRangeIds, rangeId];
    onRangeMultiSelect(newSelection);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            background: selectedRangeIds.length > 0 ? '#dbeafe' : '#f8fafc',
            color: selectedRangeIds.length > 0 ? '#1e40af' : '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
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
        </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
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
              📅 Date Ranges
            </div>

            <label
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
                checked={selectedRangeIds.length === 0}
                onChange={() => onRangeMultiSelect([])}
                style={{
                  margin: 0,
                  accentColor: '#3b82f6'
                }}
              />
              <span style={{ color: '#374151' }}>
                All Data (No Filter)
              </span>
            </label>

            {dateRanges.map(range => (
              <label
                key={range.id}
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
                  checked={selectedRangeIds.includes(range.id)}
                  onChange={() => handleRangeToggle(range.id)}
                  style={{
                    margin: 0,
                    accentColor: '#3b82f6'
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#374151', fontWeight: '500' }}>
                    {range.name}
                  </div>
                  <div style={{ fontSize: '10px', color: '#6b7280' }}>
                    {new Date(range.startDate).toLocaleDateString()} - {new Date(range.endDate).toLocaleDateString()}
                  </div>
                </div>
              </label>
            ))}

            {dateRanges.length === 0 && (
              <div style={{
                fontSize: '11px',
                color: '#6b7280',
                textAlign: 'center',
                padding: '8px'
              }}>
                No date ranges created yet
              </div>
            )}

            {selectedRangeIds.length > 0 && (
              <button
                onClick={() => onRangeMultiSelect([])}
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

      {onManage && (
        <button
          onClick={() => onManage()}
          style={{
            background: '#f3f4f6',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e5e7eb';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f3f4f6';
          }}
        >
          ⚙️
        </button>
      )}
    </div>
  );
};

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  dateRanges,
  selectedRangeId,
  onRangeSelect,
  onDateRangeAdd,
  onDateRangeUpdate,
  onDateRangeDelete,
  compact = false,
  selectedRangeIds = [],
  onRangeMultiSelect
}) => {
  const [showManagement, setShowManagement] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newRange, setNewRange] = useState({
    name: '',
    startDate: '',
    endDate: ''
  });

  const handleCreate = () => {
    if (!newRange.name || !newRange.startDate || !newRange.endDate || !onDateRangeAdd) return;

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
    setIsCreating(true);
  };

  const handleUpdate = () => {
    if (!editingId || !newRange.name || !newRange.startDate || !newRange.endDate || !onDateRangeUpdate) return;

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
    setIsCreating(false);
  };

  const handleCancel = () => {
    setNewRange({ name: '', startDate: '', endDate: '' });
    setIsCreating(false);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (onDateRangeDelete) {
      onDateRangeDelete(id);
    }
  };

  if (compact) {
    return (
      <>
        <CompactDateRangeDropdown
          dateRanges={dateRanges}
          selectedRangeIds={onRangeMultiSelect ? selectedRangeIds : (selectedRangeId ? [selectedRangeId] : [])}
          onRangeMultiSelect={onRangeMultiSelect || ((ranges) => onRangeSelect(ranges.length > 0 ? ranges[0] : null))}
          onManage={onDateRangeAdd ? () => setShowManagement(true) : undefined}
        />

        {/* Management Modal */}
        {showManagement && onDateRangeAdd && (
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
              maxWidth: '500px',
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
                  📅 Manage Date Ranges
                </h3>
                <button
                  onClick={() => {
                    setShowManagement(false);
                    setIsCreating(false);
                    setEditingId(null);
                    setNewRange({ name: '', startDate: '', endDate: '' });
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

              {!isCreating ? (
                <div>
                  <button
                    onClick={() => setIsCreating(true)}
                    style={{
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 16px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      width: '100%',
                      marginBottom: '16px'
                    }}
                  >
                    ⚙️ Create Date Ranges
                  </button>

                  {dateRanges.length > 0 && (
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '12px', color: '#374151' }}>
                        Existing Date Ranges:
                      </div>
                      {dateRanges.map(range => (
                        <div key={range.id} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px',
                          background: '#f9fafb',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          marginBottom: '8px'
                        }}>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '2px' }}>
                              {range.name}
                            </div>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>
                              {new Date(range.startDate).toLocaleDateString()} - {new Date(range.endDate).toLocaleDateString()}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => handleEdit(range)}
                              style={{
                                background: '#dbeafe',
                                color: '#1e40af',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(range.id)}
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
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                      Range Name (e.g., "2025", "Past 3 Years")
                    </label>
                    <input
                      type="text"
                      value={newRange.name}
                      onChange={(e) => setNewRange(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter range name"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        background: 'white'
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
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
                          borderRadius: '6px',
                          fontSize: '14px',
                          background: 'white'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
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
                          borderRadius: '6px',
                          fontSize: '14px',
                          background: 'white'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={editingId ? handleUpdate : handleCreate}
                      disabled={!newRange.name || !newRange.startDate || !newRange.endDate}
                      style={{
                        background: (!newRange.name || !newRange.startDate || !newRange.endDate) ? '#9ca3af' : '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '8px 16px',
                        fontSize: '14px',
                        cursor: (!newRange.name || !newRange.startDate || !newRange.endDate) ? 'not-allowed' : 'pointer',
                        flex: 1
                      }}
                    >
                      {editingId ? 'Update Range' : 'Create Range'}
                    </button>
                    <button
                      onClick={handleCancel}
                      style={{
                        background: '#f3f4f6',
                        color: '#374151',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        padding: '8px 16px',
                        fontSize: '14px',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
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
      background: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '12px',
      marginBottom: '16px'
    }}>
      <div style={{
        fontSize: '14px',
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          📅 Date Filter
        </div>
        {onDateRangeAdd && (
          <button
            onClick={() => setShowManagement(!showManagement)}
            style={{
              background: showManagement ? '#f3f4f6' : '#3b82f6',
              color: showManagement ? '#374151' : 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '11px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            {showManagement ? '✕' : '⚙️'}
          </button>
        )}
      </div>

      {/* Management Section */}
      {showManagement && onDateRangeAdd && (
        <div style={{
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          padding: '12px',
          marginBottom: '12px'
        }}>
          {!isCreating ? (
            <div>
              <button
                onClick={() => setIsCreating(true)}
                style={{
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  width: '100%',
                  marginBottom: '8px'
                }}
              >
                ⚙️ Create Date Ranges
              </button>

              {dateRanges.length > 0 && (
                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '8px' }}>
                  Manage existing ranges:
                </div>
              )}

              {dateRanges.map(range => (
                <div key={range.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 8px',
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  marginBottom: '4px'
                }}>
                  <div style={{ fontSize: '12px', fontWeight: '500' }}>
                    {range.name}
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => handleEdit(range)}
                      style={{
                        background: '#dbeafe',
                        color: '#1e40af',
                        border: 'none',
                        borderRadius: '3px',
                        padding: '2px 6px',
                        fontSize: '10px',
                        cursor: 'pointer'
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(range.id)}
                      style={{
                        background: '#fef2f2',
                        color: '#dc2626',
                        border: 'none',
                        borderRadius: '3px',
                        padding: '2px 6px',
                        fontSize: '10px',
                        cursor: 'pointer'
                      }}
                    >
                      Del
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '8px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#374151', marginBottom: '2px' }}>
                  Name (e.g., "2025", "Past 3 Years")
                </label>
                <input
                  type="text"
                  value={newRange.name}
                  onChange={(e) => setNewRange(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter range name"
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '12px',
                    background: 'white'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#374151', marginBottom: '2px' }}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={newRange.startDate}
                    onChange={(e) => setNewRange(prev => ({ ...prev, startDate: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '12px',
                      background: 'white'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#374151', marginBottom: '2px' }}>
                    End Date
                  </label>
                  <input
                    type="date"
                    value={newRange.endDate}
                    onChange={(e) => setNewRange(prev => ({ ...prev, endDate: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '12px',
                      background: 'white'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
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
                    cursor: (!newRange.name || !newRange.startDate || !newRange.endDate) ? 'not-allowed' : 'pointer',
                    flex: 1
                  }}
                >
                  {editingId ? 'Update' : 'Create'}
                </button>
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
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <button
          onClick={() => onRangeSelect(null)}
          style={{
            padding: '8px 12px',
            background: selectedRangeId === null ? '#3b82f6' : '#f8fafc',
            color: selectedRangeId === null ? 'white' : '#374151',
            border: `1px solid ${selectedRangeId === null ? '#3b82f6' : '#e5e7eb'}`,
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.2s'
          }}
        >
          🔍 All Data (No Filter)
        </button>

        {dateRanges.length === 0 && !showManagement && (
          <div style={{
            textAlign: 'center',
            padding: '16px',
            color: '#6b7280',
            fontSize: '12px',
            background: '#f9fafb',
            border: '1px dashed #d1d5db',
            borderRadius: '6px'
          }}>
            No date ranges created yet
          </div>
        )}

        {dateRanges.map(range => (
          <button
            key={range.id}
            onClick={() => onRangeSelect(range.id)}
            style={{
              padding: '8px 12px',
              background: selectedRangeId === range.id ? '#3b82f6' : '#f8fafc',
              color: selectedRangeId === range.id ? 'white' : '#374151',
              border: `1px solid ${selectedRangeId === range.id ? '#3b82f6' : '#e5e7eb'}`,
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '2px'
            }}
          >
            <div>{range.name}</div>
            <div style={{
              fontSize: '11px',
              opacity: 0.8,
              fontWeight: '400'
            }}>
              {new Date(range.startDate).toLocaleDateString()} - {new Date(range.endDate).toLocaleDateString()}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default DateRangeFilter;