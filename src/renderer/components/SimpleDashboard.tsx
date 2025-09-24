import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Project, ProjectData, Chart, Dashboard, Settings, DateRange } from '../types';
import { ChartConfiguration, ChartData } from '../types/charts';
import { safeNumber, roundToMaxDecimals } from '../utils/numberUtils';
import ChartBuilder from './charts/ChartBuilder';
import ChartRenderer from './charts/ChartRenderer';
import html2canvas from 'html2canvas';
import DataImport from './DataImport';
import ChartAnalysisModal from './ChartAnalysisModal';
import ChartSelectionModal from './export/ChartSelectionModal';
import ExportConfigurationModal from './export/ExportConfigurationModal';
import { ExportStage, ExportReportConfig } from './export/types';
import { applySlicersToData } from '../utils/slicerUtils';
import ChartSlicerControls from './ChartSlicerControls';
import DateRangeManager from './DateRangeManager';
import DateRangeFilter from './DateRangeFilter';
import { GeminiClient } from '../utils/geminiClient';

type ChartAnalysisEntry = {
  content: string;
  isGenerating: boolean;
  error?: string;
  generatedAt?: number;
};

// New nested structure: chartId -> filterFingerprint -> analysis
type ChartAnalysisMap = Record<string, Record<string, ChartAnalysisEntry>>;


interface SimpleDashboardProps {
  project: Project;
  projectData: ProjectData;
  onProjectUpdate: (projectData: ProjectData) => void;
  onBack: () => void;
  settings?: Settings;
}

