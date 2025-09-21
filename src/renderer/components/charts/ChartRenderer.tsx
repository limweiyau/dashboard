import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { ChartConfiguration, ChartData } from '../../types/charts';
import { COLOR_SCHEMES } from './chartTemplates';

// Helper function for compatibility with existing code
function formatNumber(value: number, format?: ChartConfiguration['numberFormat']): string {
  return formatNumberValue(value, format);
}

// Excel-style number formatting utility
function formatNumberValue(value: number, format: ChartConfiguration['numberFormat']): string {
  if (!format || value === undefined || value === null) return String(value);

  let formattedValue = value;
  let unitSuffix = '';

  // Handle display units first
  if (format.displayUnit && format.displayUnit !== 'none') {
    switch (format.displayUnit) {
      case 'hundreds':
        formattedValue = value / 100;
        unitSuffix = format.displayUnitLabel ? ' H' : '';
        break;
      case 'thousands':
        formattedValue = value / 1000;
        unitSuffix = format.displayUnitLabel ? ' K' : '';
        break;
      case 'millions':
        formattedValue = value / 1000000;
        unitSuffix = format.displayUnitLabel ? ' M' : '';
        break;
      case 'billions':
        formattedValue = value / 1000000000;
        unitSuffix = format.displayUnitLabel ? ' B' : '';
        break;
    }
  }

  // Handle decimals and thousands separators together
  let result: string;

  // Auto-adjust decimal places for display units if needed
  let effectiveDecimals = format.decimals !== undefined ? format.decimals : 2;

  // If display unit is applied and decimals is 0, but result has meaningful decimals, auto-adjust
  if (format.displayUnit && format.displayUnit !== 'none' && format.decimals === 0) {
    const decimalPart = formattedValue - Math.floor(formattedValue);
    if (decimalPart > 0.001) { // If there are meaningful decimals
      // Count significant decimal places (up to 3)
      const decimalStr = decimalPart.toFixed(6);
      const significantDecimals = Math.min(3, decimalStr.replace('0.', '').replace(/0+$/, '').length);
      effectiveDecimals = Math.max(1, significantDecimals);
    }
  }

  if (format.thousands) {
    // Use toLocaleString with proper decimal places option
    result = formattedValue.toLocaleString(undefined, {
      minimumFractionDigits: effectiveDecimals,
      maximumFractionDigits: effectiveDecimals
    });
  } else {
    // Handle decimals only
    formattedValue = Number(formattedValue.toFixed(effectiveDecimals));
    result = String(formattedValue);
  }

  // Handle negative numbers
  if (value < 0 && format.negativeNumbers) {
    const absResult = result.replace('-', '');
    switch (format.negativeNumbers) {
      case 'parentheses':
        result = `(${absResult})`;
        break;
      case 'red':
        result = absResult; // Color handling would be done in CSS/styling
        break;
      // 'minus' is default, no change needed
    }
  }

  // Add prefix and suffix
  const prefix = format.prefix || '';
  const suffix = (format.suffix || '') + unitSuffix;

  return prefix + result + suffix;
}

// Helper function to create axes with rotation support
const createAxesWithRotation = (
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  xScale: any,
  yScale: any,
  width: number,
  height: number,
  config: ChartConfiguration
) => {
  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale);

  // Configure tick visibility
  if (config.showXAxisTicks === false) {
    xAxis.tickSize(0);
  }
  if (config.showYAxisTicks === false) {
    yAxis.tickSize(0);
  }

  // Create X-axis with positioning offset
  const xAxisGroup = g.append('g')
    .attr('transform', `translate(${config.xAxisOffsetX || 0},${height + (config.xAxisOffsetY || 0)})`)
    .call(xAxis);

  // Style axis lines
  xAxisGroup.selectAll('path, line')
    .style('stroke', '#6b7280');

  // Style X-axis text with rotation and font size (scale for preview charts)
  const actualWidth = width + 200; // Approximate total width including margins
  const isPreviewChart = actualWidth <= 550;
  const scaledXAxisFontSize = config.xAxisFontSize || (isPreviewChart ? 9 : 12);

  xAxisGroup.selectAll('text')
    .style('font-size', `${scaledXAxisFontSize}px`)
    .style('text-anchor', config.rotateXAxisLabels ? 'end' : 'middle')
    .style('fill', '#6b7280');

  // Apply rotation if enabled
  if (config.rotateXAxisLabels) {
    xAxisGroup.selectAll('text')
      .attr('transform', 'rotate(-45)')
      .attr('dx', '-0.8em')
      .attr('dy', '0.15em');
  }

  // Create Y-axis with positioning offset
  const yAxisGroup = g.append('g')
    .attr('transform', `translate(${config.yAxisOffsetX || 0},${config.yAxisOffsetY || 0})`)
    .call(yAxis);

  // Style Y-axis lines
  yAxisGroup.selectAll('path, line')
    .style('stroke', '#6b7280');

  // Style Y-axis text with rotation and font size (scale for preview charts)
  const scaledYAxisFontSize = config.yAxisFontSize || (isPreviewChart ? 9 : 12);

  yAxisGroup.selectAll('text')
    .style('font-size', `${scaledYAxisFontSize}px`)
    .style('text-anchor', config.rotateYAxisLabels ? 'start' : 'end')
    .style('fill', '#6b7280');

  // Apply rotation if enabled for Y-axis
  if (config.rotateYAxisLabels) {
    yAxisGroup.selectAll('text')
      .attr('transform', `rotate(-90) translate(${(config.yAxisLabelOffsetX || 0) - 20}, ${config.yAxisLabelOffsetY || 0})`)
      .attr('dx', '-0.8em')
      .attr('dy', '0.35em');
  }
};

// Utility function to get colors based on color management mode
const getColors = (config: ChartConfiguration, data: ChartData): string[] => {
  // Determine if this is a single-dataset chart that should use per-category coloring
  const isSingleDatasetChart = (config.templateId === 'simple-bar' || config.templateId === 'pie-chart' || config.templateId === 'area-chart') && data.datasets.length === 1;

  // Determine coloring strategy based on legend mapping
  const usePerCategoryColors =
    config.legendMapping === 'categories' ||
    (!config.legendMapping && isSingleDatasetChart && (config.colorScheme === 'dynamic' || config.colorMode === 'individual'));

  const itemCount = usePerCategoryColors ? data.labels.length : data.datasets.length;

  // For Data Series mapping in single color mode, use single color
  if (config.legendMapping === 'series' && config.colorMode === 'single') {
    const singleColor = config.singleColor || '#6366f1';
    return new Array(itemCount).fill(singleColor);
  }

  switch (config.colorMode) {
    case 'single':
      // Single color for all elements
      const singleColor = config.singleColor || '#6366f1';
      return new Array(itemCount).fill(singleColor);

    case 'individual':
      // Use custom colors if available, fallback to scheme colors
      const customColors = config.customColors || [];
      return Array.from({length: itemCount}, (_, i) =>
        customColors[i] || COLOR_SCHEMES[config.colorScheme as keyof typeof COLOR_SCHEMES]?.[i % 8] || '#6366f1'
      );

    case 'scheme':
    default:
      // Use color scheme
      if (config.colorScheme === 'dynamic') {
        return Array.from({length: itemCount}, (_, i) => {
          const hue = (i * 360 / itemCount) % 360;
          const saturation = 65 + (i % 3) * 10;
          const lightness = 45 + (i % 2) * 10;
          return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        });
      } else {
        const schemeColors = COLOR_SCHEMES[config.colorScheme as keyof typeof COLOR_SCHEMES] as string[] || COLOR_SCHEMES.modern as string[];
        return Array.from({length: itemCount}, (_, i) => schemeColors[i % schemeColors.length]);
      }
  }
};

// Utility function to apply data label positioning offsets
const applyDataLabelOffset = (x: number, y: number, config: ChartConfiguration): { x: number, y: number } => {
  const offsetX = config.dataLabelsOffsetX || 0;
  const offsetY = config.dataLabelsOffsetY || 0;

  return {
    x: x + offsetX,
    y: y + offsetY
  };
};


interface ChartRendererProps {
  config: ChartConfiguration;
  data: ChartData;
  width?: number;
  height?: number;
  forceDisableAnimation?: boolean; // Optional prop to disable animations contextually
  scaleFactor?: number; // New prop for proportional scaling of all elements
  tooltipZIndex?: number; // Z-index for tooltips (useful for modals)
}

