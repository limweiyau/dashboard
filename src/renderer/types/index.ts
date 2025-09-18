export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  dataFile?: string;
  hasData: boolean;
  github?: {
    repoName: string;
    repoUrl: string;
    lastSync?: string;
    autoSync: boolean;
  };
}

export interface ProjectData {
  id: string;
  name: string;
  data: any[];
  columns: ColumnInfo[];
  charts: Chart[];
  dashboards: Dashboard[];
  tables: DataTable[];
  slicers: Slicer[];
  chartSlicers: ChartSlicer[];
  dateRanges: DateRange[];
}

export interface DataTable {
  id: string;
  name: string;
  data: any[];
  columns: ColumnInfo[];
  createdAt: string;
  updatedAt: string;
  sourceFile?: string;
}

export interface ColumnInfo {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  nullable: boolean;
  unique: boolean;
}

export interface Chart {
  id: string;
  name: string;
  type: 'none' | 'bar' | 'line' | 'pie' | 'doughnut' | 'scatter' | 'area' | 'histogram' | 'bubble' | 'radar' | 'polarArea' | 'stacked-bar' | 'stacked-area' | 'combo';
  config: ChartConfig;
  createdAt: string;
  updatedAt: string;
}

export interface ChartConfig {
  // Data Configuration
  tableId?: string; // Which table to use (defaults to main data)
  xAxis?: string;
  yAxis?: string | string[];
  groupBy?: string;
  secondaryGroupBy?: string; // For stacking/series
  aggregation?: 'sum' | 'count' | 'avg' | 'min' | 'max' | 'median' | 'mode' | 'stddev';
  filters?: Filter[];
  appliedSlicers?: string[]; // Array of slicer IDs applied to this chart
  
  // Data Processing Options
  dataSampling?: 'all' | 'first-1000' | 'first-5000' | 'random-1000' | 'random-5000';
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  maxRecords?: number;
  dataLimitBehavior?: 'truncate' | 'sample' | 'aggregate';
  
  // Chart Layout Options
  orientation?: 'vertical' | 'horizontal';
  stacking?: 'none' | 'normal' | 'percent';
  barWidth?: number;
  
  // Axis Configuration
  xAxisLabelRotation?: number;
  yAxisScale?: 'auto' | 'manual' | 'zero';
  yAxisMin?: number;
  yAxisMax?: number;
  
  // Performance Options
  enableVirtualization?: boolean;
  enableDataCaching?: boolean;
  enableProgressiveLoading?: boolean;
  
  // Hidden categories (used for per-category legend toggling on bar charts)
  hiddenCategories?: string[];
  
  // Chart Title
  title?: ChartTitle;
  
  // Legend Configuration
  legend?: ChartLegend;
  
  // Colors and Styling
  colors?: ChartColors;
  
  // Data Labels
  dataLabels?: ChartDataLabels;
  
  // Axes Configuration
  xAxisConfig?: ChartAxis;
  yAxisConfig?: ChartAxis;
  
  // Chart Area and Plot Area
  chartArea?: ChartArea;
  plotArea?: PlotArea;
  
  // Gridlines
  gridlines?: ChartGridlines;
  
  // Series-specific settings
  series?: ChartSeries[];
  
  // Animation and Interaction
  animation?: ChartAnimation;
  interaction?: ChartInteraction;
  
  // Export and Print Settings
  export?: ExportSettings;
  
  // Chart styling
  chartStyle?: {
    background?: 'light' | 'dark' | 'pattern';
    borderRadius?: number;
  };
}

export interface ChartTitle {
  text?: string;
  show?: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'left' | 'center' | 'right';
  font?: TextStyle;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  padding?: number;
}

export interface ChartLegend {
  show?: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  align?: 'left' | 'center' | 'right';
  layout?: 'horizontal' | 'vertical';
  font?: TextStyle;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  padding?: number;
  itemSpacing?: number;
  markerSize?: number;
  reverse?: boolean;
}

export interface ChartColors {
  scheme?: 'default' | 'gradient' | 'colorful' | 'pastel' | 'neon' | 'earth' | 'ocean' | 'fire' | 'monochrome' | 'analogous' | 'accent' | 'custom';
  palette?: string[]; // Custom color palette
  opacity?: number;
  gradients?: boolean;
  seriesColors?: { [seriesName: string]: string };
  // Excel-level styling
  individualBarColors?: string[]; // Color each bar individually
  patterns?: ChartPattern[]; // Pattern fills for bars
  borders?: ChartBorder; // Border styling for bars
  shadows?: ChartShadow; // Shadow effects
}

