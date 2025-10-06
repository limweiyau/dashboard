import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_MODELS, GeminiModel } from '../types';

export class GeminiClient {
  private genAI: GoogleGenerativeAI | null = null;
  private apiKey: string | null = null;

  constructor(apiKey?: string) {
    if (apiKey) {
      this.setApiKey(apiKey);
    }
  }

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async testConnection(modelName: string = 'gemini-2.5-flash'): Promise<{ success: boolean; error?: string }> {
    if (!this.genAI || !this.apiKey) {
      return { success: false, error: 'API key not set' };
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: modelName });
      
      const result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [{ text: 'Hello, this is a test connection. Please respond with "OK".' }]
        }]
      });

      const response = await result.response;
      const text = response.text();

      if (text) {
        return { success: true };
      } else {
        return { success: false, error: 'Empty response from API' };
      }
    } catch (error: any) {
      console.error('Gemini API test failed:', error);
      
      if (error?.message?.includes('API_KEY_INVALID')) {
        return { success: false, error: 'Invalid API key' };
      } else if (error?.message?.includes('QUOTA_EXCEEDED')) {
        return { success: false, error: 'API quota exceeded' };
      } else if (error?.message?.includes('MODEL_NOT_FOUND')) {
        return { success: false, error: 'Model not found' };
      } else if (error?.code === 'NETWORK_ERROR') {
        return { success: false, error: 'Network error - check your internet connection' };
      } else {
        return { success: false, error: error?.message || 'Unknown error occurred' };
      }
    }
  }

  async generateContent(prompt: string, modelName: string = 'gemini-2.5-flash'): Promise<string> {
    if (!this.genAI) {
      throw new Error('API key not set');
    }

    const model = this.genAI.getGenerativeModel({ model: modelName });
    
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{ text: prompt }]
      }]
    });

    const response = await result.response;
    return response.text();
  }

  async generateChartInsights(chartData: any, chartConfig: any, modelName: string = 'gemini-2.5-flash'): Promise<string> {
    if (!this.genAI) {
      throw new Error('API key not set');
    }

    // Extract labels and data for context-aware analysis
    const labels = chartData?.labels || [];
    const datasets = chartData?.datasets || [];
    const sampleData = datasets[0]?.data || [];

    // Create structured data for AI with proper context
    const structuredData = {
      labels: labels,
      datasets: datasets.map((dataset: any) => ({
        label: dataset.label,
        data: dataset.data
      })),
      dataPreview: labels.map((label: string, index: number) => ({
        category: label,
        value: sampleData[index] || 0
      }))
    };

    const dataPreview = JSON.stringify(structuredData, null, 2);
    const chartType = (chartConfig?.templateId || chartConfig?.type || chartConfig?.chartType || 'unknown').toLowerCase();

    const getChartGuidance = () => {
      const makeGuidance = (analysis: string, insights: string) => ({ analysis, insights });

      if (chartType.includes('pie')) {
        return makeGuidance(
          'Explain how values are distributed across categories. Mention total, largest and smallest shares with their percentages. Highlight any categories that dominate or are under-represented. Avoid describing time-based trends.',
          'Recommend actions that rebalance category shares, capitalize on dominant segments, or strengthen underperforming ones.'
        );
      }

      if (chartType.includes('line') || chartType.includes('area')) {
        return makeGuidance(
          'Describe how the measures change across the ordered axis. Call out increases, decreases, peaks, troughs, and relative volatility by series. Compare series if more than one is present.',
          'Suggest tactics that sustain positive momentum, reverse declines, or reduce volatility based on the observed trajectories.'
        );
      }

      if (chartType.includes('bar') || chartType.includes('column') || chartType.includes('stacked')) {
        return makeGuidance(
          'Compare categories side by side. Identify top and bottom performers, notable gaps, and clusters of similar values. Reference series differences for multi-series charts.',
          'Focus on reallocating resources from lagging categories to high performers, closing gaps, or replicating winning approaches from the best categories.'
        );
      }

      if (chartType.includes('scatter')) {
        return makeGuidance(
          'Assess the relationship between the X and Y values. Comment on correlation strength, outliers, and any clusters or segments. Reference numeric ranges for both axes.',
          'Recommend actions that leverage positive relationships, mitigate negative ones, or collect more data where relationships are unclear.'
        );
      }

      return makeGuidance(
        'Summarize the most important patterns, extremes, and comparisons visible in the chart. Reference specific categories, series, and values where helpful.',
        'Suggest practical next steps that exploit strengths, address weaknesses, or investigate notable anomalies found in the visualization.'
      );
    };

    const guidance = getChartGuidance();

    const prompt = `
Analyze ALL the chart data shown below. This data represents exactly what is displayed on the chart.

Complete Chart Data:
${dataPreview}

Chart Type: ${chartConfig.templateId || 'unknown'}
X-Axis: ${chartConfig.xAxisField || chartConfig.categoryField || 'category'}
Y-Axis: ${chartConfig.yAxisField || chartConfig.valueField || 'value'}

Provide your response in EXACTLY this format with these two sections:

ANALYSIS:
[${guidance.analysis} Analyze ALL data points across ALL series/categories. 120 words maximum.]

INSIGHTS:
[${guidance.insights} Provide 3-4 concrete business recommendations grounded in the chart. 80 words maximum.]

CRITICAL REQUIREMENTS:
- Use EXACTLY the format above with "ANALYSIS:" and "INSIGHTS:" headers
- ALWAYS use the EXACT category names from the data (e.g., "MY", "TH", "SG" NOT "country 1", "country 2")
- ALWAYS use the EXACT dataset labels from the data (e.g., if dataset label is "Sales", use "Sales" NOT "series 1")
- NEVER use generic terms like "category 1", "month 1", "country 1" - use the actual labels provided
- Include specific values, series names, and category names EXACTLY as they appear in the data
- Analyze ALL data points from ALL series/categories shown, not just one series
- Compare performance across different series if multiple series exist
- Plain text only (no markdown, asterisks, or formatting)
- Maximum 200 words total (120 for analysis, 80 for insights)
`;

    return await this.generateContent(prompt, modelName);
  }

  async generateExecutiveSummary(charts: any[], projectData: any, config: any, modelName: string = 'gemini-2.5-flash'): Promise<{ summary: string; highlights: Array<{ metric: string; label: string; trend?: 'up' | 'down' | 'neutral' }> }> {
    if (!this.genAI) {
      throw new Error('API key not set');
    }

    // Extract comprehensive chart data for logging
    const detailedChartData = charts.map((chart, index) => {
      // Try multiple possible locations for chart configuration
      const chartConfig = chart.config || chart.configuration || {};
      const chartData = chart.data || {};
      const datasets = chartData.datasets || [];
      const labels = chartData.labels || [];

      return {
        chartIndex: index + 1,
        id: chart.id || 'no-id',
        title: chartConfig.title || chart.title || chart.name || `Chart ${index + 1}`,
        type: chartConfig.templateId || chartConfig.type || chart.type || chartConfig.chartType || 'unknown',
        xAxisField: chartConfig.xAxisField || chartConfig.categoryField || 'unknown',
        yAxisField: chartConfig.yAxisField || chartConfig.valueField || 'unknown',
        aggregation: chartConfig.aggregation || 'unknown',
        colorScheme: chartConfig.colorScheme || 'unknown',
        showLegend: chartConfig.showLegend,
        showGrid: chartConfig.showGrid,
        animation: chartConfig.animation,
        dataLabels: labels,
        datasets: datasets.map((dataset: any) => ({
          label: dataset.label || 'Unnamed Dataset',
          data: dataset.data || [],
          dataLength: dataset.data?.length || 0,
          backgroundColor: dataset.backgroundColor,
          borderColor: dataset.borderColor
        })),
        totalDataPoints: datasets.reduce((sum: number, ds: any) => sum + (ds.data?.length || 0), 0),
        tableName: chartConfig.tableName || chart.tableName || chart.sourceTable || 'unknown',
        tableDescription: chartConfig.tableDescription || chart.tableDescription || chart.description || 'no description',
        analysis: chart.analysis || 'no analysis available',
        insights: chart.insights || 'no insights available',
        hasAnalysis: !!chart.analysis,
        hasInsights: !!chart.insights,
        // Additional chart properties
        dateRange: chart.dateRange || chartConfig.dateRange || 'no date range',
        filters: chart.filters || chartConfig.filters || 'no filters',
        slicers: chart.slicers || chartConfig.slicers || 'no slicers',
        rawChartObject: JSON.stringify(chart, null, 2)
      };
    });

    // Get project metadata
    const projectName = projectData?.name || config.reportTitle || 'Data Analysis Report';
    const reportDate = config.reportDate || new Date().toISOString().split('T')[0];

    // Calculate aggregate statistics
    const totalCharts = charts.length;
    const totalDataPoints = detailedChartData.reduce((sum, chart) => sum + chart.totalDataPoints, 0);
    const chartTypes = [...new Set(detailedChartData.map(chart => chart.type))];
    const uniqueTableNames = [...new Set(detailedChartData.map(chart => chart.tableName))];
    const chartsWithAnalysis = detailedChartData.filter(chart => chart.hasAnalysis).length;
    const chartsWithInsights = detailedChartData.filter(chart => chart.hasInsights).length;

    const prompt = `
You are an executive business analyst creating a report summary with key highlights.

PROJECT CONTEXT:
- Report: ${config.reportTitle || 'Data Analysis Report'}
- Date: ${reportDate}
- Scope: ${config.description || 'Comprehensive data analysis'}
- Coverage: ${totalCharts} chart${totalCharts !== 1 ? 's' : ''} analyzing ${totalDataPoints} data points across ${uniqueTableNames.join(', ')}

DETAILED CHART INSIGHTS:
${detailedChartData.map(chart => `
"${chart.title}" (${chart.type})
${chart.analysis ? `Analysis: ${chart.analysis}` : ''}
${chart.insights ? `Insights: ${chart.insights}` : ''}
`).join('\n')}

TASK: Generate TWO outputs in strict JSON format:

1. HIGHLIGHTS: Exactly 3 visual metric cards showing the most critical numbers
   Each highlight has two parts:
   - METRIC: Pure number/percentage/value ONLY - NO WORDS
     * Maximum 8 characters (must fit on one line)
     * Must be a concrete number from the data
     * Examples: "42%", "$2.5M", "3.2x", "18.3K", "13.75" - NEVER "13.75 days"
     * If the data is "13.75 days", the metric should be just "13.75"
   - LABEL: Brief description of what the metric represents
     * Maximum 20 characters (must fit on one line)
     * 2-3 words maximum
     * This is where you explain the unit (e.g., "Avg Days", "Leave Days", "Revenue Growth")
   - TREND (optional): "up" for positive, "down" for negative, "neutral" for stable

   Examples of good highlights:
   * { "metric": "42%", "label": "Revenue Growth", "trend": "up" }
   * { "metric": "$2.5M", "label": "Cost Savings", "trend": "up" }
   * { "metric": "18,305", "label": "New Customers", "trend": "up" }
   * { "metric": "13.75", "label": "Average Leave Days", "trend": "neutral" }

   BAD examples (NEVER do this):
   * { "metric": "13.75 days", ... } ❌ NO WORDS IN METRIC
   * { "metric": "42% growth", ... } ❌ NO WORDS IN METRIC

2. SUMMARY: Executive narrative synthesizing all insights
   - Target length: 3000-3500 actual characters (aim for comprehensive, detailed analysis)
   - IMPORTANT: Each newline character counts as 100 characters toward the UI limit (but write normally)
   - Write substantial, detailed content - aim for the full 3000-3500 character range
   - MUST use this exact structure with headers and spacing:

   **Overview**

   [3-5 sentences providing comprehensive context, scope, and background of the analysis]

   **Key Findings**

   [4-6 sentences with detailed discoveries, trends, and specific metrics from the data]

   **Strategic Implications**

   [3-5 sentences analyzing business impact, risks, opportunities, and what the findings mean strategically]

   **Recommendations**

   [3-5 sentences with specific, actionable next steps and strategic recommendations]

   - Use **bold** for section headers (use markdown ** syntax)
   - MUST have a blank line between header and content
   - NO bullet points - use flowing paragraph text only
   - Write detailed, thorough content - aim for substance and depth
   - Reference specific metrics, data points, and trends throughout
   - Use decisive, confident C-suite language
   - Connect insights across multiple charts
   - Be comprehensive - executives want detailed analysis, not bullet points

OUTPUT FORMAT (return ONLY this JSON structure, no additional text):
{
  "highlights": [
    { "metric": "42%", "label": "Revenue Growth", "trend": "up" },
    { "metric": "$1.8M", "label": "Cost Reduction", "trend": "up" },
    { "metric": "15K", "label": "New Customers", "trend": "up" }
  ],
  "summary": "**Overview**\\n\\nContext sentences here. More context.\\n\\n**Key Findings**\\n\\nFirst finding with metrics. Second finding with data.\\n\\n**Strategic Implications**\\n\\nImplications here. Business impact.\\n\\n**Recommendations**\\n\\nAction steps here. Next steps."
}

CRITICAL REQUIREMENTS:
- Return ONLY valid JSON, no markdown code blocks, no additional commentary
- Highlights array must contain exactly 3 objects with metric, label, and optional trend
- Each metric must be 10 characters or less
- Each label must be 25 characters or less (2-4 words)
- Summary must be under 1400 characters INCLUDING all formatting (headers, bullets, newlines)
- Summary MUST follow the exact 4-section structure: Overview, Key Findings, Strategic Implications, Recommendations
- Use \\n for line breaks in the JSON string
- The summary must integrate ALL chart analyses, not just describe individual charts in isolation
`;

    try {
      const response = await this.generateContent(prompt, modelName);

      // Extract JSON from response (handle potential markdown code blocks)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('Failed to extract JSON from response:', response);
        throw new Error('Invalid response format - no JSON found');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate and sanitize highlights
      let highlights: Array<{ metric: string; label: string; trend?: 'up' | 'down' | 'neutral' }> = [];
      if (Array.isArray(parsed.highlights) && parsed.highlights.length > 0) {
        highlights = parsed.highlights
          .slice(0, 3)
          .map((h: any) => {
            if (!h || typeof h !== 'object') return null;

            const metric = String(h.metric || '').trim();
            const label = String(h.label || '').trim();
            const trend = ['up', 'down', 'neutral'].includes(h.trend) ? h.trend : undefined;

            // Validate lengths
            if (!metric || !label) return null;

            return {
              metric: metric.length > 8 ? metric.substring(0, 8) : metric,
              label: label.length > 20 ? label.substring(0, 20) : label,
              trend
            };
          })
          .filter((h: any) => h !== null);
      }

      // Pad with empty highlights if we have fewer than 3
      while (highlights.length < 3) {
        highlights.push({ metric: '', label: '', trend: undefined });
      }

      // Validate and sanitize summary
      let summary = String(parsed.summary || '').trim();
      if (summary.length > 1400) {
        // Try to truncate at last complete sentence within limit
        const truncated = summary.substring(0, 1397);
        const lastPeriod = truncated.lastIndexOf('.');
        summary = lastPeriod > 1100 ? truncated.substring(0, lastPeriod + 1) : truncated + '...';
      }

      return { summary, highlights };
    } catch (error) {
      console.error('Failed to generate structured executive summary:', error);
      // Fallback: return empty highlights and error message
      return {
        summary: 'Failed to generate executive summary. Please try again.',
        highlights: [
          { metric: '', label: '', trend: undefined },
          { metric: '', label: '', trend: undefined },
          { metric: '', label: '', trend: undefined }
        ]
      };
    }
  }

  async debugExecutiveSummaryFeed(charts: any[], projectData: any, config: any): Promise<string> {
    const detailedChartData = charts.map((chart, index) => {
      const chartConfig = chart.config || chart.configuration || {};
      const chartData = chart.data || {};
      return {
        chartIndex: index + 1,
        id: chart.id,
        title: chartConfig.title || chart.title || chart.name,
        type: chartConfig.templateId || chart.type,
        xAxisField: chartConfig.xAxisField,
        yAxisField: chartConfig.yAxisField,
        analysis: chart.analysis,
        insights: chart.insights,
        datasets: chartData.datasets,
        labels: chartData.labels,
        fullChart: chart
      };
    });

    const feedData = {
      projectMetadata: {
        projectName: projectData?.name || config.reportTitle,
        reportDate: config.reportDate,
        reportTitle: config.reportTitle,
        description: config.description
      },
      charts: detailedChartData,
      projectData,
      config
    };

    console.log('=== DEBUG FEED DATA ===');
    console.log(JSON.stringify(feedData, null, 2));
    console.log('=== END DEBUG FEED ===');

    return JSON.stringify(feedData, null, 2);
  }

  async suggestChartTypes(data: any[], columns: any[], modelName: string = 'gemini-2.5-flash'): Promise<string[]> {
    if (!this.genAI) {
      throw new Error('API key not set');
    }

    const columnsInfo = columns.map(col => `${col.name} (${col.type})`).join(', ');
    const sampleData = data.slice(0, 5);
    
    const prompt = `
Given this data structure and sample:

Columns: ${columnsInfo}
Sample data: ${JSON.stringify(sampleData, null, 2)}

Suggest the most appropriate chart types for visualizing this data. Consider:
- Data types and relationships
- Number of dimensions
- Distribution characteristics
- Common visualization patterns

Return only a JSON array of chart types like: ["bar", "line", "pie", "scatter"]
Available types: bar, line, pie, scatter, area, histogram
`;

    try {
      const response = await this.generateContent(prompt, modelName);
      
      // Extract JSON from response
      const jsonMatch = response.match(/\[.*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback to default suggestions
      return ['bar', 'line'];
    } catch (error) {
      console.error('Failed to get chart suggestions:', error);
      return ['bar', 'line', 'pie'];
    }
  }
}

export const getAvailableModels = (): GeminiModel[] => {
  return GEMINI_MODELS;
};

export const getModelByName = (name: string): GeminiModel | undefined => {
  return GEMINI_MODELS.find(model => model.name === name);
};
