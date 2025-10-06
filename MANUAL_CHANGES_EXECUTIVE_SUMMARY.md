# Manual Code Changes Required - Executive Summary Feature

**Reason:** Disk is 100% full - cannot save file edits automatically

## File 1: `/Users/wy/Desktop/dashboard/src/renderer/utils/geminiClient.ts`

### Change 1: Replace the executive summary prompt (around line 235-268)

**FIND:**
```typescript
    const prompt = `
You are a business analyst writing an executive summary for a data report.

PROJECT INFORMATION:
- Project: ${projectName}
- Report Date: ${reportDate}
- Report Title: ${config.reportTitle || 'Data Analysis Report'}
- Description: ${config.description || 'Comprehensive data analysis'}

REPORT CONTAINS:
- ${totalCharts} chart${totalCharts !== 1 ? 's' : ''} analyzing ${totalDataPoints} data points
- Chart types: ${chartTypes.join(', ')}
- Data sources: ${uniqueTableNames.join(', ')}
- ${chartsWithAnalysis} chart${chartsWithAnalysis !== 1 ? 's' : ''} with detailed analysis
- ${chartsWithInsights} chart${chartsWithInsights !== 1 ? 's' : ''} with actionable insights

CHART SUMMARIES:
${detailedChartData.map(chart => `
Chart ${chart.chartIndex}: "${chart.title}"
- Type: ${chart.type}
- Analyzes: ${chart.xAxisField} vs ${chart.yAxisField}
- Data: ${chart.totalDataPoints} points across ${chart.datasets.length} series
${chart.hasAnalysis ? `- Analysis: ${chart.analysis}` : ''}
${chart.hasInsights ? `- Insights: ${chart.insights}` : ''}
`).join('\n')}

Write a concise executive summary (150-250 words) that:
1. Opens with the report's overall purpose and scope
2. Highlights 3-5 key findings from across all charts
3. Synthesizes insights into strategic takeaways
4. Concludes with high-level recommendations

Use professional business language. Reference specific data points, trends, and chart findings. Make it actionable for executives.
`;

    // Console log the input data for debugging
    console.log('=== EXECUTIVE SUMMARY INPUT DATA ===');
    console.log('Charts array:', charts);
    console.log('Charts length:', charts.length);
    console.log('Project data:', projectData);
    console.log('Config object:', config);
    console.log('Detailed chart data:', detailedChartData);
    console.log('Prompt length:', prompt.length);
    console.log('Full prompt:', prompt);
    console.log('=== END INPUT DATA ===');

    return await this.generateContent(prompt, modelName);
  }
```

**REPLACE WITH:**
```typescript
    const prompt = `
You are a business analyst writing an executive summary for a data report.

PROJECT INFORMATION:
- Project: ${projectName}
- Report Date: ${reportDate}
- Report Title: ${config.reportTitle || 'Data Analysis Report'}
- Description: ${config.description || 'Comprehensive data analysis'}

REPORT CONTAINS:
- ${totalCharts} chart${totalCharts !== 1 ? 's' : ''} analyzing ${totalDataPoints} data points
- Chart types: ${chartTypes.join(', ')}
- Data sources: ${uniqueTableNames.join(', ')}
- ${chartsWithAnalysis} chart${chartsWithAnalysis !== 1 ? 's' : ''} with detailed analysis
- ${chartsWithInsights} chart${chartsWithInsights !== 1 ? 's' : ''} with actionable insights

CHART SUMMARIES:
${detailedChartData.map(chart => `
Chart ${chart.chartIndex}: "${chart.title}"
- Type: ${chart.type}
- Analyzes: ${chart.xAxisField} vs ${chart.yAxisField}
- Data: ${chart.totalDataPoints} points across ${chart.datasets.length} series
${chart.hasAnalysis ? `- Analysis: ${chart.analysis}` : ''}
${chart.hasInsights ? `- Insights: ${chart.insights}` : ''}
`).join('\n')}

Write a concise executive summary (150-250 words) that:
1. Opens with the report's overall purpose and scope
2. Highlights 3-5 key findings from across all charts
3. Synthesizes insights into strategic takeaways
4. Concludes with high-level recommendations

Use professional business language. Reference specific data points, trends, and chart findings. Make it actionable for executives.
`;

    return await this.generateContent(prompt, modelName);
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
```

---

## File 2: `/Users/wy/Desktop/dashboard/src/renderer/components/export/ExportConfigurationModal.tsx`

### Change 2: Update the Generate button styling and add Feed button (around line 1485-1545)