export interface ChartPattern {
  type?: 'none' | 'diagonal' | 'vertical' | 'horizontal' | 'dots' | 'grid' | 'crosshatch';
  color?: string;
  backgroundColor?: string;
  size?: number;
}

export interface ChartBorder {
  show?: boolean;
  color?: string;
  width?: number;
  style?: 'solid' | 'dashed' | 'dotted' | 'double';
  radius?: number; // Border radius for rounded corners
}

export interface ChartShadow {
  show?: boolean;
  color?: string;
  blur?: number;
  offsetX?: number;
  offsetY?: number;
  opacity?: number;
}

export interface ChartDataLabels {
  show?: boolean;
  position?: 'inside' | 'outside' | 'center' | 'top' | 'bottom' | 'left' | 'right';
  format?: 'value' | 'decimal' | 'integer' | 'comma' | 'percentage' | 'currency' | 'thousands' | 'millions' | 'billions' | 'scientific' | 'label' | 'label-value' | 'label-percentage' | 'custom';
  customFormat?: string;
  font?: TextStyle;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  padding?: number;
  rotation?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}

export interface ChartAxis {
  title?: {
    text?: string;
    show?: boolean;
    font?: TextStyle;
    rotation?: number;
  };
  labels?: {
    show?: boolean;
    font?: TextStyle;
    rotation?: number;
    format?: 'value' | 'decimal' | 'integer' | 'comma' | 'percentage' | 'currency' | 'thousands' | 'millions' | 'billions' | 'scientific';
    decimals?: number;
    prefix?: string;
    suffix?: string;
  };
  gridlines?: {
    show?: boolean;
    color?: string;
    width?: number;
    style?: 'solid' | 'dashed' | 'dotted';
  };
  ticks?: {
    show?: boolean;
    color?: string;
    width?: number;
    length?: number;
    position?: 'inside' | 'outside';
  };
  scale?: {
    type?: 'linear' | 'logarithmic' | 'time' | 'category';
    min?: number;
    max?: number;
    step?: number;
    reverse?: boolean;
  };
  line?: {
    show?: boolean;
    color?: string;
    width?: number;
  };
  axisLine?: {
    show?: boolean;
    color?: string;
    width?: number;
  };
}

export interface ChartArea {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  padding?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
}

export interface PlotArea {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
}

export interface ChartGridlines {
  major?: {
    show?: boolean;
    color?: string;
    width?: number;
    style?: 'solid' | 'dashed' | 'dotted';
  };
  minor?: {
    show?: boolean;
    color?: string;
    width?: number;
    style?: 'solid' | 'dashed' | 'dotted';
  };
}

export interface ChartSeries {
  name?: string;
  type?: string;
  color?: string;
  opacity?: number;
  lineWidth?: number;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  markerStyle?: 'circle' | 'square' | 'triangle' | 'diamond' | 'none';
  markerSize?: number;
  fill?: boolean;
  fillOpacity?: number;
  smooth?: boolean;
  stacked?: boolean;
}

export interface ChartAnimation {
  enabled?: boolean;
  duration?: number;
  easing?: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
  delay?: number;
}

export interface ChartInteraction {
  hover?: {
    enabled?: boolean;
    highlightColor?: string;
  };
  tooltip?: {
    enabled?: boolean;
    format?: string;
    backgroundColor?: string;
    borderColor?: string;
    font?: TextStyle;
  };
  zoom?: {
    enabled?: boolean;
    type?: 'x' | 'y' | 'xy';
  };
  pan?: {
    enabled?: boolean;
    type?: 'x' | 'y' | 'xy';
  };
}

export interface ExportSettings {
  format?: 'png' | 'jpg' | 'pdf' | 'svg';
  quality?: number;
  width?: number;
  height?: number;
  dpi?: number;
}

export interface TextStyle {
  family?: string;
  size?: number;
  weight?: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
  style?: 'normal' | 'italic';
  color?: string;
  decoration?: 'none' | 'underline' | 'line-through';
}

export interface Filter {
  column: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'between';
  value: any;
}

