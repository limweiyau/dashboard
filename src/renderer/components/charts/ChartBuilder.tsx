import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Chart, ProjectData, ColumnInfo } from '../../types';
import { ChartConfiguration, ChartData, ChartTemplate } from '../../types/charts';
import { CHART_TEMPLATES, COLOR_SCHEMES } from './chartTemplates';
import ChartRenderer from './ChartRenderer';
import { roundToMaxDecimals } from '../../utils/numberUtils';

interface ChartBuilderProps {
  chart?: Chart;
  projectData: ProjectData;
  onSave: (chart: Chart) => void;
  onCancel: () => void;
}

const ChartBuilder: React.FC<ChartBuilderProps> = ({
  chart,
  projectData,
  onSave,
  onCancel
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<ChartTemplate | null>(null);
  const [chartConfig, setChartConfig] = useState<ChartConfiguration>({
    templateId: '',
    title: '',
    colorScheme: 'modern',
    colorMode: 'scheme',
    legendMapping: 'categories',
    showLegend: true,
    showGrid: true,
    animation: true,
    legendPosition: 'right',
    titlePosition: 'center',
    aggregation: 'sum',
    // Default position values for proper button highlighting
    titleVerticalPosition: 'top',
    titleHorizontalPosition: 'center',
    legendVerticalPosition: 'top',
    legendHorizontalPosition: 'center',
    dataLabelsPosition: 'top'
  });
  const [chartOpacity, setChartOpacity] = useState(0.8);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [activeTab, setActiveTab] = useState<'data' | 'layout' | 'axes' | 'colors' | 'style'>('data');
  const [layoutSubTab, setLayoutSubTab] = useState<'title' | 'legend' | 'labels' | 'chart'>('title');
  const [axesSubTab, setAxesSubTab] = useState<'x-axis' | 'y-axis' | 'series'>('x-axis');
  const [paddingHorizontal, setPaddingHorizontal] = useState(20);
  const [paddingVertical, setPaddingVertical] = useState(20);
  const [chartOffsetX, setChartOffsetX] = useState(0);
  const [chartOffsetY, setChartOffsetY] = useState(0);
  const [selectedTableId, setSelectedTableId] = useState<string>('main');
  const [isDataSelection, setIsDataSelection] = useState(false);
  const [isLegendMappingChange, setIsLegendMappingChange] = useState(false);
  const [isChartTypeChange, setIsChartTypeChange] = useState(false);
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const legendMappingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollY = useRef(0);

  // Helper function to manage animation state
  const triggerAnimation = (type: 'chartType' | 'legendMapping', duration = 800) => {
    if (type === 'chartType') {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      setIsChartTypeChange(true);
      animationTimeoutRef.current = setTimeout(() => {
        setIsChartTypeChange(false);
        animationTimeoutRef.current = null;
      }, duration);
    } else if (type === 'legendMapping') {
      if (legendMappingTimeoutRef.current) {
        clearTimeout(legendMappingTimeoutRef.current);
      }
      setIsLegendMappingChange(true);
      legendMappingTimeoutRef.current = setTimeout(() => {
        setIsLegendMappingChange(false);
        legendMappingTimeoutRef.current = null;
      }, duration);
    }
  };

  // Cleanup animation timeouts on unmount
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      if (legendMappingTimeoutRef.current) {
        clearTimeout(legendMappingTimeoutRef.current);
      }
    };
  }, []);

  // Responsive chart dimensions based on window size
  const [chartDimensions, setChartDimensions] = useState(() => {
    const maxContainerWidth = window.innerWidth > 1600 ? window.innerWidth * 0.95 - 48 : 1600 - 48;
    const chartPanelWidth = maxContainerWidth * 0.65; // 65% for chart panel
    const availableWidth = chartPanelWidth - 40; // Subtract padding

    // Height is the limiting factor - calculate based on max available height first
    const maxChartHeight = 1200 - 100; // Leave some padding for container
    const maxChartWidth = 1600; // Cap width at extreme screen sizes

    // Calculate width based on available width, but prioritize height constraint
    let proposedWidth = Math.min(availableWidth * 0.95, window.innerWidth * 0.55, maxChartWidth);
    let proposedHeight = proposedWidth * (2/3); // 3:2 aspect ratio

    // If height exceeds limit, use height as constraint and scale width down
    if (proposedHeight > maxChartHeight) {
      proposedHeight = maxChartHeight;
      proposedWidth = proposedHeight * (3/2); // Maintain 3:2 aspect ratio
    }

    // Final width check for extreme screen sizes
    if (proposedWidth > maxChartWidth) {
      proposedWidth = maxChartWidth;
      proposedHeight = proposedWidth * (2/3);
    }

    const containerWidth = proposedWidth;
    const containerHeight = proposedHeight;

    return {
      containerWidth: Math.max(300, containerWidth), // Minimum width
      containerHeight: Math.max(200, containerHeight), // Minimum height (3:2 of 300)
      previewWidth: Math.floor(Math.max(300, containerWidth)),
      previewHeight: Math.floor(Math.max(200, containerHeight))
    };
  });

  // Layout management for adaptive UI
  const [layoutMode, setLayoutMode] = useState<'horizontal' | 'vertical'>('horizontal');
  const [isLayoutTransitioning, setIsLayoutTransitioning] = useState(false);

  // Get current table data and columns based on selection
  const getCurrentTableData = () => {
    if (selectedTableId === 'main') {
      return {
        data: projectData.data,
        columns: projectData.columns
      };
    }
    const selectedTable = projectData.tables?.find(table => table.id === selectedTableId);
    if (selectedTable) {
      // Generate columns from table data if not provided
      const columns = selectedTable.columns || generateColumnsFromData(selectedTable.data);
      return {
        data: selectedTable.data,
        columns
      };
    }
    return {
      data: projectData.data,
      columns: projectData.columns
    };
  };

  const currentTableData = getCurrentTableData();
  const numericColumns = currentTableData.columns.filter(col => col.type === 'number');
  const categoricalColumns = currentTableData.columns.filter(col => col.type === 'string' || col.type === 'date');
  const allColumns = currentTableData.columns;

  // Detect zoom level and apply curved scaling
  const devicePixelRatio = window.devicePixelRatio || 1;

  // Curved scaling function: more aggressive at higher zoom levels
  const calculateZoomScale = (ratio: number): number => {
    if (ratio <= 1) return 1; // No scaling at 100% or below

    // Exponential curve: slightly more aggressive scaling at higher zoom levels
    // At 150% (1.5): scale ≈ 0.87
    // At 200% (2.0): scale ≈ 0.76
    // At 250% (2.5): scale ≈ 0.68
    const exponent = 1.0; // Controls curve aggressiveness (slightly more aggressive)
    return Math.pow(1 / ratio, exponent);
  };

  const zoomScale = calculateZoomScale(devicePixelRatio);

  // Configuration panel sizing constants - with zoom-aware scaling
  const CONFIG_HEADER_HEIGHT = 56;
  const TAB_NAV_HEIGHT = 64;
  const FOOTER_HEIGHT = 82;
  const PANEL_PADDING_ALLOWANCE = 24; // additional breathing room

  // Base values (at 100% zoom) - reduced for shorter containers
  const BASE_PANEL_MIN_HEIGHT = 400;
  const BASE_PANEL_MAX_HEIGHT = 800;
  const BASE_MIN_VH = 35;

  // Apply zoom scaling
  const PANEL_MIN_HEIGHT = Math.round(BASE_PANEL_MIN_HEIGHT * zoomScale);
  const PANEL_MAX_HEIGHT = Math.round(BASE_PANEL_MAX_HEIGHT * zoomScale);
  const SCALED_MIN_VH = Math.round(BASE_MIN_VH * zoomScale);

  const computedPanelHeight = Math.min(
    Math.max(
      chartDimensions.previewHeight + CONFIG_HEADER_HEIGHT + TAB_NAV_HEIGHT + FOOTER_HEIGHT + PANEL_PADDING_ALLOWANCE,
      PANEL_MIN_HEIGHT
    ),
    PANEL_MAX_HEIGHT
  );

  // Helper function to generate columns from data if not provided
  const generateColumnsFromData = (data: any[]): ColumnInfo[] => {
    if (!data || data.length === 0) return [];

    const firstRow = data[0];
    return Object.keys(firstRow).map(key => {
      const sampleValue = firstRow[key];
      let type: 'string' | 'number' | 'date' | 'boolean';

      if (typeof sampleValue === 'number') {
        type = 'number';
      } else if (typeof sampleValue === 'boolean') {
        type = 'boolean';
      } else if (sampleValue instanceof Date ||
                 (typeof sampleValue === 'string' && !isNaN(Date.parse(sampleValue)) &&
                  /^\d{4}-\d{2}-\d{2}|^\d{1,2}\/\d{1,2}\/\d{4}|^\d{4}\/\d{1,2}\/\d{1,2}/.test(sampleValue))) {
        type = 'date';
      } else {
        type = 'string';
      }

      return {
        name: key,
        type,
        originalName: key
      };
    });
  };

  // Chart size classification for adaptive layout
  const getChartLayoutType = (templateId: string | null): 'big' | 'small' => {
    if (!templateId) return 'big';

    const bigChartTypes = [
      'simple-bar', 'multi-series-bar', 'stacked-bar',
      'simple-line', 'multi-line', 'area-chart',
      'scatter-plot'
    ];

    const smallChartTypes = [
      'pie-chart', 'donut-chart'
    ];

    return bigChartTypes.includes(templateId) ? 'big' : 'small';
  };

  // Determine layout mode based on chart type
  const shouldUseVerticalLayout = (templateId: string | null): boolean => {
    return false; // Always use horizontal (side-by-side) layout
  };

  useEffect(() => {
    if (chart && chart.config && typeof chart.config === 'object') {
      const config = chart.config as any;
      if (config.templateId) {
        const template = CHART_TEMPLATES.find(t => t.id === config.templateId);
        if (template) {
          setSelectedTemplate(template);
          // Load table selection if available
          if (config.tableId) {
            setSelectedTableId(config.tableId);
          }
          setChartConfig({
            // Basic configuration
            templateId: config.templateId,
            title: config.title || chart.name || '',
            xAxisField: config.xAxisField,
            yAxisField: config.yAxisField,
            categoryField: config.categoryField,
            valueField: config.valueField,
            seriesField: config.seriesField,
            aggregation: config.aggregation || 'sum',

            // Color configuration
            colorScheme: config.colorScheme || template.recipe.configuration.colorScheme,
            colorMode: config.colorMode || 'scheme',
            customColors: config.customColors,
            singleColor: config.singleColor,

            // Display options
            showLegend: config.showLegend ?? template.recipe.configuration.showLegend,
            showGrid: config.showGrid ?? template.recipe.configuration.showGrid,
            animation: config.animation ?? template.recipe.configuration.animation,

            // Legend configuration
            legendPosition: config.legendPosition || 'right',
            legendVerticalPosition: config.legendVerticalPosition || 'top',
            legendHorizontalPosition: config.legendHorizontalPosition || 'center',
            legendMapping: config.legendMapping || 'categories',
            legendCustomPosition: config.legendCustomPosition,
            legendOffsetX: config.legendOffsetX,
            legendOffsetY: config.legendOffsetY,

            // Title configuration
            titlePosition: config.titlePosition || 'center',
            titleVerticalPosition: config.titleVerticalPosition || 'top',
            titleHorizontalPosition: config.titleHorizontalPosition || 'center',
            titleCustomPosition: config.titleCustomPosition,
            titleOffsetX: config.titleOffsetX,
            titleOffsetY: config.titleOffsetY,

            // Data labels
            showDataLabels: config.showDataLabels,
            dataLabelsPosition: config.dataLabelsPosition || (() => {
              // Set appropriate default based on chart type
              switch (template?.id) {
                case 'pie-chart':
                  return 'outside';
                case 'simple-bar':
                case 'multi-series-bar':
                case 'stacked-bar':
                case 'simple-line':
                case 'multi-line':
                case 'area-chart':
                case 'scatter-plot':
                  return 'top';
                default:
                  return 'top';
              }
            })(),
            dataLabelsColor: config.dataLabelsColor,
            dataLabelsOffsetX: config.dataLabelsOffsetX,
            dataLabelsOffsetY: config.dataLabelsOffsetY,

            // Padding
            paddingHorizontal: config.paddingHorizontal,
            paddingVertical: config.paddingVertical,

            // Number formatting
            numberFormat: config.numberFormat,

            // Font sizes
            titleFontSize: config.titleFontSize,
            legendFontSize: config.legendFontSize,
            dataLabelsFontSize: config.dataLabelsFontSize,
            xAxisFontSize: config.xAxisFontSize,
            yAxisFontSize: config.yAxisFontSize,
            xAxisLabelFontSize: config.xAxisLabelFontSize,
            yAxisLabelFontSize: config.yAxisLabelFontSize,

            // Axis labels
            xAxisLabel: config.xAxisLabel,
            yAxisLabel: config.yAxisLabel,

            // Axis label positioning
            xAxisLabelOffsetX: config.xAxisLabelOffsetX,
            xAxisLabelOffsetY: config.xAxisLabelOffsetY,
            yAxisLabelOffsetX: config.yAxisLabelOffsetX,
            yAxisLabelOffsetY: config.yAxisLabelOffsetY,

            // Axis positioning
            xAxisOffsetX: config.xAxisOffsetX,
            xAxisOffsetY: config.xAxisOffsetY,
            yAxisOffsetX: config.yAxisOffsetX,
            yAxisOffsetY: config.yAxisOffsetY,

            // Axis configuration
            showXAxisTicks: config.showXAxisTicks,
            showYAxisTicks: config.showYAxisTicks,
            rotateXAxisLabels: config.rotateXAxisLabels,
            rotateYAxisLabels: config.rotateYAxisLabels,
            xAxisMin: config.xAxisMin,
            xAxisMax: config.xAxisMax,
            yAxisMin: config.yAxisMin,
            yAxisMax: config.yAxisMax,

            // Trend line configuration (for scatter plots)
            showTrendLine: config.showTrendLine,
            trendLineColor: config.trendLineColor,
            trendLineWidth: config.trendLineWidth,
            trendLineStyle: config.trendLineStyle,
            showTrendLineStats: config.showTrendLineStats,
            trendLineStatsOffsetX: config.trendLineStatsOffsetX,
            trendLineStatsOffsetY: config.trendLineStatsOffsetY,
            trendLineStatsFontSize: config.trendLineStatsFontSize
          });

          // Load padding state variables for 1:1 preview-to-display replica
          if (config.paddingHorizontal !== undefined) {
            setPaddingHorizontal(config.paddingHorizontal);
          }
          if (config.paddingVertical !== undefined) {
            setPaddingVertical(config.paddingVertical);
          }
          // Load chart position offsets
          if (config.chartOffsetX !== undefined) {
            setChartOffsetX(config.chartOffsetX);
          }
          if (config.chartOffsetY !== undefined) {
            setChartOffsetY(config.chartOffsetY);
          }
        }
      }
    }
  }, [chart]);

  useEffect(() => {
    if (selectedTemplate) {
      generateChartData();
    }
  }, [chartConfig, selectedTemplate, projectData, selectedTableId]);

  // Handle layout transitions when chart template changes
  useEffect(() => {
    const newLayoutMode = shouldUseVerticalLayout(selectedTemplate?.id || null) ? 'vertical' : 'horizontal';

    if (newLayoutMode !== layoutMode) {
      // No transition animation - just set immediately to avoid resizing
      setLayoutMode(newLayoutMode);
    }
  }, [selectedTemplate?.id, layoutMode]);

  // Handle window resize for responsive chart dimensions
  useEffect(() => {
    const handleResize = () => {
      const maxContainerWidth = window.innerWidth > 1600 ? window.innerWidth * 0.95 - 48 : 1600 - 48;
      const chartPanelWidth = maxContainerWidth * 0.65; // 65% for chart panel
      const availableWidth = chartPanelWidth - 40; // Subtract padding

      // Calculate available height from computedPanelHeight
      const availableHeight = computedPanelHeight - 32; // Subtract padding (16px top + 16px bottom)

      // Ensure chart doesn't exceed container bounds and maintains good proportions
      const containerWidth = Math.min(availableWidth * 0.95, window.innerWidth * 0.55);
      let containerHeight = containerWidth * (2/3); // 3:2 aspect ratio

      // IMPORTANT: Constrain height to available vertical space
      if (containerHeight > availableHeight) {
        containerHeight = availableHeight;
      }

      setChartDimensions({
        containerWidth: Math.max(300, containerWidth), // Minimum width
        containerHeight: Math.max(200, containerHeight), // Minimum height (3:2 of 300)
        previewWidth: Math.floor(Math.max(300, containerWidth)),
        previewHeight: Math.floor(Math.max(200, containerHeight))
      });
    };

    window.addEventListener('resize', handleResize);

    // Force initial recalculation to fix positioning
    const timer = setTimeout(() => {
      handleResize();
    }, 100);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [computedPanelHeight]);

  // Auto-hide navbar on scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        // Scrolling down & past 100px - hide navbar
        setIsNavbarVisible(false);
      } else if (currentScrollY < lastScrollY.current) {
        // Scrolling up - show navbar
        setIsNavbarVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Sync chart position offsets with chart config
  useEffect(() => {
    setChartConfig(prev => ({
      ...prev,
      paddingHorizontal,
      paddingVertical,
      chartOffsetX,
      chartOffsetY
    }));
  }, [paddingHorizontal, paddingVertical, chartOffsetX, chartOffsetY]);

  const handleTemplateSelect = (template: ChartTemplate) => {
    triggerAnimation('chartType');
    setSelectedTemplate(template);

    // Determine smart defaults based on chart type
    const isSingleSeriesChart = !template.recipe.requiredFields.series;
    const defaultLegendMapping = isSingleSeriesChart ? 'categories' : 'categories'; // Default to categories for better UX

    // Set chart-specific data label defaults
    let defaultDataLabelsComponents = {};

    if (template.category === 'bar') {
      // Bar charts should show values, not percentages
      defaultDataLabelsComponents = {
        showValue: true,
        showPercentage: false,
        showCategory: false,
        showSeriesName: false
      };
    } else if (template.category === 'pie') {
      // Pie charts should show percentages
      defaultDataLabelsComponents = {
        showValue: false,
        showPercentage: true,
        showCategory: false,
        showSeriesName: false
      };
    } else if (template.category === 'line') {
      // Line charts should show values
      defaultDataLabelsComponents = {
        showValue: true,
        showPercentage: false,
        showCategory: false,
        showSeriesName: false
      };
    } else if (template.category === 'scatter') {
      // Scatter charts should show coordinates
      defaultDataLabelsComponents = {
        showCoordinates: true,
        showValue: false,
        showPercentage: false,
        showCategory: false,
        showSeriesName: false
      };
    }

    setChartConfig({
      templateId: template.id,
      title: chartConfig.title || 'New Chart',
      colorScheme: template.recipe.configuration.colorScheme,
      colorMode: 'scheme', // Use color schemes by default for better visual variety
      legendMapping: defaultLegendMapping,
      showLegend: template.recipe.configuration.showLegend || template.recipe.requiredFields.series,
      showGrid: template.recipe.configuration.showGrid,
      animation: template.recipe.configuration.animation,

      // Chart-specific data label defaults
      dataLabelsComponents: defaultDataLabelsComponents,

      // Default position values for proper button highlighting
      titlePosition: 'center',
      titleVerticalPosition: 'top',
      titleHorizontalPosition: 'center',
      legendPosition: 'right',
      legendVerticalPosition: 'top',
      legendHorizontalPosition: 'center',
      dataLabelsPosition: template?.id === 'pie-chart' ? 'outside' : 'top',
      aggregation: 'sum'
    });
  };

  const isConfigurationComplete = (): boolean => {
    if (!selectedTemplate) return false;

    const recipe = selectedTemplate.recipe;

    if (recipe.requiredFields.xAxis && !chartConfig.xAxisField) return false;
    if (recipe.requiredFields.yAxis && !chartConfig.yAxisField) return false;
    if (recipe.requiredFields.category && !chartConfig.categoryField) return false;
    if (recipe.requiredFields.value && !chartConfig.valueField) return false;
    if (recipe.requiredFields.series && !chartConfig.seriesField) return false;

    return true;
  };

  const generateChartData = () => {
    if (!selectedTemplate || !currentTableData.data.length) return;

    let labels: string[] = [];
    let datasets: ChartData['datasets'] = [];

    const recipe = selectedTemplate.recipe;

    try {
      if (recipe.type === 'pie') {
        // Pie chart - needs both category and value fields
        if (chartConfig.categoryField && chartConfig.valueField) {
          // Aggregate data by categories
          const categoryMap = new Map<string, number>();

          currentTableData.data.forEach(row => {
            const category = String(row[chartConfig.categoryField!] || 'N/A');
            const value = Number(row[chartConfig.valueField!]) || 0;

            if (categoryMap.has(category)) {
              // Apply aggregation method
              const existingValue = categoryMap.get(category)!;
              switch (chartConfig.aggregation) {
                case 'sum':
                  categoryMap.set(category, existingValue + value);
                  break;
                case 'average':
                  // For average, we need to track count separately - for now use sum and divide later
                  categoryMap.set(category, existingValue + value);
                  break;
                case 'count':
                  categoryMap.set(category, existingValue + 1);
                  break;
                case 'min':
                  categoryMap.set(category, Math.min(existingValue, value));
                  break;
                case 'max':
                  categoryMap.set(category, Math.max(existingValue, value));
                  break;
                case 'none':
                  // Keep first value
                  break;
                default:
                  categoryMap.set(category, existingValue + value); // Default to sum
                  break;
              }
            } else {
              categoryMap.set(category, value);
            }
          });

          // Handle average aggregation post-processing
          if (chartConfig.aggregation === 'average') {
            const countMap = new Map<string, number>();
            currentTableData.data.forEach(row => {
              const category = String(row[chartConfig.categoryField!] || 'N/A');
              countMap.set(category, (countMap.get(category) || 0) + 1);
            });

            categoryMap.forEach((sum, category) => {
              const count = countMap.get(category) || 1;
              categoryMap.set(category, sum / count);
            });
          }

          labels = Array.from(categoryMap.keys());
          datasets = [{
            label: chartConfig.valueField || 'Data',
            data: Array.from(categoryMap.values())
          }];
        } else {
          // Show sample data for preview when no fields are selected or only one field is selected
          labels = ['Sample A', 'Sample B', 'Sample C', 'Sample D'];
          datasets = [{
            label: 'Preview',
            data: [30, 45, 25, 35]
          }];
        }
      } else if (recipe.type === 'scatter') {
        // Scatter plot - x and y both need to be numeric values in {x, y} format
        labels = []; // Scatter plots don't use labels

        if (chartConfig.xAxisField && chartConfig.yAxisField) {
          const yField = Array.isArray(chartConfig.yAxisField) ? chartConfig.yAxisField[0] : chartConfig.yAxisField;

          datasets = [{
            label: 'Data Points',
            data: currentTableData.data.map(row => ({
              x: Number(row[chartConfig.xAxisField!]) || 0,
              y: Number(row[yField!]) || 0
            }))
          }];
        } else {
          // Show sample scatter data for preview when no fields are selected
          datasets = [{
            label: 'Preview',
            data: [
              { x: 10, y: 20 },
              { x: 25, y: 35 },
              { x: 40, y: 60 },
              { x: 35, y: 45 },
              { x: 60, y: 75 },
              { x: 20, y: 30 },
              { x: 70, y: 85 },
              { x: 45, y: 50 }
            ]
          }];
        }
      } else {
        // Bar, line, area charts - show partial data as soon as we have an axis
        if (chartConfig.xAxisField) {
          // Get unique labels from the selected field, filter out undefined/null
          labels = [...new Set(currentTableData.data
            .map(row => row[chartConfig.xAxisField!])
            .filter(value => value !== undefined && value !== null && value !== '')
            .map(value => String(value))
          )];

          // If no valid data, use fallback
          if (labels.length === 0) {
            labels = ['No Data'];
          }
        } else {
          // Default sample labels
          labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        }

        if (chartConfig.seriesField && chartConfig.yAxisField) {
          // Multi-series chart with real data
          const seriesValues = [...new Set(currentTableData.data.map(row => String(row[chartConfig.seriesField!] || 'Default')))];

          datasets = seriesValues.map(series => {
            const seriesData = labels.map(label => {
              const matchingRows = currentTableData.data.filter(row =>
                String(row[chartConfig.xAxisField!] || 'N/A') === label &&
                String(row[chartConfig.seriesField!] || 'Default') === series
              );

              if (matchingRows.length > 0) {
                const yField = Array.isArray(chartConfig.yAxisField) ? chartConfig.yAxisField[0] : chartConfig.yAxisField;
                const values = matchingRows.map(row => Number(row[yField!]) || 0);

                switch (chartConfig.aggregation) {
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
                    return values[0] || 0; // Return first value without aggregation
                  default:
                    return values.reduce((sum, val) => sum + val, 0); // Default to sum
                }
              }
              return 0;
            });

            return {
              label: series,
              data: seriesData
            };
          });
        } else if (chartConfig.yAxisField) {
          // Single series chart with real data
          const data = labels.map(label => {
            const matchingRows = currentTableData.data.filter(row =>
              String(row[chartConfig.xAxisField!] || 'N/A') === label
            );

            if (matchingRows.length > 0) {
              const yField = Array.isArray(chartConfig.yAxisField) ? chartConfig.yAxisField[0] : chartConfig.yAxisField;
              const values = matchingRows.map(row => Number(row[yField!]) || 0);

              switch (chartConfig.aggregation) {
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
                  return values[0] || 0; // Return first value without aggregation
                default:
                  return values.reduce((sum, val) => sum + val, 0); // Default to sum
              }
            }
            return 0;
          });

          datasets = [{
            label: Array.isArray(chartConfig.yAxisField) ? chartConfig.yAxisField[0] : chartConfig.yAxisField,
            data: data
          }];
        } else {
          // Show sample data for preview - match the number of labels
          const generateSampleData = (count: number) =>
            Array.from({length: count}, () => Math.floor(Math.random() * 80) + 20);

          if (recipe.type === 'multi-line') {
            datasets = [
              {
                label: 'Revenue',
                data: generateSampleData(labels.length)
              },
              {
                label: 'Profit',
                data: generateSampleData(labels.length)
              },
              {
                label: 'Expenses',
                data: generateSampleData(labels.length)
              }
            ];
          } else if (recipe.type === 'multi-bar') {
            // Multi-series bar chart preview
            datasets = [
              {
                label: 'Q1 Sales',
                data: generateSampleData(labels.length)
              },
              {
                label: 'Q2 Sales',
                data: generateSampleData(labels.length)
              },
              {
                label: 'Q3 Sales',
                data: generateSampleData(labels.length)
              }
            ];
          } else if (recipe.type === 'stacked-bar') {
            // Stacked bar chart preview
            datasets = [
              {
                label: 'Product A',
                data: generateSampleData(labels.length)
              },
              {
                label: 'Product B',
                data: generateSampleData(labels.length)
              },
              {
                label: 'Product C',
                data: generateSampleData(labels.length)
              }
            ];
          } else {
            // Single bar chart and other chart types
            datasets = [{
              label: 'Preview',
              data: generateSampleData(labels.length)
            }];
          }
        }
      }

      // Scatter plots don't need labels, so check differently
      const isScatterPlot = recipe.type === 'scatter';
      const hasValidData = isScatterPlot ? datasets.length > 0 : (labels.length > 0 && datasets.length > 0);

      if (hasValidData) {
        // Round all dataset values and auto-detect decimal formatting needs
        const roundedDatasets = datasets.map(dataset => {
          const roundedData = (dataset.data as any[]).map(value => {
            if (typeof value === 'number') {
              return roundToMaxDecimals(value);
            }

            if (value && typeof value === 'object' && 'x' in value && 'y' in value) {
              return {
                ...value,
                x: roundToMaxDecimals((value as any).x ?? 0),
                y: roundToMaxDecimals((value as any).y ?? 0)
              };
            }

            return value;
          }) as typeof dataset.data;

          return {
            ...dataset,
            data: roundedData
          };
        });

        // Check if data has decimal values that need formatting
        const decimalPlacesForValue = (value: number) => {
          const absValue = Math.abs(value);
          const parts = absValue.toString().split('.');
          if (parts.length < 2) return 0;
          const fractional = parts[1].replace(/0+$/, '');
          return Math.min(3, fractional.length);
        };

        const isManualDecimals = chartConfig.numberFormat?.decimalsManuallySet;

        if (!isManualDecimals) {
          const detectedDecimals = roundedDatasets.reduce((maxDecimals, dataset) => {
            const datasetMax = dataset.data.reduce((max, value) => {
              if (typeof value === 'number') {
                const decimals = decimalPlacesForValue(value);
                return Math.max(max, decimals);
              } else if (value && typeof value === 'object' && 'x' in value && 'y' in value) {
                // For scatter plots with {x, y} format
                const xDecimals = decimalPlacesForValue((value as any).x);
                const yDecimals = decimalPlacesForValue((value as any).y);
                return Math.max(max, xDecimals, yDecimals);
              }
              return max;
            }, 0);
            return Math.max(maxDecimals, datasetMax);
          }, 0);

          // Auto-set decimal places based on detected precision when none configured yet
          if (detectedDecimals > 0 && (chartConfig.numberFormat?.decimals ?? 0) === 0) {
            setChartConfig(prev => ({
              ...prev,
              numberFormat: {
                ...prev.numberFormat,
                decimals: detectedDecimals,
                decimalsManuallySet: false
              }
            }));
          }
        }

        setChartData({ labels, datasets: roundedDatasets });
      } else {
        setChartData(null);
      }
    } catch (error) {
      console.error('Error generating chart data:', error);
      setChartData(null);
    }
  };

  const handleSave = () => {
    if (!selectedTemplate || !isConfigurationComplete()) return;

    const updatedChart: Chart = {
      id: chart?.id || Date.now().toString(),
      name: chartConfig.title || 'New Chart',
      type: selectedTemplate.category,
      config: {
        ...chartConfig,
        templateId: selectedTemplate.id, // Ensure templateId is preserved for correct chart type rendering
        tableId: selectedTableId !== 'main' ? selectedTableId : undefined,
        paddingHorizontal, // Include padding values for 1:1 preview-to-display replica
        paddingVertical    // Include padding values for 1:1 preview-to-display replica
      } as any, // Temporary fix for type compatibility
      createdAt: (chart?.createdAt || new Date()).toString(),
      updatedAt: new Date().toString()
    };
    onSave(updatedChart);
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '24px',
      overflowY: 'auto',
      overflowX: 'hidden',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <div style={{
        display: 'flex',
        flexDirection: layoutMode === 'vertical' ? 'column' : 'row',
        height: layoutMode === 'vertical' ? 'auto' : 'auto',
        minHeight: `${SCALED_MIN_VH}vh`,
        gap: layoutMode === 'vertical' ? '16px' : '12px',
        maxWidth: window.innerWidth > 1600 ? '95vw' : '1600px',
        width: '100%',
        transition: 'none'
      }}>
        {/* Configuration Panel - Adaptive sizing */}
        <div style={{
          width: layoutMode === 'vertical' ? '100%' : '35%',
          order: layoutMode === 'vertical' ? 2 : 1,
          background: 'rgba(255, 255, 255, 0.98)',
          borderRadius: '12px',
          boxShadow: '0 15px 35px rgba(0, 0, 0, 0.15)',
          backdropFilter: 'blur(20px)',
          display: 'flex',
          flexDirection: 'column',
          flexWrap: 'nowrap',
          height: layoutMode === 'vertical' ? 'auto' : computedPanelHeight,
          minHeight: layoutMode === 'vertical' ? 'auto' : computedPanelHeight,
          maxHeight: layoutMode === 'vertical' ? 'none' : computedPanelHeight,
          overflow: 'hidden'
        }}>
          {/* Chart Type Selection - Compact Dropdown */}
          <div style={{
            padding: '14px 20px 12px 20px',
            borderBottom: '1px solid #f1f5f9',
            flexShrink: 0,
            transform: `translateY(${isNavbarVisible ? '0' : '-100%'})`,
            transition: 'transform 0.3s ease-in-out',
            overflow: 'hidden'
          }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px', display: 'block' }}>
              📊 Chart Type
            </label>
            <select
              value={selectedTemplate?.id || ''}
              onChange={(e) => {
                const template = CHART_TEMPLATES.find(t => t.id === e.target.value);
                if (template) handleTemplateSelect(template);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '14px',
                background: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="">Select a chart type...</option>
              {CHART_TEMPLATES.map(template => (
                <option key={template.id} value={template.id}>
                  {template.icon} {template.name}
                </option>
              ))}
            </select>
            {selectedTemplate && (
              <div style={{
                fontSize: '12px',
                color: '#6b7280',
                marginTop: '4px',
                fontStyle: 'italic'
              }}>
                {selectedTemplate.description}
              </div>
            )}
          </div>

          {/* Configuration Panel with Tabs */}
          {selectedTemplate && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Tab Navigation */}
              <div style={{ padding: '12px 20px 0 20px', flexShrink: 0 }}>
                <div style={{
                  display: 'flex',
                  background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                  borderRadius: '12px',
                  padding: '3px',
                  border: '1px solid rgba(148, 163, 184, 0.2)'
                }}>
                  {[
                    { key: 'data', icon: '📊', label: 'Data', color: '#3b82f6' },
                    { key: 'layout', icon: '📐', label: 'Layout', color: '#f59e0b' },
                    { key: 'axes', icon: '📏', label: 'Axes', color: '#ef4444' },
                    { key: 'colors', icon: '🎨', label: 'Colors', color: '#10b981' },
                    { key: 'style', icon: '✨', label: 'Style', color: '#8b5cf6' }
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key as any)}
                      style={{
                        flex: 1,
                        padding: '8px 4px',
                        border: 'none',
                        background: activeTab === tab.key
                          ? `linear-gradient(135deg, ${tab.color} 0%, ${tab.color}dd 100%)`
                          : 'transparent',
                        color: activeTab === tab.key ? 'white' : '#64748b',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: activeTab === tab.key ? '600' : '500',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: activeTab === tab.key ? '0 4px 12px rgba(0, 0, 0, 0.15)' : 'none',
                        transform: activeTab === tab.key ? 'translateY(-1px)' : 'translateY(0)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <div style={{ fontSize: '16px', lineHeight: 1 }}>{tab.icon}</div>
                      <div style={{ fontSize: '11px', lineHeight: 1 }}>{tab.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content - Dynamic Height */}
              <div style={{
                padding: '16px 20px',
                flex: '1 1 0',
                overflowY: layoutMode === 'vertical' ? 'visible' : 'auto',
                overflowX: 'hidden',
                minHeight: 0,
                maxHeight: layoutMode === 'vertical' ? 'none' : Math.max(computedPanelHeight - (CONFIG_HEADER_HEIGHT + TAB_NAV_HEIGHT + FOOTER_HEIGHT), 220)
              }}>
                {/* Data Tab */}
                {activeTab === 'data' && (
                  <div>
                    {/* Table Selection */}
                    <div style={{ marginBottom: '20px', padding: '16px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                      <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600', color: '#374151' }}>
                        📊 Data Source Selection
                      </h3>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: '#6b7280' }}>
                          Select Data Table *
                        </label>
                        <select
                          value={selectedTableId}
                          onChange={(e) => {
                            const newTableId = e.target.value;
                            const newTable = newTableId === 'main'
                              ? { columns: projectData.columns }
                              : projectData.tables.find(t => t.id === newTableId);

                            if (!newTable) return;

                            // Check which fields will become invalid
                            const invalidFields: string[] = [];
                            const newColumnNames = newTable.columns.map(c => c.name);

                            if (chartConfig.xAxisField && !newColumnNames.includes(chartConfig.xAxisField)) {
                              invalidFields.push('X-Axis');
                            }
                            if (chartConfig.yAxisField) {
                              const yFields = Array.isArray(chartConfig.yAxisField)
                                ? chartConfig.yAxisField
                                : [chartConfig.yAxisField];
                              if (yFields.some(f => !newColumnNames.includes(f))) {
                                invalidFields.push('Y-Axis');
                              }
                            }
                            if (chartConfig.categoryField && !newColumnNames.includes(chartConfig.categoryField)) {
                              invalidFields.push('Category');
                            }
                            if (chartConfig.valueField && !newColumnNames.includes(chartConfig.valueField)) {
                              invalidFields.push('Value');
                            }
                            if (chartConfig.seriesField && !newColumnNames.includes(chartConfig.seriesField)) {
                              invalidFields.push('Series');
                            }

                            // Show warning if fields will be reset
                            if (invalidFields.length > 0) {
                              const message = `Switching tables will reset these fields because they don't exist in the new table:\n\n${invalidFields.join(', ')}\n\nContinue?`;
                              if (!confirm(message)) {
                                return;
                              }
                            }

                            setSelectedTableId(newTableId);

                            // Only reset invalid fields
                            setChartConfig(prev => ({
                              ...prev,
                              xAxisField: newColumnNames.includes(prev.xAxisField || '') ? prev.xAxisField : '',
                              yAxisField: Array.isArray(prev.yAxisField)
                                ? prev.yAxisField.filter(f => newColumnNames.includes(f))
                                : (newColumnNames.includes(prev.yAxisField || '') ? prev.yAxisField : ''),
                              categoryField: newColumnNames.includes(prev.categoryField || '') ? prev.categoryField : '',
                              valueField: newColumnNames.includes(prev.valueField || '') ? prev.valueField : '',
                              seriesField: newColumnNames.includes(prev.seriesField || '') ? prev.seriesField : ''
                            }));
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '14px',
                            background: 'white'
                          }}
                        >
                          <option value="main">
                            {projectData.name || 'Main Dataset'} ({projectData.data.length} rows)
                          </option>
                          {projectData.tables && projectData.tables.map(table => (
                            <option key={table.id} value={table.id}>
                              {table.name} ({table.data.length} rows)
                            </option>
                          ))}
                        </select>
                        {selectedTableId !== 'main' && (
                          <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
                            ✓ Using table: {projectData.tables?.find(t => t.id === selectedTableId)?.name}
                          </div>
                        )}
                        {(!projectData.tables || projectData.tables.length === 0) && (
                          <div style={{ marginTop: '8px', fontSize: '12px', color: '#9ca3af', fontStyle: 'italic' }}>
                            Tip: You can upload additional tables from the Data tab
                          </div>
                        )}
                      </div>

                    {selectedTemplate.recipe.requiredFields.xAxis && (
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                          X-Axis Field *
                        </label>
                        <select
                          value={chartConfig.xAxisField || ''}
                          onChange={(e) => {
                            setIsDataSelection(true);
                            setChartConfig(prev => ({ ...prev, xAxisField: e.target.value }));
                            setTimeout(() => setIsDataSelection(false), 1000);
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        >
                          <option value="">Select field...</option>
                          {(selectedTemplate.recipe.type === 'scatter' ? numericColumns : categoricalColumns).map(col => (
                            <option key={col.name} value={col.name}>{col.name} ({col.type})</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {selectedTemplate.recipe.requiredFields.yAxis && (
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                          Y-Axis Field *
                        </label>
                        <select
                          value={chartConfig.yAxisField || ''}
                          onChange={(e) => {
                            setIsDataSelection(true);
                            setChartConfig(prev => ({ ...prev, yAxisField: e.target.value }));
                            setTimeout(() => setIsDataSelection(false), 1000);
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        >
                          <option value="">Select field...</option>
                          {numericColumns.map(col => (
                            <option key={col.name} value={col.name}>{col.name} ({col.type})</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {selectedTemplate.recipe.requiredFields.category && (
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                          Category Field *
                        </label>
                        <select
                          value={chartConfig.categoryField || ''}
                          onChange={(e) => {
                            setIsDataSelection(true);
                            setChartConfig(prev => ({ ...prev, categoryField: e.target.value }));
                            setTimeout(() => setIsDataSelection(false), 1000);
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        >
                          <option value="">Select field...</option>
                          {categoricalColumns.map(col => (
                            <option key={col.name} value={col.name}>{col.name} ({col.type})</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {selectedTemplate.recipe.requiredFields.value && (
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                          Value Field *
                        </label>
                        <select
                          value={chartConfig.valueField || ''}
                          onChange={(e) => {
                            setIsDataSelection(true);
                            setChartConfig(prev => ({ ...prev, valueField: e.target.value }));
                            setTimeout(() => setIsDataSelection(false), 1000);
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        >
                          <option value="">Select field...</option>
                          {numericColumns.map(col => (
                            <option key={col.name} value={col.name}>{col.name} ({col.type})</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {selectedTemplate.recipe.requiredFields.series && (
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                          Series Field
                        </label>
                        <select
                          value={chartConfig.seriesField || ''}
                          onChange={(e) => {
                            setIsDataSelection(true);
                            setChartConfig(prev => ({ ...prev, seriesField: e.target.value }));
                            setTimeout(() => setIsDataSelection(false), 1000);
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        >
                          <option value="">Select field...</option>
                          {categoricalColumns.map(col => (
                            <option key={col.name} value={col.name}>{col.name} ({col.type})</option>
                          ))}
                        </select>
                      </div>
                    )}

                  </div>
                )}

                {/* Layout Tab */}
                {activeTab === 'layout' && (
                  <div>
                    {/* Layout Sub-tabs */}
                    <div style={{
                      display: 'flex',
                      marginBottom: '16px',
                      borderBottom: '1px solid #e5e7eb'
                    }}>
                      {[
                        { key: 'title', label: 'Title' },
                        { key: 'legend', label: 'Legend' },
                        { key: 'labels', label: 'Labels' },
                        { key: 'chart', label: 'Chart' }
                      ].map((tab) => (
                        <button
                          key={tab.key}
                          onClick={() => setLayoutSubTab(tab.key as any)}
                          style={{
                            padding: '8px 16px',
                            background: 'none',
                            border: 'none',
                            borderBottom: layoutSubTab === tab.key ? '2px solid #6366f1' : '2px solid transparent',
                            fontSize: '13px',
                            fontWeight: layoutSubTab === tab.key ? '600' : '500',
                            color: layoutSubTab === tab.key ? '#6366f1' : '#6b7280',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Title Sub-tab */}
                    {layoutSubTab === 'title' && (
                      <div>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                        Chart Title
                      </label>
                      <input
                        type="text"
                        value={chartConfig.title || ''}
                        onChange={(e) => setChartConfig(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Enter chart title"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                    </div>

                    {/* Title Position */}
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                        Title Position
                      </label>

                      {/* Vertical & Horizontal stacked vertically */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <label style={{ fontSize: '12px', color: '#9ca3af', minWidth: '60px' }}>Vertical:</label>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {[
                              { value: 'top', label: 'Top' },
                              { value: 'bottom', label: 'Bottom' }
                            ].map((option) => (
                              <button
                                key={option.value}
                                onClick={() => setChartConfig(prev => ({ ...prev, titleVerticalPosition: option.value as any }))}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  border: chartConfig.titleVerticalPosition === option.value ? '2px solid #6366f1' : '1px solid #e5e7eb',
                                  borderRadius: '4px',
                                  background: chartConfig.titleVerticalPosition === option.value ? '#eff6ff' : 'white',
                                  color: chartConfig.titleVerticalPosition === option.value ? '#6366f1' : '#6b7280',
                                  cursor: 'pointer'
                                }}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <label style={{ fontSize: '12px', color: '#9ca3af', minWidth: '60px' }}>Horizontal:</label>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {[
                              { value: 'left', label: 'Left' },
                              { value: 'center', label: 'Center' },
                              { value: 'right', label: 'Right' }
                            ].map((option) => (
                              <button
                                key={option.value}
                                onClick={() => setChartConfig(prev => ({ ...prev, titleHorizontalPosition: option.value as any }))}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  border: chartConfig.titleHorizontalPosition === option.value ? '2px solid #6366f1' : '1px solid #e5e7eb',
                                  borderRadius: '4px',
                                  background: chartConfig.titleHorizontalPosition === option.value ? '#eff6ff' : 'white',
                                  color: chartConfig.titleHorizontalPosition === option.value ? '#6366f1' : '#6b7280',
                                  cursor: 'pointer'
                                }}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Title Font Size */}
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ fontSize: '13px', fontWeight: '500', color: '#6b7280', marginBottom: '4px', display: 'block' }}>
                          Font Size
                        </label>
                        <input
                          type="range"
                          min="12"
                          max="32"
                          value={chartConfig.titleFontSize || 18}
                          onChange={(e) => setChartConfig(prev => ({ ...prev, titleFontSize: Number(e.target.value) }))}
                          style={{ width: '100%' }}
                        />
                        <div style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>
                          {chartConfig.titleFontSize || 18}px
                        </div>
                      </div>

                      {/* Title Positioning Controls */}
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ fontSize: '13px', fontWeight: '500', color: '#6b7280', marginBottom: '8px', display: 'block' }}>
                          Title Position Adjustment
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <div>
                            <label style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px', display: 'block' }}>
                              Shift Left/Right
                            </label>
                            <input
                              type="range"
                              min="-80"
                              max="80"
                              value={chartConfig.titleOffsetX || 0}
                              onChange={(e) => setChartConfig(prev => ({ ...prev, titleOffsetX: Number(e.target.value) }))}
                              style={{ width: '100%' }}
                            />
                            <div style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'center' }}>
                              {chartConfig.titleOffsetX > 0 ? '+' : ''}{chartConfig.titleOffsetX || 0}px
                            </div>
                          </div>
                          <div>
                            <label style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px', display: 'block' }}>
                              Shift Up/Down
                            </label>
                            <input
                              type="range"
                              min="-80"
                              max="80"
                              value={chartConfig.titleOffsetY || 0}
                              onChange={(e) => setChartConfig(prev => ({ ...prev, titleOffsetY: Number(e.target.value) }))}
                              style={{ width: '100%' }}
                            />
                            <div style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'center' }}>
                              {chartConfig.titleOffsetY > 0 ? '+' : ''}{chartConfig.titleOffsetY || 0}px
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                      </div>
                    )}

                    {/* Legend Sub-tab */}
                    {layoutSubTab === 'legend' && (
                      <div>
                    {/* Legend Controls */}
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                          Legend
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', fontSize: '13px' }}>
                          <input
                            type="checkbox"
                            checked={chartConfig.showLegend}
                            onChange={(e) => setChartConfig(prev => ({ ...prev, showLegend: e.target.checked }))}
                            style={{ marginRight: '6px' }}
                          />
                          Show Legend
                        </label>
                      </div>
{chartConfig.showLegend && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={{ fontSize: '12px', color: '#9ca3af', minWidth: '60px' }}>Vertical:</label>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {[
                                { value: 'top', label: 'Top' },
                                { value: 'center', label: 'Center' },
                                { value: 'bottom', label: 'Bottom' }
                              ].map((option) => (
                                <button
                                  key={option.value}
                                  onClick={() => setChartConfig(prev => ({ ...prev, legendVerticalPosition: option.value as any }))}
                                  style={{
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    border: chartConfig.legendVerticalPosition === option.value ? '2px solid #6366f1' : '1px solid #e5e7eb',
                                    borderRadius: '4px',
                                    background: chartConfig.legendVerticalPosition === option.value ? '#eff6ff' : 'white',
                                    color: chartConfig.legendVerticalPosition === option.value ? '#6366f1' : '#6b7280',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={{ fontSize: '12px', color: '#9ca3af', minWidth: '60px' }}>Horizontal:</label>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {[
                                { value: 'left', label: 'Left' },
                                { value: 'center', label: 'Center' },
                                { value: 'right', label: 'Right' }
                              ].map((option) => (
                                <button
                                  key={option.value}
                                  onClick={() => setChartConfig(prev => ({ ...prev, legendHorizontalPosition: option.value as any }))}
                                  style={{
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    border: chartConfig.legendHorizontalPosition === option.value ? '2px solid #6366f1' : '1px solid #e5e7eb',
                                    borderRadius: '4px',
                                    background: chartConfig.legendHorizontalPosition === option.value ? '#eff6ff' : 'white',
                                    color: chartConfig.legendHorizontalPosition === option.value ? '#6366f1' : '#6b7280',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                    {/* Legend Mapping Configuration */}
                    {chartConfig.showLegend && (
                      <div style={{ marginBottom: '16px' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                          Legend Mapping
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <label style={{ fontSize: '13px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>
                            Map legend to:
                          </label>
                          <div style={{ display: 'flex', gap: '12px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', fontSize: '13px' }}>
                              <input
                                type="radio"
                                name="legendMapping"
                                checked={chartConfig.legendMapping === 'categories' || !chartConfig.legendMapping}
                                onChange={() => {
                                  triggerAnimation('legendMapping');
                                  setChartConfig(prev => ({ ...prev, legendMapping: 'categories' }));
                                }}
                                style={{ marginRight: '6px' }}
                              />
                              Data Categories
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', fontSize: '13px' }}>
                              <input
                                type="radio"
                                name="legendMapping"
                                checked={chartConfig.legendMapping === 'series'}
                                onChange={() => {
                                  triggerAnimation('legendMapping');
                                  setChartConfig(prev => ({ ...prev, legendMapping: 'series' }));
                                }}
                                style={{ marginRight: '6px' }}
                              />
                              Data Series
                            </label>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Legend Font Size */}
                    {chartConfig.showLegend && (
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ fontSize: '13px', fontWeight: '500', color: '#6b7280', marginBottom: '4px', display: 'block' }}>
                          Font Size
                        </label>
                        <input
                          type="range"
                          min="8"
                          max="16"
                          value={chartConfig.legendFontSize || 11}
                          onChange={(e) => setChartConfig(prev => ({ ...prev, legendFontSize: Number(e.target.value) }))}
                          style={{ width: '100%' }}
                        />
                        <div style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>
                          {chartConfig.legendFontSize || 11}px
                        </div>
                      </div>
                    )}

                    {/* Legend Positioning Controls */}
                    {chartConfig.showLegend && (
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ fontSize: '13px', fontWeight: '500', color: '#6b7280', marginBottom: '8px', display: 'block' }}>
                          Legend Position Adjustment
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <div>
                            <label style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px', display: 'block' }}>
                              Shift Left/Right
                            </label>
                            <input
                              type="range"
                              min="-80"
                              max="80"
                              value={chartConfig.legendOffsetX || 0}
                              onChange={(e) => setChartConfig(prev => ({ ...prev, legendOffsetX: Number(e.target.value) }))}
                              style={{ width: '100%' }}
                            />
                            <div style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'center' }}>
                              {chartConfig.legendOffsetX > 0 ? '+' : ''}{chartConfig.legendOffsetX || 0}px
                            </div>
                          </div>
                          <div>
                            <label style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px', display: 'block' }}>
                              Shift Up/Down
                            </label>
                            <input
                              type="range"
                              min="-80"
                              max="80"
                              value={chartConfig.legendOffsetY || 0}
                              onChange={(e) => setChartConfig(prev => ({ ...prev, legendOffsetY: Number(e.target.value) }))}
                              style={{ width: '100%' }}
                            />
                            <div style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'center' }}>
                              {chartConfig.legendOffsetY > 0 ? '+' : ''}{chartConfig.legendOffsetY || 0}px
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    </div>
                      </div>
                    )}

                    {/* Labels Sub-tab */}
                    {layoutSubTab === 'labels' && (
                      <div>
                    {/* Data Labels */}
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                          Data Labels
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', fontSize: '13px' }}>
                          <input
                            type="checkbox"
                            checked={chartConfig.showDataLabels || false}
                            onChange={(e) => setChartConfig(prev => ({ ...prev, showDataLabels: e.target.checked }))}
                            style={{ marginRight: '6px' }}
                          />
                          Show Labels
                        </label>
                      </div>

                      {/* Data Label Components */}
                      {chartConfig.showDataLabels && (
                        <div style={{ marginBottom: '16px' }}>
                          <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                            Label Content
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {(() => {
                              // Smart data label components based on chart type
                              const chartCategory = selectedTemplate?.category;

                              if (chartCategory === 'bar') {
                                return null;
                              }

                              if (chartCategory === 'line' || chartCategory === 'area') {
                                return null;
                              }

                              if (chartCategory === 'pie') {
                                return (
                                  <>
                                    <label style={{ display: 'flex', alignItems: 'center', fontSize: '13px' }}>
                                      <input
                                        type="checkbox"
                                        checked={chartConfig.dataLabelsComponents?.showPercentage || false}
                                        onChange={(e) => setChartConfig(prev => ({
                                          ...prev,
                                          dataLabelsComponents: {
                                            ...prev.dataLabelsComponents,
                                            showPercentage: e.target.checked
                                          }
                                        }))}
                                        style={{ marginRight: '8px' }}
                                      />
                                      Percentage
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', fontSize: '13px' }}>
                                      <input
                                        type="checkbox"
                                        checked={chartConfig.dataLabelsComponents?.showCategory || false}
                                        onChange={(e) => setChartConfig(prev => ({
                                          ...prev,
                                          dataLabelsComponents: {
                                            ...prev.dataLabelsComponents,
                                            showCategory: e.target.checked
                                          }
                                        }))}
                                        style={{ marginRight: '8px' }}
                                      />
                                      Category Name
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', fontSize: '13px' }}>
                                      <input
                                        type="checkbox"
                                        checked={chartConfig.dataLabelsComponents?.showValue || false}
                                        onChange={(e) => setChartConfig(prev => ({
                                          ...prev,
                                          dataLabelsComponents: {
                                            ...prev.dataLabelsComponents,
                                            showValue: e.target.checked
                                          }
                                        }))}
                                        style={{ marginRight: '8px' }}
                                      />
                                      Value
                                    </label>
                                  </>
                                );
                              }

                              if (chartCategory === 'scatter') {
                                return (
                                  <>
                                    <label style={{ display: 'flex', alignItems: 'center', fontSize: '13px' }}>
                                      <input
                                        type="checkbox"
                                        checked={chartConfig.dataLabelsComponents?.showCoordinates || false}
                                        onChange={(e) => setChartConfig(prev => ({
                                          ...prev,
                                          dataLabelsComponents: {
                                            ...prev.dataLabelsComponents,
                                            showCoordinates: e.target.checked
                                          }
                                        }))}
                                        style={{ marginRight: '8px' }}
                                      />
                                      Coordinates (X, Y)
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', fontSize: '13px' }}>
                                      <input
                                        type="checkbox"
                                        checked={chartConfig.dataLabelsComponents?.showSeriesName || false}
                                        onChange={(e) => setChartConfig(prev => ({
                                          ...prev,
                                          dataLabelsComponents: {
                                            ...prev.dataLabelsComponents,
                                            showSeriesName: e.target.checked
                                          }
                                        }))}
                                        style={{ marginRight: '8px' }}
                                      />
                                      Series Name
                                    </label>
                                  </>
                                );
                              }

                              // Fallback for any other chart types
                              return (
                                <label style={{ display: 'flex', alignItems: 'center', fontSize: '13px' }}>
                                  <input
                                    type="checkbox"
                                    checked={chartConfig.dataLabelsComponents?.showValue || false}
                                    onChange={(e) => setChartConfig(prev => ({
                                      ...prev,
                                      dataLabelsComponents: {
                                        ...prev.dataLabelsComponents,
                                        showValue: e.target.checked
                                      }
                                    }))}
                                    style={{ marginRight: '8px' }}
                                  />
                                  Value
                                </label>
                              );
                            })()}
                          </div>
                        </div>
                      )}

                      {chartConfig.showDataLabels && (
                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ fontSize: '13px', fontWeight: '500', color: '#6b7280', marginBottom: '6px', display: 'block' }}>
                            Position
                          </label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                            {(() => {
                              // Smart position options based on chart type, like Excel
                              const getPositionOptions = () => {
                                switch (selectedTemplate?.id) {
                                  case 'pie-chart':
                                    return [
                                      { value: 'center', label: 'Center' },
                                      { value: 'inside', label: 'Inside End' },
                                      { value: 'outside', label: 'Outside End' },
                                      { value: 'bottom', label: 'Best Fit' }
                                    ];

                                  case 'simple-bar':
                                  case 'multi-series-bar':
                                  case 'stacked-bar':
                                    return [
                                      { value: 'top', label: 'Outside End' },
                                      { value: 'inside-top', label: 'Inside End' },
                                      { value: 'center', label: 'Center' },
                                      { value: 'inside-bottom', label: 'Inside Base' },
                                      { value: 'bottom', label: 'Outside Base' }
                                    ];

                                  case 'simple-line':
                                  case 'multi-line':
                                  case 'area-chart':
                                    return [
                                      { value: 'top', label: 'Above' },
                                      { value: 'center', label: 'Center' },
                                      { value: 'inside-bottom', label: 'Below' },
                                      { value: 'left', label: 'Left' },
                                      { value: 'right', label: 'Right' }
                                    ];

                                  case 'scatter-plot':
                                    return [
                                      { value: 'top', label: 'Above' },
                                      { value: 'inside-bottom', label: 'Below' },
                                      { value: 'left', label: 'Left' },
                                      { value: 'right', label: 'Right' },
                                      { value: 'center', label: 'Center' }
                                    ];

                                  default:
                                    // Fallback for unknown chart types
                                    return [
                                      { value: 'top', label: 'Top' },
                                      { value: 'center', label: 'Center' },
                                      { value: 'bottom', label: 'Bottom' }
                                    ];
                                }
                              };

                              return getPositionOptions();
                            })().map(option => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => setChartConfig(prev => ({ ...prev, dataLabelsPosition: option.value as any }))}
                                style={{
                                  padding: '4px 8px',
                                  border: chartConfig.dataLabelsPosition === option.value ? '2px solid #6366f1' : '1px solid #e5e7eb',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: '500',
                                  background: chartConfig.dataLabelsPosition === option.value ? '#eff6ff' : 'white',
                                  color: chartConfig.dataLabelsPosition === option.value ? '#6366f1' : '#6b7280',
                                  cursor: 'pointer',
                                  textAlign: 'center',
                                  minHeight: '26px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Data Labels Font Size */}
                      {chartConfig.showDataLabels && (
                        <div style={{ marginBottom: '16px' }}>
                          <label style={{ fontSize: '13px', fontWeight: '500', color: '#6b7280', marginBottom: '4px', display: 'block' }}>
                            Font Size
                          </label>
                          <input
                            type="range"
                            min="8"
                            max={selectedTemplate?.id === 'pie-chart' ? "25" : "16"}
                            value={chartConfig.dataLabelsFontSize || 11}
                            onChange={(e) => setChartConfig(prev => ({ ...prev, dataLabelsFontSize: Number(e.target.value) }))}
                            style={{ width: '100%' }}
                          />
                          <div style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>
                            {chartConfig.dataLabelsFontSize || 11}px
                          </div>
                        </div>
                      )}

                      {/* Data Labels Positioning Controls */}
                      {chartConfig.showDataLabels && (
                        <div style={{ marginBottom: '16px' }}>
                          <label style={{ fontSize: '13px', fontWeight: '500', color: '#6b7280', marginBottom: '8px', display: 'block' }}>
                            Data Labels Position Adjustment
                          </label>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div>
                              <label style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px', display: 'block' }}>
                                Shift Left/Right
                              </label>
                              <input
                                type="range"
                                min="-50"
                                max="50"
                                value={chartConfig.dataLabelsOffsetX || 0}
                                onChange={(e) => setChartConfig(prev => ({ ...prev, dataLabelsOffsetX: Number(e.target.value) }))}
                                style={{ width: '100%' }}
                              />
                              <div style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'center' }}>
                                {chartConfig.dataLabelsOffsetX > 0 ? '+' : ''}{chartConfig.dataLabelsOffsetX || 0}px
                              </div>
                            </div>
                            <div>
                              <label style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px', display: 'block' }}>
                                Shift Up/Down
                              </label>
                              <input
                                type="range"
                                min="-50"
                                max="50"
                                value={chartConfig.dataLabelsOffsetY || 0}
                                onChange={(e) => setChartConfig(prev => ({ ...prev, dataLabelsOffsetY: Number(e.target.value) }))}
                                style={{ width: '100%' }}
                              />
                              <div style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'center' }}>
                                {chartConfig.dataLabelsOffsetY > 0 ? '+' : ''}{chartConfig.dataLabelsOffsetY || 0}px
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Number Formatting */}
                      {chartConfig.showDataLabels && (
                        <div style={{ marginBottom: '16px' }}>
                          <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                            Number Formatting
                          </h4>

                          {/* Decimal Points */}
                          <div style={{ marginBottom: '8px' }}>
                            <label style={{ fontSize: '13px', fontWeight: '500', color: '#6b7280', marginBottom: '4px', display: 'block' }}>
                              Decimal Places
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="3"
                              value={chartConfig.numberFormat?.decimals ?? 0}
                              onChange={(e) => setChartConfig(prev => ({
                                ...prev,
                                numberFormat: {
                                  ...prev.numberFormat,
                                  decimals: Math.max(0, Math.min(Number(e.target.value), 3)),
                                  decimalsManuallySet: true
                                }
                              }))}
                              style={{
                                width: '100%',
                                padding: '6px 10px',
                                border: '1px solid #e5e7eb',
                                borderRadius: '4px',
                                fontSize: '13px'
                              }}
                            />
                          </div>

                          {/* Prefix and Suffix */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                            <div>
                              <label style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', display: 'block' }}>Prefix</label>
                              <input
                                type="text"
                                placeholder="$"
                                value={chartConfig.numberFormat?.prefix || ''}
                                onChange={(e) => setChartConfig(prev => ({
                                  ...prev,
                                  numberFormat: {
                                    ...prev.numberFormat,
                                    prefix: e.target.value
                                  }
                                }))}
                                style={{
                                  width: '100%',
                                  padding: '6px 8px',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: '4px',
                                  fontSize: '12px'
                                }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', display: 'block' }}>Suffix</label>
                              <input
                                type="text"
                                placeholder="%"
                                value={chartConfig.numberFormat?.suffix || ''}
                                onChange={(e) => setChartConfig(prev => ({
                                  ...prev,
                                  numberFormat: {
                                    ...prev.numberFormat,
                                    suffix: e.target.value
                                  }
                                }))}
                                style={{
                                  width: '100%',
                                  padding: '6px 8px',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: '4px',
                                  fontSize: '12px'
                                }}
                              />
                            </div>
                          </div>

                          {/* Display Units - Excel Style */}
                          <div style={{ marginBottom: '12px' }}>
                            <label style={{ fontSize: '13px', fontWeight: '500', color: '#6b7280', marginBottom: '6px', display: 'block' }}>
                              Display Unit
                            </label>
                          <select
                            value={chartConfig.numberFormat?.displayUnit || 'none'}
                            onChange={(e) => {
                              const newDisplayUnit = e.target.value as any;
                              setChartConfig(prev => {
                                const currentDecimals = prev.numberFormat?.decimals ?? 0;
                                const manualDecimals = prev.numberFormat?.decimalsManuallySet;
                                let nextDecimals = currentDecimals;
                                let nextManualFlag = manualDecimals;

                                // Auto-adjust decimal places when no manual override is present
                                if (newDisplayUnit !== 'none' && !manualDecimals && currentDecimals === 0) {
                                  nextDecimals = 2; // Default to 2 decimal places when scaling units
                                  nextManualFlag = false;
                                }

                                return {
                                  ...prev,
                                  numberFormat: {
                                    ...prev.numberFormat,
                                    displayUnit: newDisplayUnit,
                                    decimals: nextDecimals,
                                    decimalsManuallySet: nextManualFlag
                                  }
                                };
                              });
                            }}
                            style={{
                              width: '100%',
                                padding: '6px 10px',
                                border: '1px solid #e5e7eb',
                                borderRadius: '4px',
                                fontSize: '13px',
                                background: 'white'
                              }}
                            >
                              <option value="none">None</option>
                              <option value="hundreds">Hundreds</option>
                              <option value="thousands">Thousands</option>
                              <option value="millions">Millions</option>
                              <option value="billions">Billions</option>
                            </select>
                            {chartConfig.numberFormat?.displayUnit !== 'none' && (
                              <label style={{ display: 'flex', alignItems: 'center', fontSize: '12px', marginTop: '6px' }}>
                                <input
                                  type="checkbox"
                                  checked={chartConfig.numberFormat?.displayUnitLabel || false}
                                  onChange={(e) => setChartConfig(prev => ({
                                    ...prev,
                                    numberFormat: {
                                      ...prev.numberFormat,
                                      displayUnitLabel: e.target.checked
                                    }
                                  }))}
                                  style={{ marginRight: '6px' }}
                                />
                                Show unit label (K, M, B)
                              </label>
                            )}
                          </div>

                          {/* Number Formatting Options */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', fontSize: '13px' }}>
                              <input
                                type="checkbox"
                                checked={chartConfig.numberFormat?.thousands || false}
                                onChange={(e) => setChartConfig(prev => ({
                                  ...prev,
                                  numberFormat: {
                                    ...prev.numberFormat,
                                    thousands: e.target.checked
                                  }
                                }))}
                                style={{ marginRight: '8px' }}
                              />
                              Use 1,000 separators
                            </label>
                          </div>

                          {/* Negative Numbers Display */}
                          <div style={{ marginBottom: '12px' }}>
                            <label style={{ fontSize: '13px', fontWeight: '500', color: '#6b7280', marginBottom: '6px', display: 'block' }}>
                              Negative Numbers
                            </label>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {[
                                { value: 'minus', label: '-1,234' },
                                { value: 'red', label: '1,234' },
                                { value: 'parentheses', label: '(1,234)' }
                              ].map((option) => (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => setChartConfig(prev => ({
                                    ...prev,
                                    numberFormat: {
                                      ...prev.numberFormat,
                                      negativeNumbers: option.value as any
                                    }
                                  }))}
                                  style={{
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    border: chartConfig.numberFormat?.negativeNumbers === option.value ? '2px solid #6366f1' : '1px solid #e5e7eb',
                                    borderRadius: '4px',
                                    background: chartConfig.numberFormat?.negativeNumbers === option.value ? '#eff6ff' : 'white',
                                    color: chartConfig.numberFormat?.negativeNumbers === option.value ? '#6366f1' : '#6b7280',
                                    cursor: 'pointer',
                                    flex: 1,
                                    textAlign: 'center'
                                  }}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Data Labels Color */}
                          <div style={{ marginBottom: '8px' }}>
                            <label style={{ fontSize: '13px', fontWeight: '500', color: '#6b7280', marginBottom: '4px', display: 'block' }}>
                              Text Color
                            </label>
                            <input
                              type="color"
                              value={chartConfig.dataLabelsColor || '#374151'}
                              onChange={(e) => setChartConfig(prev => ({
                                ...prev,
                                dataLabelsColor: e.target.value
                              }))}
                              style={{
                                width: '100%',
                                height: '32px',
                                border: '1px solid #e5e7eb',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                            />
                          </div>
                        </div>

                      )}
                    </div>
                      </div>
                    )}

                    {/* Chart Sub-tab */}
                    {layoutSubTab === 'chart' && (
                      <div>
                        {/* Chart Padding */}
                        <div style={{ marginBottom: '16px' }}>
                          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                            Chart Padding
                          </label>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div>
                              <label style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', display: 'block' }}>Horizontal ({paddingHorizontal}px)</label>
                              <input
                                type="range"
                                min="10"
                                max="80"
                                value={paddingHorizontal}
                                onChange={(e) => setPaddingHorizontal(Number(e.target.value))}
                                style={{ width: '100%' }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', display: 'block' }}>Vertical ({paddingVertical}px)</label>
                              <input
                                type="range"
                                min="10"
                                max="80"
                                value={paddingVertical}
                                onChange={(e) => setPaddingVertical(Number(e.target.value))}
                                style={{ width: '100%' }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Chart Position */}
                        <div style={{ marginBottom: '16px' }}>
                          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                            Chart Position
                          </label>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div>
                              <label style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', display: 'block' }}>
                                Shift Left/Right
                              </label>
                              <input
                                type="range"
                                min="-50"
                                max="50"
                                value={chartOffsetX}
                                onChange={(e) => setChartOffsetX(Number(e.target.value))}
                                style={{ width: '100%' }}
                              />
                              <div style={{ fontSize: '9px', color: '#9ca3af', textAlign: 'center', lineHeight: '1.2' }}>
                                {chartOffsetX > 0 ? '+' : ''}{chartOffsetX}px
                              </div>
                            </div>
                            <div>
                              <label style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', display: 'block' }}>
                                Shift Up/Down
                              </label>
                              <input
                                type="range"
                                min="-50"
                                max="50"
                                value={chartOffsetY}
                                onChange={(e) => setChartOffsetY(Number(e.target.value))}
                                style={{ width: '100%' }}
                              />
                              <div style={{ fontSize: '9px', color: '#9ca3af', textAlign: 'center', lineHeight: '1.2' }}>
                                {chartOffsetY > 0 ? '+' : ''}{chartOffsetY}px
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Colors Tab */}
                {activeTab === 'colors' && (
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>
                      Color Management
                    </h3>

                    {/* Color Mode Selection */}
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px', display: 'block' }}>
                        Color Mode
                      </label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {/* Scenario 1: Color Schemes */}
                        <div
                          onClick={() => setChartConfig(prev => ({ ...prev, colorMode: 'scheme' }))}
                          style={{
                            padding: '12px',
                            border: chartConfig.colorMode === 'scheme' || !chartConfig.colorMode ? '2px solid #10b981' : '1px solid #e5e7eb',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            backgroundColor: chartConfig.colorMode === 'scheme' || !chartConfig.colorMode ? '#f0fdf4' : 'white'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '16px' }}>🎨</span>
                            <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                              Use Color Schemes
                            </span>
                          </div>
                          <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, marginLeft: '24px' }}>
                            Choose from pre-designed color palettes. Colors are automatically assigned.
                          </p>
                        </div>

                        {/* Scenario 2: Individual Colors */}
                        <div
                          onClick={() => setChartConfig(prev => ({ ...prev, colorMode: 'individual' }))}
                          style={{
                            padding: '12px',
                            border: chartConfig.colorMode === 'individual' ? '2px solid #10b981' : '1px solid #e5e7eb',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            backgroundColor: chartConfig.colorMode === 'individual' ? '#f0fdf4' : 'white'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '16px' }}>🎯</span>
                            <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                              Custom Individual Colors
                            </span>
                          </div>
                          <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, marginLeft: '24px' }}>
                            Set different colors for each bar/category. Full customization control.
                          </p>
                        </div>

                        {/* Scenario 3: Single Color */}
                        <div
                          onClick={() => setChartConfig(prev => ({ ...prev, colorMode: 'single' }))}
                          style={{
                            padding: '12px',
                            border: chartConfig.colorMode === 'single' ? '2px solid #10b981' : '1px solid #e5e7eb',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            backgroundColor: chartConfig.colorMode === 'single' ? '#f0fdf4' : 'white'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '16px' }}>⚪</span>
                            <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                              Single Color for All
                            </span>
                          </div>
                          <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, marginLeft: '24px' }}>
                            Use the same color for all bars/elements. Consistent monochromatic look.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Color Mode Content */}
                    {/* Scenario 1: Color Schemes */}
                    {(chartConfig.colorMode === 'scheme' || !chartConfig.colorMode) && (
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '10px', color: '#374151' }}>
                          Choose Color Palette
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          {Object.entries(COLOR_SCHEMES).filter(([scheme]) =>
                            ['modern', 'vibrant', 'professional', 'pastel', 'neon', 'dark'].includes(scheme)
                          ).map(([scheme, colors]) => (
                            <button
                              key={scheme}
                              onClick={() => setChartConfig(prev => ({ ...prev, colorScheme: scheme }))}
                              style={{
                                padding: '8px',
                                border: chartConfig.colorScheme === scheme ? '2px solid #10b981' : '1px solid #e5e7eb',
                                borderRadius: '8px',
                                background: chartConfig.colorScheme === scheme ? '#f0fdf4' : 'white',
                                cursor: 'pointer',
                                textAlign: 'left',
                                fontSize: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all 0.2s'
                              }}
                            >
                              <div style={{ display: 'flex', gap: '2px' }}>
                                {(colors === 'auto' ? ['#6366f1', '#10b981', '#f59e0b'] : (colors as string[]).slice(0, 4)).map((color, i) => (
                                  <div
                                    key={i}
                                    style={{
                                      width: '12px',
                                      height: '12px',
                                      borderRadius: '2px',
                                      backgroundColor: color
                                    }}
                                  />
                                ))}
                              </div>
                              <span style={{
                                fontWeight: '500',
                                color: chartConfig.colorScheme === scheme ? '#10b981' : '#374151',
                                textTransform: 'capitalize'
                              }}>
                                {scheme}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Scenario 2: Individual Colors */}
                    {chartConfig.colorMode === 'individual' && chartData && (
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                            Individual Colors
                          </label>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              onClick={() => {
                                // Generate rainbow colors
                                const count = (selectedTemplate?.id === 'simple-bar' || selectedTemplate?.id === 'pie-chart') && chartData.datasets.length === 1
                                  ? chartData.labels.length
                                  : chartData.datasets.length;
                                const newColors = Array.from({length: count}, (_, i) =>
                                  `hsl(${(i * 360 / count) % 360}, 70%, 50%)`
                                );
                                setChartConfig(prev => ({ ...prev, customColors: newColors }));
                              }}
                              style={{
                                padding: '4px 8px',
                                fontSize: '10px',
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                color: '#64748b'
                              }}
                            >
                              🌈 Rainbow
                            </button>
                            <button
                              onClick={() => {
                                const count = (selectedTemplate?.id === 'simple-bar' || selectedTemplate?.id === 'pie-chart') && chartData.datasets.length === 1
                                  ? chartData.labels.length
                                  : chartData.datasets.length;
                                const randomColors = Array.from({length: count}, () =>
                                  `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`
                                );
                                setChartConfig(prev => ({ ...prev, customColors: randomColors }));
                              }}
                              style={{
                                padding: '4px 8px',
                                fontSize: '10px',
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                color: '#64748b'
                              }}
                            >
                              🎲 Random
                            </button>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {/* For single dataset charts, show color picker for each data category */}
                          {(selectedTemplate?.id === 'simple-bar' || selectedTemplate?.id === 'pie-chart') && chartData.datasets.length === 1 ? (
                            chartData.labels.map((label, index) => (
                              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                  type="color"
                                  value={chartConfig.customColors?.[index] || COLOR_SCHEMES[chartConfig.colorScheme as keyof typeof COLOR_SCHEMES]?.[index % 8] || '#6366f1'}
                                  onChange={(e) => {
                                    const newColors = [...(chartConfig.customColors || [])];
                                    newColors[index] = e.target.value;
                                    setChartConfig(prev => ({ ...prev, customColors: newColors }));
                                  }}
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                  }}
                                />
                                <span style={{ fontSize: '13px', color: '#374151', flex: 1 }}>
                                  {label}
                                </span>
                              </div>
                            ))
                          ) : (
                            /* For multi-dataset charts, show color picker for each dataset */
                            chartData.datasets.map((dataset, index) => (
                              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                  type="color"
                                  value={chartConfig.customColors?.[index] || COLOR_SCHEMES[chartConfig.colorScheme as keyof typeof COLOR_SCHEMES]?.[index % 8] || '#6366f1'}
                                  onChange={(e) => {
                                    const newColors = [...(chartConfig.customColors || [])];
                                    newColors[index] = e.target.value;
                                    setChartConfig(prev => ({ ...prev, customColors: newColors }));
                                  }}
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                  }}
                                />
                                <span style={{ fontSize: '13px', color: '#374151', flex: 1 }}>
                                  {dataset.label}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {/* Scenario 3: Single Color */}
                    {chartConfig.colorMode === 'single' && (
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '10px', display: 'block' }}>
                          Choose Single Color
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <input
                            type="color"
                            value={chartConfig.singleColor || '#6366f1'}
                            onChange={(e) => setChartConfig(prev => ({ ...prev, singleColor: e.target.value }))}
                            style={{
                              width: '48px',
                              height: '48px',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer'
                            }}
                          />
                          <div>
                            <p style={{ fontSize: '13px', color: '#374151', margin: 0 }}>
                              Selected Color: {chartConfig.singleColor || '#6366f1'}
                            </p>
                            <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                              This color will be used for all chart elements
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Axes Tab */}
                {activeTab === 'axes' && (
                  <div>
                    {/* Axes Sub-tabs */}
                    <div style={{
                      display: 'flex',
                      marginBottom: '16px',
                      borderBottom: '1px solid #e5e7eb'
                    }}>
                      {[
                        { key: 'x-axis', label: 'X-Axis' },
                        { key: 'y-axis', label: 'Y-Axis' },
                        ...(selectedTemplate?.recipe.requiredFields.series ?
                          [{ key: 'series', label: 'Series' }] : []),
                        ...(selectedTemplate?.recipe.type === 'scatter' ?
                          [{ key: 'trend-line', label: 'Trend Line' }] : [])
                      ].map((tab) => (
                        <button
                          key={tab.key}
                          onClick={() => setAxesSubTab(tab.key as any)}
                          style={{
                            padding: '8px 16px',
                            background: 'none',
                            border: 'none',
                            borderBottom: axesSubTab === tab.key ? '2px solid #6366f1' : '2px solid transparent',
                            fontSize: '13px',
                            fontWeight: axesSubTab === tab.key ? '600' : '500',
                            color: axesSubTab === tab.key ? '#6366f1' : '#6b7280',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* X-Axis Sub-tab */}
                    {axesSubTab === 'x-axis' && (
                      <div>
                    {/* X-Axis Configuration */}
                    <div style={{ marginBottom: '20px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#374151', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
                        X-Axis Configuration
                      </h3>
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: '#6b7280' }}>
                          Label
                        </label>
                        <input
                          type="text"
                          placeholder="X-Axis Label"
                          value={chartConfig.xAxisLabel || ''}
                          onChange={(e) => setChartConfig(prev => ({ ...prev, xAxisLabel: e.target.value }))}
                          style={{
                            width: '100%',
                            padding: '6px 10px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            fontSize: '13px'
                          }}
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <label style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', display: 'block' }}>Min Value</label>
                          <input
                            type="number"
                            placeholder="Auto"
                            value={chartConfig.xAxisMin || ''}
                            onChange={(e) => setChartConfig(prev => ({ ...prev, xAxisMin: e.target.value ? Number(e.target.value) : undefined }))}
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              border: '1px solid #e5e7eb',
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', display: 'block' }}>Max Value</label>
                          <input
                            type="number"
                            placeholder="Auto"
                            value={chartConfig.xAxisMax || ''}
                            onChange={(e) => setChartConfig(prev => ({ ...prev, xAxisMax: e.target.value ? Number(e.target.value) : undefined }))}
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              border: '1px solid #e5e7eb',
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* X-Axis Tick Controls */}
                    <div style={{ marginBottom: '16px' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                        Tick Configuration
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', fontSize: '13px' }}>
                          <input
                            type="checkbox"
                            checked={chartConfig.showXAxisTicks !== false}
                            onChange={(e) => setChartConfig(prev => ({ ...prev, showXAxisTicks: e.target.checked }))}
                            style={{ marginRight: '8px' }}
                          />
                          Show X-Axis Ticks
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', fontSize: '13px' }}>
                          <input
                            type="checkbox"
                            checked={chartConfig.rotateXAxisLabels || false}
                            onChange={(e) => setChartConfig(prev => ({ ...prev, rotateXAxisLabels: e.target.checked }))}
                            style={{ marginRight: '8px' }}
                          />
                          Rotate X-Axis Labels
                        </label>
                      </div>
                    </div>

                    {/* X-Axis Title Controls */}
                    {(chartConfig.xAxisLabel || chartConfig.xAxisField) && (
                      <div style={{ marginBottom: '12px', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '10px' }}>
                        <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#374151', margin: '0 0 8px 0' }}>
                          📊 X-Axis Title
                        </h4>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '8px' }}>
                          {/* Font Size */}
                          <div>
                            <label style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '2px', display: 'block' }}>
                              Font Size
                            </label>
                            <input
                              type="range"
                              min="8"
                              max="18"
                              value={chartConfig.xAxisLabelFontSize || 12}
                              onChange={(e) => setChartConfig(prev => ({ ...prev, xAxisLabelFontSize: Number(e.target.value) }))}
                              style={{ width: '100%' }}
                            />
                            <div style={{ fontSize: '9px', color: '#9ca3af', textAlign: 'center', lineHeight: '1.2' }}>
                              {chartConfig.xAxisLabelFontSize || 12}px
                            </div>
                          </div>

                          {/* Left/Right Position */}
                          <div>
                            <label style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '2px', display: 'block' }}>
                              Left/Right
                            </label>
                            <input
                              type="range"
                              min="-80"
                              max="80"
                              value={chartConfig.xAxisLabelOffsetX || 0}
                              onChange={(e) => setChartConfig(prev => ({ ...prev, xAxisLabelOffsetX: Number(e.target.value) }))}
                              style={{ width: '100%' }}
                            />
                            <div style={{ fontSize: '9px', color: '#9ca3af', textAlign: 'center', lineHeight: '1.2' }}>
                              {chartConfig.xAxisLabelOffsetX > 0 ? '+' : ''}{chartConfig.xAxisLabelOffsetX || 0}px
                            </div>
                          </div>

                          {/* Up/Down Position */}
                          <div>
                            <label style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '2px', display: 'block' }}>
                              Up/Down
                            </label>
                            <input
                              type="range"
                              min="-80"
                              max="80"
                              value={chartConfig.xAxisLabelOffsetY || 0}
                              onChange={(e) => setChartConfig(prev => ({ ...prev, xAxisLabelOffsetY: Number(e.target.value) }))}
                              style={{ width: '100%' }}
                            />
                            <div style={{ fontSize: '9px', color: '#9ca3af', textAlign: 'center', lineHeight: '1.2' }}>
                              {chartConfig.xAxisLabelOffsetY > 0 ? '+' : ''}{chartConfig.xAxisLabelOffsetY || 0}px
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* X-Axis Values Controls */}
                    <div style={{ marginBottom: '12px', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '10px' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#374151', margin: '0 0 12px 0' }}>
                        📈 X-Axis Values
                      </h4>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '8px' }}>
                        {/* Font Size */}
                        <div>
                          <label style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px', display: 'block' }}>
                            Font Size
                          </label>
                          <input
                            type="range"
                            min="8"
                            max="16"
                            value={chartConfig.xAxisFontSize || 12}
                            onChange={(e) => setChartConfig(prev => ({ ...prev, xAxisFontSize: Number(e.target.value) }))}
                            style={{ width: '100%' }}
                          />
                          <div style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center' }}>
                            {chartConfig.xAxisFontSize || 12}px
                          </div>
                        </div>

                        {/* Left/Right Position */}
                        <div>
                          <label style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px', display: 'block' }}>
                            Left/Right
                          </label>
                          <input
                            type="range"
                            min="-60"
                            max="60"
                            value={chartConfig.xAxisOffsetX || 0}
                            onChange={(e) => setChartConfig(prev => ({ ...prev, xAxisOffsetX: Number(e.target.value) }))}
                            style={{ width: '100%' }}
                          />
                          <div style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center' }}>
                            {chartConfig.xAxisOffsetX > 0 ? '+' : ''}{chartConfig.xAxisOffsetX || 0}px
                          </div>
                        </div>

                        {/* Up/Down Position */}
                        <div>
                          <label style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px', display: 'block' }}>
                            Up/Down
                          </label>
                          <input
                            type="range"
                            min="-60"
                            max="60"
                            value={chartConfig.xAxisOffsetY || 0}
                            onChange={(e) => setChartConfig(prev => ({ ...prev, xAxisOffsetY: Number(e.target.value) }))}
                            style={{ width: '100%' }}
                          />
                          <div style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center' }}>
                            {chartConfig.xAxisOffsetY > 0 ? '+' : ''}{chartConfig.xAxisOffsetY || 0}px
                          </div>
                        </div>
                      </div>
                    </div>

                      </div>
                    )}

                    {/* Y-Axis Sub-tab */}
                    {axesSubTab === 'y-axis' && (
                      <div>
                    {/* Y-Axis Configuration */}
                    <div style={{ marginBottom: '16px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#374151', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
                        Y-Axis Configuration
                      </h3>
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: '#6b7280' }}>
                          Label
                        </label>
                        <input
                          type="text"
                          placeholder="Y-Axis Label"
                          value={chartConfig.yAxisLabel || ''}
                          onChange={(e) => setChartConfig(prev => ({ ...prev, yAxisLabel: e.target.value }))}
                          style={{
                            width: '100%',
                            padding: '6px 10px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            fontSize: '13px'
                          }}
                        />
                      </div>

                      {/* Aggregation */}
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: '#6b7280' }}>
                          Aggregation Method
                        </label>
                        <select
                          value={chartConfig.aggregation || 'sum'}
                          onChange={(e) => setChartConfig(prev => ({ ...prev, aggregation: e.target.value as any }))}
                          style={{
                            width: '100%',
                            padding: '6px 10px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            fontSize: '13px',
                            background: 'white'
                          }}
                        >
                          <option value="sum">Sum</option>
                          <option value="average">Average</option>
                          <option value="count">Count</option>
                          <option value="min">Minimum</option>
                          <option value="max">Maximum</option>
                          <option value="none">None (Raw Data)</option>
                        </select>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <label style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', display: 'block' }}>Min Value</label>
                          <input
                            type="number"
                            placeholder="Auto"
                            value={chartConfig.yAxisMin || ''}
                            onChange={(e) => setChartConfig(prev => ({ ...prev, yAxisMin: e.target.value ? Number(e.target.value) : undefined }))}
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              border: '1px solid #e5e7eb',
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', display: 'block' }}>Max Value</label>
                          <input
                            type="number"
                            placeholder="Auto"
                            value={chartConfig.yAxisMax || ''}
                            onChange={(e) => setChartConfig(prev => ({ ...prev, yAxisMax: e.target.value ? Number(e.target.value) : undefined }))}
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              border: '1px solid #e5e7eb',
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Y-Axis Tick Controls */}
                    <div style={{ marginBottom: '16px' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                        Tick Configuration
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', fontSize: '13px' }}>
                          <input
                            type="checkbox"
                            checked={chartConfig.showYAxisTicks !== false}
                            onChange={(e) => setChartConfig(prev => ({ ...prev, showYAxisTicks: e.target.checked }))}
                            style={{ marginRight: '8px' }}
                          />
                          Show Y-Axis Ticks
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', fontSize: '13px' }}>
                          <input
                            type="checkbox"
                            checked={chartConfig.rotateYAxisLabels || false}
                            onChange={(e) => setChartConfig(prev => ({ ...prev, rotateYAxisLabels: e.target.checked }))}
                            style={{ marginRight: '8px' }}
                          />
                          Rotate Y-Axis Labels
                        </label>
                      </div>
                    </div>

                    {/* Y-Axis Title Controls */}
                    {(chartConfig.yAxisLabel || chartConfig.yAxisField) && (
                      <div style={{ marginBottom: '12px', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '10px' }}>
                        <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#374151', margin: '0 0 8px 0' }}>
                          📊 Y-Axis Title
                        </h4>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '8px' }}>
                          {/* Font Size */}
                          <div>
                            <label style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '2px', display: 'block' }}>
                              Font Size
                            </label>
                            <input
                              type="range"
                              min="8"
                              max="18"
                              value={chartConfig.yAxisLabelFontSize || 12}
                              onChange={(e) => setChartConfig(prev => ({ ...prev, yAxisLabelFontSize: Number(e.target.value) }))}
                              style={{ width: '100%' }}
                            />
                            <div style={{ fontSize: '9px', color: '#9ca3af', textAlign: 'center', lineHeight: '1.2' }}>
                              {chartConfig.yAxisLabelFontSize || 12}px
                            </div>
                          </div>

                          {/* Left/Right Position (since Y-axis is rotated) */}
                          <div>
                            <label style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '2px', display: 'block' }}>
                              Left/Right
                            </label>
                            <input
                              type="range"
                              min="-80"
                              max="80"
                              value={chartConfig.yAxisLabelOffsetY || 0}
                              onChange={(e) => setChartConfig(prev => ({ ...prev, yAxisLabelOffsetY: Number(e.target.value) }))}
                              style={{ width: '100%' }}
                            />
                            <div style={{ fontSize: '9px', color: '#9ca3af', textAlign: 'center', lineHeight: '1.2' }}>
                              {chartConfig.yAxisLabelOffsetY > 0 ? '+' : ''}{chartConfig.yAxisLabelOffsetY || 0}px
                            </div>
                          </div>

                          {/* Up/Down Position (since Y-axis is rotated) */}
                          <div>
                            <label style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '2px', display: 'block' }}>
                              Up/Down
                            </label>
                            <input
                              type="range"
                              min="-80"
                              max="80"
                              value={chartConfig.yAxisLabelOffsetX || 0}
                              onChange={(e) => setChartConfig(prev => ({ ...prev, yAxisLabelOffsetX: Number(e.target.value) }))}
                              style={{ width: '100%' }}
                            />
                            <div style={{ fontSize: '9px', color: '#9ca3af', textAlign: 'center', lineHeight: '1.2' }}>
                              {chartConfig.yAxisLabelOffsetX > 0 ? '+' : ''}{chartConfig.yAxisLabelOffsetX || 0}px
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Y-Axis Values Controls */}
                    <div style={{ marginBottom: '12px', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '10px' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#374151', margin: '0 0 12px 0' }}>
                        📈 Y-Axis Values
                      </h4>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '8px' }}>
                        {/* Font Size */}
                        <div>
                          <label style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px', display: 'block' }}>
                            Font Size
                          </label>
                          <input
                            type="range"
                            min="8"
                            max="16"
                            value={chartConfig.yAxisFontSize || 12}
                            onChange={(e) => setChartConfig(prev => ({ ...prev, yAxisFontSize: Number(e.target.value) }))}
                            style={{ width: '100%' }}
                          />
                          <div style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center' }}>
                            {chartConfig.yAxisFontSize || 12}px
                          </div>
                        </div>

                        {/* Left/Right Position */}
                        <div>
                          <label style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px', display: 'block' }}>
                            Left/Right
                          </label>
                          <input
                            type="range"
                            min="-60"
                            max="60"
                            value={chartConfig.yAxisOffsetX || 0}
                            onChange={(e) => setChartConfig(prev => ({ ...prev, yAxisOffsetX: Number(e.target.value) }))}
                            style={{ width: '100%' }}
                          />
                          <div style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center' }}>
                            {chartConfig.yAxisOffsetX > 0 ? '+' : ''}{chartConfig.yAxisOffsetX || 0}px
                          </div>
                        </div>

                        {/* Up/Down Position */}
                        <div>
                          <label style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px', display: 'block' }}>
                            Up/Down
                          </label>
                          <input
                            type="range"
                            min="-60"
                            max="60"
                            value={chartConfig.yAxisOffsetY || 0}
                            onChange={(e) => setChartConfig(prev => ({ ...prev, yAxisOffsetY: Number(e.target.value) }))}
                            style={{ width: '100%' }}
                          />
                          <div style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center' }}>
                            {chartConfig.yAxisOffsetY > 0 ? '+' : ''}{chartConfig.yAxisOffsetY || 0}px
                          </div>
                        </div>
                      </div>
                    </div>

                      </div>
                    )}

                    {/* Series Sub-tab */}
                    {axesSubTab === 'series' && selectedTemplate?.recipe.requiredFields.series && (
                      <div>
                    {/* Series Configuration */}
                    <div style={{ marginBottom: '16px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#374151', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
                        Series Configuration
                      </h3>

                      {/* Series Field Selection */}
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: '#6b7280' }}>
                          Series Field
                        </label>
                        <select
                          value={chartConfig.seriesField || ''}
                          onChange={(e) => {
                            setIsDataSelection(true);
                            setChartConfig(prev => ({ ...prev, seriesField: e.target.value }));
                            setTimeout(() => setIsDataSelection(false), 1000);
                          }}
                          style={{
                            width: '100%',
                            padding: '6px 10px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '4px',
                            fontSize: '13px',
                            backgroundColor: 'white'
                          }}
                        >
                          <option value="">Select Series Field</option>
                          {categoricalColumns.map(col => (
                            <option key={col.name} value={col.name}>{col.name} ({col.type})</option>
                          ))}
                        </select>
                      </div>

                      {/* Data Aggregation - Hide for stacked bar charts */}
                      {selectedTemplate?.id !== 'stacked-bar' && (
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: '#6b7280' }}>
                          Data Aggregation
                        </label>
                        <select
                          value={chartConfig.aggregation || 'sum'}
                          onChange={(e) => setChartConfig(prev => ({ ...prev, aggregation: e.target.value as 'sum' | 'average' | 'count' | 'min' | 'max' | 'none' }))}
                          style={{
                            width: '100%',
                            padding: '6px 10px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '4px',
                            fontSize: '13px',
                            backgroundColor: 'white'
                          }}
                        >
                          <option value="sum">Sum</option>
                          <option value="average">Average</option>
                          <option value="count">Count</option>
                          <option value="min">Minimum</option>
                          <option value="max">Maximum</option>
                          <option value="none">None</option>
                        </select>
                        <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                          How to combine values when multiple data points exist for the same series
                        </p>
                      </div>
                      )}
                    </div>
                      </div>
                    )}

                    {/* Trend Line Sub-tab */}
                    {axesSubTab === 'trend-line' && selectedTemplate?.recipe.type === 'scatter' && (
                      <div>
                    {/* Trend Line Configuration */}
                    <div style={{ marginBottom: '16px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#374151', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
                        Trend Line Configuration
                      </h3>

                      {/* Enable Trend Line */}
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
                          <input
                            type="checkbox"
                            checked={!!chartConfig.showTrendLine}
                            onChange={(e) => setChartConfig(prev => ({ ...prev, showTrendLine: e.target.checked }))}
                            style={{ marginRight: '8px' }}
                          />
                          Show Trend Line
                        </label>
                        <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px', marginLeft: '24px' }}>
                          Display a linear regression line showing the correlation between data points
                        </p>
                      </div>

                      {/* Trend Line Settings - Only show when enabled */}
                      {chartConfig.showTrendLine && (
                        <>
                          {/* Line Style */}
                          <div style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: '#6b7280' }}>
                              Line Style
                            </label>
                            <select
                              value={chartConfig.trendLineStyle || 'dashed'}
                              onChange={(e) => setChartConfig(prev => ({ ...prev, trendLineStyle: e.target.value as 'solid' | 'dashed' | 'dotted' }))}
                              style={{
                                width: '100%',
                                padding: '6px 10px',
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px',
                                fontSize: '13px',
                                background: 'white'
                              }}
                            >
                              <option value="solid">Solid</option>
                              <option value="dashed">Dashed</option>
                              <option value="dotted">Dotted</option>
                            </select>
                          </div>

                          {/* Color and Width */}
                          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '12px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: '#6b7280' }}>
                                Line Color
                              </label>
                              <input
                                type="color"
                                value={chartConfig.trendLineColor || '#ef4444'}
                                onChange={(e) => setChartConfig(prev => ({ ...prev, trendLineColor: e.target.value }))}
                                style={{ width: '100%', height: '36px', border: '1px solid #e5e7eb', borderRadius: '6px' }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: '#6b7280' }}>
                                Line Width
                              </label>
                              <input
                                type="number"
                                min="1"
                                max="10"
                                value={chartConfig.trendLineWidth || 2}
                                onChange={(e) => setChartConfig(prev => ({ ...prev, trendLineWidth: Number(e.target.value) }))}
                                style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '6px' }}
                              />
                            </div>
                          </div>

                          {/* Show Statistics */}
                          <div style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', fontSize: '13px' }}>
                              <input
                                type="checkbox"
                                checked={!!chartConfig.showTrendLineStats}
                                onChange={(e) => setChartConfig(prev => ({ ...prev, showTrendLineStats: e.target.checked }))}
                                style={{ marginRight: '8px' }}
                              />
                              Show statistics on chart
                            </label>
                            <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px', marginLeft: '24px' }}>
                              Display correlation statistics (R², correlation coefficient) in a box on the chart
                            </p>
                          </div>

                          {/* Statistics Configuration */}
                          {chartConfig.showTrendLineStats && (
                            <div style={{ marginLeft: '24px', padding: '12px', background: '#f9fafb', borderRadius: '6px', marginBottom: '12px' }}>
                              <h5 style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                                Statistics Box Settings
                              </h5>

                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                {/* Font Size */}
                                <div>
                                  <label style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px', display: 'block' }}>
                                    Font Size
                                  </label>
                                  <input
                                    type="range"
                                    min="8"
                                    max="16"
                                    value={chartConfig.trendLineStatsFontSize || 11}
                                    onChange={(e) => setChartConfig(prev => ({ ...prev, trendLineStatsFontSize: Number(e.target.value) }))}
                                    style={{ width: '100%' }}
                                  />
                                  <div style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center' }}>
                                    {chartConfig.trendLineStatsFontSize || 11}px
                                  </div>
                                </div>

                                {/* Horizontal Offset */}
                                <div>
                                  <label style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px', display: 'block' }}>
                                    Left/Right
                                  </label>
                                  <input
                                    type="range"
                                    min="-100"
                                    max="100"
                                    value={chartConfig.trendLineStatsOffsetX || 0}
                                    onChange={(e) => setChartConfig(prev => ({ ...prev, trendLineStatsOffsetX: Number(e.target.value) }))}
                                    style={{ width: '100%' }}
                                  />
                                  <div style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center' }}>
                                    {chartConfig.trendLineStatsOffsetX > 0 ? '+' : ''}{chartConfig.trendLineStatsOffsetX || 0}px
                                  </div>
                                </div>

                                {/* Vertical Offset */}
                                <div>
                                  <label style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px', display: 'block' }}>
                                    Up/Down
                                  </label>
                                  <input
                                    type="range"
                                    min="-100"
                                    max="100"
                                    value={chartConfig.trendLineStatsOffsetY || 0}
                                    onChange={(e) => setChartConfig(prev => ({ ...prev, trendLineStatsOffsetY: Number(e.target.value) }))}
                                    style={{ width: '100%' }}
                                  />
                                  <div style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center' }}>
                                    {chartConfig.trendLineStatsOffsetY > 0 ? '+' : ''}{chartConfig.trendLineStatsOffsetY || 0}px
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                      </div>
                    )}

                  </div>
                )}

                {/* Style Tab */}
                {activeTab === 'style' && (
                  <div>
                    {/* Visual Style Options */}
                    <div style={{ marginBottom: '20px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#374151', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
                        Visual Style
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
                          <input
                            type="checkbox"
                            checked={chartConfig.showGrid}
                            onChange={(e) => setChartConfig(prev => ({ ...prev, showGrid: e.target.checked }))}
                            style={{ marginRight: '8px' }}
                          />
                          Show Grid Lines
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
                          <input
                            type="checkbox"
                            checked={chartConfig.animation}
                            onChange={(e) => setChartConfig(prev => ({ ...prev, animation: e.target.checked }))}
                            style={{ marginRight: '8px' }}
                          />
                          Enable Animations
                        </label>
                      </div>
                    </div>

                    {/* Chart Opacity */}
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                        Chart Opacity
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="range"
                          min="0.3"
                          max="1"
                          step="0.1"
                          value={chartOpacity}
                          onChange={(e) => setChartOpacity(Number(e.target.value))}
                          style={{ flex: 1 }}
                        />
                        <span style={{ fontSize: '12px', color: '#6b7280', minWidth: '30px' }}>
                          {Math.round(chartOpacity * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

          {/* Fixed Save/Cancel buttons - Always visible */}
          {selectedTemplate && (
            <div style={{
              padding: '12px 16px',
              borderTop: '1px solid rgba(148, 163, 184, 0.2)',
              background: 'rgba(248, 250, 252, 0.95)',
              flexShrink: 0,
              borderRadius: '0 0 12px 12px',
              marginTop: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{
                display: 'flex',
                gap: '10px',
                width: '100%',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <button
                  onClick={handleSave}
                  disabled={!isConfigurationComplete()}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    background: isConfigurationComplete()
                      ? '#10b981'
                      : '#9ca3af',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: isConfigurationComplete() ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  Save Chart
                </button>
                <button
                  onClick={onCancel}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Chart Preview Panel - Adaptive sizing */}
        <div style={{
          width: layoutMode === 'vertical' ? '100%' : '65%',
          minHeight: computedPanelHeight,
          maxHeight: computedPanelHeight,
          order: layoutMode === 'vertical' ? 1 : 2,
          background: 'rgba(255, 255, 255, 0.98)',
          borderRadius: '12px',
          boxShadow: '0 15px 35px rgba(0, 0, 0, 0.15)',
          backdropFilter: 'blur(20px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {selectedTemplate && chartData ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              maxWidth: '100%',
              maxHeight: '100%'
            }}>
              <ChartRenderer
                config={{
                  ...chartConfig,
                  paddingHorizontal,
                  paddingVertical
                }}
                data={chartData}
                width={chartDimensions.previewWidth}
                height={chartDimensions.previewHeight}
                forceDisableAnimation={!isDataSelection && !isLegendMappingChange && !isChartTypeChange}
                isPreview={true}
              />
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              color: 'rgba(30, 41, 59, 0.6)',
              fontSize: '18px',
              fontWeight: '500'
            }}>
              {!selectedTemplate ? (
                <>
                  <div style={{
                    fontSize: '80px',
                    marginBottom: '24px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}>📊</div>
                  <div style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>Select a Chart Type</div>
                  <div style={{ fontSize: '14px', color: '#64748b' }}>Choose from the options on the left to get started</div>
                </>
              ) : !isConfigurationComplete() ? (
                <>
                  <div style={{
                    fontSize: '60px',
                    marginBottom: '20px',
                    color: '#8b5cf6'
                  }}>⚙️</div>
                  <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#1e293b' }}>Configure Your Chart</div>
                  <div style={{ fontSize: '14px', color: '#64748b' }}>Fill in the required fields to see your preview</div>
                </>
              ) : (
                <>
                  <div style={{
                    fontSize: '80px',
                    marginBottom: '24px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}>⏳</div>
                  <div style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>Generating Chart</div>
                  <div style={{ fontSize: '14px', color: '#64748b' }}>Your beautiful chart is being created...</div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChartBuilder;
