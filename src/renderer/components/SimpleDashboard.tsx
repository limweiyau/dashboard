import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Project, ProjectData, Chart, Dashboard, Settings, DateRange } from '../types';
import { ChartConfiguration, ChartData } from '../types/charts';
import { safeNumber, roundToMaxDecimals } from '../utils/numberUtils';
import ChartBuilder from './charts/ChartBuilder';
import ChartRenderer from './charts/ChartRenderer';
import html2canvas from 'html2canvas';
import DataImport from './DataImport';
import { processCSV, processExcel, processJSON } from '../utils/dataProcessor';
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

type StoredExportBranding = {
  companyName?: string;
  primaryColor?: string;
  logoDataUrl?: string | null;
  logoFileName?: string | null;
};


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
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');
  const [selectedDateRange, setSelectedDateRange] = useState<string | null>(null);
  const [selectedDateRanges, setSelectedDateRanges] = useState<string[]>([]);
  const analysisStorageKey = useMemo(() => `chart-analyses-${project?.id ?? 'default'}`, [project?.id]);
  const brandingStorageKey = useMemo(
    () => (project?.id ? `export-branding-${project.id}` : 'export-branding-default'),
    [project?.id]
  );

  const readStoredBranding = useCallback((): StoredExportBranding | null => {
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      const raw = window.localStorage.getItem(brandingStorageKey);
      return raw ? (JSON.parse(raw) as StoredExportBranding) : null;
    } catch (error) {
      console.error('Failed to read export branding from storage', error);
      return null;
    }
  }, [brandingStorageKey]);

  const persistBranding = useCallback((branding: StoredExportBranding) => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage.setItem(brandingStorageKey, JSON.stringify(branding));
    } catch (error) {
      console.error('Failed to persist export branding', error);
    }
  }, [brandingStorageKey]);

  const [chartAnalyses, setChartAnalyses] = useState<ChartAnalysisMap>({});
  const [hasRestoredAnalyses, setHasRestoredAnalyses] = useState(false);
  const [editingTableName, setEditingTableName] = useState(false);
  const [tableName, setTableName] = useState(projectData.name || (projectData.data?.length > 0 ? 'Dataset' : ''));
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
  const [exportConfig, setExportConfig] = useState<ExportReportConfig>(() => {
    const storedBranding = readStoredBranding();

    return {
      reportTitle: 'Title',
      description: '',
      reportDate: new Date().toISOString().split('T')[0],
      includeCharts: true,
      includeAnalysis: false,
      includeAIAnalysis: true,
      includeAIInsights: true,
      analysisSummary: 'No chart analysis is available yet',
      orientation: 'portrait',
      pageSize: 'A4',
      companyName: storedBranding?.companyName ?? 'Your Company',
      logoFile: null,
      logoDataUrl: storedBranding?.logoDataUrl ?? null,
      logoFileName: storedBranding?.logoFileName ?? null,
      primaryColor: storedBranding?.primaryColor ?? '#3b82f6',
      headerText: 'Data Analysis Report',
      footerText: 'Confidential',
      confidentialStatus: 'Confidential'
    };
  });
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
  // Restore persisted branding settings when switching projects.
  useEffect(() => {
    const storedBranding = readStoredBranding();

    setExportConfig(prev => ({
      ...prev,
      companyName: storedBranding?.companyName ?? 'Your Company',
      primaryColor: storedBranding?.primaryColor ?? '#3b82f6',
      logoFile: null,
      logoDataUrl: storedBranding?.logoDataUrl ?? null,
      logoFileName: storedBranding?.logoFileName ?? null
    }));
  }, [readStoredBranding]);

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

    // For ultrawide screens (>2400px), use flexbox with max 2 charts per row
    const isUltrawide = containerWidth > 2400;
    const columns = containerWidth >= 880 ? 2 : 1;
    const horizontalPadding = 48; // combined page padding and gutter
    const gap = isUltrawide ? 40 : 20; // Increased gap for ultrawide screens

    let availableWidth, targetCardWidth, fullRowWidth;

    if (isUltrawide) {
      // For ultrawide, calculate based on max 2 charts with their max widths
      const maxChartWidth = 1200;
      const maxCardWidth = maxChartWidth + 120; // chart width + padding
      availableWidth = Math.min(containerWidth - horizontalPadding, (maxCardWidth * 2) + gap);
      targetCardWidth = Math.floor((availableWidth - gap) / 2);
      fullRowWidth = availableWidth;
    } else {
      availableWidth = containerWidth - horizontalPadding - gap * (columns - 1);
      targetCardWidth = Math.floor(availableWidth / Math.max(columns, 1));
      fullRowWidth = columns > 1 ? availableWidth : targetCardWidth;
    }

    const builderPreviewWidth = Math.min(
      Math.max((viewportWidth * 0.6) - 40, 320),
      viewportWidth - 200
    );

    // Use same width for all charts, but different heights with maximum constraints
    const maxChartWidth = 1200; // Maximum chart width
    const maxChartHeight = 800; // Maximum chart height for 16:9 ratio (1200 * 9/16 = 675, but allow some extra)

    let proposedWidth = Math.min(Math.max(builderPreviewWidth, minWidthForWideChart(viewportWidth)), fullRowWidth - 40);
    let proposedHeight = Math.max(Math.round(proposedWidth * 9 / 16), 480);

    // Apply maximum constraints while maintaining 16:9 aspect ratio
    if (proposedWidth > maxChartWidth) {
      proposedWidth = maxChartWidth;
      proposedHeight = Math.round(proposedWidth * 9 / 16);
    }

    if (proposedHeight > maxChartHeight) {
      proposedHeight = maxChartHeight;
      proposedWidth = Math.round(proposedHeight * 16 / 9);
    }

    const chartWidth = Math.round(proposedWidth);
    const chartHeight = proposedHeight;
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
    const chartTableId = chart.config.tableId || 'main';
    const appliedSlicerIds = chart.config.appliedSlicers || [];
    const appliedSlicers = projectData.slicers.filter(s => appliedSlicerIds.includes(s.id));

    const filterState = {
      tableId: chartTableId, // Include table ID for multi-table isolation
      dateRange: selectedDateRange,
      dateRanges: selectedDateRanges,
      // Only include slicers that actually filter data (have specific values selected)
      // and don't include slicers where all available values are selected (equivalent to no filter)
      slicers: appliedSlicers
        .filter(slicer => {
          // Filter isolation: only include slicers from the same table
          const slicerTableId = slicer.tableId || 'main';
          if (slicerTableId !== chartTableId) {
            return false;
          }

          if (!slicer.selectedValues || slicer.selectedValues.length === 0) {
            return false; // No values selected = no filter
          }
          // If all available values are selected, treat it as no filter
          if (slicer.selectedValues.length === slicer.availableValues.length) {
            return false;
          }
          return true;
        })
        .map(slicer => ({
          id: slicer.id,
          column: slicer.columnName,
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

    const chartTableId = config.tableId || 'main';
    let sourceData: any[] = projectData.data;
    let sourceColumns = projectData.columns;

    if (config.tableId && config.tableId !== 'main') {
      const selectedTable = projectData.tables?.find(table => table.id === config.tableId);
      if (!selectedTable) {
        // Table not found - chart is broken
        console.error(`Chart ${chart.id} references missing table ${config.tableId}`);
        return null;
      }
      sourceData = selectedTable.data;
      sourceColumns = selectedTable.columns || (selectedTable.data.length > 0 ?
        Object.keys(selectedTable.data[0]).map(key => ({
          name: key,
          type: typeof selectedTable.data[0][key] === 'number' ? 'number' as const : 'string' as const,
          nullable: true,
          unique: false
        })) : []);
    }

    sourceData = applyDateRangeFilter(sourceData);

    // Filter isolation: Only apply slicers from the same table
    if (config.appliedSlicers && config.appliedSlicers.length > 0) {
      const validSlicers = projectData.slicers.filter(slicer => {
        // Check if slicer is applied to this chart
        if (!config.appliedSlicers?.includes(slicer.id)) return false;

        // Check if slicer's table matches chart's table
        const slicerTableId = slicer.tableId || 'main';
        if (slicerTableId !== chartTableId) {
          console.warn(`Skipping slicer ${slicer.id} - table mismatch (chart: ${chartTableId}, slicer: ${slicerTableId})`);
          return false;
        }

        // Check if slicer's column exists in the table
        const columnExists = sourceColumns.some(col => col.name === slicer.columnName);
        if (!columnExists) {
          console.warn(`Skipping slicer ${slicer.id} - column ${slicer.columnName} not found in table`);
          return false;
        }

        return true;
      });

      if (validSlicers.length > 0) {
        sourceData = applySlicersToData(sourceData, validSlicers.map(s => s.id), projectData.slicers);
      }
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
    // Check if we have main data - if not, this becomes main data
    if (!projectData.data || projectData.data.length === 0) {
      const updatedData = {
        ...projectData,
        data,
        columns,
        name: fileName ? fileName.replace(/\.[^/.]+$/, '') : projectData.name || 'Dataset'
      };
      onProjectUpdate(updatedData);
    } else {
      // Add as additional table
      const newTable = {
        id: `table-${Date.now()}`,
        name: fileName ? fileName.replace(/\.[^/.]+$/, '') : `Table ${(projectData.tables?.length || 0) + 1}`,
        data,
        columns,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const updatedData = {
        ...projectData,
        tables: [...(projectData.tables || []), newTable]
      };
      onProjectUpdate(updatedData);
    }
    setShowDataImport(false);
    setImportError('');
  };

  const handleDirectFileSelect = async () => {
    try {
      setImportLoading(true);
      setImportError('');

      const filePath = await window.electronAPI.selectFile();
      if (!filePath) return;

      const fileContent = await window.electronAPI.readFile(filePath);
      const extension = filePath.toLowerCase().split('.').pop();

      let result;

      switch (extension) {
        case 'csv':
          result = await processCSV(fileContent);
          break;
        case 'json':
          result = processJSON(fileContent);
          break;
        case 'xlsx':
        case 'xls':
          throw new Error('Excel files not supported in file path mode. Please drag and drop the file instead.');
          break;
        default:
          throw new Error('Unsupported file format. Please use CSV, JSON, or Excel files.');
      }

      if (result.data.length === 0) {
        throw new Error('No data found in the selected file.');
      }

      const fileName = filePath.split('/').pop() || 'imported_file';
      handleDataImport(result.data, result.columns, fileName);

    } catch (err) {
      console.error('Import error:', err);
      setImportError(err instanceof Error ? err.message : 'An error occurred while importing the file.');
    } finally {
      setImportLoading(false);
    }
  };

  // Map column types to display labels and colors
  const getColumnDisplayInfo = (type: string) => {
    switch (type.toLowerCase()) {
      case 'date':
      case 'datetime':
      case 'timestamp':
        return {
          label: 'date',
          color: '#059669',
          backgroundColor: '#dcfce7',
          borderColor: '#bbf7d0'
        };
      case 'string':
      case 'text':
      case 'varchar':
      case 'char':
        return {
          label: 'category',
          color: '#7c3aed',
          backgroundColor: '#ede9fe',
          borderColor: '#d8b4fe'
        };
      case 'number':
      case 'int':
      case 'integer':
      case 'float':
      case 'double':
      case 'decimal':
        return {
          label: 'values',
          color: '#dc2626',
          backgroundColor: '#fee2e2',
          borderColor: '#fecaca'
        };
      default:
        return {
          label: type,
          color: '#6b7280',
          backgroundColor: '#e5e7eb',
          borderColor: '#d1d5db'
        };
    }
  };

  const handleDirectDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const file = files[0];
    const extension = file.name.toLowerCase().split('.').pop();

    if (!['csv', 'json', 'xlsx', 'xls'].includes(extension || '')) {
      setImportError('Unsupported file format. Please use CSV, JSON, or Excel files.');
      return;
    }

    try {
      setImportLoading(true);
      setImportError('');

      const reader = new FileReader();

      reader.onload = async (event) => {
        try {
          let result;

          if (extension === 'csv' || extension === 'json') {
            const content = event.target?.result as string;
            if (extension === 'csv') {
              result = await processCSV(content);
            } else {
              result = processJSON(content);
            }
          } else if (extension === 'xlsx' || extension === 'xls') {
            const buffer = event.target?.result as ArrayBuffer;
            result = processExcel(buffer);
          }

          if (result && result.data.length > 0) {
            handleDataImport(result.data, result.columns, file.name);
          } else {
            throw new Error('No data found in the selected file.');
          }
        } catch (err) {
          console.error('Import error:', err);
          setImportError(err instanceof Error ? err.message : 'An error occurred while processing the file.');
        } finally {
          setImportLoading(false);
        }
      };

      if (extension === 'csv' || extension === 'json') {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }

    } catch (err) {
      console.error('File reading error:', err);
      setImportError('Failed to read the file.');
      setImportLoading(false);
    }
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

    // Clear cached thumbnail for this chart since it was edited
    if (chart.id && chartThumbnailCache.current[chart.id]) {
      delete chartThumbnailCache.current[chart.id];
      setChartThumbnails(prev => {
        const next = { ...prev };
        delete next[chart.id];
        return next;
      });
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

  const handleOpenExportFlow = async () => {
    const chartIds = projectData.charts.map(chart => chart.id);
    setSelectedExportChartIds(chartIds);

    // Calculate analysis summary
    const totalSelected = chartIds.length;
    const analysisCount = chartIds.reduce((count, chartId) => (
      chartsWithAnalysisSet.has(chartId) ? count + 1 : count
    ), 0);
    const analysisSummary = `${analysisCount} of ${totalSelected} charts have analysis available`;

    // Update export config with defaults
    setExportConfig(prev => {
      const defaultTitle = 'Title';
      const shouldEnableAnalysisByDefault =
        analysisCount > 0 && prev.analysisSummary === 'No chart analysis is available yet';
      const nextIncludeAnalysis = analysisCount === 0
        ? false
        : shouldEnableAnalysisByDefault
          ? true
          : prev.includeAnalysis;

      return {
        ...prev,
        reportTitle: prev.reportTitle && prev.reportTitle.trim().length > 0 ? prev.reportTitle : defaultTitle,
        description: prev.description,
        reportDate: prev.reportDate || new Date().toISOString().split('T')[0],
        includeAnalysis: nextIncludeAnalysis,
        analysisSummary
      };
    });

    setExportStage('config'); // Skip selection stage, go straight to config
    setShowExportFlow(true);
    setIsCapturingExportAssets(true);
    setExportError(null);

    // Capture thumbnails for all charts
    try {
      await captureChartThumbnails(chartIds, { force: false, scale: 2 });
    } catch (error) {
      console.error('Failed to prepare chart previews for export', error);
      setExportError('Failed to prepare some chart previews. Please ensure charts are visible and try again.');
    } finally {
      setIsCapturingExportAssets(false);
    }
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

  const handleReorderCharts = (startIndex: number, endIndex: number) => {
    console.log('handleReorderCharts called:', { startIndex, endIndex, totalCharts: projectData.charts.length });

    const newCharts = [...projectData.charts];
    const [movedChart] = newCharts.splice(startIndex, 1);
    newCharts.splice(endIndex, 0, movedChart);

    console.log('Before:', projectData.charts.map(c => c.name));
    console.log('After:', newCharts.map(c => c.name));

    onProjectUpdate({
      ...projectData,
      charts: newCharts
    });
  };

  const handleExportSelectionContinue = async () => {
    if (selectedExportChartIds.length === 0) {
      return;
    }

    const totalSelected = selectedExportChartIds.length;
    const analysisSummary = `${analysisAvailableCount} of ${totalSelected} charts have analysis available`;

    setExportConfig(prev => {
      const defaultTitle = 'Title';
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
        description: prev.description, // Keep user's description unchanged
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
    setExportConfig(prev => {
      const next = {
        ...prev,
        ...updates
      };

      if (
        'companyName' in updates ||
        'primaryColor' in updates ||
        'logoDataUrl' in updates ||
        'logoFileName' in updates
      ) {
        persistBranding({
          companyName: next.companyName,
          primaryColor: next.primaryColor,
          logoDataUrl: next.logoDataUrl ?? null,
          logoFileName: next.logoFileName ?? null
        });
      }

      return next;
    });
  };

  const handleExportLogoUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        setExportConfig(prev => {
          const next = {
            ...prev,
            logoFile: file,
            logoDataUrl: result,
            logoFileName: file.name
          };

          persistBranding({
            companyName: next.companyName,
            primaryColor: next.primaryColor,
            logoDataUrl: next.logoDataUrl ?? null,
            logoFileName: next.logoFileName ?? null
          });

          return next;
        });
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
    setExportConfig(prev => {
      const next = {
        ...prev,
        logoFile: null,
        logoDataUrl: null,
        logoFileName: null
      };

      persistBranding({
        companyName: next.companyName,
        primaryColor: next.primaryColor,
        logoDataUrl: null,
        logoFileName: null
      });

      return next;
    });
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
      const selectedModel = settings.selectedModels?.gemini || 'gemini-2.5-flash';
      const analysis = await geminiClient.generateChartInsights(chartData, chart.config, selectedModel);

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

    const handleTableDelete = (tableId: string) => {
      const table = projectData.tables.find(t => t.id === tableId);
      if (!table) return;

      // Check for dependent charts
      const affectedCharts = projectData.charts.filter(
        c => c.config.tableId === tableId
      );

      // Check for dependent slicers
      const affectedSlicers = projectData.slicers.filter(
        s => s.tableId === tableId
      );

      if (affectedCharts.length > 0 || affectedSlicers.length > 0) {
        const chartNames = affectedCharts.map(c => `"${c.config.title || c.name}"`).join(', ');
        const message = `Deleting "${table.name}" will affect:\n\n` +
          `• ${affectedCharts.length} chart(s): ${chartNames}\n` +
          `• ${affectedSlicers.length} filter(s)\n\n` +
          `These will stop working until reconfigured.\n\n` +
          `Delete anyway?`;

        if (!confirm(message)) return;
      }

      // Proceed with deletion
      const updatedData = {
        ...projectData,
        tables: projectData.tables.filter(t => t.id !== tableId)
      };
      onProjectUpdate(updatedData);
    };

    const handleTableRename = (tableId: string, newName: string) => {
      const updatedData = {
        ...projectData,
        tables: projectData.tables.map(t =>
          t.id === tableId
            ? { ...t, name: newName, updatedAt: new Date().toISOString() }
            : t
        )
      };
      onProjectUpdate(updatedData);
    };

    return (
      <div style={{ padding: '24px' }}>
        {projectData.data?.length > 0 ? (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            border: '2px solid #d1d5db',
            overflow: 'hidden',
            fontSize: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
          }}>
            {/* Fixed Header Outside Scrollable Area */}
            <div style={{
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              padding: '12px 16px',
              borderBottom: '2px solid #e2e8f0',
              position: 'sticky',
              top: 0,
              zIndex: 10
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {editingTableName ? (
                      <input
                        type="text"
                        value={tableName}
                        onChange={(e) => setTableName(e.target.value)}
                        onBlur={handleTableNameSave}
                        onKeyPress={(e) => e.key === 'Enter' && handleTableNameSave()}
                        style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          border: '1px solid #3b82f6',
                          borderRadius: '4px',
                          padding: '3px 6px',
                          outline: 'none'
                        }}
                        autoFocus
                      />
                    ) : (
                      <h3
                        style={{
                          margin: 0,
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          color: '#1e293b'
                        }}
                        onClick={() => setEditingTableName(true)}
                      >
                        {tableName || 'Dataset'}
                      </h3>
                    )}
                    <button
                      onClick={() => setEditingTableName(true)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '11px',
                        color: '#6b7280',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                  </div>

                  <span style={{
                    fontSize: '11px',
                    color: '#9ca3af',
                    fontWeight: '500'
                  }}>
                    {projectData.data?.length || 0} rows × {projectData.columns?.length || 0} columns
                  </span>
                </div>
                <button
                  onClick={handleDeleteData}
                  style={{
                    padding: '4px 8px',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#dc2626'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#ef4444'}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}>
                    <polyline points="3,6 5,6 21,6"/>
                    <path d="M19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2v2"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                  </svg>
                  Delete
                </button>
              </div>
            </div>

            {/* Scrollable Table Content */}
            <div style={{
              maxHeight: '350px',
              overflow: 'auto'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                {/* Column Headers */}
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    {projectData.columns?.map((column) => (
                      <th
                        key={column.name}
                        style={{
                          padding: '8px 10px',
                          textAlign: 'left',
                          fontWeight: '600',
                          borderBottom: '1px solid #e5e7eb',
                          position: 'sticky',
                          top: 0,
                          background: '#f9fafb',
                          whiteSpace: 'nowrap',
                          fontSize: '11px',
                          minWidth: '100px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>{column.name}</span>
                          {(() => {
                            const displayInfo = getColumnDisplayInfo(column.type);
                            return (
                              <span style={{
                                fontSize: '8px',
                                color: displayInfo.color,
                                backgroundColor: displayInfo.backgroundColor,
                                border: `1px solid ${displayInfo.borderColor}`,
                                padding: '1px 4px',
                                borderRadius: '6px',
                                fontWeight: '700',
                                textTransform: 'uppercase',
                                letterSpacing: '0.025em'
                              }}>
                                {displayInfo.label}
                              </span>
                            );
                          })()}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {projectData.data?.slice(0, 10).map((row, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      {projectData.columns?.map((column) => (
                        <td
                          key={column.name}
                          style={{
                            padding: '6px 10px',
                            borderRight: '1px solid #f3f4f6',
                            maxWidth: '120px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontSize: '11px'
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

            {projectData.data?.length > 10 && (
              <div style={{
                padding: '8px 12px',
                background: '#f9fafb',
                textAlign: 'center',
                fontSize: '11px',
                color: '#6b7280',
                fontWeight: '500'
              }}>
                <span style={{ color: '#9ca3af' }}>+{projectData.data.length - 10} more rows</span>
              </div>
            )}
          </div>
        ) : (
          <div
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Handle file drop here - you can implement drag and drop import
              console.log('File dropped:', e.dataTransfer.files);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            style={{
              background: 'white',
              borderRadius: '16px',
              border: '3px dashed #e5e7eb',
              padding: '64px 24px',
              textAlign: 'center',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#4f46e5';
              e.currentTarget.style.background = 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e5e7eb';
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            onClick={handleDirectFileSelect}
          >
            {importError && (
              <div style={{
                color: '#dc2626',
                background: '#fee2e2',
                border: '1px solid #fecaca',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
                fontSize: '14px',
                fontWeight: '500',
                maxWidth: '500px'
              }}>
                Error: {importError}
              </div>
            )}
            <div style={{
              fontSize: '64px',
              marginBottom: '24px',
              background: importLoading ? 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)' : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              borderRadius: '20px',
              padding: '20px',
              display: 'inline-block',
              boxShadow: '0 4px 16px rgba(79, 70, 229, 0.3)'
            }}>
              {importLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                  <div className="spinner"></div>
                  Processing...
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '600' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14,2 14,8 20,8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10,9 9,9 8,9"/>
                  </svg>
                  DATA
                </div>
              )}
            </div>
            <h3 style={{
              margin: '0 0 12px 0',
              fontSize: '24px',
              fontWeight: '700',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              No Data Available
            </h3>
            <p style={{
              margin: '0 0 32px 0',
              fontSize: '18px',
              color: '#6b7280',
              lineHeight: '1.6'
            }}>
              {importLoading ? (
                <>Processing file...</>
              ) : (
                <>Drop your CSV, JSON, or Excel file here<br />
                <span style={{ fontSize: '16px', color: '#9ca3af' }}>
                  or click to browse and import data
                </span></>
              )}
            </p>
          </div>
        )}

        {/* Additional Tables Section */}
        <div style={{ marginTop: '32px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: '600',
              color: '#1e293b'
            }}>
              Additional Tables ({projectData.tables?.length || 0})
            </h3>
            <button
              onClick={() => setShowDataImport(true)}
              style={{
                padding: '8px 16px',
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #4338ca 0%, #6d28d9 100%)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Upload Table
            </button>
          </div>

          {projectData.tables && projectData.tables.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '16px'
            }}>
              {projectData.tables.map(table => (
                <TableCard
                  key={table.id}
                  table={table}
                  onDelete={() => handleTableDelete(table.id)}
                  onRename={(newName) => handleTableRename(table.id, newName)}
                />
              ))}
            </div>
          ) : (
            <div style={{
              background: 'white',
              border: '2px dashed #e5e7eb',
              borderRadius: '8px',
              padding: '32px',
              textAlign: 'center',
              color: '#9ca3af'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📊</div>
              <p style={{ margin: 0, fontSize: '14px' }}>
                No additional tables yet. Upload a table to use in your charts.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Table Card Component
  const TableCard: React.FC<{
    table: any;
    onDelete: () => void;
    onRename: (newName: string) => void;
  }> = ({ table, onDelete, onRename }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(table.name);

    const handleSave = () => {
      if (editName.trim() && editName !== table.name) {
        onRename(editName.trim());
      }
      setIsEditing(false);
    };

    return (
      <div style={{
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '16px',
        transition: 'all 0.2s',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
          <div style={{ flex: 1 }}>
            {isEditing ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleSave}
                onKeyPress={(e) => e.key === 'Enter' && handleSave()}
                style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  border: '1px solid #3b82f6',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  outline: 'none',
                  width: '100%'
                }}
                autoFocus
              />
            ) : (
              <h4
                style={{
                  margin: '0 0 4px 0',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1e293b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onClick={() => setIsEditing(true)}
              >
                📊 {table.name}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.5 }}>
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </h4>
            )}
            <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
              {table.data.length} rows × {table.columns.length} columns
            </p>
          </div>
          <button
            onClick={onDelete}
            style={{
              background: 'none',
              border: 'none',
              color: '#ef4444',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.15s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#dc2626';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#ef4444';
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title="Delete table"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3,6 5,6 21,6"/>
              <path d="M19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2v2"/>
            </svg>
          </button>
        </div>
        <div style={{
          background: '#f9fafb',
          borderRadius: '4px',
          padding: '8px',
          fontSize: '11px',
          color: '#6b7280'
        }}>
          <div style={{ marginBottom: '4px' }}>
            <strong>Columns:</strong> {table.columns.slice(0, 3).map((c: any) => c.name).join(', ')}
            {table.columns.length > 3 && ` +${table.columns.length - 3} more`}
          </div>
          <div style={{ fontSize: '10px', color: '#9ca3af' }}>
            Created: {new Date(table.createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>
    );
  };

  const renderCharts = () => {
    return (
      <div style={{ padding: '12px' }}>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', marginLeft: '12px' }}>
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
              <div style={{
                fontSize: '48px',
                marginBottom: '24px',
                color: '#d1d5db'
              }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto', display: 'block' }}>
                  <line x1="18" y1="20" x2="18" y2="10"/>
                  <line x1="12" y1="20" x2="12" y2="4"/>
                  <line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '600', color: '#374151' }}>
                No Charts Yet
              </h3>
              <p style={{ margin: '0', fontSize: '14px', color: '#9ca3af' }}>
                Create your first chart using the button above
              </p>
            </div>
          ) : (
            <div style={{
              display: viewportWidth > 2400 ? 'flex' : 'grid',
              flexDirection: viewportWidth > 2400 ? 'row' : undefined,
              flexWrap: viewportWidth > 2400 ? 'wrap' : undefined,
              justifyContent: viewportWidth > 2400 ? 'center' : undefined,
              gap: viewportWidth > 2400 ? '40px 12px' : '20px', // row-gap column-gap for flex, regular gap for grid
              gridTemplateColumns: viewportWidth > 2400 ? undefined : (viewportWidth >= 880 ? 'repeat(2, minmax(0, 1fr))' : '1fr'),
              width: viewportWidth > 2400 ? '80%' : '100%',
              gridAutoFlow: viewportWidth > 2400 ? undefined : 'row dense',
              margin: viewportWidth > 2400 ? '0 auto' : undefined
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
                    width: viewportWidth > 2400 ? `${chartConfig.cardWidth}px` : '100%',
                    maxWidth: `${chartConfig.cardWidth}px`,
                    height: `${chartConfig.cardMinHeight}px`,
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    gridColumn: viewportWidth > 2400 ? undefined : gridSpan,
                    margin: '0 auto',
                    flexShrink: viewportWidth > 2400 ? 0 : undefined
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
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#1f2937' }}>Date</span>
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
                          Filters
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
                      padding: '3px 13px 20px 13px',
                      background: '#ffffff',
                      borderTop: '1px solid #e5e7eb',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      <div style={{
                        width: '100%',
                        height: 'calc(100% - 25px)',
                        border: '2px solid #8b5cf6',
                        borderRadius: '8px',
                        padding: '3px',
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
                            <div style={{
                              fontSize: '14px',
                              marginBottom: '8px',
                              fontWeight: '600',
                              color: '#6b7280',
                              background: '#f3f4f6',
                              padding: '8px',
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8"/>
                                <path d="M21 21l-4.35-4.35"/>
                              </svg>
                              No Data Found
                            </div>
                          </div>
                        )}
                      </div>
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
        padding: '0 32px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          minHeight: '56px'
        }}>
          <div style={{
            display: 'flex',
            gap: '32px',
            alignItems: 'center',
            height: '100%'
          }}>
            {[
              {
                id: 'data',
                label: 'Data',
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14,2 14,8 20,8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10,9 9,9 8,9"/>
                  </svg>
                )
              },
              {
                id: 'charts',
                label: 'Charts',
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="20" x2="18" y2="10"/>
                    <line x1="12" y1="20" x2="12" y2="4"/>
                    <line x1="6" y1="20" x2="6" y2="14"/>
                  </svg>
                )
              }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  if (tab.id === 'data') {
                    setSelectedChart(null);
                  }
                }}
                style={{
                  padding: '16px 0',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === tab.id ? '3px solid #3b82f6' : '3px solid transparent',
                  color: activeTab === tab.id ? '#3b82f6' : '#6b7280',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.color = '#374151';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.color = '#6b7280';
                  }
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginLeft: '32px'
          }}>

          {activeTab === 'data' && (
            <button
              onClick={() => setShowDataImport(true)}
              style={{
                padding: '10px 16px',
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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7,10 12,15 17,10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Import Data
            </button>
          )}

          {selectedChart && (
            <button
              onClick={() => setSelectedChart(null)}
              style={{
                padding: '10px 16px',
                background: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#e5e7eb'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#f3f4f6'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5"/>
                <polyline points="12,19 5,12 12,5"/>
              </svg>
              Back to Charts
            </button>
          )}

          {activeTab === 'charts' && !selectedChart && (
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setSelectedChart({ id: '', name: '', type: 'bar', config: {}, data: [] })}
                style={{
                  padding: '10px 16px',
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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="20" x2="18" y2="10"/>
                  <line x1="12" y1="20" x2="12" y2="4"/>
                  <line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
                Create Chart
              </button>
              {projectData.charts.length > 0 && (
                <button
                  onClick={handleOpenExportFlow}
                  style={{
                    padding: '10px 16px',
                    background: '#059669',
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
                  onMouseEnter={(e) => e.currentTarget.style.background = '#047857'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#059669'}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17,8 12,3 7,8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Export
                </button>
              )}
            </div>
          )}
        </div>
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
          charts={projectData.charts}
          selectedChartIds={selectedExportChartIds}
          chartsWithAnalysis={chartsWithAnalysisSet}
          chartThumbnails={chartThumbnails}
          analysisContentByChart={selectedChartAnalyses}
          analysisAvailableCount={analysisAvailableCount}
          totalSelectedCount={selectedExportChartIds.length}
          isCapturingAssets={isCapturingExportAssets}
          exportError={exportError}
          onConfigChange={handleExportConfigChange}
          onLogoUpload={handleExportLogoUpload}
          onLogoClear={handleExportLogoClear}
          onToggleChart={handleToggleExportChart}
          onSelectAllCharts={handleExportSelectAll}
          onClearAllCharts={handleExportClearAll}
          onReorderCharts={handleReorderCharts}
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
          onAnalysisUpdate={(analysisContent: string, insightsContent: string) => {
            if (modalChart) {
              const filterFingerprint = generateFilterFingerprint(modalChart);
              // Format with explicit headers for consistent parsing
              const { formatAnalysisContent } = require('../utils/analysisParser');
              const combinedAnalysis = formatAnalysisContent(analysisContent, insightsContent);

              setChartAnalyses(prev => ({
                ...prev,
                [modalChart.id]: {
                  ...prev[modalChart.id],
                  [filterFingerprint]: {
                    content: combinedAnalysis,
                    isGenerating: false,
                    error: undefined,
                    generatedAt: Date.now()
                  }
                }
              }));
            }
          }}
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
