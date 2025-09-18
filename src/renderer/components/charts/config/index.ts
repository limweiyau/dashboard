// Chart configuration components for different chart types
// This provides a clean way for LLMs to navigate and understand chart-specific configurations

export { default as BaseChartConfig } from './BaseChartConfig';
export type { BaseChartConfigProps, ChartTypeConfigProps } from './BaseChartConfig';

export { default as BarChartConfig } from './BarChartConfig';
export { default as PieChartConfig } from './PieChartConfig';
export { default as LineChartConfig } from './LineChartConfig';
export { default as ScatterChartConfig } from './ScatterChartConfig';
export { default as AreaChartConfig } from './AreaChartConfig';
export { default as StackedBarChartConfig } from './StackedBarChartConfig';
export { default as MultiLineChartConfig } from './MultiLineChartConfig';

// Chart type mapping for easy access
export const ChartConfigComponents = {
  'simple-bar': BarChartConfig,
  'multi-bar': BarChartConfig,
  'stacked-bar': StackedBarChartConfig,
  'simple-line': LineChartConfig,
  'multi-line': MultiLineChartConfig,
  'area': AreaChartConfig,
  'pie': PieChartConfig,
  'scatter': ScatterChartConfig,
} as const;

export type ChartType = keyof typeof ChartConfigComponents;