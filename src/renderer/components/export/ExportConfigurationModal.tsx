import React, { ChangeEvent, useMemo, useState, useRef, useEffect } from 'react';
import { Chart, Settings } from '../../types';
import { ExportReportConfig, ConfidentialStatus } from './types';
import { parseAnalysisContent } from '../../utils/analysisParser';

interface ExportConfigurationModalProps {
  config: ExportReportConfig;
  charts: Chart[];
  selectedChartIds: string[];
  chartsWithAnalysis: Set<string>;
  chartThumbnails: Record<string, { dataUrl: string; capturedAt: number }>;
  analysisContentByChart: Record<string, string>;
  chartAIOptions: Record<string, { analysis: boolean; insights: boolean }>;
  analysisAvailableCount: number;
  totalSelectedCount: number;
  isCapturingAssets: boolean;
  exportError: string | null;
  settings?: Settings;
  onConfigChange: (updates: Partial<ExportReportConfig>) => void;
  onLogoUpload: (file: File) => void;
  onLogoClear: () => void;
  onToggleChart: (chartId: string) => void;
  onSelectAllCharts: () => void;
  onClearAllCharts: () => void;
  onReorderCharts: (startIndex: number, endIndex: number) => void;
  onChartAIOptionsChange: (chartId: string, updates: Partial<{ analysis: boolean; insights: boolean }>) => void;
  onBack: () => void;
  onCancel: () => void;
  onGenerate: () => void;
}

const cardTitleStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 600,
  color: '#0f172a',
  marginBottom: '12px'
};

const cardContainerStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: '10px',
  border: '1px solid #e5e7eb',
  padding: '18px',
  marginBottom: '12px',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  transition: 'all 0.2s ease'
};

const fieldLabelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  color: '#475569',
  marginBottom: '6px',
  marginTop: '10px',
  display: 'block'
};

const textInputStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: '8px',
  border: '1px solid #d1d5db',
  padding: '10px 12px',
  fontSize: '13px',
  color: '#0f172a',
  outline: 'none',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  backgroundColor: '#ffffff'
};

const textareaStyle: React.CSSProperties = {
  ...textInputStyle,
  minHeight: '80px',
  resize: 'vertical',
  fontFamily: 'inherit'
};

const disabledCheckboxLabelStyle: React.CSSProperties = {
  color: '#94a3b8',
  cursor: 'not-allowed'
};

const chartsPerPage = 1;
// A4 aspect ratio: 210mm x 297mm = 0.707:1
const pageDimensions = { width: 780, height: 1103 }; // Maintains proper A4 ratio, expanded by 56%

// Calculate dynamic preview dimensions based on available space with zoom awareness
const getPreviewDimensions = () => {
  // Detect zoom level
  const devicePixelRatio = window.devicePixelRatio || 1;

  // Apply zoom adjustment to container calculations
  const zoomAdjustment = devicePixelRatio > 1 ? Math.pow(0.85, devicePixelRatio - 1) : 1;

  const containerWidth = Math.min(window.innerWidth * 0.52, 1100) * zoomAdjustment;
  const containerHeight = Math.min(window.innerHeight * 0.8, 900) * zoomAdjustment;

  // Calculate scale to fit both width and height
  const scaleX = containerWidth / pageDimensions.width;
  const scaleY = containerHeight / pageDimensions.height;
  const baseScale = Math.min(scaleX, scaleY, 1.0);

  // Apply additional zoom-based scaling for preview
  const finalScale = baseScale * zoomAdjustment;

  // Smooth minimum scale transition - no sudden jumps
  const minScale = Math.max(0.6, 0.8 - (devicePixelRatio - 1) * 0.4);
  const actualScale = Math.max(finalScale, minScale);

  return {
    width: pageDimensions.width * actualScale,
    height: pageDimensions.height * actualScale,
    scale: actualScale
  };
};

type TocEntry = {
  title: string;
  subtitle?: string;
  pageNumber?: number;
};

type PreviewPage =
  | { type: 'cover' }
  | { type: 'executive-summary' }
  | { type: 'toc'; entries: TocEntry[] }
  | { type: 'charts'; charts: Chart[]; startIndex: number };

// Add CSS animation for spinner
const spinnerStyle = document.createElement('style');
if (!document.querySelector('#spinner-animation')) {
  spinnerStyle.id = 'spinner-animation';
  spinnerStyle.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(spinnerStyle);
}

