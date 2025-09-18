import React, { useState, useEffect, useMemo } from 'react';
import { Project, ProjectData, Chart, Dashboard, Settings } from '../types';
import { ChartConfiguration, ChartData } from '../types/charts';
import ChartBuilder from './charts/ChartBuilder';
import ChartRenderer from './charts/ChartRenderer';
import DashboardBuilder from './DashboardBuilder';
import DataImport from './DataImport';
import { applySlicersToData } from '../utils/slicerUtils';
import ChartSlicerControls from './ChartSlicerControls';
import DateRangeManager from './DateRangeManager';
import DateRangeFilter from './DateRangeFilter';
import { GeminiClient } from '../utils/geminiClient';

type ChartAnalysisEntry = { content: string; isGenerating: boolean; error?: string };
type ChartAnalysisMap = Record<string, ChartAnalysisEntry>;

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
  const [selectedDashboard, setSelectedDashboard] = useState<Dashboard | null>(null);
  const [showDataImport, setShowDataImport] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState<string | null>(null);
  const [selectedDateRanges, setSelectedDateRanges] = useState<string[]>([]);
  const analysisStorageKey = useMemo(() => `chart-analyses-${project?.id ?? 'default'}`, [project?.id]);
  const [chartAnalyses, setChartAnalyses] = useState<ChartAnalysisMap>({});
  const [hasRestoredAnalyses, setHasRestoredAnalyses] = useState(false);
  const [editingTableName, setEditingTableName] = useState(false);
  const [tableName, setTableName] = useState(projectData.name || 'Dataset');

  useEffect(() => {
    if (typeof window === 'undefined') {
      setHasRestoredAnalyses(true);
      return;
    }

    try {
      const stored = window.localStorage.getItem(analysisStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, { content?: string; error?: string }>;
        const restored = Object.entries(parsed).reduce((acc, [chartId, value]) => {
          acc[chartId] = {
            content: value.content ?? '',
            error: value.error ?? undefined,
            isGenerating: false
          };
          return acc;
        }, {} as ChartAnalysisMap);
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

  // Auto-regenerate analysis when filters change (date ranges, slicers)
  // Removed automatic analysis generation - now only generates when explicitly requested
  // useEffect(() => {
  //   if (!hasRestoredAnalyses || activeTab !== 'charts') {
  //     return;
  //   }

  //   projectData.charts.forEach(chart => {
  //     const chartData = generateChartData(chart);
  //     // Only regenerate if chart has data and analysis already exists (meaning it was manually generated before)
  //     if (chartData && chartData.labels && chartData.labels.length > 0 && chartAnalyses[chart.id] && !chartAnalyses[chart.id].isGenerating) {
  //       generateChartAnalysis(chart, chartData);
  //     }
  //   });
  // }, [hasRestoredAnalyses, activeTab, selectedDateRange, selectedDateRanges, projectData.slicers, projectData.charts]); // Trigger when filters change

  useEffect(() => {
    if (!hasRestoredAnalyses || typeof window === 'undefined') {
      return;
    }

    try {
      const persistable = Object.entries(chartAnalyses).reduce((acc, [chartId, analysis]) => {
        if (!analysis?.content?.trim()) {
          return acc;
        }

        acc[chartId] = {
          content: analysis.content,
          ...(analysis.error ? { error: analysis.error } : {})
        };
        return acc;
      }, {} as Record<string, { content: string; error?: string }>);

      window.localStorage.setItem(analysisStorageKey, JSON.stringify(persistable));
    } catch (error) {
      console.warn('Failed to persist chart analyses to storage', error);
    }
  }, [chartAnalyses, analysisStorageKey, hasRestoredAnalyses]);

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

  const createChartSummaryData = (sourceData: any[], config: ChartConfiguration, chartData: ChartData | null): any[] => {
    if (!chartData || !chartData.labels || !chartData.datasets?.length) {
      return [];
    }

    const labels = chartData.labels;
    const datasets = chartData.datasets;

    // For multi-series charts, create a comprehensive summary including ALL series
    const summaryData: any[] = [];

    labels.forEach((label, labelIndex) => {
      datasets.forEach((dataset, datasetIndex) => {
        const dataPoint: any = {};

        // Add the X-axis/category field
        if (config.xAxisField || config.categoryField) {
          const xField = config.xAxisField || config.categoryField;
          dataPoint[xField] = label;
        } else {
          dataPoint['category'] = label;
        }

        // Add the series/category information
        if (config.seriesField) {
          dataPoint[config.seriesField] = dataset.label || `Series ${datasetIndex + 1}`;
        } else if (datasets.length > 1) {
          dataPoint['series'] = dataset.label || `Series ${datasetIndex + 1}`;
        }

        // Add the Y-axis/value field
        if (config.yAxisField || config.valueField) {
          const yField = config.yAxisField || config.valueField;
          dataPoint[yField] = dataset.data[labelIndex];
        } else {
          dataPoint['value'] = dataset.data[labelIndex];
        }

        summaryData.push(dataPoint);
      });
    });

    return summaryData;
  };

  const generateChartAnalysis = async (chart: Chart, chartData: ChartData | null) => {
    const chartId = chart.id;

    // Set generating state
    setChartAnalyses(prev => ({
      ...prev,
      [chartId]: {
        content: prev[chartId]?.content ?? '',
        isGenerating: true
      }
    }));

    try {
      const config = chart.config as ChartConfiguration;

      // Get the source data used for this chart
      let sourceData: any[] = projectData.data;

      if (config.tableId && config.tableId !== 'main') {
        const selectedTable = projectData.tables?.find(table => table.id === config.tableId);
        if (selectedTable) {
          sourceData = selectedTable.data;
        }
      }

      // Apply the same filters as in generateChartData
      sourceData = applyDateRangeFilter(sourceData);
      if (config.appliedSlicers && config.appliedSlicers.length > 0) {
        sourceData = applySlicersToData(sourceData, config.appliedSlicers, projectData.slicers);
      }

      if (!sourceData.length) {
        throw new Error('No data available for analysis');
      }

      // Use GeminiClient for analysis generation
      if (!settings?.apiKeys?.gemini) {
        throw new Error('Gemini API key not configured. Please set it in Settings.');
      }

      // Create chart-specific summary data that matches what's actually displayed
      const chartSummaryData = createChartSummaryData(sourceData, config, chartData);

      const geminiClient = new GeminiClient(settings.apiKeys.gemini);
      const selectedModel = settings.selectedModels?.gemini || 'gemini-2.5-flash';
      const analysis = await geminiClient.generateChartInsights(chartSummaryData, config, selectedModel);

      setChartAnalyses(prev => ({
        ...prev,
        [chartId]: { content: analysis, isGenerating: false }
      }));

    } catch (error) {
      console.error('Analysis generation failed:', error);

      // Fallback to a simple template-based analysis
      const config = chart.config as ChartConfiguration;

      // Get source data for fallback analysis too
      let sourceData: any[] = projectData.data;
      if (config.tableId && config.tableId !== 'main') {
        const selectedTable = projectData.tables?.find(table => table.id === config.tableId);
        if (selectedTable) {
          sourceData = selectedTable.data;
        }
      }
      sourceData = applyDateRangeFilter(sourceData);
      if (config.appliedSlicers && config.appliedSlicers.length > 0) {
        sourceData = applySlicersToData(sourceData, config.appliedSlicers, projectData.slicers);
      }

      const fallbackAnalysis = generateFallbackAnalysis(chart, sourceData, config, chartData);

      setChartAnalyses(prev => ({
        ...prev,
        [chartId]: { content: fallbackAnalysis, isGenerating: false, error: 'Using fallback analysis' }
      }));
    }
  };

  const generateFallbackAnalysis = (
    chart: Chart,
    rawData: any[],
    config: ChartConfiguration,
    chartRenderData?: ChartData | null
  ): string => {
    const chartTypeKey = (chart.type || '').toLowerCase();
    const templateId = (config.templateId || chart.type || '').toLowerCase();
    const chartTypeLabel = chart.type.replace('-', ' ');

    const safeValue = (value: any): number => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
          return parsed;
        }
      }
      return 0;
    };

    const formatValue = (value: number): string => {
      if (!Number.isFinite(value)) {
        return '0';
      }
      const abs = Math.abs(value);
      const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
      return value.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: digits
      });
    };

    const formatPercent = (part: number, total: number): string => {
      if (!Number.isFinite(part) || !Number.isFinite(total) || total === 0) {
        return '0%';
      }
      return `${((part / total) * 100).toFixed(1)}%`;
    };

    const joinSentences = (parts: string[]) => parts.filter(Boolean).join(' ');

    const datasets = chartRenderData?.datasets || [];
    const labels = chartRenderData?.labels || [];
    const hasChartValues = datasets.some(ds => Array.isArray(ds.data) && ds.data.length > 0);

    const isPieChart = templateId.includes('pie') || chartTypeKey === 'pie';
    const isBarChart = templateId.includes('bar') || chartTypeKey.includes('bar');
    const isLineChart = templateId.includes('line') || chartTypeKey.includes('line');
    const isAreaChart = templateId.includes('area') || chartTypeKey.includes('area');
    const isScatterChart = templateId.includes('scatter') || chartTypeKey.includes('scatter');

    if (isPieChart && hasChartValues) {
      const primaryDataset = datasets[0];
      if (primaryDataset && Array.isArray(primaryDataset.data) && primaryDataset.data.length > 0) {
        const slices = primaryDataset.data.map((value, index) => ({
          label: labels[index] || `Slice ${index + 1}`,
          value: safeValue(value)
        })).filter(slice => slice.label && Number.isFinite(slice.value));

        const total = slices.reduce((sum, slice) => sum + slice.value, 0);

        if (total > 0 && slices.length > 0) {
          const sorted = [...slices].sort((a, b) => b.value - a.value);
          const top = sorted[0];
          const second = sorted[1];
          const bottom = sorted[sorted.length - 1];
          const topShare = total === 0 ? 0 : (top.value / total) * 100;

          const analysisParts = [
            `This pie chart compares ${slices.length} categories with a combined total of ${formatValue(total)}.`,
            top ? `${top.label} is the largest segment at ${formatValue(top.value)} (${formatPercent(top.value, total)}).` : '',
            second ? `${second.label} follows at ${formatValue(second.value)} (${formatPercent(second.value, total)}).` : '',
            bottom && bottom.label !== top.label ? `${bottom.label} represents the smallest share at ${formatValue(bottom.value)} (${formatPercent(bottom.value, total)}).` : ''
          ];

          const insightsParts = [
            top ? `Prioritize ${top.label}, which contributes ${formatPercent(top.value, total)} of the whole.` : '',
            bottom && bottom.label !== top.label ? `Explore ways to grow ${bottom.label}, currently the weakest slice.` : '',
            topShare > 50 ? `Mitigate risk by diversifying so results are not overly dependent on ${top.label}.` : ''
          ];

          return `ANALYSIS:\n${joinSentences(analysisParts)}\n\nINSIGHTS:\n${joinSentences(insightsParts) || 'Review category mix and identify opportunities to balance the distribution.'}`;
        }
      }
    }

    if ((isLineChart || isAreaChart) && hasChartValues) {
      const effectiveLabels = labels.length
        ? labels
        : (datasets[0]?.data || []).map((_, idx) => `Point ${idx + 1}`);

      const seriesSummaries = datasets.map((ds, seriesIndex) => {
        if (!Array.isArray(ds.data) || ds.data.length === 0) {
          return null;
        }

        const values = ds.data.map(val => safeValue(val));
        const numericValues = values.filter(val => Number.isFinite(val));

        if (!numericValues.length) {
          return null;
        }

        const lastIndex = Math.min(values.length - 1, effectiveLabels.length - 1);
        const first = values[0];
        const last = values[lastIndex];
        const maxVal = Math.max(...numericValues);
        const minVal = Math.min(...numericValues);
        const maxIndex = values.indexOf(maxVal);
        const minIndex = values.indexOf(minVal);

        return {
          label: ds.label || `Series ${seriesIndex + 1}`,
          values,
          first,
          last,
          maxVal,
          minVal,
          maxLabel: effectiveLabels[Math.max(0, Math.min(maxIndex, effectiveLabels.length - 1))] || `Point ${maxIndex + 1}`,
          minLabel: effectiveLabels[Math.max(0, Math.min(minIndex, effectiveLabels.length - 1))] || `Point ${minIndex + 1}`,
          change: last - first
        };
      }).filter(Boolean) as Array<{
        label: string;
        values: number[];
        first: number;
        last: number;
        maxVal: number;
        minVal: number;
        maxLabel: string;
        minLabel: string;
        change: number;
      }>;

      if (seriesSummaries.length) {
        const firstLabel = effectiveLabels[0] || 'start';
        const lastLabel = effectiveLabels[effectiveLabels.length - 1] || 'end';
        const leadingSeries = seriesSummaries.reduce((best, current) => current.last > best.last ? current : best, seriesSummaries[0]);
        const trailingSeries = seriesSummaries.reduce((worst, current) => current.last < worst.last ? current : worst, seriesSummaries[0]);
        const peakSeries = seriesSummaries.reduce((best, current) => current.maxVal > best.maxVal ? current : best, seriesSummaries[0]);

        const analysisParts = [
          `This ${chartTypeLabel} tracks ${seriesSummaries.length} series across ${effectiveLabels.length} points from ${firstLabel} to ${lastLabel}.`,
          seriesSummaries.length === 1
            ? (() => {
                const single = seriesSummaries[0];
                if (single.last > single.first) {
                  return `Values climb from ${formatValue(single.first)} in ${firstLabel} to ${formatValue(single.last)} in ${lastLabel}.`;
                }
                if (single.last < single.first) {
                  return `Values decline from ${formatValue(single.first)} in ${firstLabel} to ${formatValue(single.last)} in ${lastLabel}.`;
                }
                return `Values stay near ${formatValue(single.first)} throughout the period.`;
              })()
            : `${leadingSeries.label} finishes highest at ${formatValue(leadingSeries.last)} in ${lastLabel}, while ${trailingSeries.label} closes at ${formatValue(trailingSeries.last)}.`,
          peakSeries ? `${peakSeries.label} peaks at ${formatValue(peakSeries.maxVal)} in ${peakSeries.maxLabel}, compared with a low of ${formatValue(peakSeries.minVal)} in ${peakSeries.minLabel}.` : ''
        ];

        const insightsParts = [
          seriesSummaries.length === 1
            ? (
              seriesSummaries[0].change > 0
                ? `Keep reinforcing the drivers behind the upswing after ${peakSeries.maxLabel}.`
                : seriesSummaries[0].change < 0
                  ? `Investigate factors causing the slide after ${peakSeries.maxLabel}.`
                  : 'Introduce new initiatives to spark movement—the series is flat across the period.'
            )
            : `Share the playbook from ${leadingSeries.label}; it outperforms ${trailingSeries.label} by ${formatValue(leadingSeries.last - trailingSeries.last)} in the final period.`,
          peakSeries ? `Use the peak of ${formatValue(peakSeries.maxVal)} in ${peakSeries.maxLabel} as a benchmark for future periods.` : ''
        ];

        return `ANALYSIS:\n${joinSentences(analysisParts)}\n\nINSIGHTS:\n${joinSentences(insightsParts)}`;
      }
    }

    if (isBarChart && hasChartValues) {
      const effectiveLabels = labels.length
        ? labels
        : (datasets[0]?.data || []).map((_, idx) => `Category ${idx + 1}`);

      const categorySummaries = effectiveLabels.map((label, labelIndex) => {
        const values = datasets.map(ds => {
          if (!Array.isArray(ds.data)) {
            return 0;
          }
          return safeValue(ds.data[labelIndex]);
        });

        const total = values.reduce((sum, val) => sum + val, 0);

        return {
          label: label || `Category ${labelIndex + 1}`,
          total,
          values
        };
      }).filter(summary => Number.isFinite(summary.total));

      if (categorySummaries.length) {
        const sorted = [...categorySummaries].sort((a, b) => b.total - a.total);
        const top = sorted[0];
        const bottom = sorted[sorted.length - 1];
        const average = categorySummaries.reduce((sum, cat) => sum + cat.total, 0) / categorySummaries.length;

        const seriesTotals = datasets.length > 0
          ? datasets.map((ds, seriesIndex) => {
              if (!Array.isArray(ds.data)) {
                return { label: ds.label || `Series ${seriesIndex + 1}`, total: 0 };
              }
              const total = ds.data.reduce((sum, value) => sum + safeValue(value), 0);
              return { label: ds.label || `Series ${seriesIndex + 1}`, total };
            })
          : [];

        const leadingSeries = seriesTotals.length > 0
          ? seriesTotals.reduce((best, current) => current.total > best.total ? current : best, seriesTotals[0])
          : null;
        const trailingSeries = seriesTotals.length > 0
          ? seriesTotals.reduce((worst, current) => current.total < worst.total ? current : worst, seriesTotals[0])
          : null;

        const analysisParts = [
          `This ${chartTypeLabel} compares ${categorySummaries.length} categories.`,
          top ? `${top.label} leads with ${formatValue(top.total)}.` : '',
          bottom && bottom.label !== top.label ? `${bottom.label} trails at ${formatValue(bottom.total)}.` : '',
          Number.isFinite(average) ? `Average performance across categories is ${formatValue(average)}.` : '',
          leadingSeries ? `${leadingSeries.label} contributes the most overall, totaling ${formatValue(leadingSeries.total)}.` : ''
        ];

        const insightsParts = [
          top ? `Keep investing in ${top.label}; it sets the pace.` : '',
          bottom && bottom.label !== top.label ? `Audit ${bottom.label} to uncover blockers—it lags the rest.` : '',
          leadingSeries && trailingSeries && leadingSeries.label !== trailingSeries.label
            ? `Share tactics from ${leadingSeries.label}; it outperforms ${trailingSeries.label} by ${formatValue(leadingSeries.total - trailingSeries.total)}.`
            : ''
        ];

        return `ANALYSIS:\n${joinSentences(analysisParts)}\n\nINSIGHTS:\n${joinSentences(insightsParts) || 'Use the bar comparison to replicate strengths and shore up weak contributors.'}`;
      }
    }

    if (isScatterChart && hasChartValues) {
      const primaryDataset = datasets[0];
      if (primaryDataset && Array.isArray(primaryDataset.data) && primaryDataset.data.length > 0) {
        const points = primaryDataset.data.map(point => {
          if (point && typeof point === 'object' && 'x' in point && 'y' in point) {
            return { x: safeValue((point as any).x), y: safeValue((point as any).y) };
          }
          if (Array.isArray(point) && point.length >= 2) {
            return { x: safeValue(point[0]), y: safeValue(point[1]) };
          }
          return null;
        }).filter(Boolean) as { x: number; y: number }[];

        if (points.length) {
          const xs = points.map(p => p.x);
          const ys = points.map(p => p.y);
          const mean = (values: number[]) => values.reduce((sum, val) => sum + val, 0) / values.length;
          const meanX = mean(xs);
          const meanY = mean(ys);

          let covariance = 0;
          let varianceX = 0;
          let varianceY = 0;

          points.forEach(point => {
            const dx = point.x - meanX;
            const dy = point.y - meanY;
            covariance += dx * dy;
            varianceX += dx * dx;
            varianceY += dy * dy;
          });

          const correlation = varianceX === 0 || varianceY === 0
            ? 0
            : covariance / Math.sqrt(varianceX * varianceY);
          const corrRounded = Number(correlation.toFixed(2));
          const absCorrelation = Math.abs(corrRounded);

          let correlationDescription = `minimal linear correlation (r=${corrRounded})`;
          if (absCorrelation >= 0.7) {
            correlationDescription = `a strong ${corrRounded >= 0 ? 'positive' : 'negative'} correlation (r=${corrRounded})`;
          } else if (absCorrelation >= 0.4) {
            correlationDescription = `a moderate ${corrRounded >= 0 ? 'positive' : 'negative'} correlation (r=${corrRounded})`;
          } else if (absCorrelation >= 0.2) {
            correlationDescription = `a weak ${corrRounded >= 0 ? 'positive' : 'negative'} correlation (r=${corrRounded})`;
          }

          const minX = Math.min(...xs);
          const maxX = Math.max(...xs);
          const minY = Math.min(...ys);
          const maxY = Math.max(...ys);

          const analysisParts = [
            `This scatter plot charts ${points.length} observations.`,
            `There is ${correlationDescription}.`,
            `X spans ${formatValue(minX)} to ${formatValue(maxX)}, while Y ranges from ${formatValue(minY)} to ${formatValue(maxY)}.`
          ];

          const insightsParts = [
            corrRounded >= 0.35
              ? 'Leverage the positive relationship—boosting the X driver should lift Y as well.'
              : corrRounded <= -0.35
                ? 'Reduce the factors on the X axis that are dragging Y downward.'
                : 'Group the points by segment or add more context to uncover stronger relationships.'
          ];

          return `ANALYSIS:\n${joinSentences(analysisParts)}\n\nINSIGHTS:\n${joinSentences(insightsParts)}`;
        }
      }
    }

    const totalPoints = rawData.length;
    const baseAnalysis = totalPoints > 0
      ? `This ${chartTypeLabel} summarizes ${totalPoints} data points${labels.length ? ` across ${labels.length} categories` : ''}.`
      : `This ${chartTypeLabel} does not have enough data to summarize yet.`;
    const baseInsight = totalPoints > 0
      ? 'Use this view to highlight extremes and decide where to focus next.'
      : 'Add or expand data for this chart to unlock automated insights.';

    return `ANALYSIS:\n${baseAnalysis}\n\nINSIGHTS:\n${baseInsight}`;
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
    // Use multi-select if available, otherwise fall back to single selection
    const activeDateRanges = selectedDateRanges.length > 0 ? selectedDateRanges : (selectedDateRange ? [selectedDateRange] : []);

    if (activeDateRanges.length === 0 || !projectData.dateRanges) {
      return data;
    }

    // Get all the selected date ranges
    const dateRangeObjects = activeDateRanges
      .map(rangeId => projectData.dateRanges.find(range => range.id === rangeId))
      .filter(Boolean);

    if (dateRangeObjects.length === 0) {
      return data;
    }

    return data.filter(row => {
      // Check if the row matches ANY of the selected date ranges
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
    // 16:9 aspect ratio optimized for laptop screens
    const baseWidth = 800;
    const baseHeight = 450; // 16:9 aspect ratio
    const svgHeight = baseHeight;
    const containerHeight = svgHeight + 40; // Reduced padding for tighter fit

    switch (templateId) {
      case 'simple-bar':
      case 'multi-series-bar':
      case 'stacked-bar':
        return { width: baseWidth, height: containerHeight, svgHeight };
      case 'simple-line':
      case 'multi-line':
        return { width: baseWidth, height: containerHeight, svgHeight };
      case 'area-chart':
        return { width: baseWidth, height: containerHeight, svgHeight };
      case 'pie-chart':
        // Square aspect ratio for pie charts
        return { width: 500, height: 500 + 40, svgHeight: 500 };
      case 'scatter-plot':
        return { width: baseWidth, height: containerHeight, svgHeight };
      default:
        return { width: baseWidth, height: containerHeight, svgHeight };
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

  // Helper function to determine if chart type should use compact (horizontal) layout
  const isCompactChart = (chartType: string, templateId?: string): boolean => {
    const type = (templateId || chartType || '').toLowerCase();
    return type.includes('pie') ||
           type.includes('donut') ||
           type.includes('gauge') ||
           type.includes('circle');
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
                Create your first chart using the form above
              </p>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              width: '100%'
            }}>
              {projectData.charts.map(chart => {
                const config = chart.config as ChartConfiguration;
                const chartData = generateChartData(chart);
                const dimensions = getChartDimensions(config.templateId || chart.type);
                const analysisState = chartAnalyses[chart.id];
                const hasExistingAnalysis = Boolean(analysisState?.content?.trim());
                const analysisButtonLabel = analysisState?.isGenerating
                  ? 'Generating...'
                  : hasExistingAnalysis
                    ? 'Regenerate'
                    : 'Generate';

                // Determine layout based on chart type
                const useHorizontalLayout = isCompactChart(chart.type, config.templateId);


                return (
                  <div key={chart.id} style={{
                    background: '#ffffff',
                    borderRadius: '16px',
                    border: '2px solid #e2e8f0',
                    overflow: 'visible',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)',
                    width: '100%',
                    maxWidth: 'none',
                    minWidth: 'auto',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.12), 0 4px 10px rgba(0, 0, 0, 0.08)';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}>
                    <div style={{
                      padding: '20px 24px',
                      borderBottom: '2px solid #f1f5f9',
                      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      width: 'auto',
                      boxSizing: 'border-box',
                      borderTopLeftRadius: '14px',
                      borderTopRightRadius: '14px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flex: 1 }}>
                        {/* Title Section */}
                        <div>
                          <h4 style={{
                            margin: 0,
                            fontSize: '18px',
                            fontWeight: '600',
                            color: '#1e293b',
                            letterSpacing: '-0.025em',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                          }}>
                            <span style={{
                              fontSize: '12px',
                              color: '#6366f1',
                              background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
                              padding: '3px 8px',
                              borderRadius: '12px',
                              textTransform: 'uppercase',
                              fontWeight: '700',
                              border: '1px solid #c7d2fe',
                              letterSpacing: '0.05em'
                            }}>
                              {chart.type.replace('-', ' ')}
                            </span>
                            {chart.name}
                          </h4>
                        </div>

                        {/* Filters Section */}
                        <div style={{
                          display: 'flex',
                          gap: '12px',
                          alignItems: 'center',
                          flexWrap: 'wrap'
                        }}>
                          {/* Compact Date Filter */}
                          <div style={{
                            background: 'linear-gradient(135deg, #fafbfc 0%, #f1f5f9 100%)',
                            border: '2px solid #d1d5db',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            minWidth: '180px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                            transition: 'all 0.2s ease'
                          }}>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: '600',
                              color: '#374151'
                            }}>📅 Date:</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                              <DateRangeFilter
                                dateRanges={projectData.dateRanges || []}
                                selectedRangeId={selectedDateRange}
                                onRangeSelect={setSelectedDateRange}
                                selectedRangeIds={selectedDateRanges}
                                onDateRangeAdd={(newRange) => {
                                  const updatedData = {
                                    ...projectData,
                                    dateRanges: [...(projectData.dateRanges || []), newRange]
                                  };
                                  onProjectUpdate(updatedData);
                                }}
                                onDateRangeUpdate={(updatedRange) => {
                                  const updatedData = {
                                    ...projectData,
                                    dateRanges: (projectData.dateRanges || []).map(range =>
                                      range.id === updatedRange.id ? updatedRange : range
                                    )
                                  };
                                  onProjectUpdate(updatedData);
                                }}
                                onDateRangeDelete={(id) => {
                                  const updatedData = {
                                    ...projectData,
                                    dateRanges: (projectData.dateRanges || []).filter(range => range.id !== id)
                                  };
                                  onProjectUpdate(updatedData);
                                }}
                                compact={true}
                                onRangeMultiSelect={setSelectedDateRanges}
                              />
                            </div>
                          </div>

                          {/* Compact Chart Filters */}
                          <div style={{
                            background: 'linear-gradient(135deg, #fafbfc 0%, #f1f5f9 100%)',
                            border: '2px solid #d1d5db',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            minWidth: '200px',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                            transition: 'all 0.2s ease'
                          }}>
                            <ChartSlicerControls
                              chart={chart}
                              projectData={projectData}
                              onProjectDataChange={onProjectUpdate}
                              compact={true}
                            />
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {/* Analysis button removed but function kept for later use */}
                        <button
                          onClick={() => setSelectedChart(chart)}
                          style={{
                            padding: '8px 16px',
                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                            color: 'white',
                            border: '1px solid #2563eb',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '500',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 4px 8px rgba(59, 130, 246, 0.3)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.2)';
                          }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleChartDelete(chart.id)}
                          style={{
                            padding: '8px 16px',
                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                            color: 'white',
                            border: '1px solid #dc2626',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '500',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 4px 8px rgba(239, 68, 68, 0.3)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(239, 68, 68, 0.2)';
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>


                    {/* Chart Content - Simplified without Analysis and Insights */}
                    <div style={{
                      padding: '24px',
                      background: 'linear-gradient(135deg, #fefefe 0%, #f8fafc 100%)',
                      borderTop: '1px solid #e5e7eb',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      {chartData ? (
                        <ChartRenderer
                          config={config}
                          data={chartData}
                          width={dimensions.width}
                          height={dimensions.height}
                          forceDisableAnimation={false}
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
                          borderRadius: '12px'
                        }}>
                          <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔍</div>
                          <div style={{ fontSize: '14px', color: '#64748b', textAlign: 'center' }}>No Data Found</div>
                        </div>
                      )}
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
