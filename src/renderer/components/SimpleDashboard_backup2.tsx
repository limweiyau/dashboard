import React, { useState } from 'react';
import { Project, ProjectData, Chart, Dashboard } from '../types';
import { ChartConfiguration, ChartData } from '../types/charts';
import ChartBuilder from './charts/ChartBuilder';
import ChartRenderer from './charts/ChartRenderer';
import DashboardBuilder from './DashboardBuilder';
import DataImport from './DataImport';
import { applySlicersToData } from '../utils/slicerUtils';
import ChartSlicerControls from './ChartSlicerControls';
import DateRangeManager from './DateRangeManager';
import DateRangeFilter from './DateRangeFilter';

interface SimpleDashboardProps {
  project: Project;
  projectData: ProjectData;
  onProjectUpdate: (projectData: ProjectData) => void;
  onBack: () => void;
}

const SimpleDashboard: React.FC<SimpleDashboardProps> = ({
  project,
  projectData,
  onProjectUpdate,
  onBack
}) => {
  const [activeTab, setActiveTab] = useState<'charts' | 'data'>('data');
  const [selectedChart, setSelectedChart] = useState<Chart | null>(null);
  const [selectedDashboard, setSelectedDashboard] = useState<Dashboard | null>(null);
  const [showDataImport, setShowDataImport] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState<string | null>(null);

  const handleDataImport = (data: any[], columns: any[], fileName?: string) => {
    const updatedData = {
      ...projectData,
      data,
      columns
    };
    onProjectUpdate(updatedData);
    setShowDataImport(false);
  };

  const handleDateRangeAdd = (dateRange: any) => {
    const updatedData = {
      ...projectData,
      dateRanges: [...(projectData.dateRanges || []), dateRange]
    };
    onProjectUpdate(updatedData);
  };

  const handleDateRangeUpdate = (dateRange: any) => {
    const updatedData = {
      ...projectData,
      dateRanges: (projectData.dateRanges || []).map(range =>
        range.id === dateRange.id ? dateRange : range
      )
    };
    onProjectUpdate(updatedData);
  };

  const handleDateRangeDelete = (id: string) => {
    const updatedData = {
      ...projectData,
      dateRanges: (projectData.dateRanges || []).filter(range => range.id !== id)
    };
    onProjectUpdate(updatedData);
    if (selectedDateRange === id) {
      setSelectedDateRange(null);
    }
  };

  const applyDateRangeFilter = (data: any[]) => {
    if (!selectedDateRange || !projectData.dateRanges) {
      return data;
    }

    const dateRange = projectData.dateRanges.find(range => range.id === selectedDateRange);
    if (!dateRange) {
      return data;
    }

    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);

    return data.filter(row => {
      for (const [key, value] of Object.entries(row)) {
        if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
          const rowDate = new Date(value);
          if (rowDate >= startDate && rowDate <= endDate) {
            return true;
          }
        }
      }
      return false;
    });
  };

  const handleChartSave = (chart: Chart) => {
    const existingIndex = projectData.charts.findIndex(c => c.id === chart.id);
    let updatedCharts;

    if (existingIndex >= 0) {
      updatedCharts = [...projectData.charts];
      updatedCharts[existingIndex] = chart;
    } else {
      updatedCharts = [...projectData.charts, chart];
    }

    onProjectUpdate({
      ...projectData,
      charts: updatedCharts
    });
    setSelectedChart(null);
  };

  const handleChartDelete = (chartId: string) => {
    if (confirm('Are you sure you want to delete this chart?')) {
      onProjectUpdate({
        ...projectData,
        charts: projectData.charts.filter(c => c.id !== chartId)
      });
    }
  };

  const handleDashboardSave = (dashboard: Dashboard) => {
    const existingIndex = projectData.dashboards.findIndex(d => d.id === dashboard.id);
    let updatedDashboards;

    if (existingIndex >= 0) {
      updatedDashboards = [...projectData.dashboards];
      updatedDashboards[existingIndex] = dashboard;
    } else {
      updatedDashboards = [...projectData.dashboards, dashboard];
    }

    onProjectUpdate({
      ...projectData,
      dashboards: updatedDashboards
    });
    setSelectedDashboard(null);
  };

  const generateChartData = (chart: Chart): ChartData | null => {
    const config = chart.config as ChartConfiguration;
    if (!config || typeof config !== 'object') {
      return generateSampleData(chart.type);
    }

    let sourceData: any[] = projectData.data;
    let sourceColumns = projectData.columns;

    if (config.tableId && config.tableId !== 'main') {
      const selectedTable = projectData.tables?.find(table => table.id === config.tableId);
      if (selectedTable) {
        sourceData = selectedTable.data;
        sourceColumns = selectedTable.columns || (selectedTable.data.length > 0 ?
          Object.keys(selectedTable.data[0]).map(key => ({
            name: key,
            type: typeof selectedTable.data[0][key] === 'number' ? 'number' as const : 'string' as const,
            nullable: true,
            unique: false
          })) : []);
      }
    }

    sourceData = applyDateRangeFilter(sourceData);

    if (config.appliedSlicers && config.appliedSlicers.length > 0) {
      sourceData = applySlicersToData(sourceData, config.appliedSlicers, projectData.slicers);
    }

    if (!sourceData.length) {
      return null;
    }

    try {
      if (config.templateId === 'pie-chart') {
        if (!config.categoryField || !config.valueField) {
          return generateSampleData('pie-chart');
        }

        const categoryMap = new Map<string, number[]>();
        sourceData.forEach(row => {
          const category = String(row[config.categoryField!] || 'Unknown');
          const value = Number(row[config.valueField!]) || 0;

          if (!categoryMap.has(category)) {
            categoryMap.set(category, []);
          }
          categoryMap.get(category)!.push(value);
        });

        const categoryData: Record<string, number> = {};
        categoryMap.forEach((values, category) => {
          switch (config.aggregation) {
            case 'sum':
              categoryData[category] = values.reduce((sum, val) => sum + val, 0);
              break;
            case 'average':
              categoryData[category] = values.reduce((sum, val) => sum + val, 0) / values.length;
              break;
            case 'count':
              categoryData[category] = values.length;
              break;
            case 'min':
              categoryData[category] = Math.min(...values);
              break;
            case 'max':
              categoryData[category] = Math.max(...values);
              break;
            case 'none':
              categoryData[category] = values[0] || 0;
              break;
            default:
              categoryData[category] = values.reduce((sum, val) => sum + val, 0);
          }
        });

        return {
          labels: Object.keys(categoryData),
          datasets: [{
            label: config.valueField,
            data: Object.values(categoryData)
          }]
        };
      } else if (config.templateId === 'scatter-plot') {
        if (!config.xAxisField || !config.yAxisField) {
          return generateSampleData('scatter-plot');
        }

        const scatterData = sourceData.map(row => {
          const xField = config.xAxisField!;
          const yField = Array.isArray(config.yAxisField) ? config.yAxisField[0] : config.yAxisField;
          return {
            x: Number(row[xField]) || 0,
            y: Number(row[yField]) || 0
          };
        });

        const labels = sourceData.map((_, index) => `Point ${index + 1}`);

        return {
          labels,
          datasets: [{
            label: 'Data Points',
            data: scatterData
          }]
        };
      } else {
        if (!config.xAxisField || !config.yAxisField) {
          return generateSampleData(config.templateId || chart.type);
        }

        const xValues = [...new Set(sourceData.map(row => String(row[config.xAxisField!] || 'Unknown')))];

        if (config.seriesField && (config.templateId === 'stacked-bar' || config.templateId === 'multi-series-bar' || config.templateId === 'multi-line')) {
          const seriesValues = [...new Set(sourceData.map(row => String(row[config.seriesField!] || 'Default')))];
          const datasets = seriesValues.map(series => {
            const seriesData = xValues.map(xValue => {
              const matchingRows = sourceData.filter(row =>
                String(row[config.xAxisField!] || 'Unknown') === xValue &&
                String(row[config.seriesField!] || 'Default') === series
              );

              if (matchingRows.length > 0) {
                const yField = Array.isArray(config.yAxisField) ? config.yAxisField[0] : config.yAxisField;
                const values = matchingRows.map(row => Number(row[yField!]) || 0);

                switch (config.aggregation) {
                  case 'sum':
                    return values.reduce((sum, val) => sum + val, 0);
                  case 'average':
                    return values.reduce((sum, val) => sum + val, 0) / values.length;
                  case 'count':
                    return values.length;
                  case 'min':
                    return Math.min(...values);
                  case 'max':
                    return Math.max(...values);
                  case 'none':
                    return values[0] || 0;
                  default:
                    return values.reduce((sum, val) => sum + val, 0);
                }
              }
              return 0;
            });

            return {
              label: series,
              data: seriesData
            };
          });

          return {
            labels: xValues,
            datasets
          };
        } else {
          const groupedData: Record<string, number[]> = {};
          sourceData.forEach(row => {
            const xValue = String(row[config.xAxisField!] || 'Unknown');
            const yValue = Number(row[config.yAxisField as string]) || 0;

            if (!groupedData[xValue]) groupedData[xValue] = [];
            groupedData[xValue].push(yValue);
          });

          const labels = Object.keys(groupedData);
          const data = labels.map(label => {
            const values = groupedData[label];

            switch (config.aggregation) {
              case 'sum':
                return values.reduce((sum, val) => sum + val, 0);
              case 'average':
                return values.reduce((sum, val) => sum + val, 0) / values.length;
              case 'count':
                return values.length;
              case 'min':
                return Math.min(...values);
              case 'max':
                return Math.max(...values);
              case 'none':
                return values[0] || 0;
              default:
                return values.reduce((sum, val) => sum + val, 0);
            }
          });

          return {
            labels,
            datasets: [{
              label: config.yAxisField as string,
              data
            }]
          };
        }
      }
    } catch (error) {
      console.error('Error generating chart data:', error);
      return generateSampleData(config.templateId || chart.type);
    }
  };

  const getChartDimensions = (templateId: string) => {
    const standardHeight = 350;

    switch (templateId) {
      case 'simple-bar':
      case 'multi-series-bar':
      case 'stacked-bar':
        return { width: 850, height: standardHeight };
      case 'simple-line':
      case 'multi-line':
        return { width: 800, height: standardHeight };
      case 'area-chart':
        return { width: 800, height: standardHeight };
      case 'pie-chart':
        return { width: 450, height: standardHeight };
      case 'scatter-plot':
        return { width: 600, height: standardHeight };
      default:
        return { width: 650, height: standardHeight };
    }
  };

  const generateSampleData = (chartType: string): ChartData => {
    switch (chartType) {
      case 'pie-chart':
      case 'pie':
        return {
          labels: ['Product A', 'Product B', 'Product C', 'Product D'],
          datasets: [{
            label: 'Sales',
            data: [35, 25, 20, 20]
          }]
        };
      case 'simple-line':
      case 'area-chart':
      case 'line':
        return {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          datasets: [{
            label: 'Revenue',
            data: [12, 19, 15, 25, 22, 30]
          }]
        };
      case 'scatter-plot':
      case 'scatter':
        return {
          labels: ['Point 1', 'Point 2', 'Point 3', 'Point 4', 'Point 5', 'Point 6'],
          datasets: [{
            label: 'Data Points',
            data: [
              { x: 10, y: 15 },
              { x: 25, y: 28 },
              { x: 18, y: 12 },
              { x: 35, y: 32 },
              { x: 22, y: 20 },
              { x: 30, y: 25 }
            ]
          }]
        };
      case 'stacked-bar':
      case 'multi-series-bar':
      case 'multi-line':
        return {
          labels: ['Q1', 'Q2', 'Q3', 'Q4'],
          datasets: [
            {
              label: 'Series A',
              data: [20, 25, 30, 22]
            },
            {
              label: 'Series B',
              data: [15, 18, 12, 25]
            },
            {
              label: 'Series C',
              data: [10, 12, 18, 15]
            }
          ]
        };
      case 'simple-bar':
      case 'bar':
      default:
        return {
          labels: ['Category 1', 'Category 2', 'Category 3', 'Category 4'],
          datasets: [{
            label: 'Value',
            data: [45, 32, 28, 38]
          }]
        };
    }
  };

  const renderCharts = () => {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          padding: '16px 24px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
              Create New Chart
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
              Build interactive charts from your data
            </p>
          </div>
          <button
            onClick={() => setSelectedChart({
              id: `chart-${Date.now()}`,
              name: 'New Chart',
              type: 'bar',
              config: {},
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            })}
            style={{
              padding: '12px 20px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
          >
            📊 Create Chart
          </button>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>Your Charts</h2>
          </div>

          {projectData.charts.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '64px 24px',
              color: '#6b7280',
              background: 'white',
              borderRadius: '12px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '500' }}>
                No Charts Yet
              </h3>
              <p style={{ margin: 0 }}>
                Create your first chart using the form on the left
              </p>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '24px',
              justifyContent: 'flex-start'
            }}>
              {projectData.charts.map(chart => {
                const config = chart.config as ChartConfiguration;
                const chartData = generateChartData(chart);
                const dimensions = getChartDimensions(config.templateId || chart.type);

                return (
                  <div key={chart.id} style={{
                    background: 'white',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    overflow: 'visible',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                    width: `${dimensions.width + 280 + 32}px`, // Chart width + filter width + gap
                    margin: '0 auto'
                  }}>
                    <div style={{
                      padding: '16px',
                      borderBottom: '1px solid #e5e7eb',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      width: 'auto',
                      boxSizing: 'border-box'
                    }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>
                          {chart.name}
                        </h4>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                          <span style={{
                            fontSize: '12px',
                            color: '#6b7280',
                            background: '#f3f4f6',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            textTransform: 'capitalize'
                          }}>
                            {chart.type.replace('-', ' ')}
                          </span>
                          <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                            {new Date(chart.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => setSelectedChart(chart)}
                          style={{
                            padding: '4px 8px',
                            background: '#f3f4f6',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleChartDelete(chart.id)}
                          style={{
                            padding: '4px 8px',
                            background: '#fef2f2',
                            color: '#dc2626',
                            border: '1px solid #fecaca',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div style={{
                      padding: '16px',
                      display: 'flex',
                      gap: '16px',
                      alignItems: 'flex-start'
                    }}>
                      <div style={{
                        minWidth: '280px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}>
                        <DateRangeFilter
                          dateRanges={projectData.dateRanges || []}
                          selectedRangeId={selectedDateRange}
                          onRangeSelect={setSelectedDateRange}
                        />

                        <ChartSlicerControls
                          chart={chart}
                          projectData={projectData}
                          onProjectDataChange={onProjectUpdate}
                        />
                      </div>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {chartData ? (
                          <ChartRenderer
                            config={config}
                            data={chartData}
                            width={dimensions.width}
                            height={dimensions.height}
                          />
                        ) : (
                          <div style={{
                            height: `${dimensions.height}px`,
                            width: `${dimensions.width}px`,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                            border: '2px dashed #cbd5e1',
                            borderRadius: '12px',
                            position: 'relative',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              backgroundImage: `
                                radial-gradient(circle at 25% 25%, #e2e8f0 2px, transparent 2px),
                                radial-gradient(circle at 75% 75%, #e2e8f0 2px, transparent 2px)
                              `,
                              backgroundSize: '40px 40px',
                              opacity: 0.3,
                              zIndex: 1
                            }} />

                            <div style={{
                              textAlign: 'center',
                              zIndex: 2,
                              maxWidth: '280px',
                              padding: '20px'
                            }}>
                              <div style={{
                                width: '64px',
                                height: '64px',
                                margin: '0 auto 16px',
                                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '24px',
                                boxShadow: '0 8px 25px rgba(99, 102, 241, 0.2)'
                              }}>
                                🔍
                              </div>

                              <h3 style={{
                                margin: '0 0 8px 0',
                                fontSize: '18px',
                                fontWeight: '600',
                                color: '#1e293b',
                                lineHeight: '1.3'
                              }}>
                                No Data Found
                              </h3>

                              <p style={{
                                margin: '0 0 16px 0',
                                fontSize: '14px',
                                color: '#64748b',
                                lineHeight: '1.5'
                              }}>
                                Your current filters are too restrictive and exclude all available data points.
                              </p>

                              <div style={{
                                background: 'rgba(255, 255, 255, 0.8)',
                                borderRadius: '8px',
                                padding: '12px',
                                border: '1px solid #e2e8f0'
                              }}>
                                <div style={{
                                  fontSize: '12px',
                                  fontWeight: '500',
                                  color: '#475569',
                                  marginBottom: '6px'
                                }}>
                                  💡 Try these solutions:
                                </div>
                                <ul style={{
                                  margin: 0,
                                  padding: '0 0 0 16px',
                                  fontSize: '11px',
                                  color: '#64748b',
                                  lineHeight: '1.4'
                                }}>
                                  <li style={{ marginBottom: '2px' }}>Adjust or remove some filters</li>
                                  <li style={{ marginBottom: '2px' }}>Expand date ranges</li>
                                  <li>Select more categories</li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const [editingTableName, setEditingTableName] = useState(false);
  const [tableName, setTableName] = useState(projectData.name || 'Dataset');

  const renderData = () => {
    const handleTableNameSave = () => {
      const updatedData = {
        ...projectData,
        name: tableName
      };
      onProjectUpdate(updatedData);
      setEditingTableName(false);
    };

    const handleDeleteData = () => {
      if (confirm('Are you sure you want to delete all data? This will also delete all charts that depend on this data.')) {
        const updatedData = {
          ...projectData,
          data: [],
          columns: [],
          charts: []
        };
        onProjectUpdate(updatedData);
      }
    };

    return (
      <div style={{ padding: '24px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>Data</h2>
          <button
            onClick={() => setShowDataImport(true)}
            style={{
              padding: '8px 16px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            + Import Data
          </button>
        </div>

        {/* Date Range Management Section */}
        <div style={{ marginBottom: '24px' }}>
          <DateRangeManager
            dateRanges={projectData.dateRanges || []}
            onDateRangeAdd={handleDateRangeAdd}
            onDateRangeUpdate={handleDateRangeUpdate}
            onDateRangeDelete={handleDateRangeDelete}
          />
        </div>

        {projectData.data.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '64px 24px',
            color: '#6b7280'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '500' }}>
              No Data Imported
            </h3>
            <p style={{ margin: '0 0 24px 0' }}>
              Import your first dataset to start creating charts
            </p>
            <button
              onClick={() => setShowDataImport(true)}
              style={{
                padding: '12px 24px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Import Data
            </button>
          </div>
        ) : (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            overflow: 'hidden'
          }}>
                <div style={{
                  padding: '16px',
                  borderBottom: '1px solid #e5e7eb',
                  background: '#f9fafb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {editingTableName ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="text"
                          value={tableName}
                          onChange={(e) => setTableName(e.target.value)}
                          style={{
                            padding: '4px 8px',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            fontSize: '16px',
                            fontWeight: '500'
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleTableNameSave();
                            if (e.key === 'Escape') {
                              setTableName(projectData.name || 'Dataset');
                              setEditingTableName(false);
                            }
                          }}
                          autoFocus
                        />
                        <button
                          onClick={handleTableNameSave}
                          style={{
                            padding: '4px 8px',
                            background: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setTableName(projectData.name || 'Dataset');
                            setEditingTableName(false);
                          }}
                          style={{
                            padding: '4px 8px',
                            background: '#6b7280',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>
                          {tableName} ({projectData.data.length.toLocaleString()} rows)
                        </h3>
                        <button
                          onClick={() => setEditingTableName(true)}
                          style={{
                            padding: '2px 6px',
                            background: 'transparent',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            color: '#6b7280'
                          }}
                        >
                          ✏️ Rename
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleDeleteData}
                    style={{
                      padding: '6px 12px',
                      background: '#fef2f2',
                      color: '#dc2626',
                      border: '1px solid #fecaca',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}
                  >
                    🗑️ Delete Data
                  </button>
                </div>
                <div style={{ padding: '16px', overflowX: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '14px'
                  }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                        {projectData.columns.map(column => (
                          <th key={column.name} style={{
                            textAlign: 'left',
                            padding: '8px 12px',
                            fontWeight: '500',
                            color: '#374151'
                          }}>
                            {column.name}
                            <span style={{ color: '#6b7280', fontSize: '12px', marginLeft: '4px' }}>
                              ({column.type})
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {projectData.data.slice(0, 10).map((row, index) => (
                        <tr key={index} style={{
                          borderBottom: '1px solid #f3f4f6'
                        }}>
                          {projectData.columns.map(column => (
                            <td key={column.name} style={{
                              padding: '8px 12px',
                              color: '#374151'
                            }}>
                              {String(row[column.name] || '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {projectData.data.length > 10 && (
                    <div style={{
                      textAlign: 'center',
                      padding: '16px',
                      color: '#6b7280',
                      fontSize: '14px'
                    }}>
                      Showing first 10 rows of {projectData.data.length.toLocaleString()} total rows
                    </div>
                  )}
                </div>
              </div>
          </div>
        )}
      </div>
    );
  };

  if (selectedChart) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}>
          <ChartBuilder
            chart={selectedChart}
            projectData={projectData}
            onSave={handleChartSave}
            onCancel={() => setSelectedChart(null)}
          />
        </div>
      </div>
    );
  }

  if (selectedDashboard) {
    return (
      <DashboardBuilder
        dashboard={selectedDashboard}
        projectData={projectData}
        onSave={handleDashboardSave}
        onCancel={() => setSelectedDashboard(null)}
      />
    );
  }

  if (showDataImport) {
    return (
      <DataImport
        onImport={handleDataImport}
        onCancel={() => setShowDataImport(false)}
      />
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <div style={{
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '0 24px'
      }}>
        <div style={{
          display: 'flex',
          gap: '24px'
        }}>
          {[
            { id: 'data', label: 'Data Import', icon: '📁' },
            { id: 'charts', label: 'Chart Creation', icon: '📊' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '16px 0',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                color: activeTab === tab.id ? '#3b82f6' : '#6b7280',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'charts' && renderCharts()}
      {activeTab === 'data' && renderData()}
    </div>
  );
};

export default SimpleDashboard;