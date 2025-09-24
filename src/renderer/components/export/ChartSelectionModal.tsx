import React from 'react';
import { Chart } from '../../types';

interface ChartSelectionModalProps {
  charts: Chart[];
  selectedChartIds: string[];
  chartsWithAnalysis: Set<string>;
  onToggleChart: (chartId: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onClose: () => void;
  onContinue: () => void;
}

const ChartSelectionModal: React.FC<ChartSelectionModalProps> = ({
  charts,
  selectedChartIds,
  chartsWithAnalysis,
  onToggleChart,
  onSelectAll,
  onClearAll,
  onClose,
  onContinue
}) => {
  const selectedCount = selectedChartIds.length;
  const totalCount = charts.length;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.55)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '24px'
    }}>
      <div style={{
        width: 'min(720px, 100%)',
        maxHeight: '90vh',
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 24px 48px rgba(15, 23, 42, 0.16)',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e2e8f0',
          background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 600,
              color: '#0f172a'
            }}>
              Select Charts to Export
            </h2>
            <p style={{
              margin: '6px 0 0 0',
              fontSize: '14px',
              color: '#475569'
            }}>
              Choose which charts you want to include in your report.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#64748b'
            }}
            aria-label="Close chart selection"
          >
            ×
          </button>
        </div>

        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div style={{
            display: 'flex',
            gap: '8px'
          }}>
            <button
              onClick={onSelectAll}
              style={{
                border: '1px solid #cbd5f5',
                background: '#eef2ff',
                color: '#4338ca',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Select All
            </button>
            <button
              onClick={onClearAll}
              style={{
                border: '1px solid #e2e8f0',
                background: 'white',
                color: '#64748b',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Clear All
            </button>
          </div>
          <div style={{
            fontSize: '14px',
            color: '#475569',
            fontWeight: 500
          }}>
            {selectedCount} of {totalCount} charts selected
          </div>
        </div>

        <div style={{
          padding: '12px 24px 0 24px',
          flex: 1,
          overflowY: 'auto'
        }}>
          {charts.map(chart => {
            const selected = selectedChartIds.includes(chart.id);
            const hasAnalysis = chartsWithAnalysis.has(chart.id);
            const lastUpdatedLabel = chart.updatedAt
              ? new Date(chart.updatedAt).toLocaleString()
              : 'Not updated yet';

            return (
              <label
                key={chart.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: selected ? '2px solid #34d399' : '1px solid #e2e8f0',
                  background: selected ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(59, 130, 246, 0.05) 100%)' : 'white',
                  boxShadow: selected
                    ? '0 10px 20px rgba(16, 185, 129, 0.12)'
                    : '0 4px 10px rgba(15, 23, 42, 0.05)',
                  marginBottom: '12px',
                  cursor: 'pointer'
                }}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => onToggleChart(chart.id)}
                  style={{
                    width: '18px',
                    height: '18px',
                    marginTop: '4px'
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <div>
                      <div style={{
                        fontSize: '16px',
                        fontWeight: 600,
                        color: '#0f172a'
                      }}>
                        {chart.name || 'Untitled Chart'}
                      </div>
                      <div style={{
                        fontSize: '13px',
                        color: '#64748b',
                        marginTop: '4px'
                      }}>
                        Type: {chart.type || 'Unknown'} • Last updated: {lastUpdatedLabel}
                      </div>
                    </div>
                    <span style={{
                      borderRadius: '999px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: hasAnalysis ? '#047857' : '#64748b',
                      background: hasAnalysis ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.18)',
                      border: hasAnalysis ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(148, 163, 184, 0.4)'
                    }}>
                      {hasAnalysis ? 'Has Analysis' : 'No Analysis'}
                    </span>
                  </div>
                </div>
              </label>
            );
          })}
        </div>

        <div style={{
          padding: '20px 24px',
          borderTop: '1px solid #e2e8f0',
          background: '#f8fafc',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            fontSize: '14px',
            color: '#475569'
          }}>
            {selectedCount > 0
              ? `Ready to export ${selectedCount} chart${selectedCount === 1 ? '' : 's'}`
              : 'Select at least one chart to continue'}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={onClose}
              style={{
                background: 'white',
                color: '#475569',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '10px 18px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={onContinue}
              disabled={selectedCount === 0}
              style={{
                background: selectedCount === 0 ? '#bbf7d0' : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                color: selectedCount === 0 ? '#166534' : 'white',
                border: 'none',
                borderRadius: '10px',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: selectedCount === 0 ? 'not-allowed' : 'pointer',
                boxShadow: selectedCount === 0
                  ? 'none'
                  : '0 12px 20px rgba(22, 163, 74, 0.2)',
                transition: 'transform 0.2s ease'
              }}
            >
              Continue to Export ({selectedCount})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartSelectionModal;