**FIND:**
```typescript
                        <div style={{ marginBottom: '16px' }}>
                          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                            <button
                              disabled={isGeneratingExecutiveSummary}
                              onClick={async () => {
                                setIsGeneratingExecutiveSummary(true);
                                try {
                                  const { GeminiClient } = await import('../../utils/geminiClient');
                                  const client = new GeminiClient();

                                  // Get API key from settings
                                  const apiKey = settings?.apiKeys?.gemini;
                                  if (!apiKey) {
                                    alert('Please set your Gemini API key in Settings first.');
                                    setIsGeneratingExecutiveSummary(false);
                                    return;
                                  }

                                  client.setApiKey(apiKey);
                                  const summary = await client.generateExecutiveSummary(
                                    selectedCharts,
                                    { name: config.reportTitle },
                                    config
                                  );
                                  // Don't enforce character limit for logging mode - let full data through
                                  onConfigChange({ executiveSummaryContent: summary });
                                } catch (error) {
                                  console.error('Failed to generate executive summary:', error);
                                  alert('Failed to generate executive summary. Please check your API key and try again.');
                                } finally {
                                  setIsGeneratingExecutiveSummary(false);
                                }
                              }}
                              style={{
                                padding: '8px 16px',
                                border: 'none',
                                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                color: '#ffffff',
                                borderRadius: '6px',
                                fontSize: '12px',
```

**REPLACE WITH:**
```typescript
                        <div style={{ marginBottom: '16px' }}>
                          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                            <button
                              disabled={isGeneratingExecutiveSummary}
                              onClick={async () => {
                                setIsGeneratingExecutiveSummary(true);
                                try {
                                  const { GeminiClient } = await import('../../utils/geminiClient');
                                  const client = new GeminiClient();

                                  // Get API key from settings
                                  const apiKey = settings?.apiKeys?.gemini;
                                  if (!apiKey) {
                                    alert('Please set your Gemini API key in Settings first.');
                                    setIsGeneratingExecutiveSummary(false);
                                    return;
                                  }

                                  client.setApiKey(apiKey);
                                  const summary = await client.generateExecutiveSummary(
                                    selectedCharts,
                                    { name: config.reportTitle },
                                    config
                                  );
                                  onConfigChange({ executiveSummaryContent: summary });
                                } catch (error) {
                                  console.error('Failed to generate executive summary:', error);
                                  alert('Failed to generate executive summary. Please check your API key and try again.');
                                } finally {
                                  setIsGeneratingExecutiveSummary(false);
                                }
                              }}
                              style={{
                                padding: '8px 16px',
                                border: 'none',
                                background: isGeneratingExecutiveSummary
                                  ? '#9ca3af'
                                  : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                color: '#ffffff',
                                borderRadius: '6px',
                                fontSize: '12px',
                                cursor: isGeneratingExecutiveSummary ? 'not-allowed' : 'pointer',
                                opacity: isGeneratingExecutiveSummary ? 0.6 : 1,
```

### Change 3: Add the Feed button right after the Generate button

**ADD AFTER THE GENERATE BUTTON (before the closing div):**
```typescript
                            <button
                              onClick={async () => {
                                try {
                                  const { GeminiClient } = await import('../../utils/geminiClient');
                                  const client = new GeminiClient();
                                  const feedData = await client.debugExecutiveSummaryFeed(
                                    selectedCharts,
                                    { name: config.reportTitle },
                                    config
                                  );
                                  console.log('Feed button clicked - check console for output');
                                  alert('Feed data logged to console. Open DevTools to view.');
                                } catch (error) {
                                  console.error('Failed to generate feed data:', error);
                                  alert('Failed to generate feed data.');
                                }
                              }}
                              style={{
                                padding: '8px 16px',
                                border: '1px solid #d1d5db',
                                background: '#ffffff',
                                color: '#6b7280',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#f9fafb';
                                e.currentTarget.style.borderColor = '#9ca3af';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#ffffff';
                                e.currentTarget.style.borderColor = '#d1d5db';
                              }}
                            >
                              Feed
                            </button>
```

---

## Summary of Changes:

1. **geminiClient.ts**:
   - Removed debug logging mode prompt
   - Changed to proper executive summary generation prompt
   - Added new `debugExecutiveSummaryFeed()` function that console logs all feed data

2. **ExportConfigurationModal.tsx**:
   - Fixed "Generate" button to grey out when disabled (background changes to `#9ca3af`, opacity 0.6, cursor not-allowed)
   - Added "Feed" button that calls `debugExecutiveSummaryFeed()` and logs to console

## To Apply:
1. Free up disk space on your Mac
2. Open the files mentioned above
3. Make the changes as indicated
4. Save files

The app should hot-reload automatically.