const SimpleDashboard: React.FC<SimpleDashboardProps> = ({
  project,
  projectData,
  onProjectUpdate,
  onBack,
  settings
}) => {
  const [activeTab, setActiveTab] = useState<'charts' | 'data'>('data');
  const [selectedChart, setSelectedChart] = useState<Chart | null>(null);
  const [showDataImport, setShowDataImport] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState<string | null>(null);
  const [selectedDateRanges, setSelectedDateRanges] = useState<string[]>([]);
  const analysisStorageKey = useMemo(() => `chart-analyses-${project?.id ?? 'default'}`, [project?.id]);
  const [chartAnalyses, setChartAnalyses] = useState<ChartAnalysisMap>({});
  const [hasRestoredAnalyses, setHasRestoredAnalyses] = useState(false);
  const [editingTableName, setEditingTableName] = useState(false);
  const [tableName, setTableName] = useState(projectData.name || 'Dataset');
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );
  const [showDateRangeManager, setShowDateRangeManager] = useState(false);
  const chartCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const chartContentRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const chartVisualizationRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const chartThumbnailCache = useRef<Record<string, { dataUrl: string; capturedAt: number }>>({});
  const [chartThumbnails, setChartThumbnails] = useState<Record<string, { dataUrl: string; capturedAt: number }>>({});
  const [showExportFlow, setShowExportFlow] = useState(false);
  const [exportStage, setExportStage] = useState<ExportStage>('selection');
  const [selectedExportChartIds, setSelectedExportChartIds] = useState<string[]>([]);
  const chartsWithAnalysisSet = useMemo(() => {
    const set = new Set<string>();
    Object.entries(chartAnalyses).forEach(([chartId, analysisMap]) => {
      if (!analysisMap) {
        return;
      }
      const hasContent = Object.values(analysisMap).some(entry => entry?.content);
      if (hasContent) {
        set.add(chartId);
      }
    });
    return set;
  }, [chartAnalyses]);
  const [exportConfig, setExportConfig] = useState<ExportReportConfig>(() => ({
    reportTitle: `${project.name} Analytics Report`,
    description: 'Analysis and insights for your charts',
    reportDate: new Date().toISOString().split('T')[0],
    includeCharts: true,
    includeAnalysis: false,
    analysisSummary: 'No chart analysis is available yet',
    orientation: 'portrait',
    pageSize: 'A4',
    companyName: 'Your Company',
    logoFile: null,
    logoDataUrl: null,
    logoFileName: null,
    primaryColor: '#3b82f6',
    headerText: 'Data Analysis Report',
    footerText: 'Confidential'
  }));
  const [isCapturingExportAssets, setIsCapturingExportAssets] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const selectedExportCharts = useMemo(() => {
    const selectedSet = new Set(selectedExportChartIds);
    return projectData.charts.filter(chart => selectedSet.has(chart.id));
  }, [projectData.charts, selectedExportChartIds]);
  const selectedChartThumbnailsMap = useMemo(() => {
    return selectedExportChartIds.reduce((acc, chartId) => {
      const thumbnail = chartThumbnails[chartId];
      if (thumbnail) {
        acc[chartId] = thumbnail;
      }
      return acc;
    }, {} as Record<string, { dataUrl: string; capturedAt: number }>);
  }, [selectedExportChartIds, chartThumbnails]);
  const analysisAvailableCount = useMemo(() => {
    return selectedExportChartIds.reduce((count, chartId) => (
      chartsWithAnalysisSet.has(chartId) ? count + 1 : count
    ), 0);
  }, [selectedExportChartIds, chartsWithAnalysisSet]);
  const captureChartThumbnail = useCallback(
    async (
      chartId: string,
      options: { force?: boolean; scale?: number } = {}
    ): Promise<string | null> => {
      const { force = false, scale = 2 } = options;

      if (!force && chartThumbnailCache.current[chartId]) {
        return chartThumbnailCache.current[chartId].dataUrl;
      }

      const element = chartVisualizationRefs.current[chartId] || chartContentRefs.current[chartId] || chartCardRefs.current[chartId];
      if (!element) {
        return null;
      }

      try {
        const canvas = await html2canvas(element, {
          backgroundColor: '#ffffff',
          scale,
          useCORS: true,
          windowWidth: element.scrollWidth,
          windowHeight: element.scrollHeight,
          logging: false
        });
        const dataUrl = canvas.toDataURL('image/png');
        const thumbnail = { dataUrl, capturedAt: Date.now() };
        chartThumbnailCache.current[chartId] = thumbnail;
        setChartThumbnails(prev => ({
          ...prev,
          [chartId]: thumbnail
        }));
        return dataUrl;
      } catch (error) {
        console.error('Failed to capture chart screenshot', error);
        return null;
      }
    },
    []
  );

  const captureChartThumbnails = useCallback(
    async (
      chartIds: string[],
      options: { force?: boolean; scale?: number } = {}
    ): Promise<Record<string, string>> => {
      const results = await Promise.all(
        chartIds.map(async chartId => ({
          chartId,
          dataUrl: await captureChartThumbnail(chartId, options)
        }))
      );

      return results.reduce((acc, result) => {
        if (result.dataUrl) {
          acc[result.chartId] = result.dataUrl;
        }
        return acc;
      }, {} as Record<string, string>);
    },
    [captureChartThumbnail]
  );

  // Modal analysis states
  const [modalChart, setModalChart] = useState<Chart | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [modalChartData, setModalChartData] = useState<ChartData | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setHasRestoredAnalyses(true);
      return;
    }

    try {
      const stored = window.localStorage.getItem(analysisStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored);

        // Handle both old and new storage formats for backward compatibility
        const restored: any = {};

        Object.entries(parsed).forEach(([chartId, value]: [string, any]) => {
          if (value && typeof value === 'object') {
            // Check if this is the new nested format (fingerprint -> analysis)
            if (value.content && typeof value.content === 'string') {
              // Old format: direct analysis object
              // Convert to new format with a default fingerprint
              restored[chartId] = {
                'legacy': {
                  content: value.content,
                  error: value.error,
                  isGenerating: false,
                  generatedAt: Date.now()
                }
              };
            } else {
              // New format: fingerprint -> analysis mapping
              const chartData: any = {};
              Object.entries(value).forEach(([fingerprint, analysis]: [string, any]) => {
                if (analysis && analysis.content) {
                  chartData[fingerprint] = {
                    content: analysis.content,
                    error: analysis.error,
                    isGenerating: false,
                    generatedAt: analysis.generatedAt || Date.now()
                  };
                }
              });
              if (Object.keys(chartData).length > 0) {
                restored[chartId] = chartData;
              }
            }
          }
        });

        setChartAnalyses(restored);
      } else {
        setChartAnalyses(prev => (Object.keys(prev).length === 0 ? prev : {}));
      }
    } catch (error) {
      console.warn('Failed to restore chart analyses from storage', error);
      setChartAnalyses(prev => (Object.keys(prev).length === 0 ? prev : {}));
    } finally {
      setHasRestoredAnalyses(true);
    }
  }, [analysisStorageKey]);

  useEffect(() => {
    if (!hasRestoredAnalyses || typeof window === 'undefined') {
      return;
    }

    try {
      const persistable = Object.entries(chartAnalyses).reduce((acc, [chartId, chartData]) => {
        if (!chartData || typeof chartData !== 'object') {
          return acc;
        }

        // Filter out analyses with no content and include filter fingerprint
        const validAnalyses = Object.entries(chartData).reduce((chartAcc, [fingerprint, analysis]) => {
          if (analysis?.content?.trim()) {
            chartAcc[fingerprint] = {
              content: analysis.content,
              generatedAt: analysis.generatedAt,
              ...(analysis.error ? { error: analysis.error } : {})
            };
          }
          return chartAcc;
        }, {} as Record<string, { content: string; generatedAt?: number; error?: string }>);

        if (Object.keys(validAnalyses).length > 0) {
          acc[chartId] = validAnalyses;
        }
        return acc;
      }, {} as Record<string, Record<string, { content: string; generatedAt?: number; error?: string }>>);

      window.localStorage.setItem(analysisStorageKey, JSON.stringify(persistable));
    } catch (error) {
      console.warn('Failed to persist chart analyses to storage', error);
    }
  }, [chartAnalyses, analysisStorageKey, hasRestoredAnalyses]);

  // Monitor filter changes and clear invalid analyses
  useEffect(() => {
    clearInvalidAnalyses();
  }, [selectedDateRange, selectedDateRanges, projectData.charts]);

  useEffect(() => {
    setChartAnalyses(prev => {
      const validIds = new Set(projectData.charts.map(chart => chart.id));
      let changed = false;
      const next: ChartAnalysisMap = {};

      Object.entries(prev).forEach(([chartId, analysis]) => {
        if (validIds.has(chartId)) {
          next[chartId] = analysis;
        } else {
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [projectData.charts]);

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(typeof window !== 'undefined' ? window.innerWidth : 1200);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const minWidthForWideChart = (vw: number) => Math.max(640, Math.round(vw * 0.55));

  // Get optimized chart display configuration
  const getChartDisplayConfig = (chartType: string, templateId?: string, containerWidth: number = viewportWidth) => {
    const type = (templateId || chartType || '').toLowerCase();

    const isCompactChart = ['pie', 'donut', 'gauge', 'circle'].some(keyword => type.includes(keyword));

    const columns = containerWidth >= 880 ? 2 : 1;
    const horizontalPadding = 48; // combined page padding and gutter
    const gap = 20;
    const availableWidth = containerWidth - horizontalPadding - gap * (columns - 1);
    const targetCardWidth = Math.floor(availableWidth / Math.max(columns, 1));
    const fullRowWidth = columns > 1 ? availableWidth : targetCardWidth;

    const builderPreviewWidth = Math.min(
      Math.max((viewportWidth * 0.6) - 40, 320),
      viewportWidth - 200
    );

    // Use same width for all charts, but different heights
    const previewWidth = Math.min(Math.max(builderPreviewWidth, minWidthForWideChart(viewportWidth)), fullRowWidth - 40);

    const chartWidth = Math.round(previewWidth);
    // ALL charts in Your Charts section use same 16:9 aspect ratio
    const baseHeight = Math.max(Math.round(chartWidth * 9 / 16), 480);
    const chartHeight = baseHeight;
    const cardMinHeight = chartHeight + 130;
    const cardWidth = chartWidth + 120; // Increased significantly to accommodate 3 multi-select filters + gear icon

    return {
      isCompact: isCompactChart,
      cardWidth,
      chartWidth,
      chartHeight,
      cardMinHeight
    };
  };

  // Generate filter fingerprint for analysis accuracy
  const generateFilterFingerprint = (chart: Chart) => {
    const appliedSlicerIds = chart.config.appliedSlicers || [];
    const appliedSlicers = projectData.slicers.filter(s => appliedSlicerIds.includes(s.id));

    const filterState = {
      dateRange: selectedDateRange,
      dateRanges: selectedDateRanges,
      // Only include slicers that actually filter data (have specific values selected)
      slicers: appliedSlicers
        .filter(slicer => slicer.selectedValues && slicer.selectedValues.length > 0)
        .map(slicer => ({
          id: slicer.id,
          column: slicer.column,
          selectedValues: slicer.selectedValues.sort() // Sort for consistent ordering
        }))
    };
    return btoa(JSON.stringify(filterState)).replace(/[+/=]/g, ''); // Simple hash
  };

  // Helper function to get current analysis for a chart
  const getCurrentAnalysis = (chart: Chart) => {
    const chartData = chartAnalyses[chart.id];
    if (!chartData) return null;

    const currentFingerprint = generateFilterFingerprint(chart);
    return chartData[currentFingerprint] || null;
  };

  // Check if stored analysis is valid for current filters
  const isAnalysisValid = (chart: Chart) => {
    const analysis = getCurrentAnalysis(chart);
    return !!(analysis?.content);
  };

  // Check if analysis is currently being generated
  const isAnalysisGenerating = (chart: Chart) => {
    const analysis = getCurrentAnalysis(chart);
    return !!(analysis?.isGenerating);
  };

  // Check if there's any analysis for this chart (regardless of filters)
  const hasAnyAnalysis = (chart: Chart) => {
    const chartData = chartAnalyses[chart.id];
    if (!chartData) return false;

    return Object.values(chartData).some(analysis => analysis?.content);
  };

  const selectedChartAnalyses = useMemo(() => {
    const map: Record<string, string> = {};
    selectedExportCharts.forEach(chart => {
      const analysis = getCurrentAnalysis(chart);
      if (analysis?.content) {
        map[chart.id] = analysis.content;
      }
    });
    return map;
  }, [selectedExportCharts, chartAnalyses, getCurrentAnalysis]);

  // Clear analysis when filters change - No longer needed since we persist all filter combinations
  const clearInvalidAnalyses = () => {
    // This function is kept for backward compatibility but no longer clears analyses
    // All filter combinations are now persisted
  };

  const handleDateRangeAdd = (dateRange: DateRange) => {
    const existingRanges = projectData.dateRanges || [];
    const updatedRanges = [...existingRanges, dateRange];
    onProjectUpdate({
      ...projectData,
      dateRanges: updatedRanges
    });
  };

  const handleDateRangeUpdate = (dateRange: DateRange) => {
    const existingRanges = projectData.dateRanges || [];
    const updatedRanges = existingRanges.map(range =>
      range.id === dateRange.id ? dateRange : range
    );
    onProjectUpdate({
      ...projectData,
      dateRanges: updatedRanges
    });
  };

  const handleDateRangeDelete = (id: string) => {
    const existingRanges = projectData.dateRanges || [];
    const updatedRanges = existingRanges.filter(range => range.id !== id);
    onProjectUpdate({
      ...projectData,
      dateRanges: updatedRanges
    });
    setSelectedDateRanges(prev => prev.filter(rangeId => rangeId !== id));
    if (selectedDateRange === id) {
      setSelectedDateRange(null);
    }
  };

  const handleDateRangeMultiSelect = (rangeIds: string[]) => {
    setSelectedDateRanges(rangeIds);
    if (rangeIds.length === 0) {
      setSelectedDateRange(null);
    } else if (!rangeIds.includes(selectedDateRange || '')) {
      setSelectedDateRange(rangeIds[0]);
    }
  };

  const generateChartData = (chart: Chart): ChartData | null => {
    const config = chart.config;
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

    const aggregateValues = (
      values: number[],
      aggregation: ChartConfiguration['aggregation'] = config.aggregation
    ): number => {
      if (!values || values.length === 0) {
        return 0;
      }

      const method = aggregation || 'sum';
      switch (method) {
        case 'sum':
          return roundToMaxDecimals(values.reduce((sum, val) => sum + val, 0));
        case 'average':
          return roundToMaxDecimals(values.reduce((sum, val) => sum + val, 0) / values.length);
        case 'count':
          return values.length;
        case 'min':
          return roundToMaxDecimals(Math.min(...values));
        case 'max':
          return roundToMaxDecimals(Math.max(...values));
        case 'none':
          return roundToMaxDecimals(values[0] ?? 0);
        default:
          return roundToMaxDecimals(values.reduce((sum, val) => sum + val, 0));
      }
    };

    try {
      if (config.templateId === 'pie-chart') {
        if (!config.categoryField || !config.valueField) {
          return generateSampleData('pie-chart');
        }

        const categoryMap = new Map<string, number[]>();
        sourceData.forEach(row => {
          const category = String(row[config.categoryField!] || 'Unknown');
          const value = safeNumber(row[config.valueField!]);

          if (!categoryMap.has(category)) {
            categoryMap.set(category, []);
          }
          categoryMap.get(category)!.push(value);
        });

        const categoryData: Record<string, number> = {};
        categoryMap.forEach((values, category) => {
          categoryData[category] = aggregateValues(values);
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
            x: safeNumber(row[xField]),
            y: safeNumber(row[yField])
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
                const values = matchingRows.map(row => safeNumber(row[yField!]));

                return aggregateValues(values);
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
            const yField = Array.isArray(config.yAxisField) ? config.yAxisField[0] : config.yAxisField;
            const yValue = safeNumber(row[yField]);

            if (!groupedData[xValue]) groupedData[xValue] = [];
            groupedData[xValue].push(yValue);
          });

          const labels = Object.keys(groupedData);
          const data = labels.map(label => {
            const values = groupedData[label];

            return aggregateValues(values);
          });

          return {
            labels,
            datasets: [{
              label: Array.isArray(config.yAxisField) ? config.yAxisField[0] : config.yAxisField,
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

  const applyDateRangeFilter = (data: any[]) => {
    const activeDateRanges = selectedDateRanges.length > 0 ? selectedDateRanges : (selectedDateRange ? [selectedDateRange] : []);

    if (activeDateRanges.length === 0 || !projectData.dateRanges) {
      return data;
    }

    const dateRangeObjects = activeDateRanges
      .map(rangeId => projectData.dateRanges.find(range => range.id === rangeId))
      .filter(Boolean);

    if (dateRangeObjects.length === 0) {
      return data;
    }

    return data.filter(row => {
      return dateRangeObjects.some(dateRange => {
        const startDate = new Date(dateRange.startDate);
        const endDate = new Date(dateRange.endDate);

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
    });
  };

  const handleDataImport = (data: any[], columns: any[], fileName?: string) => {
    const updatedData = {
      ...projectData,
      data,
      columns
    };
    onProjectUpdate(updatedData);
    setShowDataImport(false);
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

  const handleOpenExportFlow = () => {
    const chartIds = projectData.charts.map(chart => chart.id);
    setSelectedExportChartIds(chartIds);
    setExportStage('selection');
    setShowExportFlow(true);
    setExportError(null);
    setIsCapturingExportAssets(false);
  };

  const handleCloseExportFlow = () => {
    setShowExportFlow(false);
    setExportStage('selection');
    setIsCapturingExportAssets(false);
  };

  const handleToggleExportChart = (chartId: string) => {
    setSelectedExportChartIds(prev => (
      prev.includes(chartId)
        ? prev.filter(id => id !== chartId)
        : [...prev, chartId]
    ));
  };

  const handleExportSelectAll = () => {
    setSelectedExportChartIds(projectData.charts.map(chart => chart.id));
  };

  const handleExportClearAll = () => {
    setSelectedExportChartIds([]);
  };

  const handleExportSelectionContinue = async () => {
    if (selectedExportChartIds.length === 0) {
      return;
    }

    const totalSelected = selectedExportChartIds.length;
    const analysisSummary = `${analysisAvailableCount} of ${totalSelected} charts have analysis available`;

    setExportConfig(prev => {
      const defaultTitle = `${project.name} Analytics Report`;
      const defaultDescription = `Analysis and insights for ${totalSelected} chart${totalSelected === 1 ? '' : 's'}`;
      const shouldReplaceDescription =
        !prev.description ||
        prev.description === 'Analysis and insights for your charts' ||
        prev.description.startsWith('Analysis and insights for ');
      const shouldEnableAnalysisByDefault =
        analysisAvailableCount > 0 && prev.analysisSummary === 'No chart analysis is available yet';
      const nextIncludeAnalysis = analysisAvailableCount === 0
        ? false
        : shouldEnableAnalysisByDefault
          ? true
          : prev.includeAnalysis;

      return {
        ...prev,
        reportTitle: prev.reportTitle && prev.reportTitle.trim().length > 0 ? prev.reportTitle : defaultTitle,
        description: shouldReplaceDescription ? defaultDescription : prev.description,
        reportDate: prev.reportDate || new Date().toISOString().split('T')[0],
        includeAnalysis: nextIncludeAnalysis,
        analysisSummary
      };
    });

    setExportStage('config');
    setIsCapturingExportAssets(true);
    setExportError(null);

    try {
      await captureChartThumbnails(selectedExportChartIds, { force: false, scale: 2 });
    } catch (error) {
      console.error('Failed to prepare chart previews for export', error);
      setExportError('Failed to prepare some chart previews. Please ensure charts are visible and try again.');
    } finally {
      setIsCapturingExportAssets(false);
    }
  };

  useEffect(() => {
    setSelectedExportChartIds(prev =>
      prev.filter(id => projectData.charts.some(chart => chart.id === id))
    );
  }, [projectData.charts]);

  const handleExportConfigChange = (updates: Partial<ExportReportConfig>) => {
    setExportConfig(prev => ({
      ...prev,
      ...updates
    }));
  };

  const handleExportLogoUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        setExportConfig(prev => ({
          ...prev,
          logoFile: file,
          logoDataUrl: result,
          logoFileName: file.name
        }));
        setExportError(null);
      } else {
        setExportError('Unable to read the selected logo file.');
      }
    };
    reader.onerror = () => {
      console.error('Failed to read logo file');
      setExportError('Failed to load the selected logo. Please try a different file.');
    };
    reader.readAsDataURL(file);
  };

  const handleExportLogoClear = () => {
    setExportConfig(prev => ({
      ...prev,
      logoFile: null,
      logoDataUrl: null,
      logoFileName: null
    }));
  };

  const handleExportBackToSelection = () => {
    setExportStage('selection');
  };

  const handleExportGenerate = () => {
    const preparedCharts = selectedExportCharts.map(chart => ({
      id: chart.id,
      name: chart.name,
      thumbnail: selectedChartThumbnailsMap[chart.id]?.dataUrl || null,
      analysis: exportConfig.includeAnalysis ? selectedChartAnalyses[chart.id] || null : null
    }));

    console.log('Export report payload preview', {
      config: exportConfig,
      charts: preparedCharts
    });

    setExportError('Report generation is not yet implemented. Chart previews are ready for export.');
  };

  const handleGenerateAnalysis = async (chart: Chart) => {
    const chartData = generateChartData(chart);
    if (!chartData || !settings?.apiKeys?.gemini) {
      alert('Unable to generate analysis. Please ensure you have chart data and a valid Gemini API key configured in settings.');
      return;
    }

    const filterFingerprint = generateFilterFingerprint(chart);

    // Set generating state
    setChartAnalyses(prev => ({
      ...prev,
      [chart.id]: {
        ...prev[chart.id],
        [filterFingerprint]: {
          content: prev[chart.id]?.[filterFingerprint]?.content || '',
          isGenerating: true,
          error: undefined,
          generatedAt: undefined
        }
      }
    }));

    try {
      const geminiClient = new GeminiClient(settings.apiKeys.gemini);
      const analysis = await geminiClient.generateChartInsights(chartData, chart.config);

      setChartAnalyses(prev => ({
        ...prev,
        [chart.id]: {
          ...prev[chart.id],
          [filterFingerprint]: {
            content: analysis,
            isGenerating: false,
            error: undefined,
            generatedAt: Date.now()
          }
        }
      }));

      // Open modal with analysis
      setModalChart(chart);
      setModalChartData(chartData);
      setShowAnalysisModal(true);
    } catch (error) {
      console.error('Error generating analysis:', error);
      setChartAnalyses(prev => ({
        ...prev,
        [chart.id]: {
          ...prev[chart.id],
          [filterFingerprint]: {
            content: prev[chart.id]?.[filterFingerprint]?.content || '',
            isGenerating: false,
            error: error instanceof Error ? error.message : 'Failed to generate analysis',
            generatedAt: undefined
          }
        }
      }));
      alert('Failed to generate analysis. Please check your API key and try again.');
    }
  };

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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {editingTableName ? (
                <input
                  type="text"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  onBlur={handleTableNameSave}
                  onKeyPress={(e) => e.key === 'Enter' && handleTableNameSave()}
                  style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    border: '1px solid #3b82f6',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    outline: 'none'
                  }}
                  autoFocus
                />
              ) : (
                <h3
                  style={{
                    margin: 0,
                    fontSize: '18px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                  onClick={() => setEditingTableName(true)}
                >
                  {tableName}
                </h3>
              )}
              <button
                onClick={() => setEditingTableName(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#6b7280'
                }}
              >
                ✏️
              </button>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
              {projectData.data?.length || 0} rows × {projectData.columns?.length || 0} columns
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setShowDataImport(true)}
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
              📁 Import Data
            </button>
            <button
              onClick={handleDeleteData}
              style={{
                padding: '12px 20px',
                background: '#ef4444',
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
              onMouseEnter={(e) => e.currentTarget.style.background = '#dc2626'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#ef4444'}
            >
              Delete Table
            </button>
          </div>
        </div>

        {projectData.data?.length > 0 ? (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            overflow: 'hidden'
          }}>
            <div style={{
              maxHeight: '600px',
              overflow: 'auto',
              fontSize: '14px'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    {projectData.columns?.map((column) => (
                      <th
                        key={column.name}
                        style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontWeight: '600',
                          borderBottom: '1px solid #e5e7eb',
                          position: 'sticky',
                          top: 0,
                          background: '#f9fafb',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>{column.name}</span>
                          <span style={{
                            fontSize: '12px',
                            color: '#6b7280',
                            backgroundColor: '#e5e7eb',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}>
                            {column.type}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {projectData.data?.slice(0, 1000).map((row, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      {projectData.columns?.map((column) => (
                        <td
                          key={column.name}
                          style={{
                            padding: '12px 16px',
                            borderRight: '1px solid #f3f4f6',
                            maxWidth: '200px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {row[column.name]?.toString() || ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {projectData.data?.length > 1000 && (
              <div style={{
                padding: '16px',
                background: '#f9fafb',
                textAlign: 'center',
                fontSize: '14px',
                color: '#6b7280'
              }}>
                Showing first 1,000 rows of {projectData.data.length} total rows
              </div>
            )}
          </div>
        ) : (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            border: '2px dashed #d1d5db',
            padding: '48px 24px',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '16px'
            }}>📊</div>
            <h3 style={{
              margin: '0 0 8px 0',
              fontSize: '18px',
              fontWeight: '600',
              color: '#374151'
            }}>
              No Data Available
            </h3>
            <p style={{
              margin: '0 0 24px 0',
              fontSize: '14px',
              color: '#6b7280'
            }}>
              Import data to start creating charts and dashboards
            </p>
            <button
              onClick={() => setShowDataImport(true)}
              style={{
                padding: '12px 24px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
            >
              📁 Import Data
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderCharts = () => {
    return (
      <div style={{ padding: '12px' }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          padding: '12px 16px',
          marginBottom: '16px',
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
              config: {
                title: 'New Chart',
                colorScheme: 'blue',
                showLegend: false,
                showGrid: true,
                animation: true,
                legendVerticalPosition: 'top',
                legendHorizontalPosition: 'center'
              },
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', marginLeft: '12px' }}>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>Your Charts</h2>
            {projectData.charts.length > 0 && (
              <button
                onClick={handleOpenExportFlow}
                style={{
                  padding: '10px 18px',
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 12px 24px rgba(22, 163, 74, 0.25)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 16px 28px rgba(22, 163, 74, 0.32)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 12px 24px rgba(22, 163, 74, 0.25)';
                }}
              >
                <span role="img" aria-label="export report">📄</span>
                Export Report
              </button>
            )}
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
                Create your first chart using the form above
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gap: '20px',
              gridTemplateColumns: viewportWidth >= 880 ? 'repeat(2, minmax(0, 1fr))' : '1fr',
              width: '100%',
              gridAutoFlow: 'row dense'
            }}>
              {projectData.charts.map(chart => {
                const config = chart.config;
                const chartData = generateChartData(chart);
                const chartConfig = getChartDisplayConfig(chart.type, config.templateId, viewportWidth);
                const gridSpan = viewportWidth >= 880 ? 'span 2' : 'span 1';

                return (
                  <div
                    key={chart.id}
                    ref={el => {
                      if (el) {
                        chartCardRefs.current[chart.id] = el;
                      } else {
                        delete chartCardRefs.current[chart.id];
                      }
                    }}
                    style={{
                    background: '#ffffff',
                    borderRadius: '16px',
                    border: '2px solid #e2e8f0',
                    overflow: 'hidden',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)',
                    width: '100%',
                    maxWidth: `${chartConfig.cardWidth}px`,
                    height: `${chartConfig.cardMinHeight}px`,
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    gridColumn: gridSpan,
                    margin: '0 auto'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.12), 0 4px 10px rgba(0, 0, 0, 0.08)';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}>
                    {/* First Header Row: Title and Actions */}
                    <div style={{
                      padding: '10px 14px',
                      borderBottom: '1px solid #f1f5f9',
                      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px'
                    }}>
                      {/* Title Section */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flex: 1,
                        minWidth: 0
                      }}>
                        <h4 style={{
                          margin: 0,
                          fontSize: '16px',
                          fontWeight: '600',
                          color: '#1e293b',
                          letterSpacing: '-0.025em',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          minWidth: 0,
                          overflow: 'hidden'
                        }}>
                          <span style={{
                            fontSize: '10px',
                            color: '#6366f1',
                            background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
                            padding: '2px 6px',
                            borderRadius: '6px',
                            textTransform: 'uppercase',
                            fontWeight: '700',
                            border: '1px solid #c7d2fe',
                            letterSpacing: '0.05em',
                            flexShrink: 0
                          }}>
                            {chart.type.substring(0, 3).toUpperCase()}
                          </span>
                          <span style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {chart.name}
                          </span>
                        </h4>
                      </div>

                      {/* Actions Section */}
                      <div style={{
                        display: 'flex',
                        gap: '6px',
                        alignItems: 'center'
                      }}>
                        {/* Generate/Analysis Button */}
                        <button
                          onClick={() => {
                            if (isAnalysisValid(chart)) {
                              // Show existing analysis
                              setModalChart(chart);
                              setModalChartData(generateChartData(chart));
                              setShowAnalysisModal(true);
                            } else {
                              // Generate new analysis
                              handleGenerateAnalysis(chart);
                            }
                          }}
                          style={{
                            padding: '6px 12px',
                            background: (() => {
                              if (isAnalysisGenerating(chart)) {
                                return 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)';
                              } else if (isAnalysisValid(chart)) {
                                return 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)';
                              } else if (hasAnyAnalysis(chart) && !isAnalysisValid(chart)) {
                                return 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
                              } else {
                                return 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
                              }
                            })(),
                            color: 'white',
                            border: 'none',
                            borderRadius: 6,
                            cursor: isAnalysisGenerating(chart) ? 'not-allowed' : 'pointer',
                            fontSize: '12px',
                            fontWeight: '500',
                            transition: 'all 0.2s ease',
                            opacity: isAnalysisGenerating(chart) ? 0.7 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                          disabled={isAnalysisGenerating(chart)}
                        >
                          {isAnalysisGenerating(chart) ? (
                            <>
                              <div style={{
                                width: '12px',
                                height: '12px',
                                border: '2px solid transparent',
                                borderTop: '2px solid white',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite'
                              }}></div>
                              Generating...
                            </>
                          ) : isAnalysisValid(chart) ? (
                            'Analysis'
                          ) : hasAnyAnalysis(chart) ? (
                            'Generate (Filters Changed)'
                          ) : (
                            'Generate'
                          )}
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={() => setSelectedChart(chart)}
                          style={{
                            padding: '6px 12px',
                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          Edit
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleChartDelete(chart.id)}
                          style={{
                            padding: '6px 12px',
                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Second Header Row: Filters */}
                    <div style={{
                      padding: '8px 14px',
                      borderBottom: '1px solid #f1f5f9',
                      background: 'linear-gradient(135deg, rgba(248, 250, 252, 0.8) 0%, rgba(241, 245, 249, 0.8) 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      flexWrap: 'wrap'
                    }}>
                      {/* Date Filter */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        border: '1px solid #94a3ff',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, rgba(238, 242, 255, 0.85) 0%, rgba(224, 231, 255, 0.95) 100%)',
                        padding: '6px 12px',
                        boxShadow: 'inset 0 1px 2px rgba(99,102,241,0.12)'
                      }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#1f2937' }}>📅 Date</span>
                        <DateRangeFilter
                          dateRanges={projectData.dateRanges || []}
                          selectedRangeId={selectedDateRange}
                          onRangeSelect={(rangeId) => {
                            setSelectedDateRange(rangeId);
                            setSelectedDateRanges(rangeId ? [rangeId] : []);
                          }}
                          selectedRangeIds={selectedDateRanges}
                          onRangeMultiSelect={handleDateRangeMultiSelect}
                          onDateRangeAdd={handleDateRangeAdd}
                          onDateRangeUpdate={handleDateRangeUpdate}
                          onDateRangeDelete={handleDateRangeDelete}
                          onManage={() => setShowDateRangeManager(true)}
                          compact
                        />
                      </div>

                      {/* Normal Filters */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        border: '1px solid #94a3ff',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, rgba(238, 242, 255, 0.85) 0%, rgba(224, 231, 255, 0.95) 100%)',
                        padding: '6px 12px',
                        boxShadow: 'inset 0 1px 2px rgba(99,102,241,0.12)',
                        flex: 1,
                        minWidth: 0
                      }}>
                        <span style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#1f2937',
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <span role="img" aria-label="filters">🔍</span> Filters
                        </span>
                        <ChartSlicerControls
                          chart={chart}
                          projectData={projectData}
                          onProjectDataChange={onProjectUpdate}
                          compact
                          compactShowLabel={false}
                        />
                      </div>
                    </div>

                    {/* Maximized Chart Content */}
                    <div style={{
                      padding: '6px 6px 2px 6px',
                      background: 'linear-gradient(135deg, #fefefe 0%, #f8fafc 100%)',
                      borderTop: '1px solid #e5e7eb',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      <div style={{
                        width: '100%',
                        height: `${chartConfig.chartHeight}px`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      ref={el => {
                        if (el) {
                          chartContentRefs.current[chart.id] = el;
                        } else {
                          delete chartContentRefs.current[chart.id];
                        }
                      }}
                      >
                          {chartData ? (
                            <ChartRenderer
                              ref={el => {
                                if (el) {
                                  chartVisualizationRefs.current[chart.id] = el;
                                } else {
                                  delete chartVisualizationRefs.current[chart.id];
                                }
                              }}
                              config={config}
                              data={chartData}
                              width={chartConfig.chartWidth}
                              height={chartConfig.chartHeight}
                              forceDisableAnimation
                            />
                        ) : (
                          <div style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                            border: '2px dashed #cbd5e1',
                            borderRadius: '8px'
                          }}>
                            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔍</div>
                            <div style={{ fontSize: '14px', color: '#64748b', textAlign: 'center' }}>No Data Found</div>
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

  const renderChartBuilder = () => (
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

      {selectedChart ? renderChartBuilder() : (
        <>
          {activeTab === 'charts' && renderCharts()}
          {activeTab === 'data' && renderData()}
        </>
      )}

      {showDateRangeManager && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15,23,42,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2100,
            padding: '24px'
          }}
          onClick={() => setShowDateRangeManager(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(720px, 100%)',
              maxHeight: '90vh',
              overflow: 'auto',
              background: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 24px 48px rgba(15, 23, 42, 0.25)',
              border: '1px solid #e2e8f0',
              padding: '24px'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#1f2937' }}>
                Manage Date Filters
              </h2>
              <button
                onClick={() => setShowDateRangeManager(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '18px',
                  color: '#6b7280'
                }}
              >
                ✕
              </button>
            </div>
            <DateRangeManager
              dateRanges={projectData.dateRanges || []}
              onDateRangeAdd={handleDateRangeAdd}
              onDateRangeUpdate={handleDateRangeUpdate}
              onDateRangeDelete={handleDateRangeDelete}
            />
          </div>
        </div>
      )}

      {showExportFlow && exportStage === 'selection' && (
        <ChartSelectionModal
          charts={projectData.charts}
          selectedChartIds={selectedExportChartIds}
          chartsWithAnalysis={chartsWithAnalysisSet}
          onToggleChart={handleToggleExportChart}
          onSelectAll={handleExportSelectAll}
          onClearAll={handleExportClearAll}
          onClose={handleCloseExportFlow}
          onContinue={handleExportSelectionContinue}
        />
      )}

      {showExportFlow && exportStage === 'config' && (
        <ExportConfigurationModal
          config={exportConfig}
          charts={selectedExportCharts}
          chartThumbnails={selectedChartThumbnailsMap}
          analysisContentByChart={selectedChartAnalyses}
          analysisAvailableCount={analysisAvailableCount}
          totalSelectedCount={selectedExportChartIds.length}
          isCapturingAssets={isCapturingExportAssets}
          exportError={exportError}
          onConfigChange={handleExportConfigChange}
          onLogoUpload={handleExportLogoUpload}
          onLogoClear={handleExportLogoClear}
          onBack={handleExportBackToSelection}
          onCancel={handleCloseExportFlow}
          onGenerate={handleExportGenerate}
        />
      )}

      {/* Analysis Modal */}
      {showAnalysisModal && modalChart && (
        <ChartAnalysisModal
          chart={modalChart}
          chartData={modalChartData}
          analysis={getCurrentAnalysis(modalChart)?.content || ''}
          isOpen={showAnalysisModal}
          onClose={() => {
            setShowAnalysisModal(false);
            setModalChart(null);
            setModalChartData(null);
          }}
          onRegenerate={() => handleGenerateAnalysis(modalChart)}
          isRegenerating={isAnalysisGenerating(modalChart)}
          appliedFilters={(() => {
            const appliedSlicerIds = modalChart.config.appliedSlicers || [];
            const appliedSlicers = projectData.slicers.filter(s => appliedSlicerIds.includes(s.id));
            return appliedSlicers
              .filter(slicer => slicer.selectedValues && slicer.selectedValues.length > 0) // Only filters that actually affect data
              .map(slicer => ({
                name: slicer.name,
                column: slicer.column,
                selectedValues: slicer.selectedValues
              }));
          })()}
        />
      )}
    </div>
  );
};

export default SimpleDashboard;
