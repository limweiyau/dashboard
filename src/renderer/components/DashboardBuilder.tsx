import React, { useState } from 'react';
import { Dashboard, ProjectData } from '../types';

interface DashboardBuilderProps {
  dashboard?: Dashboard;
  projectData: ProjectData;
  onSave: (dashboard: Dashboard) => void;
  onCancel: () => void;
}

const DashboardBuilder: React.FC<DashboardBuilderProps> = ({
  dashboard,
  projectData,
  onSave,
  onCancel
}) => {
  const [dashboardData, setDashboardData] = useState<Dashboard>({
    id: dashboard?.id || `dashboard-${Date.now()}`,
    name: dashboard?.name || 'New Dashboard',
    description: dashboard?.description || '',
    chartIds: dashboard?.chartIds || [],
    layout: dashboard?.layout || { columns: 2 },
    createdAt: dashboard?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  const handleSave = () => {
    onSave({
      ...dashboardData,
      updatedAt: new Date().toISOString()
    });
  };

  return (
    <div style={{
      padding: '24px',
      maxWidth: '600px',
      margin: '0 auto'
    }}>
      <div style={{
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: '600',
          margin: 0
        }}>
          {dashboard ? 'Edit Dashboard' : 'Create Dashboard'}
        </h2>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              background: 'white',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '8px 16px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Save Dashboard
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            marginBottom: '6px'
          }}>
            Dashboard Name
          </label>
          <input
            type="text"
            value={dashboardData.name}
            onChange={(e) => setDashboardData(prev => ({ ...prev, name: e.target.value }))}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
        </div>

        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            marginBottom: '6px'
          }}>
            Description
          </label>
          <textarea
            value={dashboardData.description}
            onChange={(e) => setDashboardData(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              resize: 'vertical'
            }}
          />
        </div>

        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            marginBottom: '6px'
          }}>
            Layout Columns
          </label>
          <select
            value={dashboardData.layout.columns}
            onChange={(e) => setDashboardData(prev => ({
              ...prev,
              layout: { ...prev.layout, columns: parseInt(e.target.value) }
            }))}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            <option value={1}>1 Column</option>
            <option value={2}>2 Columns</option>
            <option value={3}>3 Columns</option>
          </select>
        </div>

        {projectData.charts.length > 0 && (
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '6px'
            }}>
              Charts to Include
            </label>
            <div style={{
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              padding: '12px',
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              {projectData.charts.map(chart => (
                <label
                  key={chart.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px',
                    fontSize: '14px'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={dashboardData.chartIds.includes(chart.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setDashboardData(prev => ({
                          ...prev,
                          chartIds: [...prev.chartIds, chart.id]
                        }));
                      } else {
                        setDashboardData(prev => ({
                          ...prev,
                          chartIds: prev.chartIds.filter(id => id !== chart.id)
                        }));
                      }
                    }}
                    style={{ marginRight: '8px' }}
                  />
                  {chart.name}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardBuilder;