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

  async testConnection(modelName: string = 'gemini-pro'): Promise<{ success: boolean; error?: string }> {
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

  async generateContent(prompt: string, modelName: string = 'gemini-pro'): Promise<string> {
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

  async generateChartInsights(chartData: any, chartConfig: any, modelName: string = 'gemini-1.5-flash'): Promise<string> {
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

  async suggestChartTypes(data: any[], columns: any[], modelName: string = 'gemini-1.5-flash'): Promise<string[]> {
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