export interface Dashboard {
  id: string;
  name: string;
  description: string;
  chartIds: string[];
  layout: {
    columns: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface DashboardLayout {
  chartId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Settings {
  apiKeys: {
    [provider: string]: string;
  };
  connectedApis: {
    [provider: string]: boolean;
  };
  selectedModels: {
    [provider: string]: string;
  };
  github?: {
    token: string;
    username: string;
    autoSync: boolean;
    syncInterval: number; // minutes
  };
}

export interface GeminiModel {
  name: string;
  displayName: string;
  description: string;
  inputTokenLimit: number;
  outputTokenLimit: number;
  supportedGenerationMethods: string[];
  temperature: number;
  topP: number;
  topK: number;
}

export const GEMINI_MODELS: GeminiModel[] = [
  // Gemini 2.5 Series (Latest - 2025)
  {
    name: 'gemini-2.5-pro',
    displayName: 'Gemini 2.5 Pro',
    description: 'State-of-the-art thinking model for complex reasoning',
    inputTokenLimit: 2097152,
    outputTokenLimit: 8192,
    supportedGenerationMethods: ['generateContent', 'streamGenerateContent'],
    temperature: 1,
    topP: 0.95,
    topK: 64
  },
  {
    name: 'gemini-2.5-flash',
    displayName: 'Gemini 2.5 Flash',
    description: 'Best price-performance with well-rounded capabilities',
    inputTokenLimit: 1048576,
    outputTokenLimit: 8192,
    supportedGenerationMethods: ['generateContent', 'streamGenerateContent'],
    temperature: 1,
    topP: 0.95,
    topK: 64
  },
  {
    name: 'gemini-2.5-flash-lite',
    displayName: 'Gemini 2.5 Flash Lite',
    description: 'Optimized for cost efficiency and low latency',
    inputTokenLimit: 1048576,
    outputTokenLimit: 8192,
    supportedGenerationMethods: ['generateContent', 'streamGenerateContent'],
    temperature: 1,
    topP: 0.95,
    topK: 64
  },
  // Gemini 2.0 Series
  {
    name: 'gemini-2.0-flash-exp',
    displayName: 'Gemini 2.0 Flash (Experimental)',
    description: 'Next-gen features with superior speed and 1M token context',
    inputTokenLimit: 1048576,
    outputTokenLimit: 8192,
    supportedGenerationMethods: ['generateContent', 'streamGenerateContent'],
    temperature: 1,
    topP: 0.95,
    topK: 64
  },
  // Gemini 1.5 Series (Legacy - being deprecated April 2025)
  {
    name: 'gemini-1.5-pro-latest',
    displayName: 'Gemini 1.5 Pro (Legacy)',
    description: 'Advanced reasoning - being deprecated April 2025',
    inputTokenLimit: 2097152,
    outputTokenLimit: 8192,
    supportedGenerationMethods: ['generateContent', 'streamGenerateContent'],
    temperature: 1,
    topP: 0.95,
    topK: 64
  },
  {
    name: 'gemini-1.5-flash-latest',
    displayName: 'Gemini 1.5 Flash (Legacy)',
    description: 'Fast multimodal - being deprecated April 2025',
    inputTokenLimit: 1048576,
    outputTokenLimit: 8192,
    supportedGenerationMethods: ['generateContent', 'streamGenerateContent'],
    temperature: 1,
    topP: 0.95,
    topK: 64
  },
  {
    name: 'gemini-pro',
    displayName: 'Gemini Pro (Legacy)',
    description: 'Text-only tasks - being deprecated April 2025',
    inputTokenLimit: 32768,
    outputTokenLimit: 4096,
    supportedGenerationMethods: ['generateContent', 'streamGenerateContent'],
    temperature: 0.9,
    topP: 1,
    topK: 1
  }
];

// Slicer interfaces for filtering functionality
export interface Slicer {
  id: string;
  name: string;
  columnName: string;
  tableId?: string; // undefined for universal slicers
  type: 'universal' | 'table-specific';
  filterType: 'dropdown' | 'multi-select' | 'range' | 'date-range';
  selectedValues: any[];
  availableValues: any[];
  createdAt: string;
  updatedAt: string;
}

export interface ChartSlicer {
  chartId: string;
  slicerId: string;
  enabled: boolean;
}

export interface DateRange {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  createdAt: string;
}