const ChartRenderer: React.FC<ChartRendererProps> = ({
  config,
  data,
  width = 600,
  height = 400,
  forceDisableAnimation = false,
  scaleFactor = 1.0,
  tooltipZIndex = 1000
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const svgHeight = Math.max(height - 50, 0); // Reserve space for title/actions without forcing re-renders

  useEffect(() => {
    if (!svgRef.current || !data || !data.labels.length) return;

    // Simplified animation logic - trust the forceDisableAnimation flag from ChartBuilder
    const shouldAnimate = !forceDisableAnimation && config.animation;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Use dynamic dimensions
    const actualWidth = width;
    const actualHeight = svgHeight;

    // Adjust margins based on chart size - scale for different preview sizes
    const isSmallChart = actualWidth <= 350 || actualHeight <= 200;
    const isPreviewChart = actualWidth <= 550 || actualHeight <= 350; // Medium preview size
    const baseMargin = isSmallChart ? 15 : 60;
    const extraSpace = isSmallChart ? 8 : 30;
    const isRadialChart = config.templateId === 'pie-chart';

    let margin;
    if (isRadialChart) {
      const radialHorizontal = Math.max(20, (config.paddingHorizontal || (isSmallChart ? 5 : 16)) + 12);
      const radialVertical = Math.max(16, (config.paddingVertical || (isSmallChart ? 4 : 12)) + 8);
      margin = {
        top: radialVertical,
        right: radialHorizontal,
        bottom: radialVertical,
        left: radialHorizontal
      };
    } else {
      const horizontalPadding = baseMargin + (config.paddingHorizontal || (isSmallChart ? 5 : 20));
      const verticalPadding = (isSmallChart ? 20 : 35) + (config.paddingVertical || (isSmallChart ? 5 : 10));

      // Make margins symmetric for proper centering, with extra space distributed evenly
      const horizontalExtra = Math.floor(extraSpace / 2);
      const verticalExtra = extraSpace;

      margin = {
        top: verticalPadding,
        right: horizontalPadding + horizontalExtra,
        bottom: verticalPadding + verticalExtra, // Reserve room for axis labels when needed
        left: horizontalPadding + horizontalExtra
      };
    }
    const chartWidth = actualWidth - margin.left - margin.right;
    const chartHeight = actualHeight - margin.top - margin.bottom;

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create tooltip with theme colors
    const tooltip = d3.select('body').selectAll('.d3-tooltip').data([0]);
    const tooltipEnter = tooltip.enter().append('div').attr('class', 'd3-tooltip');
    const tooltipDiv = tooltip.merge(tooltipEnter)
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('background', '#1f2937')
      .style('color', '#ffffff')
      .style('border', '1px solid #374151')
      .style('padding', '8px 12px')
      .style('border-radius', '6px')
      .style('font-size', '12px')
      .style('font-weight', '500')
      .style('pointer-events', 'none')
      .style('box-shadow', '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)')
      .style('z-index', String(tooltipZIndex));

    // Generate colors using the new color management system
    const colors = getColors(config, data);

    // Determine if this is a single-dataset chart that should use per-category coloring
    const isSingleDatasetChart = (config.templateId === 'simple-bar' || config.templateId === 'pie-chart' || config.templateId === 'area-chart') && data.datasets.length === 1;

    // For multi-series charts, determine coloring based on explicit mapping or default to series
    const isMultiSeriesChart = config.templateId === 'multi-series-bar' || config.templateId === 'multi-line' || data.datasets.length > 1;

    // Determine coloring strategy based on legend mapping and color mode
    const shouldUsePerCategoryColors =
      config.legendMapping === 'categories' ||
      (!config.legendMapping && isSingleDatasetChart && (config.colorScheme === 'dynamic' || config.colorMode === 'individual'));

    switch (config.templateId) {
      case 'simple-bar':
      case 'multi-series-bar':
        renderBarChart(g, data, chartWidth, chartHeight, colors, config, tooltipDiv, shouldUsePerCategoryColors, !shouldAnimate, scaleFactor);
        break;
      case 'stacked-bar':
        renderStackedBarChart(g, data, chartWidth, chartHeight, colors, config, tooltipDiv, !shouldAnimate, scaleFactor);
        break;
      case 'simple-line':
      case 'multi-line':
        renderLineChart(g, data, chartWidth, chartHeight, colors, config, tooltipDiv, !shouldAnimate, scaleFactor);
        break;
      case 'area-chart':
        renderAreaChart(g, data, chartWidth, chartHeight, colors, config, tooltipDiv, !shouldAnimate, scaleFactor);
        break;
      case 'pie-chart':
        renderPieChart(g, data, chartWidth, chartHeight, colors, config, tooltipDiv, !shouldAnimate, scaleFactor);
        break;
      case 'scatter-plot':
        renderScatterPlot(g, data, chartWidth, chartHeight, colors, config, tooltipDiv, !shouldAnimate, scaleFactor);
        break;
    }

    if (config.showLegend || data.datasets.length > 1) {
      const legendVertical = config.legendVerticalPosition || 'top';
      const legendHorizontal = config.legendHorizontalPosition || config.legendPosition || 'right';
      renderLegend(svg, data, colors, actualWidth, actualHeight, legendVertical, legendHorizontal, config, shouldUsePerCategoryColors, scaleFactor);
    }

  }, [config, data, width, svgHeight, forceDisableAnimation, scaleFactor]);

  // Determine title positioning
  const titleVertical = config.titleVerticalPosition || 'top';
  const titleHorizontal = config.titleHorizontalPosition || config.titlePosition || 'center';

  const renderTitle = () => {
    if (!config.title) return null;

    const isSmallChart = width <= 350 || svgHeight <= 200;
    const baseTitleFontSize = config.titleFontSize || (isSmallChart ? 12 : 18);
    const titleFontSize = Math.round(baseTitleFontSize * scaleFactor);
    const titleMargin = isSmallChart ? '4px 0 8px 0' : '8px 0 6px 0';
    const titleHeight = isSmallChart ? '20px' : '30px';

    return (
      <div
        style={{
          position: 'relative',
          textAlign: titleHorizontal,
          margin: titleVertical === 'top' ? titleMargin : (isSmallChart ? '8px 0 4px 0' : '6px 0 8px 0'),
          flexShrink: 0,
          height: titleHeight,
          transform: `translate(${config.titleOffsetX || 0}px, ${config.titleOffsetY || 0}px)`,
          zIndex: 10
        }}
      >
        <h3
          style={{
            fontSize: `${titleFontSize}px`,
            fontWeight: '600',
            color: '#111827',
            opacity: 0.9,
            padding: isSmallChart ? '1px 4px' : '2px 8px',
            borderRadius: '4px',
            margin: 0
          }}
        >
          {config.title}
        </h3>
      </div>
    );
  };

  return (
    <div
      className="chart-container"
      style={{
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '8px',
        padding: width <= 350 || svgHeight <= 200 ? '6px' : '12px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        border: '2px solid #8b5cf6',
        transition: 'all 0.3s ease',
        width: `${width}px`,
        height: `${height}px`,
        maxWidth: '100%',
        maxHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        margin: '0 auto'
      }}>
      {titleVertical === 'top' && renderTitle()}
      <svg
        ref={svgRef}
        width={width}
        height={svgHeight}
        style={{
          background: 'transparent',
          borderRadius: '6px',
          opacity: 0.95,
          position: 'relative',
          zIndex: 1
        }}
      />
      {titleVertical === 'bottom' && renderTitle()}
    </div>
  );
};

// Helper function to scale font sizes for different chart sizes
const getScaledFontSize = (configSize: number | undefined, defaultSize: number, chartWidth: number, globalScaleFactor: number = 1.0): number => {
  const isPreviewChart = chartWidth <= 450; // Updated threshold for 650px wide charts
  const previewScale = isPreviewChart ? 0.85 : 1; // 15% smaller for previews (less aggressive)

  // Apply both preview scaling and global proportional scaling
  const combinedScale = previewScale * globalScaleFactor;
  return Math.round((configSize || defaultSize) * combinedScale);
};

function renderBarChart(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  data: ChartData,
  width: number,
  height: number,
  colors: string[],
  config: ChartConfiguration,
  tooltip: d3.Selection<d3.BaseType, unknown, HTMLElement, any>,
  shouldUsePerCategoryColors: boolean,
  forceDisableAnimation: boolean,
  scaleFactor: number = 1.0
) {

  // Add gradients and glow effects for prettier bars
  const defs = g.append('defs');
  colors.forEach((color, index) => {
    // Create main gradient
    const gradient = defs.append('linearGradient')
      .attr('id', `gradient-${index}`)
      .attr('gradientUnits', 'objectBoundingBox')
      .attr('x1', 0).attr('y1', 0)
      .attr('x2', 0).attr('y2', 1);

    // Create glass-like gradient with highlights and reflections
    gradient.append('stop')
      .attr('stop-color', '#ffffff')
      .attr('stop-opacity', '0.4')
      .attr('offset', '0%');

    gradient.append('stop')
      .attr('stop-color', d3.color(color)?.brighter(0.6) || color)
      .attr('stop-opacity', '0.7')
      .attr('offset', '15%');

    gradient.append('stop')
      .attr('stop-color', color)
      .attr('stop-opacity', '0.8')
      .attr('offset', '45%');

    gradient.append('stop')
      .attr('stop-color', d3.color(color)?.darker(0.1) || color)
      .attr('stop-opacity', '0.9')
      .attr('offset', '75%');

    gradient.append('stop')
      .attr('stop-color', d3.color(color)?.darker(0.4) || color)
      .attr('stop-opacity', '0.95')
      .attr('offset', '100%');

    // Create subtle glass reflection highlight gradient
    const glassHighlight = defs.append('linearGradient')
      .attr('id', `glass-highlight-${index}`)
      .attr('gradientUnits', 'objectBoundingBox')
      .attr('x1', 0).attr('y1', 0)
      .attr('x2', 0).attr('y2', 1);

    glassHighlight.append('stop')
      .attr('stop-color', '#ffffff')
      .attr('stop-opacity', '0.4')
      .attr('offset', '0%');

    glassHighlight.append('stop')
      .attr('stop-color', '#ffffff')
      .attr('stop-opacity', '0.1')
      .attr('offset', '35%');

    glassHighlight.append('stop')
      .attr('stop-color', '#ffffff')
      .attr('stop-opacity', '0')
      .attr('offset', '35%');

    // Create enhanced glow filter for more sophisticated outline effect
    const filter = defs.append('filter')
      .attr('id', `glow-${index}`)
      .attr('x', '-20%')
      .attr('y', '-20%')
      .attr('width', '140%')
      .attr('height', '140%');

    // Create multiple glow layers for depth
    filter.append('feGaussianBlur')
      .attr('stdDeviation', '2')
      .attr('result', 'coloredBlur');

    // Add a second blur for more depth
    filter.append('feGaussianBlur')
      .attr('stdDeviation', '0.8')
      .attr('result', 'coloredBlur2');

    // Create a colored flood for inner glow
    filter.append('feFlood')
      .attr('flood-color', d3.color(color)?.brighter(0.5) || color)
      .attr('flood-opacity', '0.3')
      .attr('result', 'coloredFlood');

    // Merge all effects
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur2');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
  });
  const xScale = d3.scaleBand()
    .domain(data.labels)
    .range([0, width])
    .padding(0.2);

  const maxValue = d3.max(data.datasets, d => d3.max(d.data)) || 0;
  const yScale = d3.scaleLinear()
    .domain([
      config.yAxisMin !== undefined ? config.yAxisMin : 0,
      config.yAxisMax !== undefined ? config.yAxisMax : maxValue * 1.1
    ])
    .range([height, 0]);

  // Grid lines
  if (config.showGrid) {
    g.selectAll('.grid-line')
      .data(yScale.ticks(5))
      .enter()
      .append('line')
      .attr('class', 'grid-line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))
      .style('stroke', '#e5e7eb')
      .style('stroke-width', 1);
  }

  // Axes with rotation support
  createAxesWithRotation(g, xScale, yScale, width, height, config);

  // Add axis labels with positioning offsets
  if (config.xAxisField || config.title) {
    g.append('text')
      .attr('transform', `translate(${width / 2 + (config.xAxisLabelOffsetX || 0)}, ${height + 35 + (config.xAxisLabelOffsetY || 0)})`)
      .style('text-anchor', 'middle')
      .style('font-size', `${getScaledFontSize(config.xAxisLabelFontSize, 12, width, scaleFactor)}px`)
      .style('font-weight', '500')
      .style('fill', '#64748b')
      .text(config.xAxisLabel || config.xAxisField || 'X-Axis');
  }

  if (config.yAxisField) {
    const yAxisLabel = Array.isArray(config.yAxisField) ? config.yAxisField[0] : config.yAxisField;
    g.append('text')
      .attr('transform', `rotate(-90) translate(${(config.yAxisLabelOffsetX || 0) - 20}, ${config.yAxisLabelOffsetY || 0})`)
      .attr('y', -40) // Fixed positioning instead of referencing undefined margin
      .attr('x', 0 - (height / 2))
      .style('text-anchor', 'middle')
      .style('font-size', `${getScaledFontSize(config.yAxisLabelFontSize, 12, width, scaleFactor)}px`)
      .style('font-weight', '500')
      .style('fill', '#64748b')
      .text(config.yAxisLabel || yAxisLabel || 'Y-Axis');
  }

  // Bars with enhanced styling and animations
  const barWidth = xScale.bandwidth() / data.datasets.length;

  data.datasets.forEach((dataset, seriesIndex) => {
    const colorIndex = seriesIndex;

    // Create only glass bars - no solid bars
    const glassOverlay = g.selectAll(`.glass-overlay-${seriesIndex}`)
      .data(dataset.data)
      .enter()
      .append('rect')
      .attr('class', `glass-overlay-${seriesIndex}`)
      .attr('x', (d, i) => (xScale(data.labels[i]) || 0) + seriesIndex * barWidth)
      .attr('width', barWidth)
      .attr('y', height)
      .attr('height', 0)
      .style('fill', (d, i) => d3.color(colors[shouldUsePerCategoryColors ? i % colors.length : colorIndex % colors.length])?.brighter(1.5) || colors[shouldUsePerCategoryColors ? i % colors.length : colorIndex % colors.length])
      .style('fill-opacity', 0.2)
      .style('stroke', (d, i) => colors[shouldUsePerCategoryColors ? i % colors.length : colorIndex % colors.length])
      .style('stroke-width', 2)
      .style('stroke-opacity', 0.8)
      .style('rx', 4)
      .style('ry', 4)
      .on('mouseover', function(event, d) {
        const i = dataset.data.indexOf(d);
        d3.select(this)
          .transition()
          .duration(200)
          .style('fill-opacity', 0.3)
          .style('stroke-width', 2.5)
          .style('stroke-opacity', 1);

        tooltip.transition().duration(200).style('opacity', 1);
        tooltip.html(`
          <div><strong>${data.labels[i]}</strong></div>
          <div>${dataset.label || 'Value'}: ${formatNumber(d, config.numberFormat)}</div>
        `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this)
          .transition()
          .duration(200)
          .style('fill-opacity', 0.2)
          .style('stroke-width', 2)
          .style('stroke-opacity', 0.8);

        tooltip.transition().duration(200).style('opacity', 0);
      });

    // Animate glass bars growing from bottom
    if (config.animation && !forceDisableAnimation) {
      const totalItems = dataset.data.length;
      const maxDelay = 800;
      const itemDelay = Math.min(80, maxDelay / totalItems);

      glassOverlay.transition()
        .duration(600)
        .delay((d, i) => i * itemDelay)
        .ease(d3.easeCubicOut)
        .attr('y', d => yScale(d))
        .attr('height', d => Math.max(0, height - yScale(d)));
    } else {
      glassOverlay.attr('y', d => yScale(d))
        .attr('height', d => Math.max(0, height - yScale(d)));
    }

    // Add data labels if enabled
    if (config.showDataLabels) {
      const labels = g.selectAll(`.label-${seriesIndex}`)
        .data(dataset.data)
        .enter()
        .append('text')
        .attr('class', `label-${seriesIndex}`)
        .attr('x', (d, i) => {
          const baseX = (xScale(data.labels[i]) || 0) + seriesIndex * barWidth + barWidth / 2;
          let x: number;
          switch (config.dataLabelsPosition) {
            case 'left':
              x = baseX - barWidth / 2 - 5; // To the left of the bar
              break;
            case 'right':
              x = baseX + barWidth / 2 + 5; // To the right of the bar
              break;
            default:
              x = baseX; // Center of the bar
              break;
          }
          return applyDataLabelOffset(x, 0, config).x;
        })
        .attr('y', d => {
          const barY = yScale(d);
          const barHeight = height - barY;
          let y: number;
          switch (config.dataLabelsPosition) {
            case 'top':
              y = barY - 8; // Above the bar
              break;
            case 'inside-top':
              y = barY + 15; // Inside top of the bar
              break;
            case 'center':
              y = barY + barHeight / 2 + 4; // Center of bar
              break;
            case 'inside-bottom':
              y = barY + barHeight - 8; // Inside bottom of the bar
              break;
            case 'bottom':
              y = height + 15; // Below the chart area
              break;
            case 'outside': // Legacy support
              y = barY - 8; // Above the bar
              break;
            case 'inside': // Legacy support
              y = barY + 15; // Inside top of the bar
              break;
            default:
              y = barY - 8; // Default to top
              break;
          }
          return applyDataLabelOffset(0, y, config).y;
        })
        .attr('text-anchor', d => {
          switch (config.dataLabelsPosition) {
            case 'left':
              return 'end'; // Right-align text when positioned to the left
            case 'right':
              return 'start'; // Left-align text when positioned to the right
            default:
              return 'middle'; // Center-align for all other positions
          }
        })
        .style('font-size', `${Math.round((config.dataLabelsFontSize || 11) * scaleFactor)}px`)
        .style('font-weight', '500')
        .style('fill', config.dataLabelsColor || '#374151')
        .style('opacity', (config.animation && !forceDisableAnimation) ? 0 : 1)
        .text(d => formatNumberValue(d, config.numberFormat));

      // Animate data labels if animation is enabled
      if (config.animation && !forceDisableAnimation) {
        const totalItems = dataset.data.length;
        const maxDelay = 800;
        const itemDelay = Math.min(80, maxDelay / totalItems);

        labels.transition()
          .duration(300)
          .delay((d, i) => i * itemDelay + 300) // Start after bars
          .ease(d3.easeCubicOut)
          .style('opacity', 1);
      }
    }
  });
}

function renderStackedBarChart(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  data: ChartData,
  width: number,
  height: number,
  colors: string[],
  config: ChartConfiguration,
  tooltip: d3.Selection<d3.BaseType, unknown, HTMLElement, any>,
  forceDisableAnimation: boolean,
  scaleFactor: number = 1.0
) {
  // Add gradients and glow effects for prettier bars
  const defs = g.append('defs');
  colors.forEach((color, index) => {
    // Create main gradient
    const gradient = defs.append('linearGradient')
      .attr('id', `gradient-${index}`)
      .attr('gradientUnits', 'objectBoundingBox')
      .attr('x1', 0).attr('y1', 0)
      .attr('x2', 0).attr('y2', 1);

    // Create glass-like gradient with highlights and reflections
    gradient.append('stop')
      .attr('stop-color', '#ffffff')
      .attr('stop-opacity', '0.4')
      .attr('offset', '0%');

    gradient.append('stop')
      .attr('stop-color', d3.color(color)?.brighter(0.6) || color)
      .attr('stop-opacity', '0.7')
      .attr('offset', '15%');

    gradient.append('stop')
      .attr('stop-color', color)
      .attr('stop-opacity', '0.8')
      .attr('offset', '45%');

    gradient.append('stop')
      .attr('stop-color', d3.color(color)?.darker(0.1) || color)
      .attr('stop-opacity', '0.9')
      .attr('offset', '75%');

    gradient.append('stop')
      .attr('stop-color', d3.color(color)?.darker(0.4) || color)
      .attr('stop-opacity', '0.95')
      .attr('offset', '100%');

    // Create subtle glass reflection highlight gradient
    const glassHighlight = defs.append('linearGradient')
      .attr('id', `glass-highlight-${index}`)
      .attr('gradientUnits', 'objectBoundingBox')
      .attr('x1', 0).attr('y1', 0)
      .attr('x2', 0).attr('y2', 1);

    glassHighlight.append('stop')
      .attr('stop-color', '#ffffff')
      .attr('stop-opacity', '0.4')
      .attr('offset', '0%');

    glassHighlight.append('stop')
      .attr('stop-color', '#ffffff')
      .attr('stop-opacity', '0.1')
      .attr('offset', '35%');

    glassHighlight.append('stop')
      .attr('stop-color', '#ffffff')
      .attr('stop-opacity', '0')
      .attr('offset', '35%');

    // Create enhanced glow filter for more sophisticated outline effect
    const filter = defs.append('filter')
      .attr('id', `glow-${index}`)
      .attr('x', '-20%')
      .attr('y', '-20%')
      .attr('width', '140%')
      .attr('height', '140%');

    // Create multiple glow layers for depth
    filter.append('feGaussianBlur')
      .attr('stdDeviation', '2')
      .attr('result', 'coloredBlur');

    // Add a second blur for more depth
    filter.append('feGaussianBlur')
      .attr('stdDeviation', '0.8')
      .attr('result', 'coloredBlur2');

    // Create a colored flood for inner glow
    filter.append('feFlood')
      .attr('flood-color', d3.color(color)?.brighter(0.5) || color)
      .attr('flood-opacity', '0.3')
      .attr('result', 'coloredFlood');

    // Merge all effects
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur2');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
  });

  const xScale = d3.scaleBand()
    .domain(data.labels)
    .range([0, width])
    .padding(0.2);

  // Calculate stacked values - simpler approach
  const stackedData: any[] = [];
  data.labels.forEach((label, labelIndex) => {
    let cumulativeValue = 0;
    const stackEntry: any = { label, labelIndex, values: [] };

    data.datasets.forEach((dataset, datasetIndex) => {
      const value = dataset.data[labelIndex] || 0;
      stackEntry.values.push({
        datasetIndex,
        value,
        y0: cumulativeValue,
        y1: cumulativeValue + value,
        label: dataset.label
      });
      cumulativeValue += value;
    });

    stackedData.push(stackEntry);
  });

  const maxValue = d3.max(stackedData, d => d3.max(d.values, (v: any) => v.y1)) || 0;
  const yScale = d3.scaleLinear()
    .domain([
      config.yAxisMin !== undefined ? config.yAxisMin : 0,
      config.yAxisMax !== undefined ? config.yAxisMax : maxValue * 1.1
    ])
    .range([height, 0]);

  // Grid lines
  if (config.showGrid) {
    g.selectAll('.grid-line')
      .data(yScale.ticks(5))
      .enter()
      .append('line')
      .attr('class', 'grid-line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))
      .style('stroke', '#e5e7eb')
      .style('stroke-width', 1);
  }

  // Axes with rotation support
  createAxesWithRotation(g, xScale, yScale, width, height, config);

  // Add axis labels
  if (config.xAxisField || config.title) {
    g.append('text')
      .attr('transform', `translate(${width / 2 + (config.xAxisLabelOffsetX || 0)}, ${height + 35 + (config.xAxisLabelOffsetY || 0)})`)
      .style('text-anchor', 'middle')
      .style('font-size', `${getScaledFontSize(config.xAxisLabelFontSize, 12, width, scaleFactor)}px`)
      .style('font-weight', '500')
      .style('fill', '#64748b')
      .text(config.xAxisLabel || config.xAxisField || 'X-Axis');
  }

  if (config.yAxisField) {
    const yAxisLabel = Array.isArray(config.yAxisField) ? config.yAxisField[0] : config.yAxisField;
    g.append('text')
      .attr('transform', `rotate(-90) translate(${(config.yAxisLabelOffsetX || 0) - 20}, ${config.yAxisLabelOffsetY || 0})`)
      .attr('y', -40)
      .attr('x', 0 - (height / 2))
      .style('text-anchor', 'middle')
      .style('font-size', `${getScaledFontSize(config.yAxisLabelFontSize, 12, width, scaleFactor)}px`)
      .style('font-weight', '500')
      .style('fill', '#64748b')
      .text(config.yAxisLabel || yAxisLabel || 'Y-Axis');
  }

  // Draw glass stacked bars
  stackedData.forEach((stackEntry, stackIndex) => {
    stackEntry.values.forEach((valueData: any, valueIndex: number) => {
      const rect = g.append('rect')
        .attr('class', `stacked-bar-${stackIndex}-${valueIndex}`)
        .attr('x', xScale(stackEntry.label) || 0)
        .attr('width', xScale.bandwidth())
        .attr('y', height)
        .attr('height', 0)
        .style('fill', d3.color(colors[valueData.datasetIndex % colors.length])?.brighter(1.5) || colors[valueData.datasetIndex % colors.length])
        .style('fill-opacity', 0.2)
        .style('stroke', colors[valueData.datasetIndex % colors.length])
        .style('stroke-width', 2)
        .style('stroke-opacity', 0.8)
        .style('rx', 4)
        .style('ry', 4)
        .on('mouseover', function(event) {
          d3.select(this)
            .transition()
            .duration(200)
            .style('fill-opacity', 0.3)
            .style('stroke-width', 2.5)
            .style('stroke-opacity', 1);

          tooltip.transition().duration(200).style('opacity', 1);
          tooltip.html(`
            <div><strong>${stackEntry.label}</strong></div>
            <div>${valueData.label}: ${formatNumber(valueData.value, config.numberFormat)}</div>
          `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', function() {
          d3.select(this)
            .transition()
            .duration(200)
            .style('fill-opacity', 0.2)
            .style('stroke-width', 2)
            .style('stroke-opacity', 0.8);

          tooltip.transition().duration(200).style('opacity', 0);
        });

      // Animate glass bars
      if (config.animation && !forceDisableAnimation) {
        rect.transition()
          .duration(600)
          .delay(stackIndex * 80 + valueIndex * 20)
          .ease(d3.easeCubicOut)
          .attr('y', yScale(valueData.y1))
          .attr('height', Math.max(0, yScale(valueData.y0) - yScale(valueData.y1)));
      } else {
        rect.attr('y', yScale(valueData.y1))
          .attr('height', Math.max(0, yScale(valueData.y0) - yScale(valueData.y1)));
      }

      // Add data labels if enabled
      if (config.showDataLabels) {
        const segmentHeight = yScale(valueData.y0) - yScale(valueData.y1);
        const segmentY = yScale(valueData.y1);

        // Only show label if segment is large enough to be readable
        if (segmentHeight > 20) {
          const label = g.append('text')
            .attr('class', `stacked-label-${stackIndex}-${valueIndex}`)
            .attr('x', (xScale(stackEntry.label) || 0) + xScale.bandwidth() / 2)
            .attr('y', () => {
              switch (config.dataLabelsPosition) {
                case 'top':
                  return segmentY - 8; // Above the segment
                case 'inside-top':
                  return segmentY + 15; // Inside top of segment
                case 'center':
                  return segmentY + segmentHeight / 2 + 4; // Center of segment
                case 'inside-bottom':
                  return segmentY + segmentHeight - 8; // Inside bottom of segment
                default:
                  return segmentY + segmentHeight / 2 + 4; // Default to center
              }
            })
            .attr('text-anchor', 'middle')
            .style('font-size', `${getScaledFontSize(config.dataLabelsFontSize, 11, width, scaleFactor)}px`)
            .style('font-weight', '500')
            .style('fill', config.dataLabelsColor || '#374151')
            .style('opacity', (config.animation && !forceDisableAnimation) ? 0 : 1)
            .text(formatNumberValue(valueData.value, config.numberFormat));

          // Animate data labels if animation is enabled
          if (config.animation && !forceDisableAnimation) {
            label.transition()
              .duration(300)
              .delay(stackIndex * 80 + valueIndex * 20 + 300)
              .ease(d3.easeCubicOut)
              .style('opacity', 1);
          }
        }
      }
    });
  });
}

function renderLineChart(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  data: ChartData,
  width: number,
  height: number,
  colors: string[],
  config: ChartConfiguration,
  tooltip: d3.Selection<d3.BaseType, unknown, HTMLElement, any>,
  forceDisableAnimation: boolean,
  scaleFactor: number = 1.0
) {
  const xScale = d3.scalePoint()
    .domain(data.labels)
    .range([0, width]);

  const maxValue = d3.max(data.datasets, d => d3.max(d.data)) || 0;
  const yScale = d3.scaleLinear()
    .domain([
      config.yAxisMin !== undefined ? config.yAxisMin : 0,
      config.yAxisMax !== undefined ? config.yAxisMax : maxValue * 1.1
    ])
    .range([height, 0]);

  // Grid lines
  if (config.showGrid) {
    g.selectAll('.grid-line')
      .data(yScale.ticks(5))
      .enter()
      .append('line')
      .attr('class', 'grid-line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))
      .style('stroke', '#e5e7eb')
      .style('stroke-width', 1);
  }

  // Axes with rotation support
  createAxesWithRotation(g, xScale, yScale, width, height, config);

  // Add axis labels
  if (config.xAxisField) {
    g.append('text')
      .attr('transform', `translate(${width / 2 + (config.xAxisLabelOffsetX || 0)}, ${height + 35 + (config.xAxisLabelOffsetY || 0)})`)
      .style('text-anchor', 'middle')
      .style('font-size', `${getScaledFontSize(config.xAxisLabelFontSize, 12, width, scaleFactor)}px`)
      .style('font-weight', '500')
      .style('fill', '#64748b')
      .text(config.xAxisField);
  }

  if (config.yAxisField) {
    const yAxisLabel = Array.isArray(config.yAxisField) ? config.yAxisField[0] : config.yAxisField;
    g.append('text')
      .attr('transform', `rotate(-90) translate(${(config.yAxisLabelOffsetX || 0) - 20}, ${config.yAxisLabelOffsetY || 0})`)
      .attr('y', -40)
      .attr('x', 0 - (height / 2))
      .style('text-anchor', 'middle')
      .style('font-size', `${getScaledFontSize(config.yAxisLabelFontSize, 12, width, scaleFactor)}px`)
      .style('font-weight', '500')
      .style('fill', '#64748b')
      .text(config.yAxisLabel || yAxisLabel);
  }

  // Line generator
  const line = d3.line<number>()
    .x((d, i) => xScale(data.labels[i]) || 0)
    .y(d => yScale(d));

  // Draw lines with animation
  data.datasets.forEach((dataset, seriesIndex) => {
    const color = colors[seriesIndex % colors.length];

    const path = g.append('path')
      .datum(dataset.data)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 2)
      .attr('d', line)
      .style('opacity', 0.9)
      .style('filter', 'none');

    // Animate line drawing
    if (config.animation && !forceDisableAnimation) {
      const totalLength = path.node()?.getTotalLength() || 0;
      path
        .attr('stroke-dasharray', totalLength + ' ' + totalLength)
        .attr('stroke-dashoffset', totalLength)
        .transition()
        .duration(1200)
        .ease(d3.easeCubicInOut)
        .attr('stroke-dashoffset', 0);
    }

    // Add points with animation
    const points = g.selectAll(`.point-${seriesIndex}`)
      .data(dataset.data)
      .enter()
      .append('circle')
      .attr('class', `point-${seriesIndex}`)
      .attr('cx', (d, i) => xScale(data.labels[i]) || 0)
      .attr('cy', d => yScale(d))
      .attr('r', (config.animation && !forceDisableAnimation) ? 0 : 4)
      .style('fill', color)
      .style('opacity', 0.9)
      .style('stroke', 'white')
      .style('stroke-width', 2)
      .style('filter', 'none')
      .on('mouseover', function(event, d) {
        const i = dataset.data.indexOf(d);
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 6)
          .style('opacity', 1);

        tooltip.transition().duration(200).style('opacity', 1);
        tooltip.html(`
          <div><strong>${dataset.label || 'Series'}</strong></div>
          <div>${data.labels[i]}: ${formatNumber(d, config.numberFormat)}</div>
        `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 4)
          .style('opacity', 0.9);

        tooltip.transition().duration(200).style('opacity', 0);
      });

    // Animate points appearing
    if (config.animation && !forceDisableAnimation) {
      points.transition()
        .duration(600)
        .delay((d, i) => 800 + i * 100) // Start after line animation
        .ease(d3.easeCubicOut)
        .attr('r', 4);
    }

    // Add data labels if enabled
    if (config.showDataLabels) {
      const labels = g.selectAll(`.line-label-${seriesIndex}`)
        .data(dataset.data)
        .enter()
        .append('text')
        .attr('class', `line-label-${seriesIndex}`)
        .attr('x', (d, i) => {
          const baseX = xScale(data.labels[i]) || 0;
          switch (config.dataLabelsPosition) {
            case 'left':
              return applyDataLabelOffset(baseX - 15, 0, config).x;
            case 'right':
              return applyDataLabelOffset(baseX + 15, 0, config).x;
            default:
              return applyDataLabelOffset(baseX, 0, config).x;
          }
        })
        .attr('y', d => {
          const pointY = yScale(d);
          let y: number;
          switch (config.dataLabelsPosition) {
            case 'top':
              y = pointY - 15; // Above the point
              break;
            case 'inside-top':
              y = pointY - 8; // Slightly above the point
              break;
            case 'center':
              y = pointY + 4; // At the point
              break;
            case 'inside-bottom':
              y = pointY + 15; // Below the point
              break;
            case 'left':
            case 'right':
              y = pointY + 4; // At point level for left/right positioning
              break;
            default:
              y = pointY - 15; // Default to above
              break;
          }
          return applyDataLabelOffset(0, y, config).y;
        })
        .attr('text-anchor', d => {
          switch (config.dataLabelsPosition) {
            case 'left':
              return 'end';
            case 'right':
              return 'start';
            default:
              return 'middle';
          }
        })
        .style('font-size', `${Math.round((config.dataLabelsFontSize || 11) * scaleFactor)}px`)
        .style('font-weight', '500')
        .style('fill', config.dataLabelsColor || '#374151')
        .style('opacity', (config.animation && !forceDisableAnimation) ? 0 : 1)
        .text((d, i) => {
          const components = config.dataLabelsComponents || {};
          let labelParts: string[] = [];

          // For line charts, show value by default if no components specified
          if (!components.showCategory && !components.showValue && !components.showPercentage && !components.showSeriesName) {
            return formatNumberValue(d, config.numberFormat);
          }

          // Show category/label if requested
          if (components.showCategory) {
            labelParts.push(data.labels[i] || '');
          }

          // Show series name if requested
          if (components.showSeriesName) {
            labelParts.push(dataset.label || 'Series');
          }

          // Show value if requested
          if (components.showValue) {
            const formattedValue = formatNumberValue(d, config.numberFormat);
            labelParts.push(formattedValue);
          }

          // Show percentage if requested (relative to max value in dataset)
          if (components.showPercentage) {
            const maxValue = d3.max(data.datasets.flatMap(ds => ds.data)) || 1;
            const percentage = ((d / maxValue) * 100).toFixed(1);
            labelParts.push(`${percentage}%`);
          }

          return labelParts.join(' ');
        });

      // Animate data labels if animation is enabled
      if (config.animation && !forceDisableAnimation) {
        labels.transition()
          .duration(400)
          .delay((d, i) => 1200 + i * 100) // Start after points animation
          .ease(d3.easeCubicOut)
          .style('opacity', 1);
      }
    }
  });
}

function renderAreaChart(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  data: ChartData,
  width: number,
  height: number,
  colors: string[],
  config: ChartConfiguration,
  tooltip: d3.Selection<d3.BaseType, unknown, HTMLElement, any>,
  forceDisableAnimation: boolean,
  scaleFactor: number = 1.0
) {
  // Determine if this is a single-dataset chart that should use per-category coloring
  const isSingleDatasetChart = (config.templateId === 'area-chart') && data.datasets.length === 1;
  const shouldUsePerCategoryColors = isSingleDatasetChart || config.colorScheme === 'dynamic';
  const xScale = d3.scalePoint()
    .domain(data.labels)
    .range([0, width]);

  const maxValue = d3.max(data.datasets, d => d3.max(d.data)) || 0;
  const yScale = d3.scaleLinear()
    .domain([
      config.yAxisMin !== undefined ? config.yAxisMin : 0,
      config.yAxisMax !== undefined ? config.yAxisMax : maxValue * 1.1
    ])
    .range([height, 0]);

  // Grid lines
  if (config.showGrid) {
    g.selectAll('.grid-line')
      .data(yScale.ticks(5))
      .enter()
      .append('line')
      .attr('class', 'grid-line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))
      .style('stroke', '#e5e7eb')
      .style('stroke-width', 1);
  }

  // Axes with rotation support
  createAxesWithRotation(g, xScale, yScale, width, height, config);

  // Add axis labels
  if (config.xAxisField) {
    g.append('text')
      .attr('transform', `translate(${width / 2 + (config.xAxisLabelOffsetX || 0)}, ${height + 35 + (config.xAxisLabelOffsetY || 0)})`)
      .style('text-anchor', 'middle')
      .style('font-size', `${getScaledFontSize(config.xAxisLabelFontSize, 12, width, scaleFactor)}px`)
      .style('font-weight', '500')
      .style('fill', '#64748b')
      .text(config.xAxisField);
  }

  if (config.yAxisField) {
    const yAxisLabel = Array.isArray(config.yAxisField) ? config.yAxisField[0] : config.yAxisField;
    g.append('text')
      .attr('transform', `rotate(-90) translate(${(config.yAxisLabelOffsetX || 0) - 20}, ${config.yAxisLabelOffsetY || 0})`)
      .attr('y', -40)
      .attr('x', 0 - (height / 2))
      .style('text-anchor', 'middle')
      .style('font-size', `${getScaledFontSize(config.yAxisLabelFontSize, 12, width, scaleFactor)}px`)
      .style('font-weight', '500')
      .style('fill', '#64748b')
      .text(config.yAxisLabel || yAxisLabel);
  }

  // Area generator
  const area = d3.area<number>()
    .x((d, i) => xScale(data.labels[i]) || 0)
    .y0(height)
    .y1(d => yScale(d));

  // Draw areas with animation
  data.datasets.forEach((dataset, seriesIndex) => {
    const color = colors[seriesIndex % colors.length];

    const path = g.append('path')
      .datum(dataset.data)
      .attr('fill', color)
      .attr('fill-opacity', 0.6)
      .attr('d', area);

    // Animate area chart
    if (config.animation && !forceDisableAnimation) {
      // Start with a flat area at the bottom
      const flatArea = d3.area<number>()
        .x((d, i) => xScale(data.labels[i]) || 0)
        .y0(height)
        .y1(height); // Flat at bottom

      path.attr('d', flatArea)
        .transition()
        .duration(1200)
        .delay(seriesIndex * 200)
        .ease(d3.easeCubicOut)
        .attr('d', area);
    }

    // Add data labels if enabled
    if (config.showDataLabels) {
      const labels = g.selectAll(`.area-label-${seriesIndex}`)
        .data(dataset.data)
        .enter()
        .append('text')
        .attr('class', `area-label-${seriesIndex}`)
        .attr('x', (d, i) => xScale(data.labels[i]) || 0)
        .attr('y', d => {
          const pointY = yScale(d);
          switch (config.dataLabelsPosition) {
            case 'top':
              return pointY - 15; // Above the point
            case 'inside-top':
              return pointY - 8; // Slightly above the point
            case 'center':
              return pointY + 4; // At the point
            case 'inside-bottom':
              return pointY + 15; // Below the point
            default:
              return pointY - 15; // Default to above
          }
        })
        .attr('text-anchor', 'middle')
        .style('font-size', `${Math.round((config.dataLabelsFontSize || 11) * scaleFactor)}px`)
        .style('font-weight', '500')
        .style('fill', config.dataLabelsColor || '#374151')
        .style('opacity', (config.animation && !forceDisableAnimation) ? 0 : 1)
        .text(d => formatNumberValue(d, config.numberFormat));

      // Animate data labels if animation is enabled
      if (config.animation && !forceDisableAnimation) {
        labels.transition()
          .duration(400)
          .delay(seriesIndex * 200 + 600) // Start after area animation
          .ease(d3.easeCubicOut)
          .style('opacity', 1);
      }
    }
  });
}

function renderPieChart(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  data: ChartData,
  width: number,
  height: number,
  colors: string[],
  config: ChartConfiguration,
  tooltip: d3.Selection<d3.BaseType, unknown, HTMLElement, any>,
  forceDisableAnimation: boolean,
  scaleFactor: number = 1.0
) {
  // Increase pie chart slice size and center it properly
  const minDimension = Math.min(width, height);
  const radius = Math.max(20, minDimension * 0.4025); // Increased by 15% (0.35 * 1.15)
  const pieGroup = g.append('g')
    .attr('transform', `translate(${width / 2},${height / 2})`); // Centered without offset

  // Add gradients and glassy effects like bar charts
  const defs = g.append('defs');
  colors.forEach((color, index) => {
    // Create main gradient for glassy effect
    const gradient = defs.append('radialGradient')
      .attr('id', `pie-gradient-${index}`)
      .attr('cx', '30%')
      .attr('cy', '30%')
      .attr('r', '70%');

    // Create glass-like gradient with highlights and reflections
    gradient.append('stop')
      .attr('stop-color', '#ffffff')
      .attr('stop-opacity', '0.4')
      .attr('offset', '0%');

    gradient.append('stop')
      .attr('stop-color', d3.color(color)?.brighter(0.6) || color)
      .attr('stop-opacity', '0.7')
      .attr('offset', '30%');

    gradient.append('stop')
      .attr('stop-color', color)
      .attr('stop-opacity', '0.8')
      .attr('offset', '70%');

    gradient.append('stop')
      .attr('stop-color', d3.color(color)?.darker(0.2) || color)
      .attr('stop-opacity', '0.95')
      .attr('offset', '100%');

    // Create enhanced glow filter for more sophisticated outline effect
    const filter = defs.append('filter')
      .attr('id', `pie-glow-${index}`)
      .attr('x', '-20%')
      .attr('y', '-20%')
      .attr('width', '140%')
      .attr('height', '140%');

    // Create multiple glow layers for depth
    filter.append('feGaussianBlur')
      .attr('stdDeviation', '2')
      .attr('result', 'coloredBlur');

    // Add a second blur for more depth
    filter.append('feGaussianBlur')
      .attr('stdDeviation', '0.8')
      .attr('result', 'coloredBlur2');

    // Merge all effects
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur2');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
  });

  const pie = d3.pie<number>()
    .value(d => d)
    .sort(null) // Disable default sorting to prevent segment size issues
    .padAngle(0); // Ensure no padding between segments

  const arc = d3.arc<d3.PieArcDatum<number>>()
    .innerRadius(0)
    .outerRadius(radius);

  const dataset = data.datasets[0];
  // Generate pie data once to ensure consistency
  const pieData = pie(dataset.data);

  const arcs = pieGroup.selectAll('.arc')
    .data(pieData)
    .enter()
    .append('g')
    .attr('class', 'arc');

  const paths = arcs.append('path')
    .style('fill', (d, i) => d3.color(colors[i % colors.length])?.brighter(1.5) || colors[i % colors.length])
    .style('fill-opacity', 0.2)
    .style('stroke', (d, i) => colors[i % colors.length])
    .style('stroke-width', 2)
    .style('stroke-opacity', 0.8)
    .style('filter', 'none')
    .on('mouseover', function(event, d) {
      const i = dataset.data.indexOf(d.data);
      d3.select(this)
        .transition()
        .duration(200)
        .style('fill-opacity', 0.3)
        .style('stroke-width', 2.5)
        .style('stroke-opacity', 1)
        .style('filter', 'none');

      const percentage = ((d.data / d3.sum(dataset.data)) * 100).toFixed(1);
      tooltip.transition().duration(200).style('opacity', 1);
      tooltip.html(`
        <div><strong>${data.labels[i]}</strong></div>
        <div>${formatNumberValue(d.data, config.numberFormat)}</div>
        <div>${percentage}%</div>
      `)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px');
    })
    .on('mouseout', function() {
      d3.select(this)
        .transition()
        .duration(200)
        .style('fill-opacity', 0.2)
        .style('stroke-width', 2)
        .style('stroke-opacity', 0.8)
        .style('filter', 'none');

      tooltip.transition().duration(200).style('opacity', 0);
    });

  // Add animation for pie chart or set path immediately
  if (config.animation && !forceDisableAnimation) {
    paths
      .attr('d', d => {
        const arcCopy = d3.arc<d3.PieArcDatum<number>>()
          .innerRadius(0)
          .outerRadius(0);
        return arcCopy(d);
      })
      .transition()
      .duration(800)
      .delay((d, i) => i * 100)
      .ease(d3.easeCubicOut)
      .attr('d', arc);
  } else {
    // Set the path immediately to prevent sizing issues
    paths.attr('d', arc);
  }

  // Add labels
  if (config.showDataLabels) {
    const labelArc = d3.arc<d3.PieArcDatum<number>>()
      .innerRadius(0)
      .outerRadius(radius);

    // For outside labels, we need to handle stacking
    let labelPositions: Array<{x: number, y: number, text: string, parts: string[]}> = [];

    if (config.dataLabelsPosition === 'outside') {
      // Calculate initial positions for all labels using the same pie data
      pieData.forEach((d, i) => {
        const outerArc = d3.arc<d3.PieArcDatum<number>>()
          .innerRadius(radius * 1.2)
          .outerRadius(radius * 1.2);
        const basePosition = outerArc.centroid(d);
        const adjustedPosition = applyDataLabelOffset(basePosition[0], basePosition[1], config);

        const components = config.dataLabelsComponents || {};
        const category = data.labels[i];
        const value = d.data;
        const total = d3.sum(dataset.data);
        const percentage = ((value / total) * 100).toFixed(1);

        let labelParts: string[] = [];

        // If no data label components are configured, use legacy position-based behavior
        if (!config.dataLabelsComponents) {
          labelParts.push(`${category} (${percentage}%)`);
        } else {
          // Check if any components are explicitly enabled
          const hasAnyComponentEnabled = components.showCategory !== undefined || components.showValue ||
                                         components.showPercentage || components.showSeriesName;

          // If no components are explicitly configured, show category by default
          if (!hasAnyComponentEnabled) {
            labelParts.push(category);
          } else {
            // Show category if requested (default to true if undefined and other components exist)
            if (components.showCategory !== false) {
              labelParts.push(category);
            }
            // Show value if requested
            if (components.showValue) {
              const formattedValue = formatNumberValue(value, config.numberFormat);
              labelParts.push(`${formattedValue}`);
            }
            // Show percentage if requested
            if (components.showPercentage) {
              labelParts.push(`${percentage}%`);
            }
            // Show series name if requested
            if (components.showSeriesName) {
              labelParts.push(`${dataset.label || 'Series'}`);
            }
          }
        }

        labelPositions.push({
          x: adjustedPosition.x,
          y: adjustedPosition.y,
          text: labelParts.join(' '), // Keep single line for now, we'll split this later
          parts: labelParts // Store individual parts for vertical stacking
        });
      });

      // Apply stacking algorithm for overlapping labels
      const lineHeight = 16;
      const threshold = lineHeight; // Minimum distance between labels

      // Sort by y position to stack from top to bottom
      labelPositions.sort((a, b) => a.y - b.y);

      // Adjust positions to avoid overlaps
      for (let i = 1; i < labelPositions.length; i++) {
        const current = labelPositions[i];
        const previous = labelPositions[i - 1];

        if (Math.abs(current.y - previous.y) < threshold) {
          // Stack this label below the previous one
          current.y = previous.y + lineHeight;
        }
      }

      // Create the labels with adjusted positions
      const outsideLabels = labelPositions.map((pos, i) => {
        const textElement = pieGroup.append('text')
          .attr('transform', `translate(${pos.x}, ${pos.y})`)
          .attr('text-anchor', 'middle')
          .style('font-size', `${Math.round((config.dataLabelsFontSize || 11) * scaleFactor)}px`)
          .style('font-weight', '500')
          .style('fill', '#374151')
          .style('opacity', (config.animation && !forceDisableAnimation) ? 0 : 1);

        // If multiple parts, stack them vertically
        if (pos.parts && pos.parts.length > 1) {
          const lineHeight = 14;
          const totalHeight = (pos.parts.length - 1) * lineHeight;
          const startY = -totalHeight / 2; // Center the text block

          pos.parts.forEach((part, partIndex) => {
            textElement.append('tspan')
              .attr('x', 0)
              .attr('y', startY + (partIndex * lineHeight))
              .style('font-weight', '500')
              .text(part);
          });
        } else {
          // Single text element
          textElement
            .attr('dy', '0.35em')
            .text(pos.text);
        }

        return textElement;
      });

      // Animate outside labels if animation is enabled
      if (config.animation && !forceDisableAnimation) {
        outsideLabels.forEach((label, i) => {
          label.transition()
            .duration(400)
            .delay(i * 100 + 600) // Start after pie slices
            .ease(d3.easeCubicOut)
            .style('opacity', 1);
        });
      }

    } else {
      // For non-outside positions, also support vertical stacking
      const insideLabels = pieData.map((d, i) => {
        const position = config.dataLabelsPosition;
        let basePosition: [number, number];

        switch (position) {
          case 'inside':
            // Position at the outer edge inside the slice
            const edgeArc = d3.arc<d3.PieArcDatum<number>>()
              .innerRadius(radius * 0.8)
              .outerRadius(radius * 0.8);
            basePosition = edgeArc.centroid(d);
            break;
          case 'bottom':
            // Position at the inner edge of the slice
            const baseArc = d3.arc<d3.PieArcDatum<number>>()
              .innerRadius(radius * 0.3)
              .outerRadius(radius * 0.3);
            basePosition = baseArc.centroid(d);
            break;
          case 'center':
          default:
            basePosition = labelArc.centroid(d);
            break;
        }

        // Apply data label offset like other charts
        const adjustedPosition = applyDataLabelOffset(basePosition[0], basePosition[1], config);

        const components = config.dataLabelsComponents || {};
        const category = data.labels[i];
        const value = d.data;
        const total = d3.sum(dataset.data);
        const percentage = ((value / total) * 100).toFixed(1);

        let labelParts: string[] = [];

        // If no data label components are configured, use legacy position-based behavior
        if (!config.dataLabelsComponents) {
          switch (config.dataLabelsPosition) {
            case 'center':
              labelParts.push(percentage + '%');
              break;
            case 'inside':
            case 'bottom':
            default:
              labelParts.push(category);
              break;
          }
        } else {
          // Check if any components are explicitly enabled
          const hasAnyComponentEnabled = components.showCategory !== undefined || components.showValue ||
                                         components.showPercentage || components.showSeriesName;

          // If no components are explicitly configured, show category by default
          if (!hasAnyComponentEnabled) {
            labelParts.push(category);
          } else {
            // Show category if requested (default to true if undefined and other components exist)
            if (components.showCategory !== false) {
              labelParts.push(category);
            }
            // Show value if requested
            if (components.showValue) {
              const formattedValue = formatNumberValue(value, config.numberFormat);
              labelParts.push(`${formattedValue}`);
            }
            // Show percentage if requested
            if (components.showPercentage) {
              labelParts.push(`${percentage}%`);
            }
            // Show series name if requested
            if (components.showSeriesName) {
              labelParts.push(`${dataset.label || 'Series'}`);
            }
          }
        }

        const textElement = pieGroup.append('text')
          .attr('transform', `translate(${adjustedPosition.x}, ${adjustedPosition.y})`)
          .attr('text-anchor', 'middle')
          .style('font-size', `${Math.round((config.dataLabelsFontSize || 11) * scaleFactor)}px`)
          .style('font-weight', '500')
          .style('fill', '#1f2937')
          .style('opacity', (config.animation && !forceDisableAnimation) ? 0 : 1);

        // If multiple parts, stack them vertically
        if (labelParts.length > 1) {
          const lineHeight = 14;
          const totalHeight = (labelParts.length - 1) * lineHeight;
          const startY = -totalHeight / 2; // Center the text block

          labelParts.forEach((part, partIndex) => {
            textElement.append('tspan')
              .attr('x', 0)
              .attr('y', startY + (partIndex * lineHeight))
              .style('font-weight', '500')
              .text(part);
          });
        } else {
          // Single text element
          textElement
            .attr('dy', '0.35em')
            .text(labelParts[0]);
        }

        return textElement;
      });

      // Animate non-outside labels if animation is enabled
      if (config.animation && !forceDisableAnimation) {
        insideLabels.forEach((label, i) => {
          label.transition()
            .duration(400)
            .delay(i * 100 + 600) // Start after pie slices
            .ease(d3.easeCubicOut)
            .style('opacity', 1);
        });
      }
    }
  }
}

function renderScatterPlot(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  data: ChartData,
  width: number,
  height: number,
  colors: string[],
  config: ChartConfiguration,
  tooltip: d3.Selection<d3.BaseType, unknown, HTMLElement, any>,
  forceDisableAnimation: boolean,
  scaleFactor: number = 1.0
) {
  // For scatter plots, data contains {x, y} objects, so we need different scaling
  const allDataPoints = data.datasets.flatMap(d => d.data);
  const xValues = allDataPoints.map((point: any) => {
    if (typeof point === 'object' && point.x !== undefined) {
      return Number(point.x) || 0;
    }
    // For scatter plots, if point is not an object with x property, use index as fallback
    return allDataPoints.indexOf(point);
  });
  const yValues = allDataPoints.map((point: any) => {
    if (typeof point === 'object' && point.y !== undefined) {
      return Number(point.y) || 0;
    }
    // For scatter plots, if point is not an object with y property, use the value itself
    return Number(point) || 0;
  });

  // Better domain calculation for scatter plots
  const xMin = d3.min(xValues) || 0;
  const xMax = d3.max(xValues) || 0;
  const yMin = d3.min(yValues) || 0;
  const yMax = d3.max(yValues) || 0;

  // Add padding to the domain to prevent points from being cut off at edges
  const xPadding = (xMax - xMin) * 0.1;
  const yPadding = (yMax - yMin) * 0.1;

  const xScale = d3.scaleLinear()
    .domain([
      config.xAxisMin !== undefined ? config.xAxisMin : xMin - xPadding,
      config.xAxisMax !== undefined ? config.xAxisMax : xMax + xPadding
    ])
    .range([0, width]);

  const yScale = d3.scaleLinear()
    .domain([
      config.yAxisMin !== undefined ? config.yAxisMin : yMin - yPadding,
      config.yAxisMax !== undefined ? config.yAxisMax : yMax + yPadding
    ])
    .range([height, 0]);

  // Grid lines
  if (config.showGrid) {
    g.selectAll('.grid-line-y')
      .data(yScale.ticks(5))
      .enter()
      .append('line')
      .attr('class', 'grid-line-y')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))
      .style('stroke', '#e5e7eb')
      .style('stroke-width', 1);

    g.selectAll('.grid-line-x')
      .data(xScale.ticks(5))
      .enter()
      .append('line')
      .attr('class', 'grid-line-x')
      .attr('x1', d => xScale(d))
      .attr('x2', d => xScale(d))
      .attr('y1', 0)
      .attr('y2', height)
      .style('stroke', '#e5e7eb')
      .style('stroke-width', 1);
  }

  // Add zero lines if data crosses zero (darker lines to show axis reference)
  const xDomain = xScale.domain();
  const yDomain = yScale.domain();

  if (xDomain[0] <= 0 && xDomain[1] >= 0) {
    g.append('line')
      .attr('class', 'zero-line-x')
      .attr('x1', xScale(0))
      .attr('x2', xScale(0))
      .attr('y1', 0)
      .attr('y2', height)
      .style('stroke', '#9ca3af')
      .style('stroke-width', 1.5)
      .style('opacity', 0.7);
  }

  if (yDomain[0] <= 0 && yDomain[1] >= 0) {
    g.append('line')
      .attr('class', 'zero-line-y')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', yScale(0))
      .attr('y2', yScale(0))
      .style('stroke', '#9ca3af')
      .style('stroke-width', 1.5)
      .style('opacity', 0.7);
  }

  // Axes with rotation support
  createAxesWithRotation(g, xScale, yScale, width, height, config);

  // Add axis labels
  if (config.xAxisField) {
    g.append('text')
      .attr('transform', `translate(${width / 2 + (config.xAxisLabelOffsetX || 0)}, ${height + 35 + (config.xAxisLabelOffsetY || 0)})`)
      .style('text-anchor', 'middle')
      .style('font-size', `${getScaledFontSize(config.xAxisLabelFontSize, 12, width, scaleFactor)}px`)
      .style('font-weight', '500')
      .style('fill', '#64748b')
      .text(config.xAxisField);
  }

  if (config.yAxisField) {
    const yAxisLabel = Array.isArray(config.yAxisField) ? config.yAxisField[0] : config.yAxisField;
    g.append('text')
      .attr('transform', `rotate(-90) translate(${(config.yAxisLabelOffsetX || 0) - 20}, ${config.yAxisLabelOffsetY || 0})`)
      .attr('y', -40)
      .attr('x', 0 - (height / 2))
      .style('text-anchor', 'middle')
      .style('font-size', `${getScaledFontSize(config.yAxisLabelFontSize, 12, width, scaleFactor)}px`)
      .style('font-weight', '500')
      .style('fill', '#64748b')
      .text(config.yAxisLabel || yAxisLabel);
  }

  // Scatter points
  data.datasets.forEach((dataset, seriesIndex) => {
    const color = colors[seriesIndex % colors.length];

    const points = g.selectAll(`.point-${seriesIndex}`)
      .data(dataset.data)
      .enter()
      .append('circle')
      .attr('class', `point-${seriesIndex}`)
      .attr('cx', (d: any) => xScale(typeof d === 'object' ? d.x : 0))
      .attr('cy', (d: any) => yScale(typeof d === 'object' ? d.y : d))
      .attr('r', (config.animation && !forceDisableAnimation) ? 0 : 4)
      .style('fill', color)
      .style('opacity', 0.8)
      .style('stroke', '#ffffff')
      .style('stroke-width', 1)
      .style('filter', 'none')
      .on('mouseover', function(event, d) {
        const i = dataset.data.indexOf(d);
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 6)
          .style('opacity', 1)
          .style('stroke-width', 2);

        tooltip.transition().duration(200).style('opacity', 1);
        const xValue = typeof d === 'object' ? d.x : i;
        const yValue = typeof d === 'object' ? d.y : d;
        tooltip.html(`
          <div><strong>${dataset.label || 'Series'}</strong></div>
          <div>X: ${formatNumberValue(xValue, config.numberFormat)}</div>
          <div>Y: ${formatNumberValue(yValue, config.numberFormat)}</div>
        `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 4)
          .style('opacity', 0.8)
          .style('stroke-width', 1);

        tooltip.transition().duration(200).style('opacity', 0);
      });

    // Add animation for scatter plot
    if (config.animation && !forceDisableAnimation) {
      points.transition()
        .duration(600)
        .delay((d, i) => i * 80)
        .ease(d3.easeCubicOut)
        .attr('r', 4);
    }

    // Add data labels if enabled
    if (config.showDataLabels) {
      const labels = g.selectAll(`.scatter-label-${seriesIndex}`)
        .data(dataset.data)
        .enter()
        .append('text')
        .attr('class', `scatter-label-${seriesIndex}`)
        .attr('x', (d: any) => xScale(typeof d === 'object' ? d.x : 0))
        .attr('y', (d: any) => {
          const pointY = yScale(typeof d === 'object' ? d.y : d);
          switch (config.dataLabelsPosition) {
            case 'top':
              return pointY - 15; // Above the point
            case 'inside-top':
              return pointY - 8; // Slightly above the point
            case 'center':
              return pointY + 4; // At the point
            case 'inside-bottom':
              return pointY + 15; // Below the point
            default:
              return pointY - 15; // Default to above
          }
        })
        .attr('text-anchor', 'middle')
        .style('font-size', `${Math.round((config.dataLabelsFontSize || 11) * scaleFactor)}px`)
        .style('font-weight', '500')
        .style('fill', config.dataLabelsColor || '#374151')
        .style('opacity', (config.animation && !forceDisableAnimation) ? 0 : 1)
        .text((d: any, i) => {
          const components = config.dataLabelsComponents || {};
          let labelParts: string[] = [];

          // For scatter plots, show coordinates by default if no components specified
          if (!components.showCategory && !components.showValue && !components.showPercentage && !components.showSeriesName && !components.showCoordinates) {
            const xValue = typeof d === 'object' ? d.x : 0;
            const yValue = typeof d === 'object' ? d.y : d;
            return `(${formatNumberValue(xValue, config.numberFormat)}, ${formatNumberValue(yValue, config.numberFormat)})`;
          }

          // Show coordinates if requested (for scatter charts)
          if (components.showCoordinates) {
            const xValue = typeof d === 'object' ? d.x : 0;
            const yValue = typeof d === 'object' ? d.y : d;
            labelParts.push(`(${formatNumberValue(xValue, config.numberFormat)}, ${formatNumberValue(yValue, config.numberFormat)})`);
          }

          // Show series name if requested
          if (components.showSeriesName) {
            labelParts.push(dataset.label || 'Series');
          }

          return labelParts.join(' ');
        });

      // Animate data labels if animation is enabled
      if (config.animation && !forceDisableAnimation) {
        labels.transition()
          .duration(400)
          .delay((d, i) => i * 80 + 600) // Start after points animation
          .ease(d3.easeCubicOut)
          .style('opacity', 1);
      }
    }
  });
}

function renderLegend(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  data: ChartData,
  colors: string[],
  width: number,
  height: number,
  verticalPosition: string = 'top',
  horizontalPosition: string = 'right',
  config: ChartConfiguration,
  usePerCategoryColors: boolean = false,
  scaleFactor: number = 1.0
) {
  const customPosition = config.legendCustomPosition;
  const datasets = data.datasets;
  let legendTransform: string;
  let horizontal = false;

  const iconSize = Math.max(12 * scaleFactor, 10);
  const iconGap = 8;
  const itemGap = 28;
  const baseFontSize = getScaledFontSize(config.legendFontSize, 11, width, scaleFactor);
  const lineHeight = baseFontSize + 12;

  // Determine what to show in legend based on user's mapping choice and chart logic
  const showCategories = config.legendMapping === 'categories' ||
    (!config.legendMapping && usePerCategoryColors);

  type LegendEntry = { label: string; color: string; textWidth: number };
  let legendItems: LegendEntry[];
  if (showCategories) {
    // Data Categories: show category labels with corresponding colors
    legendItems = data.labels.map((label, i) => ({ label, color: colors[i % colors.length], textWidth: 0 }));
  } else {
    // Data Series: show dataset labels with corresponding colors
    legendItems = datasets.map((dataset, i) => ({
      label: dataset.label,
      color: colors[i % colors.length],
      textWidth: 0
    }));
  }

  // Measure text widths for accurate spacing
  const textWidthCache = new Map<string, number>();
  let tempSvg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any> | null = null;
  let tempText: d3.Selection<SVGTextElement, unknown, SVGSVGElement, any> | null = null;

  if (legendItems.length > 0) {
    tempSvg = d3.select('body')
      .append('svg')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('top', '-1000px');

    tempText = tempSvg.append('text')
      .style('font-size', `${baseFontSize}px`)
      .style('font-family', 'inherit');
  }

  const measureTextWidth = (value: string): number => {
    if (textWidthCache.has(value)) {
      return textWidthCache.get(value)!;
    }

    if (!tempText) {
      const approximate = value.length * (baseFontSize * 0.55);
      textWidthCache.set(value, approximate);
      return approximate;
    }

    tempText.text(value);
    const bbox = tempText.node()?.getBBox();
    const widthValue = bbox ? bbox.width : value.length * (baseFontSize * 0.55);
    textWidthCache.set(value, widthValue);
    return widthValue;
  };

  legendItems = legendItems.map(item => ({
    ...item,
    textWidth: measureTextWidth(item.label || '')
  }));

  let legendHeight = Math.max(lineHeight, legendItems.length * lineHeight);
  let legendRows: { items: LegendEntry[]; width: number }[] = [];

  if (customPosition) {
    // Use custom position and rotation
    legendTransform = `translate(${customPosition.x}, ${customPosition.y}) rotate(${customPosition.rotation})`;
    horizontal = Math.abs(customPosition.rotation % 180) < 90;
  } else {
    // Use separate vertical and horizontal positioning
    let xPos: number, yPos: number;

    // Set horizontal layout for top/bottom positions when centered
    horizontal = (verticalPosition === 'top' || verticalPosition === 'bottom') && horizontalPosition === 'center';

    if (horizontal) {
      const maxRowWidth = Math.max(160, Math.min(width - 80, 540 * scaleFactor));
      let currentRow: LegendEntry[] = [];
      let currentWidth = 0;
      legendItems.forEach((item) => {
        const contentWidth = iconSize + iconGap + item.textWidth;
        const projectedWidth = currentRow.length === 0
          ? contentWidth
          : currentWidth + itemGap + contentWidth;

        if (currentRow.length > 0 && projectedWidth > maxRowWidth) {
          legendRows.push({ items: currentRow, width: currentWidth });
          currentRow = [];
          currentWidth = 0;
        }

        if (currentRow.length > 0) {
          currentWidth += itemGap;
        }
        currentWidth += contentWidth;
        currentRow.push(item);
      });

      if (currentRow.length > 0) {
        legendRows.push({ items: currentRow, width: currentWidth });
      }

      if (legendRows.length === 0) {
        legendRows = [{ items: legendItems, width: legendItems.reduce((sum, entry, idx) =>
          sum + iconSize + iconGap + entry.textWidth + (idx > 0 ? itemGap : 0), 0) }];
      }

      legendHeight = legendRows.length * lineHeight;
    } else {
      legendHeight = Math.max(lineHeight, legendItems.length * lineHeight);
    }

    const anchorPadding = Math.max(20, Math.min(30, width * 0.03));
    switch (horizontalPosition) {
      case 'left':
        xPos = anchorPadding;
        break;
      case 'center':
        xPos = width / 2;
        break;
      case 'right':
      default:
        xPos = width - anchorPadding;
        break;
    }

    switch (verticalPosition) {
      case 'top':
        yPos = anchorPadding;
        break;
      case 'center':
        yPos = height / 2 - legendHeight / 2;
        break;
      case 'bottom':
      default:
        yPos = height - legendHeight - anchorPadding;
        break;
    }

    xPos += config.legendOffsetX || 0;
    yPos += config.legendOffsetY || 0;

    legendTransform = `translate(${xPos}, ${yPos})`;
  }

  const legend = svg.append('g')
    .attr('transform', legendTransform)
    .style('font-size', '12px');

  if (horizontal) {
    const rowsToRender = legendRows.length > 0 ? legendRows : [{
      items: legendItems,
      width: legendItems.reduce((sum, entry, idx) => sum + iconSize + iconGap + entry.textWidth + (idx > 0 ? itemGap : 0), 0)
    }];

    let yCursor = 0;
    rowsToRender.forEach(row => {
      let rowStartX;
      switch (horizontalPosition) {
        case 'left':
          rowStartX = 0;
          break;
        case 'right':
          rowStartX = -row.width;
          break;
        default:
          rowStartX = -row.width / 2;
          break;
      }

      let xCursor = rowStartX;
      row.items.forEach((item, index) => {
        const legendItem = legend.append('g')
          .attr('transform', `translate(${xCursor}, ${yCursor})`);

        legendItem.append('rect')
          .attr('width', iconSize)
          .attr('height', iconSize)
          .attr('rx', 3)
          .style('fill', item.color)
          .style('opacity', 0.9);

        legendItem.append('text')
          .attr('x', iconSize + iconGap)
          .attr('y', iconSize - 2)
          .style('font-size', `${baseFontSize}px`)
          .style('fill', '#374151')
          .style('text-anchor', 'start')
          .text(item.label || '');

        xCursor += iconSize + iconGap + item.textWidth + itemGap;
        if (index === row.items.length - 1) {
          xCursor -= itemGap; // remove trailing gap for final item
        }
      });

      yCursor += lineHeight;
    });
  } else {
    // For vertical layout, use regular spacing
    legendItems.forEach((item, i) => {
      const rowWidth = iconSize + iconGap + item.textWidth;
      let xOffset: number;
      switch (horizontalPosition) {
        case 'center':
          xOffset = -rowWidth / 2;
          break;
        case 'right':
          xOffset = -rowWidth;
          break;
        default:
          xOffset = 0;
          break;
      }

      const legendItem = legend.append('g')
        .attr('transform', `translate(${xOffset}, ${i * lineHeight})`);

      legendItem.append('rect')
        .attr('width', iconSize)
        .attr('height', iconSize)
        .attr('rx', 3)
        .style('fill', item.color)
        .style('opacity', 0.9);

      legendItem.append('text')
        .attr('x', iconSize + iconGap)
        .attr('y', iconSize - 2)
        .style('font-size', `${baseFontSize}px`)
        .style('fill', '#374151')
        .style('text-anchor', 'start')
        .text(item.label || '');
    });
  }

  if (tempSvg) {
    tempSvg.remove();
  }
}

export default ChartRenderer;
