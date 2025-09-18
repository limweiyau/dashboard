import { ChartTemplate } from '../../types/charts';

export const CHART_TEMPLATES: ChartTemplate[] = [
  {
    id: 'simple-bar',
    name: 'Simple Bar Chart',
    description: 'Basic vertical bar chart for comparing values across categories',
    icon: '📊',
    category: 'bar',
    recipe: {
      type: 'single-bar',
      requiredFields: {
        xAxis: true,
        yAxis: true
      },
      configuration: {
        colorScheme: 'modern',
        showLegend: false,
        showGrid: true,
        animation: true
      }
    }
  },
  {
    id: 'multi-series-bar',
    name: 'Multi-Series Bar Chart',
    description: 'Compare multiple data series across categories',
    icon: '📊',
    category: 'bar',
    recipe: {
      type: 'multi-bar',
      requiredFields: {
        xAxis: true,
        yAxis: true,
        series: true
      },
      configuration: {
        colorScheme: 'vibrant',
        showLegend: true,
        showGrid: true,
        animation: true
      }
    }
  },
  {
    id: 'stacked-bar',
    name: 'Stacked Bar Chart',
    description: 'Show parts of a whole with stacked bars',
    icon: '📊',
    category: 'bar',
    recipe: {
      type: 'stacked-bar',
      requiredFields: {
        xAxis: true,
        yAxis: true,
        series: true
      },
      configuration: {
        colorScheme: 'vibrant',
        showLegend: true,
        showGrid: true,
        animation: true
      }
    }
  },
  {
    id: 'simple-line',
    name: 'Simple Line Chart',
    description: 'Show trends over time or continuous data',
    icon: '📈',
    category: 'line',
    recipe: {
      type: 'simple-line',
      requiredFields: {
        xAxis: true,
        yAxis: true
      },
      configuration: {
        colorScheme: 'modern',
        showLegend: false,
        showGrid: true,
        animation: true
      }
    }
  },
  {
    id: 'multi-line',
    name: 'Multi-Line Chart',
    description: 'Compare trends across multiple data series',
    icon: '📈',
    category: 'line',
    recipe: {
      type: 'multi-line',
      requiredFields: {
        xAxis: true,
        yAxis: true,
        series: true
      },
      configuration: {
        colorScheme: 'vibrant',
        showLegend: true,
        showGrid: true,
        animation: true
      }
    }
  },
  {
    id: 'area-chart',
    name: 'Area Chart',
    description: 'Show data trends with filled areas',
    icon: '🏔️',
    category: 'area',
    recipe: {
      type: 'area',
      requiredFields: {
        xAxis: true,
        yAxis: true
      },
      configuration: {
        colorScheme: 'modern',
        showLegend: false,
        showGrid: true,
        animation: true
      }
    }
  },
  {
    id: 'pie-chart',
    name: 'Pie Chart',
    description: 'Show proportions and percentages of a whole',
    icon: '🥧',
    category: 'pie',
    recipe: {
      type: 'pie',
      requiredFields: {
        category: true,
        value: true
      },
      configuration: {
        colorScheme: 'vibrant',
        showLegend: true,
        showGrid: false,
        animation: true
      }
    }
  },
  {
    id: 'scatter-plot',
    name: 'Scatter Plot',
    description: 'Show relationships between two numerical variables',
    icon: '⭐',
    category: 'scatter',
    recipe: {
      type: 'scatter',
      requiredFields: {
        xAxis: true,
        yAxis: true
      },
      configuration: {
        colorScheme: 'modern',
        showLegend: false,
        showGrid: true,
        animation: true
      }
    }
  }
];

export const COLOR_SCHEMES = {
  modern: [
    '#6366f1', // Bright Indigo - better for glass
    '#0ea5e9', // Sky Blue
    '#10b981', // Emerald Green
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#84cc16'  // Lime Green
  ],
  vibrant: [
    '#ff4757', // Electric Red
    '#00d2d3', // Turquoise
    '#3742fa', // Bright Blue
    '#ffa502', // Vivid Orange
    '#2ed573', // Neon Green
    '#5f27cd', // Deep Purple
    '#ff6b6b', // Salmon
    '#4834d4'  // Royal Blue
  ],
  professional: [
    '#1e40af', // Navy Blue
    '#065f46', // Deep Green
    '#b91c1c', // Deep Red
    '#7c2d12', // Brown
    '#0f766e', // Teal
    '#6b21a8', // Deep Purple
    '#be185d', // Rose
    '#365314'  // Dark Green
  ],
  glass: [
    '#3b82f6', // Glass Blue
    '#06b6d4', // Cyan Glass
    '#10b981', // Emerald Glass
    '#f59e0b', // Amber Glass
    '#ef4444', // Ruby Glass
    '#8b5cf6', // Amethyst Glass
    '#ec4899', // Rose Glass
    '#84cc16'  // Peridot Glass
  ],
  neon: [
    '#ff0080', // Neon Pink
    '#00ff80', // Neon Green
    '#0080ff', // Neon Blue
    '#ff8000', // Neon Orange
    '#8000ff', // Neon Purple
    '#00ffff', // Neon Cyan
    '#ffff00', // Neon Yellow
    '#ff4080'  // Neon Rose
  ],
  pastel: [
    '#a5b4fc', // Light indigo
    '#7dd3fc', // Light blue
    '#86efac', // Light green
    '#fde68a', // Light yellow
    '#fca5a5', // Light red
    '#c4b5fd', // Light purple
    '#f9a8d4', // Light pink
    '#bef264'  // Light lime
  ],
  dark: [
    '#475569', // Cool Gray
    '#64748b', // Slate Gray
    '#78716c', // Stone Gray
    '#6b7280', // True Gray
    '#71717a', // Zinc Gray
    '#737373', // Neutral
    '#525252', // Gray
    '#404040'  // Charcoal
  ],
  dynamic: 'auto' // Special case for dynamic coloring
};