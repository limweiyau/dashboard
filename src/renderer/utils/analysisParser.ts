/**
 * Shared utility for parsing analysis content with explicit header support
 * Supports both new ANALYSIS:/INSIGHTS: header format and legacy double-newline format
 */

export interface ParsedAnalysis {
  analysisContent: string;
  insightsContent: string;
}

/**
 * Parse analysis text into separate analysis and insights sections
 *
 * @param analysisText - The raw analysis text to parse
 * @returns Object with separated analysisContent and insightsContent
 */
export const parseAnalysisContent = (analysisText: string): ParsedAnalysis => {
  if (!analysisText?.trim()) {
    return { analysisContent: '', insightsContent: '' };
  }

  // Check for explicit section headers first (new format)
  const analysisMatch = analysisText.match(/ANALYSIS:\s*([\s\S]*?)(?=INSIGHTS:|$)/i);
  const insightsMatch = analysisText.match(/INSIGHTS:\s*([\s\S]*?)$/i);

  if (analysisMatch || insightsMatch) {
    // Use explicit headers
    const analysisContent = analysisMatch ? analysisMatch[1].trim() : '';
    const insightsContent = insightsMatch ? insightsMatch[1].trim() : '';
    return { analysisContent, insightsContent };
  }

  // Fallback to legacy double-newline parsing for backward compatibility
  const sections = analysisText.split(/(?:\n\s*){2,}/).filter(section => section.trim());
  const cleanedSections = sections.map(section =>
    section.replace(/^(Analysis|Insights|Recommendations?):\s*/i, '').trim()
  ).filter(section => section.length > 0);

  const analysisContent = cleanedSections[0] || '';
  const insightsContent = cleanedSections.slice(1).join('\n\n') ||
    (cleanedSections.length > 1 ? cleanedSections[cleanedSections.length - 1] : '');

  return { analysisContent, insightsContent };
};

/**
 * Format analysis content with explicit headers for consistent saving
 *
 * @param analysisContent - The analysis section content
 * @param insightsContent - The insights section content
 * @returns Formatted content with explicit headers
 */
export const formatAnalysisContent = (analysisContent: string, insightsContent: string): string => {
  return `ANALYSIS:\n${analysisContent.trim()}\n\nINSIGHTS:\n${insightsContent.trim()}`;
};