const ExportConfigurationModal: React.FC<ExportConfigurationModalProps> = ({
  config,
  charts,
  selectedChartIds,
  chartsWithAnalysis,
  chartThumbnails,
  analysisContentByChart,
  chartAIOptions,
  analysisAvailableCount,
  totalSelectedCount,
  isCapturingAssets,
  exportError,
  settings,
  onConfigChange,
  onLogoUpload,
  onLogoClear,
  onToggleChart,
  onSelectAllCharts,
  onClearAllCharts,
  onReorderCharts,
  onChartAIOptionsChange,
  onBack,
  onCancel,
  onGenerate
}) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'content' | 'branding'>('settings');
  const [settingsSubTab, setSettingsSubTab] = useState<'settings' | 'classification'>('settings');
  const [contentSubTab, setContentSubTab] = useState<'summary' | 'charts' | 'layout'>('charts');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isGeneratingExecutiveSummary, setIsGeneratingExecutiveSummary] = useState(false);

  // Note: Executive summary persistence is now handled by the parent component (SimpleDashboard)
  // The summary will persist across modal opens/closes via localStorage

  // Rich text editor functions
  const MAX_EXECUTIVE_SUMMARY_CHARS = 1500;
  const editorRef = useRef<HTMLDivElement>(null);
  const isInitialLoadRef = useRef(true);

  // Initialize editor content on mount or when content/subtab changes from external source
  useEffect(() => {
    if (!editorRef.current) return;

    // Only update when on summary tab
    if (contentSubTab !== 'summary') return;

    const currentEditorHTML = editorRef.current.innerHTML || '';

    // Clear editor if content is empty
    if (config.executiveSummaryContent === '') {
      editorRef.current.innerHTML = '';
      isInitialLoadRef.current = true;
      return;
    }

    // Update editor if:
    // 1. Initial load
    // 2. Content contains markdown (AI generated) - convert to HTML
    // 3. Editor HTML doesn't match stored HTML (external update)
    if (isInitialLoadRef.current) {
      // First load - check if content is markdown or HTML
      if (config.executiveSummaryContent.includes('**')) {
        // Markdown - convert to HTML
        const rendered = renderMarkdownForEditor(config.executiveSummaryContent);
        editorRef.current.innerHTML = rendered;
      } else {
        // Already HTML - use directly
        editorRef.current.innerHTML = config.executiveSummaryContent;
      }
      isInitialLoadRef.current = false;
    } else if (currentEditorHTML !== config.executiveSummaryContent) {
      // External update (from AI or storage) - update editor
      if (config.executiveSummaryContent.includes('**')) {
        const rendered = renderMarkdownForEditor(config.executiveSummaryContent);
        editorRef.current.innerHTML = rendered;
      } else {
        editorRef.current.innerHTML = config.executiveSummaryContent;
      }
    }
  }, [config.executiveSummaryContent, contentSubTab]);

  const handleEditorInput = (e: React.FormEvent<HTMLDivElement>) => {
    const htmlContent = e.currentTarget.innerHTML || '';
    const plainText = e.currentTarget.innerText || '';

    // Calculate effective length (newlines count as 100 chars)
    const effectiveLength = plainText.split('').reduce((count, char) => {
      return count + (char === '\n' ? 100 : 1);
    }, 0);

    // If over limit, revert to previous content
    if (effectiveLength > 3500) {
      return;
    }

    // Store HTML content (preserves formatting) and plain text (for character counting)
    onConfigChange({
      executiveSummaryContent: htmlContent,
      executiveSummaryPlainText: plainText
    });
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Handle formatting shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          document.execCommand('bold');
          return;
        case 'i':
          e.preventDefault();
          document.execCommand('italic');
          return;
      }
    }

    // Calculate current effective length
    const currentText = editorRef.current?.innerText || '';
    const effectiveLength = currentText.split('').reduce((count, char) => {
      return count + (char === '\n' ? 100 : 1);
    }, 0);

    // Allow backspace, delete, and navigation keys even if at limit
    const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];

    // Block input if at or over limit (except for allowed keys)
    if (effectiveLength >= 3500 && !allowedKeys.includes(e.key) && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      document.execCommand('insertLineBreak');
    }
  };

  // Render markdown for the editor (convert markdown to HTML for display)
  const renderMarkdownForEditor = (text: string) => {
    if (!text) return '';

    let html = text
      // Headers
      .replace(/^### (.*$)/gim, '<h3 style="font-size: 18px; font-weight: 600; margin: 8px 0; color: #1f2937;">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 style="font-size: 20px; font-weight: 600; margin: 10px 0; color: #1f2937;">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 style="font-size: 24px; font-weight: 700; margin: 12px 0; color: #111827;">$1</h1>')
      // Bold and Italic
      .replace(/\*\*\*(.*?)\*\*\*/g, '<strong style="font-weight: 700;"><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 600;">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Inline code
      .replace(/`(.*?)`/g, '<code style="background-color: #f3f4f6; padding: 2px 4px; border-radius: 3px; font-family: Monaco, monospace; font-size: 12px;">$1</code>')
      // Quotes
      .replace(/^> (.*$)/gim, '<blockquote style="margin: 8px 0; padding: 8px 16px; border-left: 4px solid #e5e7eb; background-color: #f9fafb; font-style: italic;">$1</blockquote>')
      // Lists - handle bullet points
      .replace(/^- (.*$)/gim, '<div style="margin: 2px 0;">• $1</div>')
      // Lists - handle numbered lists
      .replace(/^\d+\. (.*$)/gim, '<div style="margin: 2px 0;">$&</div>')
      // Line breaks
      .replace(/\n/g, '<br/>');

    return html;
  };

  // Simple markdown renderer for preview
  const renderMarkdown = (text: string) => {
    if (!text) return '';

    let html = text;

    // Process bold text FIRST (before any other replacements)
    html = html
      .replace(/\*\*\*(.*?)\*\*\*/g, '<strong style="font-weight: 700;"><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 700; color: #0f172a;">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Then process headers (they may now contain <strong> tags)
    html = html
      .replace(/^### (.*$)/gim, '<h3 style="font-size: 15px; font-weight: 700; margin: 18px 0 10px 0; color: #0f172a; padding-bottom: 6px; border-bottom: 1.5px solid #e5e7eb;">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 style="font-size: 16px; font-weight: 700; margin: 20px 0 12px 0; color: #0f172a; padding-bottom: 7px; border-bottom: 2px solid #e5e7eb;">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 style="font-size: 18px; font-weight: 700; margin: 0 0 14px 0; color: #111827; padding-bottom: 8px; border-bottom: 2px solid #cbd5e1;">$1</h1>');

    // Other markdown elements
    html = html
      .replace(/`(.*?)`/g, '<code style="background-color: #f3f4f6; padding: 2px 4px; border-radius: 3px; font-family: Monaco, monospace; font-size: 12px;">$1</code>')
      .replace(/^> (.*$)/gim, '<blockquote style="margin: 12px 0; padding: 8px 16px; border-left: 4px solid #e5e7eb; background-color: #f9fafb; font-style: italic;">$1</blockquote>')
      .replace(/^• (.*$)/gim, '<li style="margin: 3px 0; list-style-type: disc; margin-left: 20px;">$1</li>')
      .replace(/^- (.*$)/gim, '<li style="margin: 3px 0; list-style-type: disc; margin-left: 20px;">$1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li style="margin: 3px 0; list-style-type: decimal; margin-left: 20px;">$1</li>')
      // Line breaks - double newlines create more space
      .replace(/\n\n/g, '<div style="height: 14px;"></div>')
      .replace(/\n/g, '<br/>');

    // Wrap consecutive list items in ul/ol tags
    html = html.replace(/((<li[^>]*>.*?<\/li><br\/>)+)/g, (match) => {
      const hasNumbers = match.includes('list-style-type: decimal');
      const tag = hasNumbers ? 'ol' : 'ul';
      const listContent = match.replace(/<br\/>/g, '');
      return `<${tag} style="margin: 8px 0; padding-left: 20px;">${listContent}</${tag}>`;
    });

    return html;
  };

  const [expandedChartId, setExpandedChartId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Don't clear dragOverIndex here - let dragEnter handle it
    // This prevents flickering when moving between child elements
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      console.log('Reordering:', draggedIndex, '->', dropIndex);
      onReorderCharts(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Filter only selected charts for preview
  const selectedCharts = useMemo(() => {
    return charts.filter(chart => selectedChartIds.includes(chart.id));
  }, [charts, selectedChartIds]);

  const chunkedChartPages = useMemo(() => {
    if (!config.includeCharts || selectedCharts.length === 0) {
      return [] as Array<{ charts: Chart[]; startIndex: number }>;
    }

    const groups: Array<{ charts: Chart[]; startIndex: number }> = [];
    for (let i = 0; i < selectedCharts.length; i += chartsPerPage) {
      groups.push({
        charts: selectedCharts.slice(i, i + chartsPerPage),
        startIndex: i
      });
    }
    return groups;
  }, [config.includeCharts, selectedCharts]);

  const pages = useMemo<PreviewPage[]>(() => {
    const chartPages: PreviewPage[] = chunkedChartPages.map(group => ({
      type: 'charts' as const,
      charts: group.charts,
      startIndex: group.startIndex
    }));

    const entries: TocEntry[] = [{ title: 'Cover', pageNumber: 1 }];
    let pageCounter = 2;

    // TOC is now page 2
    const tocPageNumber = pageCounter;
    pageCounter++;

    // Add executive summary to TOC if enabled (now comes after TOC)
    if (config.includeExecutiveSummary) {
      entries.push({ title: 'Executive Summary', pageNumber: pageCounter });
      pageCounter++;
    }

    if (chartPages.length > 0) {
      chartPages.forEach((page, idx) => {
        const chartNames = page.charts
          .map(chart => chart.name || `Chart ${page.startIndex + 1}`)
          .join(', ');

        entries.push({
          title: chartNames,
          subtitle: undefined,
          pageNumber: pageCounter + idx
        });
      });
    } else {
      entries.push({ title: 'Report Overview', pageNumber: pageCounter });
    }

    const tocPage: PreviewPage = { type: 'toc', entries };
    const pages: PreviewPage[] = [{ type: 'cover' }];

    // Add table of contents first
    pages.push(tocPage);

    // Add executive summary page after TOC if enabled
    if (config.includeExecutiveSummary) {
      pages.push({ type: 'executive-summary' });
    }

    // Add chart pages last
    pages.push(...chartPages);
    return pages;
  }, [chunkedChartPages, config.includeExecutiveSummary, config.executiveSummaryContent]);

  const totalPages = pages.length;

  const handleInputChange = (
    field: keyof ExportReportConfig
  ) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.type === 'checkbox'
      ? (event.target as HTMLInputElement).checked
      : event.target.value;
    onConfigChange({ [field]: value } as Partial<ExportReportConfig>);
  };

  const handlePageSizeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onConfigChange({ pageSize: event.target.value as ExportReportConfig['pageSize'] });
  };

  const handleLogoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onLogoUpload(file);
    }
  };

  const includeAnalysisDisabled = analysisAvailableCount === 0;
  const primaryColor = config.primaryColor || '#3b82f6';
  const previewDimensions = getPreviewDimensions();

  const normalizeInsightText = (text: string) =>
    text.replace(/^(analysis|insights?)\s*[:\-]\s*/i, '').trim();

  const renderPageContent = (page: PreviewPage, pageIndex: number) => {
    switch (page.type) {
      case 'cover':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{
              flex: 1,
              padding: '72px 80px',
              background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}cc 100%)`,
              color: '#f8fafc',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <div style={{
                fontSize: '20px',
                fontWeight: 600,
                letterSpacing: '0.08em',
                color: 'rgba(248, 250, 252, 0.9)',
                fontFamily: 'Inter, "Segoe UI", sans-serif',
                marginBottom: '24px',
                textTransform: 'none'
              }}>
                {config.companyName || 'Your Company'}
              </div>
              <div style={{
                fontSize: '48px',
                fontWeight: 700,
                lineHeight: 1.08,
                marginBottom: '24px'
              }}>
                {config.reportTitle || 'Title'}
              </div>
              {config.description && (
                <div style={{
                  fontSize: '18px',
                  lineHeight: 1.6,
                  maxWidth: '70%',
                  opacity: 0.92
                }}>
                  {config.description}
                </div>
              )}
            </div>

          </div>
        );

      case 'toc':
        return (
          <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: '64px 72px',
            background: '#ffffff',
            overflow: 'hidden'
          }}>
            <div style={{ marginBottom: '36px' }}>
              <div style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.28em', color: primaryColor, fontWeight: 600 }}>
                Contents
              </div>
              <div style={{ fontSize: '36px', fontWeight: 700, color: '#0f172a', marginTop: '14px' }}>
                Table of Contents
              </div>
              <div style={{ fontSize: '16px', color: '#475569', marginTop: '14px', maxWidth: '520px' }}>
                Explore each section to review visual performance and AI commentary captured across your dashboards.
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {page.entries.map((entry, idx) => (
                <div
                  key={`${entry.title}-${idx}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 20px',
                    borderRadius: '10px',
                    background: idx % 2 === 0 ? 'rgba(148, 163, 184, 0.1)' : 'rgba(59, 130, 246, 0.06)',
                    border: '1px solid rgba(148, 163, 184, 0.2)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', letterSpacing: '0.06em' }}>
                      {String(idx + 1).padStart(2, '0')} • {entry.title}
                    </div>
                    {entry.subtitle && (
                      <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>
                        ({entry.subtitle})
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: primaryColor, marginLeft: '16px' }}>
                    {entry.pageNumber ?? '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'executive-summary':
        // Calculate summary statistics
        const totalCharts = selectedCharts.length;
        const totalDataPoints = selectedCharts.reduce((sum, chart) => {
          return sum + ((chart as any).data?.datasets?.[0]?.data?.length || 0);
        }, 0);
        const chartTypes = [...new Set(selectedCharts.map(chart =>
          (chart as any).configuration?.templateId || (chart as any).type || 'Unknown'
        ))];

        return (
          <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: '64px 72px',
            background: '#ffffff',
            overflow: 'hidden'
          }}>
            <div style={{ marginBottom: '36px' }}>
              <div style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.28em', color: primaryColor, fontWeight: 600 }}>
                Executive Summary
              </div>
              <div style={{ fontSize: '36px', fontWeight: 700, color: '#0f172a', marginTop: '14px' }}>
                Report Overview
              </div>
              <div style={{ fontSize: '16px', color: '#475569', marginTop: '14px', maxWidth: '520px' }}>
                Key insights and statistical overview of the data analysis performed.
              </div>
            </div>

            {/* Key Highlights Section */}
            {config.executiveHighlights && config.executiveHighlights.length > 0 && config.executiveHighlights.some(h => h.metric && h.label) && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '20px',
                marginBottom: '32px'
              }}>
                {config.executiveHighlights.filter(h => h.metric && h.label).map((highlight, idx) => {
                  // Different color scheme for each metric card - glassy/translucent style
                  const colorSchemes = [
                    {
                      bgColor: 'rgba(59, 130, 246, 0.08)',
                      borderColor: 'rgba(59, 130, 246, 0.3)',
                      metricColor: '#2563eb'
                    },
                    {
                      bgColor: 'rgba(168, 85, 247, 0.08)',
                      borderColor: 'rgba(168, 85, 247, 0.3)',
                      metricColor: '#9333ea'
                    },
                    {
                      bgColor: 'rgba(245, 158, 11, 0.08)',
                      borderColor: 'rgba(245, 158, 11, 0.3)',
                      metricColor: '#d97706'
                    }
                  ];

                  const colors = colorSchemes[idx % 3];

                  return (
                    <div key={idx} style={{
                      background: colors.bgColor,
                      borderRadius: '12px',
                      padding: '20px 16px',
                      border: `1.5px solid ${colors.borderColor}`,
                      textAlign: 'center'
                    }}>
                      <div style={{
                        fontSize: '32px',
                        fontWeight: 800,
                        color: colors.metricColor,
                        lineHeight: '32px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginBottom: '6px'
                      }}>
                        {highlight.metric}
                      </div>
                      <div style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        color: '#64748b',
                        lineHeight: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {highlight.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Executive Summary Content */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {config.executiveSummaryContent ? (
                <div
                  style={{
                    fontSize: '14px',
                    lineHeight: 1.6,
                    color: '#374151',
                    height: '100%',
                    overflow: 'hidden',
                    wordWrap: 'break-word',
                    paddingRight: '8px'
                  }}
                  dangerouslySetInnerHTML={{
                    __html: config.executiveSummaryContent.includes('**')
                      ? renderMarkdown(config.executiveSummaryContent)
                      : config.executiveSummaryContent
                  }}
                />
              ) : (
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                  color: '#6b7280',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  border: '1px dashed #d1d5db'
                }}>
                  <div style={{ fontSize: '16px', fontWeight: 500, marginBottom: '8px' }}>
                    No Executive Summary Generated
                  </div>
                  <div style={{ fontSize: '14px' }}>
                    Use the AI generation feature to create an executive summary based on your selected charts.
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'charts':
        return (
          <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: '20px 30px',
            background: '#ffffff',
            overflow: 'hidden'
          }}>
            {page.charts.map((chart, index) => {
              const thumbnail = chartThumbnails[chart.id];
              const analysis = analysisContentByChart[chart.id]?.trim();
              const aiOptions = chartAIOptions[chart.id] || {
                analysis: config.includeAIAnalysis,
                insights: config.includeAIInsights
              };

              // Use shared parsing utility for consistent analysis/insights separation
              const { analysisContent, insightsContent } = parseAnalysisContent(analysis || '');
              const chartPosition = page.startIndex + index + 1;

              // Normalize content by removing any header prefixes
              const narrativeParagraphs = analysisContent ? [normalizeInsightText(analysisContent)] : [];
              const bulletLines = insightsContent ? [normalizeInsightText(insightsContent)] : [];
              const includeAnalysisForChart = config.includeAnalysis && aiOptions.analysis;
              const includeInsightsForChart = config.includeAnalysis && aiOptions.insights;
              const shouldRenderAIContent = (includeAnalysisForChart && analysisContent) || (includeInsightsForChart && insightsContent);

              return (
                <div key={chart.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.22em', color: primaryColor, fontWeight: 600 }}>
                        Chart {chartPosition}
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                        {chart.name || 'Untitled Chart'}
                      </div>
                      <div style={{
                        marginTop: '4px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '10px',
                        fontWeight: 600,
                        color: '#0f172a',
                        background: 'rgba(59, 130, 246, 0.14)',
                        borderRadius: '999px',
                        padding: '4px 12px'
                      }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '999px', background: primaryColor }}></span>
                        {chart.type || 'Custom Visualization'}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    borderRadius: '12px',
                    background: '#ffffff',
                    padding: '0 12px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '250px',
                    flex: '0 0 auto',
                    position: 'relative'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      border: '2px solid #a855f7',
                      borderRadius: '12px',
                      boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.6)',
                      pointerEvents: 'none',
                      zIndex: 10
                    }}></div>
                    {thumbnail ? (
                      <img
                        src={thumbnail.dataUrl}
                        alt={`Visualization for ${chart.name || 'chart'}`}
                        style={{
                          maxWidth: '110%',
                          maxHeight: '110%',
                          objectFit: 'contain',
                          background: '#ffffff',
                          display: 'block',
                          position: 'relative',
                          zIndex: 1
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        color: '#94a3b8',
                        border: '1px dashed #cbd5e1',
                        borderRadius: '8px',
                        background: '#ffffff'
                      }}>
                        {isCapturingAssets ? 'Rendering chart preview…' : 'Chart preview not available'}
                      </div>
                    )}
                  </div>

                  {shouldRenderAIContent && (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      flex: '1 1 auto',
                      overflow: 'hidden'
                    }}>
                      {/* Analysis Block */}
                      {includeAnalysisForChart && analysisContent && (
                      <div style={{
                        background: 'linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%)',
                        borderRadius: '8px',
                        border: '1px solid #bfdbfe',
                        padding: '10px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}>
                        <div style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#1e40af',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          Analysis
                        </div>
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          fontSize: '12px',
                          color: '#1e3a8a',
                          lineHeight: 1.5
                        }}>
                          {narrativeParagraphs.map((text, idx) => (
                            <p key={idx} style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{text}</p>
                          ))}
                        </div>
                      </div>
                      )}

                      {/* Insights Block */}
                      {includeInsightsForChart && insightsContent && (
                      <div style={{
                        background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                        borderRadius: '8px',
                        border: '1px solid #bbf7d0',
                        padding: '10px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}>
                        <div style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#15803d',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          Insights
                        </div>
                        <div style={{
                          margin: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          fontSize: '12px',
                          color: '#166534',
                          lineHeight: 1.5
                        }}>
                          {bulletLines.map((line, idx) => (
                            <p key={idx} style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{line}</p>
                          ))}
                        </div>
                      </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.55)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '28px',
      zIndex: 1100
    }}>
      <div style={{
        width: 'min(1520px, 95vw)',
        height: '94vh',
        background: '#f1f5f9',
        borderRadius: '20px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 36px 72px rgba(15, 23, 42, 0.24)'
      }}>
        <div style={{
          padding: '12px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)',
          borderBottom: '1px solid #94a3b8'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>
              Configure Export Report
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#475569' }}>
              Customize layout, content, and branding.
            </p>
          </div>
          <button
            onClick={onCancel}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '22px',
              cursor: 'pointer',
              color: '#64748b'
            }}
            aria-label="Close export configuration"
          >
            ×
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 0.55fr) minmax(0, 0.45fr)',
          gap: '20px',
          padding: '20px',
          overflow: 'hidden',
          minHeight: 0,
          flex: 1
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            height: 'calc(94vh - 120px)',
            maxHeight: 'calc(94vh - 120px)'
          }}>
            <div style={{
              background: 'white',
              borderRadius: '18px',
              border: '2px solid #cbd5e1',
              padding: '22px',
              boxShadow: '0 22px 44px rgba(15, 23, 42, 0.2)',
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{
                background: '#334155',
                borderRadius: '14px',
                padding: '8px',
                boxShadow: 'inset 0 1px 3px rgba(15, 23, 42, 0.12)',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                flex: 1,
                overflow: 'hidden'
              }}>
                <div
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    padding: '16px 20px',
                    marginBottom: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '16px',
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#64748b #475569'
                  }}
                >
                  {pages.map((page, index) => (
                    <div
                      key={index}
                      style={{
                        width: previewDimensions.width,
                        height: previewDimensions.height,
                        flexShrink: 0,
                        position: 'relative',
                        overflow: 'visible'
                      }}
                    >
                      <div
                        data-report-page="true"
                        data-page-index={index}
                        style={{
                          width: pageDimensions.width,
                          height: pageDimensions.height,
                          background: '#ffffff',
                          borderRadius: '14px',
                          boxShadow: '0 14px 32px rgba(15, 23, 42, 0.12)',
                          display: 'flex',
                          flexDirection: 'column',
                          overflow: 'hidden',
                          transform: `scale(${previewDimensions.scale})`,
                          transformOrigin: 'top left',
                          position: 'absolute',
                          top: 0,
                          left: 0
                        }}
                      >
                      {/* Professional Header */}
                      <div style={{
                        padding: '16px 24px',
                        borderBottom: '1px solid #e5e7eb',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        minHeight: '60px'
                      }}>
                        {/* Logo + Company Name Left */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {config.logoDataUrl ? (
                            <img
                              src={config.logoDataUrl}
                              alt="Company Logo"
                              style={{
                                height: '32px',
                                width: 'auto',
                                maxWidth: '120px',
                                objectFit: 'contain'
                              }}
                            />
                          ) : (
                            <div style={{
                              height: '32px',
                              width: '80px',
                              background: '#f3f4f6',
                              border: '1px solid #d1d5db',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px',
                              color: '#6b7280'
                            }}>
                              Logo
                            </div>
                          )}

                        </div>

                        {/* Confidential Status Right */}
                        <div style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: config.confidentialStatus === 'Restricted' ? '#dc2626' :
                                config.confidentialStatus === 'Confidential' ? '#ea580c' :
                                config.confidentialStatus === 'Internal' ? '#059669' : '#6b7280',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          padding: '4px 8px',
                          border: `1px solid ${config.confidentialStatus === 'Restricted' ? '#dc2626' :
                                config.confidentialStatus === 'Confidential' ? '#ea580c' :
                                config.confidentialStatus === 'Internal' ? '#059669' : '#6b7280'}`,
                          borderRadius: '4px',
                          background: config.confidentialStatus === 'Restricted' ? '#fee2e2' :
                                config.confidentialStatus === 'Confidential' ? '#fed7aa' :
                                config.confidentialStatus === 'Internal' ? '#dcfce7' : '#f9fafb'
                        }}>
                          {config.confidentialStatus}
                        </div>
                      </div>

                      {/* Page Content */}
                      <div style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        minHeight: 0
                      }}>
                        {renderPageContent(page, index)}
                      </div>

                      {/* Professional Footer */}
                      <div style={{
                        padding: '12px 24px',
                        borderTop: '1px solid #e5e7eb',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '11px',
                        color: '#6b7280',
                        minHeight: '40px',
                        background: '#fafbfc'
                      }}>
                        {/* Prepared Date Left */}
                        <div>
                          Prepared on {new Date(config.reportDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>

                        {/* Page Number Right */}
                        <div style={{ fontWeight: 500 }}>
                          Page {index + 1} of {totalPages}
                        </div>
                      </div>
                      </div>
                    </div>
                  ))}
                </div>

                {exportError && (
                  <div style={{
                    marginTop: '12px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: '#fee2e2',
                    color: '#b91c1c',
                    border: '1px solid #fecaca',
                    fontSize: '13px'
                  }}>
                    {exportError}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            height: 'calc(94vh - 120px)',
            maxHeight: 'calc(94vh - 120px)',
            gap: '0px'
          }}>
            {/* Configuration Panel - TOP ELEMENT */}
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              background: 'white',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              marginBottom: '12px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
            }}>
              {/* Tab Navigation */}
              <div style={{
                display: 'flex',
                borderBottom: '1px solid #e5e7eb',
                marginBottom: '16px',
                paddingTop: '12px',
                paddingLeft: '16px',
                paddingRight: '16px',
                background: '#f8fafc'
              }}>
                {[
                  { key: 'settings', label: 'Report Settings' },
                  { key: 'content', label: 'Content' },
                  { key: 'branding', label: 'Branding' }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    style={{
                      padding: '8px 16px',
                      border: 'none',
                      background: activeTab === tab.key
                        ? 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)'
                        : 'transparent',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: activeTab === tab.key ? '#ffffff' : '#6b7280',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      borderRadius: '6px',
                      margin: '6px'
                    }}
                    onMouseEnter={(e) => {
                      if (activeTab !== tab.key) {
                        e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                        e.currentTarget.style.color = '#3b82f6';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeTab !== tab.key) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#6b7280';
                      }
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Scrollable content area */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                paddingLeft: '16px',
                paddingRight: '24px',
                paddingBottom: '16px',
                paddingTop: '4px',
                scrollbarWidth: 'thin',
                scrollbarColor: '#94a3b8 transparent'
              }}>

            {/* Report Settings Tab */}
            {activeTab === 'settings' && (
              <div>
                {/* Settings Sub-tabs */}
                <div style={{
                  display: 'flex',
                  borderBottom: '1px solid #e2e8f0',
                  marginBottom: '8px',
                  marginTop: '-8px'
                }}>
                  {[
                    { key: 'settings', label: 'Settings' },
                    { key: 'classification', label: 'Classification' }
                  ].map((subTab) => (
                    <button
                      key={subTab.key}
                      onClick={() => setSettingsSubTab(subTab.key as any)}
                      style={{
                        padding: '8px 16px',
                        border: 'none',
                        background: 'transparent',
                        fontSize: '12px',
                        fontWeight: 500,
                        color: settingsSubTab === subTab.key ? '#3b82f6' : '#6b7280',
                        borderBottom: settingsSubTab === subTab.key ? '2px solid #3b82f6' : '2px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (settingsSubTab !== subTab.key) {
                          e.currentTarget.style.color = '#374151';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (settingsSubTab !== subTab.key) {
                          e.currentTarget.style.color = '#6b7280';
                        }
                      }}
                    >
                      {subTab.label}
                    </button>
                  ))}
                </div>

                {/* Settings Sub-tab Content */}
                {settingsSubTab === 'settings' && (
                  <div style={cardContainerStyle}>
                    <div style={cardTitleStyle}>Basic Settings</div>
              <label style={{...fieldLabelStyle, marginTop: '0px'}} htmlFor="report-title-input">Report Title</label>
              <input
                id="report-title-input"
                type="text"
                value={config.reportTitle}
                onChange={handleInputChange('reportTitle')}
                style={textInputStyle}
                placeholder="Title"
              />

              <label style={{ ...fieldLabelStyle, marginTop: '8px' }} htmlFor="report-description-input">
                Description
              </label>
              <textarea
                id="report-description-input"
                value={config.description}
                onChange={handleInputChange('description')}
                style={textareaStyle}
                placeholder="Brief overview of the report content..."
              />

              {/* Date and Classification Row */}
              <label style={{ ...fieldLabelStyle, marginTop: '8px' }} htmlFor="report-date-input">
                Report Date
              </label>
              <input
                id="report-date-input"
                type="date"
                value={config.reportDate}
                onChange={handleInputChange('reportDate')}
                style={{
                  ...textInputStyle,
                  width: '100%',
                  fontFamily: 'system-ui, -apple-system, sans-serif'
                }}
              />

                  </div>
                )}

                {/* Classification Sub-tab Content */}
                {settingsSubTab === 'classification' && (
                  <div style={cardContainerStyle}>
                    <div style={cardTitleStyle}>Security Classification</div>
                    <label style={{ ...fieldLabelStyle, marginTop: '0px' }}>
                      Classification Level
                    </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  {
                    value: 'Public',
                    label: 'Public',
                    description: 'No restrictions • Suitable for public distribution',
                    color: '#6b7280',
                    bg: '#f9fafb'
                  },
                  {
                    value: 'Internal',
                    label: 'Internal Use Only',
                    description: 'Company personnel only • Not for external sharing',
                    color: '#059669',
                    bg: '#dcfce7'
                  },
                  {
                    value: 'Confidential',
                    label: 'Confidential',
                    description: 'Authorized personnel • Sensitive business information',
                    color: '#ea580c',
                    bg: '#fed7aa'
                  },
                  {
                    value: 'Restricted',
                    label: 'Restricted',
                    description: 'Highly restricted • Critical security clearance required',
                    color: '#dc2626',
                    bg: '#fee2e2'
                  }
                ].map((level) => {
                  const isSelected = config.confidentialStatus === level.value;
                  return (
                    <button
                      key={level.value}
                      type="button"
                      onClick={() => onConfigChange({ confidentialStatus: level.value as ConfidentialStatus })}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: isSelected ? `2px solid ${level.color}` : '2px solid transparent',
                        background: isSelected ? level.bg : '#f9fafb',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        textAlign: 'left'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = '#f3f4f6';
                          e.currentTarget.style.borderColor = '#e5e7eb';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = '#f9fafb';
                          e.currentTarget.style.borderColor = 'transparent';
                        }
                      }}
                    >
                      <div style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: isSelected ? level.color : '#1f2937',
                        marginBottom: '2px'
                      }}>
                        {level.label}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: isSelected ? level.color : '#6b7280',
                        lineHeight: 1.4,
                        opacity: isSelected ? 0.9 : 0.8
                      }}>
                        {level.description}
                      </div>
                    </button>
                  );
                })}
              </div>
                  </div>
                )}
              </div>
            )}

            {/* Content Tab */}
            {activeTab === 'content' && (
              <div>
                {/* Content Sub-tabs */}
                <div style={{
                  display: 'flex',
                  borderBottom: '1px solid #e2e8f0',
                  marginBottom: '8px',
                  marginTop: '-8px'
                }}>
                  {[
                    { key: 'summary', label: 'Executive Summary' },
                    { key: 'charts', label: 'Charts' },
                    { key: 'layout', label: 'Layout' }
                  ].map((subTab) => (
                    <button
                      key={subTab.key}
                      onClick={() => setContentSubTab(subTab.key as any)}
                      style={{
                        padding: '8px 16px',
                        border: 'none',
                        background: 'transparent',
                        fontSize: '12px',
                        fontWeight: 500,
                        color: contentSubTab === subTab.key ? '#3b82f6' : '#6b7280',
                        borderBottom: contentSubTab === subTab.key ? '2px solid #3b82f6' : '2px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (contentSubTab !== subTab.key) {
                          e.currentTarget.style.color = '#374151';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (contentSubTab !== subTab.key) {
                          e.currentTarget.style.color = '#6b7280';
                        }
                      }}
                    >
                      {subTab.label}
                    </button>
                  ))}
                </div>

                {/* Executive Summary Sub-tab Content */}
                {contentSubTab === 'summary' && (
                  <div style={cardContainerStyle}>
                    <div style={cardTitleStyle}>Executive Summary</div>

                    {/* Include Executive Summary Toggle */}
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '13px',
                      cursor: 'pointer',
                      marginBottom: '16px'
                    }}>
                      <input
                        type="checkbox"
                        checked={config.includeExecutiveSummary}
                        onChange={handleInputChange('includeExecutiveSummary')}
                        style={{
                          width: '16px',
                          height: '16px',
                          accentColor: '#3b82f6'
                        }}
                      />
                      Include Executive Summary in Report
                    </label>

                    {config.includeExecutiveSummary && (
                      <>
                        {/* AI Generation Controls */}
                        <div style={{ marginBottom: '16px' }}>
                          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                            <button
                              disabled={isGeneratingExecutiveSummary}
                              onClick={async () => {
                                // Clear existing content before starting
                                onConfigChange({
                                  executiveSummaryContent: '',
                                  executiveHighlights: []
                                });

                                // Also clear the editor directly
                                if (editorRef.current) {
                                  editorRef.current.innerHTML = '';
                                }

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
                                  // Merge analysis/insights data into charts
                                  const chartsWithAnalysis = selectedCharts.map(chart => {
                                    const analysisText = analysisContentByChart[chart.id] || '';
                                    const parts = analysisText.split('INSIGHTS:');
                                    const analysis = parts[0]?.replace('ANALYSIS:', '').trim() || '';
                                    const insights = parts[1]?.trim() || '';
                                    return {
                                      ...chart,
                                      analysis: analysis || undefined,
                                      insights: insights || undefined
                                    };
                                  });

                                  const result = await client.generateExecutiveSummary(
                                    chartsWithAnalysis,
                                    { name: config.reportTitle },
                                    config
                                  );
                                  onConfigChange({
                                    executiveSummaryContent: result.summary,
                                    executiveHighlights: result.highlights
                                  });
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
                                fontWeight: 500,
                                cursor: isGeneratingExecutiveSummary ? 'not-allowed' : 'pointer',
                                opacity: isGeneratingExecutiveSummary ? 0.6 : 1,
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                if (!isGeneratingExecutiveSummary) {
                                  e.currentTarget.style.transform = 'translateY(-1px)';
                                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isGeneratingExecutiveSummary) {
                                  e.currentTarget.style.transform = 'translateY(0)';
                                  e.currentTarget.style.boxShadow = 'none';
                                }
                              }}
                            >
                              {isGeneratingExecutiveSummary ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  Generating...
                                </div>
                              ) : (
                                'Generate'
                              )}
                            </button>

                            {config.executiveSummaryContent && (
                              <button
                                onClick={() => onConfigChange({
                                  executiveSummaryContent: '',
                                  executiveHighlights: []
                                })}
                                style={{
                                  padding: '8px 16px',
                                  border: '1px solid #d1d5db',
                                  background: '#ffffff',
                                  color: '#6b7280',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.borderColor = '#ef4444';
                                  e.currentTarget.style.color = '#ef4444';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.borderColor = '#d1d5db';
                                  e.currentTarget.style.color = '#6b7280';
                                }}
                              >
                                Clear
                              </button>
                            )}
                          </div>

                          <div style={{ fontSize: '11px', color: '#6b7280' }}>
                            AI will analyze your selected charts ({selectedCharts.length} charts) to generate a comprehensive executive summary.
                          </div>
                        </div>

                        {/* Executive Summary Rich Text Editor */}
                        <div>
                          <label style={{...fieldLabelStyle, marginTop: '0px'}}>
                            Executive Summary Content
                          </label>

                          {isGeneratingExecutiveSummary ? (
                            // Loading overlay for the editor
                            <div style={{
                              ...textareaStyle,
                              minHeight: '200px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: '#f9fafb',
                              border: '2px dashed #d1d5db',
                              position: 'relative'
                            }}>
                              <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '12px',
                                color: '#6b7280'
                              }}>
                                <div style={{
                                  width: '24px',
                                  height: '24px',
                                  border: '3px solid #d1d5db',
                                  borderTop: '3px solid #3b82f6',
                                  borderRadius: '50%',
                                  animation: 'spin 1s linear infinite'
                                }} />
                                <div style={{ fontSize: '14px', fontWeight: 500 }}>
                                  Generating executive summary...
                                </div>
                                <div style={{ fontSize: '12px', textAlign: 'center', maxWidth: '250px' }}>
                                  AI is analyzing your selected charts to create a comprehensive summary
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div
                              ref={editorRef}
                              contentEditable
                              suppressContentEditableWarning
                              onInput={handleEditorInput}
                              onKeyDown={handleEditorKeyDown}
                              style={{
                                ...textareaStyle,
                                minHeight: '200px',
                                fontFamily: 'system-ui, -apple-system, sans-serif',
                                fontSize: '14px',
                                lineHeight: '1.6',
                                padding: '12px',
                                whiteSpace: 'pre-wrap',
                                wordWrap: 'break-word',
                                overflow: 'auto'
                              }}
                              data-placeholder="Enter executive summary content or use AI generation..."
                            />
                          )}
                          <div style={{
                            fontSize: '11px',
                            color: '#6b7280',
                            marginTop: '4px',
                            display: 'flex',
                            justifyContent: 'space-between'
                          }}>
                            <span style={{
                              color: (() => {
                                const plainText = config.executiveSummaryPlainText || config.executiveSummaryContent || '';
                                const effectiveLength = plainText.split('').reduce((count, char) => {
                                  return count + (char === '\n' ? 100 : 1);
                                }, 0);
                                return effectiveLength > 3500 * 0.9
                                  ? '#ef4444'
                                  : effectiveLength > 3500 * 0.8
                                    ? '#f59e0b'
                                    : '#6b7280';
                              })()
                            }}>
                              {(() => {
                                const plainText = config.executiveSummaryPlainText || config.executiveSummaryContent || '';
                                const effectiveLength = plainText.split('').reduce((count, char) => {
                                  return count + (char === '\n' ? 100 : 1);
                                }, 0);
                                return `${effectiveLength} / 3500 characters`;
                              })()}
                              {(() => {
                                const plainText = config.executiveSummaryPlainText || config.executiveSummaryContent || '';
                                const effectiveLength = plainText.split('').reduce((count, char) => {
                                  return count + (char === '\n' ? 100 : 1);
                                }, 0);
                                return effectiveLength >= 3500 ? ' (limit reached)' : '';
                              })()}
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Charts Sub-tab Content */}
                {contentSubTab === 'charts' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Chart Selection & AI Content */}
                <div style={cardContainerStyle}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px'
                  }}>
                    <div style={cardTitleStyle}>Chart Selection & AI Content</div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={onSelectAllCharts}
                        style={{
                          border: '1px solid #e2e8f0',
                          background: 'white',
                          color: '#64748b',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          fontSize: '12px',
                          fontWeight: 500,
                          cursor: 'pointer'
                        }}
                      >
                        Select All
                      </button>
                      <button
                        onClick={onClearAllCharts}
                        style={{
                          border: '1px solid #e2e8f0',
                          background: 'white',
                          color: '#64748b',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          fontSize: '12px',
                          fontWeight: 500,
                          cursor: 'pointer'
                        }}
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div style={{
                    fontSize: '11px',
                    color: '#6b7280',
                    marginBottom: '8px',
                    fontStyle: 'italic'
                  }}>
                    Drag and drop charts to reorder them in the report
                  </div>

                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    padding: '2px'
                  }}>
                    {charts.map((chart, index) => {
                    const selected = selectedChartIds.includes(chart.id);
                    const hasAnalysis = chartsWithAnalysis.has(chart.id);
                    const thumbnail = chartThumbnails[chart.id];
                    const isDragging = draggedIndex === index;
                    const isDraggedOver = dragOverIndex === index;
                    const aiOptions = chartAIOptions[chart.id] || {
                      analysis: config.includeAIAnalysis,
                      insights: config.includeAIInsights
                    };
                    const aiControlsDisabled = !config.includeAnalysis;

                    return (
                      <div key={chart.id} style={{ position: 'relative' }}>
                        {/* Drop indicator above - show when dragging from below */}
                        {isDraggedOver && draggedIndex !== null && draggedIndex > index && (
                          <div style={{
                            position: 'absolute',
                            top: '-6px',
                            left: 0,
                            right: 0,
                            height: '3px',
                            background: '#3b82f6',
                            borderRadius: '2px',
                            zIndex: 10,
                            boxShadow: '0 0 8px rgba(59, 130, 246, 0.5)'
                          }} />
                        )}

                        <div
                          draggable
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragEnter={(e) => handleDragEnter(e, index)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, index)}
                          onDragEnd={handleDragEnd}
                          style={{
                            borderRadius: '8px',
                            border: selected ? '2px solid #34d399' : '1px solid #e5e7eb',
                            background: isDragging ? 'rgba(59, 130, 246, 0.1)' : selected ? 'rgba(16, 185, 129, 0.04)' : 'white',
                            overflow: 'hidden',
                            transition: 'all 0.1s ease',
                            opacity: isDragging ? 0.5 : 1,
                            cursor: 'move'
                          }}
                        >
                        {/* Chart Header */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '12px',
                            background: selected ? 'rgba(16, 185, 129, 0.06)' : '#fafbfc'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => onToggleChart(chart.id)}
                            style={{
                              width: '18px',
                              height: '18px',
                              cursor: 'pointer',
                              flexShrink: 0
                            }}
                          />

                          <div style={{ flex: 1 }}>
                            <div style={{
                              fontSize: '13px',
                              fontWeight: 600,
                              color: '#0f172a'
                            }}>
                              {chart.name || 'Untitled Chart'}
                            </div>
                          </div>

                          <span style={{
                            borderRadius: '999px',
                            padding: '4px 10px',
                            fontSize: '10px',
                            fontWeight: 600,
                            color: chart.type?.toLowerCase() === 'bar' ? '#3b82f6' : chart.type?.toLowerCase() === 'pie' ? '#f59e0b' : '#6b7280',
                            background: chart.type?.toLowerCase() === 'bar' ? '#dbeafe' : chart.type?.toLowerCase() === 'pie' ? '#fef3c7' : '#f3f4f6',
                            border: `1px solid ${chart.type?.toLowerCase() === 'bar' ? '#93c5fd' : chart.type?.toLowerCase() === 'pie' ? '#fcd34d' : '#e5e7eb'}`,
                            whiteSpace: 'nowrap',
                            textTransform: 'uppercase'
                          }}>
                            {chart.type || 'Chart'}
                          </span>
                        </div>

                        {/* AI Content Options - Only show if selected and has analysis */}
                        {selected && hasAnalysis && (
                          <div style={{
                            borderTop: '1px solid #e5e7eb',
                            background: '#f0f9ff'
                          }}>
                            {/* Expandable Header */}
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedChartId(expandedChartId === chart.id ? null : chart.id);
                              }}
                              style={{
                                padding: '10px 12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                cursor: 'pointer',
                                transition: 'background 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#dbeafe';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                              }}
                            >
                              <div style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                color: '#1e40af',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                              }}>
                                AI Content Options
                              </div>
                              <div style={{
                                fontSize: '12px',
                                color: '#1e40af',
                                transform: expandedChartId === chart.id ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s ease'
                              }}>
                                ▼
                              </div>
                            </div>

                            {/* Expandable Content */}
                            {expandedChartId === chart.id && (
                              <div style={{
                                padding: '12px'
                              }}>
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontSize: '12px',
                                    color: '#0f172a',
                                    marginBottom: '6px'
                                  }}
                                >
                                  <div
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (aiControlsDisabled) return;
                                      onChartAIOptionsChange(chart.id, { analysis: !aiOptions.analysis });
                                    }}
                                    style={{
                                      width: '32px',
                                      height: '18px',
                                      borderRadius: '9px',
                                      background: aiOptions.analysis ? '#10b981' : '#d1d5db',
                                      position: 'relative',
                                      cursor: aiControlsDisabled ? 'not-allowed' : 'pointer',
                                      transition: 'background 0.2s ease',
                                      flexShrink: 0,
                                      opacity: aiControlsDisabled ? 0.5 : 1
                                    }}
                                  >
                                    <div
                                      style={{
                                        width: '14px',
                                        height: '14px',
                                        borderRadius: '50%',
                                        background: 'white',
                                        position: 'absolute',
                                        top: '2px',
                                        left: aiOptions.analysis ? '16px' : '2px',
                                        transition: 'left 0.2s ease',
                                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
                                      }}
                                    />
                                  </div>
                                  <span style={{ fontWeight: 500, opacity: aiControlsDisabled ? 0.6 : 1 }}>Detailed Analysis</span>
                                </div>

                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontSize: '12px',
                                    color: '#0f172a'
                                  }}
                                >
                                  <div
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (aiControlsDisabled) return;
                                      onChartAIOptionsChange(chart.id, { insights: !aiOptions.insights });
                                    }}
                                    style={{
                                      width: '32px',
                                      height: '18px',
                                      borderRadius: '9px',
                                      background: aiOptions.insights ? '#10b981' : '#d1d5db',
                                      position: 'relative',
                                      cursor: aiControlsDisabled ? 'not-allowed' : 'pointer',
                                      transition: 'background 0.2s ease',
                                      flexShrink: 0,
                                      opacity: aiControlsDisabled ? 0.5 : 1
                                    }}
                                  >
                                    <div
                                      style={{
                                        width: '14px',
                                        height: '14px',
                                        borderRadius: '50%',
                                        background: 'white',
                                        position: 'absolute',
                                        top: '2px',
                                        left: aiOptions.insights ? '16px' : '2px',
                                        transition: 'left 0.2s ease',
                                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
                                      }}
                                    />
                                  </div>
                                  <span style={{ fontWeight: 500, opacity: aiControlsDisabled ? 0.6 : 1 }}>Key Insights</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* No AI Content Available Message */}
                        {selected && !hasAnalysis && (
                          <div style={{
                            padding: '10px 12px',
                            borderTop: '1px solid #e5e7eb',
                            background: '#fafafa'
                          }}>
                            <div style={{
                              fontSize: '11px',
                              color: '#6b7280',
                              fontStyle: 'italic'
                            }}>
                              No AI-generated content available for this chart
                            </div>
                          </div>
                        )}
                        </div>

                        {/* Drop indicator below - show when dragging from above */}
                        {isDraggedOver && draggedIndex !== null && draggedIndex < index && (
                          <div style={{
                            position: 'absolute',
                            bottom: '-6px',
                            left: 0,
                            right: 0,
                            height: '3px',
                            background: '#3b82f6',
                            borderRadius: '2px',
                            zIndex: 10,
                            boxShadow: '0 0 8px rgba(59, 130, 246, 0.5)'
                          }} />
                        )}
                      </div>
                    );
                  })}
                </div>

                <div style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  marginTop: '12px',
                  padding: '8px 10px',
                  background: '#f9fafb',
                  borderRadius: '6px',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <span>{selectedChartIds.length} of {charts.length} charts selected</span>
                  <span>{analysisAvailableCount} with AI content</span>
                </div>
              </div>

                  </div>
                )}

                {/* Layout Sub-tab Content */}
                {contentSubTab === 'layout' && (
                  <div style={cardContainerStyle}>
                    <div style={cardTitleStyle}>Page Layout Options</div>

                <label style={{...fieldLabelStyle, marginTop: '0px'}} htmlFor="page-size-select">
                  Page Size
                </label>
                <select
                  id="page-size-select"
                  value={config.pageSize}
                  onChange={handlePageSizeChange}
                  style={{
                    ...textInputStyle,
                    width: 'auto',
                    padding: '8px 32px 8px 12px',
                    cursor: 'pointer'
                  }}
                >
                  <option value="A4">A4</option>
                  <option value="Letter">Letter</option>
                </select>
                  </div>
                )}
              </div>
            )}

            {/* Branding Tab */}
            {activeTab === 'branding' && (
              <div style={cardContainerStyle}>
                <div style={cardTitleStyle}>Branding</div>
              <label style={{...fieldLabelStyle, marginTop: '0px'}} htmlFor="company-name-input">Company Name</label>
              <input
                id="company-name-input"
                type="text"
                value={config.companyName}
                onChange={handleInputChange('companyName')}
                style={textInputStyle}
                placeholder="Your Company"
              />

              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '18px',
                marginTop: '12px'
              }}>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  minWidth: '160px'
                }}>
                  <label style={{ ...fieldLabelStyle, marginTop: '0px' }} htmlFor="primary-color-input">
                    Cover Accent Colour
                  </label>
                  <input
                    id="primary-color-input"
                    type="color"
                    value={config.primaryColor}
                    onChange={handleInputChange('primaryColor')}
                    style={{
                      width: '56px',
                      height: '36px',
                      border: 'none',
                      borderRadius: '8px',
                      padding: 0,
                      cursor: 'pointer',
                      background: 'transparent'
                    }}
                    aria-label="Select cover accent colour"
                  />
                </div>
                <div style={{
                  flex: '1 1 260px',
                  minWidth: '200px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <label style={{ ...fieldLabelStyle, marginTop: '0px' }}>
                    Logo Upload
                  </label>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <label
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#ecfeff',
                        color: '#0e7490',
                        border: '1px solid #67e8f9',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 500
                      }}
                    >
                      Upload Logo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        style={{ display: 'none' }}
                      />
                    </label>
                    {config.logoDataUrl && (
                      <button
                        onClick={onLogoClear}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#ef4444',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  {config.logoFileName && (
                    <div style={{
                      fontSize: '12px',
                      color: '#64748b'
                    }}>
                      {config.logoFileName}
                    </div>
                  )}
                </div>
              </div>
              </div>
            )}
              </div>
            </div>

            {/* Generate Report Button - BOTTOM ELEMENT - COMPLETELY SEPARATE */}
            <div style={{
              flexShrink: 0,
              padding: '8px 0px'
            }}>
              <button
                onClick={onGenerate}
                disabled={isCapturingAssets || totalSelectedCount === 0 || isGeneratingExecutiveSummary}
                style={{
                  width: '100%',
                  background: isCapturingAssets || totalSelectedCount === 0 || isGeneratingExecutiveSummary
                    ? '#a7f3d0'
                    : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  color: isCapturingAssets || totalSelectedCount === 0 || isGeneratingExecutiveSummary ? '#166534' : 'white',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: isCapturingAssets || totalSelectedCount === 0 || isGeneratingExecutiveSummary ? 'not-allowed' : 'pointer',
                  boxShadow: isCapturingAssets || totalSelectedCount === 0 || isGeneratingExecutiveSummary
                    ? 'none'
                    : '0 4px 12px rgba(22, 163, 74, 0.25), 0 2px 4px rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (!isCapturingAssets && totalSelectedCount > 0 && !isGeneratingExecutiveSummary) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(22, 163, 74, 0.3), 0 2px 4px rgba(0, 0, 0, 0.08)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isCapturingAssets && totalSelectedCount > 0 && !isGeneratingExecutiveSummary) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)';
                    e.currentTarget.style.transform = 'translateY(0px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(22, 163, 74, 0.25), 0 2px 4px rgba(0, 0, 0, 0.05)';
                  }
                }}
              >
                {isCapturingAssets ? 'Preparing…' : 'Generate Report'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportConfigurationModal;
