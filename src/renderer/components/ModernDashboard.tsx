import React, { useState } from 'react';
import { Project, ProjectData, Chart } from '../types';
import ChartBuilder from './charts/ChartBuilder';
import DataImport from './DataImport';

interface ModernDashboardProps {
  project: Project;
  projectData: ProjectData;
  onProjectUpdate: (projectData: ProjectData) => void;
  onBack: () => void;
}

const ModernDashboard: React.FC<ModernDashboardProps> = ({
  project,
  projectData,
  onProjectUpdate,
  onBack
}) => {
  const [activeTab, setActiveTab] = useState('analytics');
  const [selectedChart, setSelectedChart] = useState<Chart | null>(null);
  const [showDataImport, setShowDataImport] = useState(false);
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [editingTableName, setEditingTableName] = useState('');

  const handleDataImport = (data: any[], columns: any[], fileName?: string) => {
    const newTable = {
      id: Date.now().toString(),
      name: fileName?.replace(/\.[^/.]+$/, "") || `Table ${projectData.tables.length + 1}`,
      data: data,
      columns: columns,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourceFile: fileName
    };

    // ONLY add to tables array - no more main data concept
    const updatedData = {
      ...projectData,
      // Keep main data empty - we only use tables now
      data: [],
      columns: [],
      tables: [...projectData.tables, newTable]
    };

    onProjectUpdate(updatedData);
    setShowDataImport(false);
  };

  const handleNewChart = () => {
    const newChart: Chart = {
      id: Date.now().toString(),
      name: 'New Chart',
      type: 'none',
      config: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setSelectedChart(newChart);
  };

  const handleChartSave = (chart: Chart) => {
    const updatedCharts = chart.id && projectData.charts.find(c => c.id === chart.id)
      ? projectData.charts.map(c => c.id === chart.id ? chart : c)
      : [...projectData.charts, chart];

    const updatedData = {
      ...projectData,
      charts: updatedCharts
    };

    onProjectUpdate(updatedData);
    setSelectedChart(null);
  };

  const handleChartEdit = (chart: Chart) => {
    setSelectedChart(chart);
  };

  const handleChartDelete = (chartId: string) => {
    if (window.confirm('Are you sure you want to delete this chart?')) {
      const updatedCharts = projectData.charts.filter(c => c.id !== chartId);
      const updatedData = {
        ...projectData,
        charts: updatedCharts
      };
      onProjectUpdate(updatedData);
    }
  };

  const handleTableDelete = (tableId: string) => {
    if (window.confirm('Are you sure you want to delete this table? This action cannot be undone.')) {
      const updatedTables = projectData.tables.filter(t => t.id !== tableId);
      const updatedData = {
        ...projectData,
        tables: updatedTables
      };
      onProjectUpdate(updatedData);
    }
  };

  const handleTableNameEdit = (tableId: string, currentName: string) => {
    setEditingTableId(tableId);
    setEditingTableName(currentName);
  };

  const handleTableNameSave = (tableId: string) => {
    if (editingTableName.trim() === '') {
      setEditingTableId(null);
      setEditingTableName('');
      return;
    }

    const updatedTables = projectData.tables.map(table => 
      table.id === tableId 
        ? { ...table, name: editingTableName.trim(), updatedAt: new Date().toISOString() }
        : table
    );

    const updatedData = {
      ...projectData,
      tables: updatedTables
    };

    onProjectUpdate(updatedData);
    setEditingTableId(null);
    setEditingTableName('');
  };

  const handleTableNameCancel = () => {
    setEditingTableId(null);
    setEditingTableName('');
  };

  if (selectedChart) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px'
      }}>
        <ChartBuilder
          chart={selectedChart}
          projectData={projectData}
          onSave={handleChartSave}
          onCancel={() => setSelectedChart(null)}
        />
      </div>
    );
  }

  return (
    <div style={{
      height: '100vh',
      background: '#f8fafc',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header with back button, project info, and quick stats */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '16px 32px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Left side: Back button and project info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={onBack}
              style={{
                background: 'transparent',
                border: '1px solid #d1d5db',
                padding: '8px 16px',
                borderRadius: '6px',
                color: '#374151',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              ← Back
            </button>
            <div>
              <h1 style={{ 
                margin: '0 0 4px 0',
                fontSize: '20px',
                fontWeight: '600',
                color: '#111827'
              }}>
                {project.name}
              </h1>
              <p style={{ 
                margin: 0,
                color: '#6b7280',
                fontSize: '14px'
              }}>
                {project.description}
              </p>
            </div>
          </div>

          {/* Right side: Quick stats */}
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#111827' }}>
                {projectData.tables.length}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>Tables</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#111827' }}>
                {projectData.charts.length}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>Charts</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#111827' }}>
                {projectData.tables.reduce((total, table) => total + table.data.length, 0)}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>Records</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '0 32px'
      }}>
        <div style={{ display: 'flex', gap: '0' }}>
          <button
            onClick={() => setActiveTab('analytics')}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '16px 24px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              color: activeTab === 'analytics' ? '#3b82f6' : '#6b7280',
              borderBottom: activeTab === 'analytics' ? '2px solid #3b82f6' : '2px solid transparent',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'analytics') {
                e.currentTarget.style.color = '#374151';
                e.currentTarget.style.background = '#f9fafb';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'analytics') {
                e.currentTarget.style.color = '#6b7280';
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            📊 Analytics Dashboard
          </button>
          <button
            onClick={() => setActiveTab('explorer')}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '16px 24px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              color: activeTab === 'explorer' ? '#3b82f6' : '#6b7280',
              borderBottom: activeTab === 'explorer' ? '2px solid #3b82f6' : '2px solid transparent',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'explorer') {
                e.currentTarget.style.color = '#374151';
                e.currentTarget.style.background = '#f9fafb';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'explorer') {
                e.currentTarget.style.color = '#6b7280';
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            🔍 Data Explorer
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main style={{
        flex: 1,
        padding: '32px',
        overflowY: 'auto'
      }}>
        {activeTab === 'analytics' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '600' }}>
                  📈 Chart Analytics
                </h2>
                <p style={{ margin: 0, color: '#6b7280' }}>
                  Create and manage your data visualizations with professional customization options
                </p>
              </div>
              {projectData.tables && projectData.tables.length > 0 && (
                <button
                  onClick={handleNewChart}
                  style={{
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <span>+</span> New Chart
                </button>
              )}
            </div>

            {(!projectData.tables || projectData.tables.length === 0) ? (
              <div style={{
                background: 'white',
                border: '2px dashed #d1d5db',
                borderRadius: '12px',
                padding: '48px 24px',
                textAlign: 'center',
                margin: '24px 0'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>
                  No Data Available
                </h3>
                <p style={{ margin: '0 0 24px 0', color: '#6b7280' }}>
                  Import data to start creating charts and analytics
                </p>
                <button
                  onClick={() => setShowDataImport(true)}
                  style={{
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Import Data
                </button>
              </div>
            ) : (
              <div>
                {projectData.charts.length === 0 ? (
                  <div style={{
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '48px 24px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📈</div>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>
                      Create Your First Chart
                    </h3>
                    <p style={{ margin: '0 0 24px 0', color: '#6b7280' }}>
                      Transform your data into meaningful visualizations
                    </p>
                    <button
                      onClick={handleNewChart}
                      style={{
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Create Chart
                    </button>
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '24px'
                  }}>
                    {projectData.charts.map((chart) => (
                      <div
                        key={chart.id}
                        style={{
                          background: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '12px',
                          padding: '20px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                          e.currentTarget.style.borderColor = '#3b82f6';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                          e.currentTarget.style.borderColor = '#e5e7eb';
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: '12px'
                        }}>
                          <div style={{ flex: 1 }}>
                            <h4 style={{
                              margin: '0 0 8px 0',
                              fontSize: '16px',
                              fontWeight: '600',
                              color: '#111827'
                            }}>
                              {chart.name}
                            </h4>
                            <div style={{
                              fontSize: '12px',
                              color: '#6b7280',
                              textTransform: 'capitalize'
                            }}>
                              {chart.type} Chart
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleChartEdit(chart);
                              }}
                              style={{
                                background: 'transparent',
                                border: '1px solid #d1d5db',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                color: '#6b7280'
                              }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleChartDelete(chart.id);
                              }}
                              style={{
                                background: 'transparent',
                                border: '1px solid #fca5a5',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                color: '#dc2626'
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: '#6b7280'
                        }}>
                          Updated {new Date(chart.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'explorer' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '600' }}>
                  🔍 Data Explorer
                </h2>
                <p style={{ margin: 0, color: '#6b7280' }}>
                  Import, view, and manage your data tables
                </p>
              </div>
              <button
                onClick={() => setShowDataImport(true)}
                style={{
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>+</span> Import Data
              </button>
            </div>

            {projectData.tables.length === 0 ? (
              <div style={{
                background: 'white',
                border: '2px dashed #d1d5db',
                borderRadius: '12px',
                padding: '48px 24px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>
                  No Data Tables
                </h3>
                <p style={{ margin: '0 0 24px 0', color: '#6b7280' }}>
                  Import CSV, Excel, or JSON files to start exploring your data
                </p>
                <button
                  onClick={() => setShowDataImport(true)}
                  style={{
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Import Data
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {projectData.tables.map((table) => (
                  <div
                    key={table.id}
                    style={{
                      background: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      padding: '20px'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '16px'
                    }}>
                      <div style={{ flex: 1 }}>
                        {editingTableId === table.id ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <input
                              type="text"
                              value={editingTableName}
                              onChange={(e) => setEditingTableName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleTableNameSave(table.id);
                                } else if (e.key === 'Escape') {
                                  handleTableNameCancel();
                                }
                              }}
                              autoFocus
                              style={{
                                fontSize: '16px',
                                fontWeight: '600',
                                padding: '4px 8px',
                                border: '1px solid #3b82f6',
                                borderRadius: '4px',
                                outline: 'none',
                                flex: 1,
                                maxWidth: '300px'
                              }}
                            />
                            <button
                              onClick={() => handleTableNameSave(table.id)}
                              style={{
                                background: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                              Save
                            </button>
                            <button
                              onClick={handleTableNameCancel}
                              style={{
                                background: '#6b7280',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <h4 
                            style={{
                              margin: '0 0 4px 0',
                              fontSize: '16px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'inline-block'
                            }}
                            onClick={() => handleTableNameEdit(table.id, table.name)}
                            title="Click to edit table name"
                          >
                            {table.name}
                          </h4>
                        )}
                        <div style={{
                          fontSize: '14px',
                          color: '#6b7280'
                        }}>
                          {table.data.length} records • {table.columns.length} columns
                        </div>
                      </div>
                      <button
                        onClick={() => handleTableDelete(table.id)}
                        style={{
                          background: '#dc2626',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '8px 16px',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          letterSpacing: '0.025em'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#b91c1c';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#dc2626';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        Delete
                      </button>
                    </div>

                    {/* Table preview */}
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{
                        width: '100%',
                        fontSize: '14px',
                        borderCollapse: 'collapse'
                      }}>
                        <thead>
                          <tr style={{ background: '#f9fafb' }}>
                            {table.columns.slice(0, 6).map((col) => (
                              <th
                                key={col.name}
                                style={{
                                  padding: '12px',
                                  textAlign: 'left',
                                  fontWeight: '600',
                                  border: '1px solid #e5e7eb'
                                }}
                              >
                                {col.name}
                                <span style={{
                                  fontSize: '12px',
                                  color: '#6b7280',
                                  fontWeight: '400',
                                  marginLeft: '4px'
                                }}>
                                  ({col.type})
                                </span>
                              </th>
                            ))}
                            {table.columns.length > 6 && (
                              <th style={{
                                padding: '12px',
                                textAlign: 'center',
                                fontWeight: '600',
                                border: '1px solid #e5e7eb',
                                color: '#6b7280'
                              }}>
                                +{table.columns.length - 6} more
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {table.data.slice(0, 5).map((row, index) => (
                            <tr key={index}>
                              {table.columns.slice(0, 6).map((col) => (
                                <td
                                  key={col.name}
                                  style={{
                                    padding: '12px',
                                    border: '1px solid #e5e7eb',
                                    maxWidth: '200px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {String(row[col.name] || '')}
                                </td>
                              ))}
                              {table.columns.length > 6 && (
                                <td style={{
                                  padding: '12px',
                                  textAlign: 'center',
                                  border: '1px solid #e5e7eb',
                                  color: '#6b7280'
                                }}>
                                  ...
                                </td>
                              )}
                            </tr>
                          ))}
                          {table.data.length > 5 && (
                            <tr>
                              <td
                                colSpan={Math.min(table.columns.length, 6) + (table.columns.length > 6 ? 1 : 0)}
                                style={{
                                  padding: '12px',
                                  textAlign: 'center',
                                  border: '1px solid #e5e7eb',
                                  color: '#6b7280',
                                  fontStyle: 'italic'
                                }}
                              >
                                +{table.data.length - 5} more rows
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Data Import Modal */}
            {showDataImport && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.5)',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '0',
                  maxWidth: '900px',
                  width: '95%',
                  maxHeight: '90vh',
                  minHeight: '600px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '20px',
                    borderBottom: '1px solid #e5e7eb'
                  }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                      Import Data
                    </h3>
                    <button
                      onClick={() => setShowDataImport(false)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        fontSize: '20px',
                        cursor: 'pointer',
                        padding: '4px',
                        color: '#6b7280'
                      }}
                    >
                      ×
                    </button>
                  </div>
                  <DataImport onDataImport={handleDataImport} />
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default ModernDashboard;
