export interface ChartTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'bar' | 'line' | 'pie' | 'area' | 'scatter';
  recipe: ChartRecipe;
}

export interface ChartRecipe {
  type: 'single-bar' | 'multi-bar' | 'stacked-bar' | 'simple-line' | 'multi-line' | 'area' | 'pie' | 'scatter';
  requiredFields: {
    xAxis?: boolean;
    yAxis?: boolean;
    category?: boolean;
    value?: boolean;
    series?: boolean;
  };
  configuration: {
    colorScheme: string;
    showLegend: boolean;
    showGrid: boolean;
    animation: boolean;
  };
}

export interface ChartConfiguration {
  templateId: string;
  title: string;
  tableId?: string; // Which table this chart uses
  xAxisField?: string;
  yAxisField?: string | string[];
  categoryField?: string;
  valueField?: string;
  seriesField?: string;
  aggregation?: 'sum' | 'average' | 'count' | 'min' | 'max' | 'none';
  appliedSlicers?: string[]; // Array of slicer IDs applied to this chart
  colorScheme: string;
  colorMode?: 'scheme' | 'individual' | 'single';
  customColors?: string[];
  singleColor?: string;
  showLegend: boolean;
  showGrid: boolean;
  animation: boolean;
  titlePosition?: 'left' | 'center' | 'right';
  titleVerticalPosition?: 'top' | 'bottom';
  titleHorizontalPosition?: 'left' | 'center' | 'right';
  legendPosition?: 'top' | 'right' | 'bottom' | 'left';
  legendVerticalPosition?: 'top' | 'center' | 'bottom';
  legendHorizontalPosition?: 'left' | 'center' | 'right';
  legendMapping?: 'categories' | 'series';
  legendCustomPosition?: { x: number; y: number; rotation: number };
  legendOffsetX?: number;
  legendOffsetY?: number;
  titleCustomPosition?: { x: number; y: number; rotation: number };
  titleOffsetX?: number;
  titleOffsetY?: number;
  showDataLabels?: boolean;
  dataLabelsPosition?: 'outside' | 'inside' | 'center' | 'top' | 'bottom' | 'left' | 'right';
  dataLabelsColor?: string;
  dataLabelsOffsetX?: number;
  dataLabelsOffsetY?: number;
  dataLabelsComponents?: {
    showCategory?: boolean;
    showValue?: boolean;
    showPercentage?: boolean;
    showSeriesName?: boolean;
    showCoordinates?: boolean;
  };
  paddingHorizontal?: number;
  paddingVertical?: number;
  numberFormat?: {
    prefix?: string;
    suffix?: string;
    decimals?: number;
    decimalsManuallySet?: boolean;
    thousands?: boolean;
    abbreviateMillions?: boolean;
    displayUnit?: 'none' | 'hundreds' | 'thousands' | 'millions' | 'billions';
    displayUnitLabel?: boolean;
    negativeNumbers?: 'minus' | 'parentheses' | 'red';
  };
  titleFontSize?: number;
  legendFontSize?: number;
  dataLabelsFontSize?: number;
  xAxisFontSize?: number;
  yAxisFontSize?: number;
  xAxisLabelFontSize?: number;
  yAxisLabelFontSize?: number;
  xAxisLabel?: string;
  yAxisLabel?: string;
  xAxisLabelOffsetX?: number;
  xAxisLabelOffsetY?: number;
  yAxisLabelOffsetX?: number;
  yAxisLabelOffsetY?: number;
  xAxisOffsetX?: number;
  xAxisOffsetY?: number;
  yAxisOffsetX?: number;
  yAxisOffsetY?: number;
  showXAxisTicks?: boolean;
  showYAxisTicks?: boolean;
  rotateXAxisLabels?: boolean;
  rotateYAxisLabels?: boolean;
  xAxisMin?: number;
  xAxisMax?: number;
  yAxisMin?: number;
  yAxisMax?: number;
  paddingHorizontal?: number;
  paddingVertical?: number;
  chartOffsetX?: number;
  chartOffsetY?: number;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[] | {x: number, y: number}[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }[];
}
