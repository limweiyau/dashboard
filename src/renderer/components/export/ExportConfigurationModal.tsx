import React, { ChangeEvent, useMemo } from 'react';
import { Chart } from '../../types';
import { ExportReportConfig } from './types';

interface ExportConfigurationModalProps {
  config: ExportReportConfig;
  charts: Chart[];
  chartThumbnails: Record<string, { dataUrl: string; capturedAt: number }>;
  analysisContentByChart: Record<string, string>;
  analysisAvailableCount: number;
  totalSelectedCount: number;
  isCapturingAssets: boolean;
  exportError: string | null;
  onConfigChange: (updates: Partial<ExportReportConfig>) => void;
  onLogoUpload: (file: File) => void;
  onLogoClear: () => void;
  onBack: () => void;
  onCancel: () => void;
  onGenerate: () => void;
}

const cardTitleStyle: React.CSSProperties = {
  fontSize: '15px',
  fontWeight: 600,
  color: '#0f172a',
  marginBottom: '10px'
};

const cardContainerStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  padding: '16px',
  marginBottom: '16px',
  boxShadow: '0 10px 24px rgba(15, 23, 42, 0.08)'
};

const fieldLabelStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 600,
  color: '#475569',
  marginBottom: '6px',
  display: 'block'
};

const textInputStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: '8px',
  border: '1px solid #cbd5f5',
  padding: '10px 12px',
  fontSize: '13px',
  color: '#0f172a',
  outline: 'none'
};

const textareaStyle: React.CSSProperties = {
  ...textInputStyle,
  minHeight: '96px',
  resize: 'vertical'
};

const disabledCheckboxLabelStyle: React.CSSProperties = {
  color: '#94a3b8',
  cursor: 'not-allowed'
};

const chartsPerPage = 1;
const pageDimensions = { width: 600, height: 900 };

type TocEntry = {
  title: string;
  subtitle?: string;
  pageNumber?: number;
};

type PreviewPage =
  | { type: 'cover' }
  | { type: 'toc'; entries: TocEntry[] }
  | { type: 'charts'; charts: Chart[]; startIndex: number };

const ExportConfigurationModal: React.FC<ExportConfigurationModalProps> = ({
  config,
  charts,
  chartThumbnails,
  analysisContentByChart,
  analysisAvailableCount,
  totalSelectedCount,
  isCapturingAssets,
  exportError,
  onConfigChange,
  onLogoUpload,
  onLogoClear,
  onBack,
  onCancel,
  onGenerate
}) => {
  const chunkedChartPages = useMemo(() => {
    if (!config.includeCharts || charts.length === 0) {
      return [] as Array<{ charts: Chart[]; startIndex: number }>;
    }

    const groups: Array<{ charts: Chart[]; startIndex: number }> = [];
    for (let i = 0; i < charts.length; i += chartsPerPage) {
      groups.push({
        charts: charts.slice(i, i + chartsPerPage),
        startIndex: i
      });
    }
    return groups;
  }, [config.includeCharts, charts]);

  const pages = useMemo<PreviewPage[]>(() => {
    const chartPages: PreviewPage[] = chunkedChartPages.map(group => ({
      type: 'charts' as const,
      charts: group.charts,
      startIndex: group.startIndex
    }));

    const entries: TocEntry[] = [{ title: 'Cover', pageNumber: 1 }];

    if (chartPages.length > 0) {
      chartPages.forEach((page, idx) => {
        const chartNames = page.charts
          .map(chart => chart.name || `Chart ${page.startIndex + 1}`)
          .join(', ');
        const chartTypes = page.charts
          .map(chart => (chart.type ? chart.type.toUpperCase() : 'CHART'))
          .join(' • ');

        entries.push({
          title: chartNames,
          subtitle: chartTypes,
          pageNumber: idx + 3
        });
      });
    } else {
      entries.push({ title: 'Report Overview', pageNumber: 2 });
    }

    const tocPage: PreviewPage = { type: 'toc', entries };
    return [{ type: 'cover' }, tocPage, ...chartPages];
  }, [chunkedChartPages]);

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
              background: `linear-gradient(135deg, ${primaryColor} 0%, rgba(14, 116, 144, 0.85) 100%)`,
              color: '#f8fafc',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              {config.logoDataUrl ? (
                <div style={{ marginBottom: '32px' }}>
                  <img
                    src={config.logoDataUrl}
                    alt="Company logo"
                    style={{ width: '84px', height: '84px', objectFit: 'contain', borderRadius: '18px', background: 'rgba(255,255,255,0.18)', padding: '12px' }}
                  />
                </div>
              ) : (
                <div style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '16px',
                  background: 'rgba(255,255,255,0.16)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  marginBottom: '32px'
                }}>
                  🏢
                </div>
              )}
              <div style={{
                fontSize: '18px',
                textTransform: 'uppercase',
                letterSpacing: '0.25em',
                fontWeight: 600,
                opacity: 0.75,
                marginBottom: '28px'
              }}>
                {config.companyName || 'Your Company'}
              </div>
              <div style={{
                fontSize: '48px',
                fontWeight: 700,
                lineHeight: 1.08,
                marginBottom: '24px'
              }}>
                {config.reportTitle || 'Analytics Report'}
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

            <div style={{
              padding: '26px 72px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#ffffff'
            }}>
              <div style={{ fontSize: '14px', color: '#475569' }}>Prepared on {config.reportDate || '—'}</div>
              <div style={{ fontSize: '13px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.24em' }}>
                {config.footerText || 'Confidential'}
              </div>
            </div>
          </div>
        );

      case 'toc':
        return (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: '64px 72px',
            background: '#ffffff'
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {page.entries.map((entry, idx) => (
                <div
                  key={`${entry.title}-${idx}`}
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    padding: '16px 22px',
                    borderRadius: '14px',
                    background: idx % 2 === 0 ? 'rgba(148, 163, 184, 0.12)' : 'rgba(59, 130, 246, 0.08)',
                    border: '1px solid rgba(148, 163, 184, 0.25)'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', letterSpacing: '0.08em' }}>
                      {String(idx + 1).padStart(2, '0')} • {entry.title}
                    </div>
                    {entry.subtitle && (
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{entry.subtitle}</div>
                    )}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: primaryColor }}>
                    {entry.pageNumber ?? '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'charts':
        return (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: '36px 52px 44px',
            background: '#ffffff',
            gap: '26px'
          }}>
            {page.charts.map((chart, index) => {
              const thumbnail = chartThumbnails[chart.id];
              const analysis = analysisContentByChart[chart.id]?.trim();
              // Split on double line breaks, single line breaks, or sentence patterns that indicate new paragraphs
              let paragraphs: string[] = [];
              if (analysis) {
                // First try splitting on double line breaks
                let splitParagraphs = analysis.split(/\n\n+/).filter(Boolean);

                // If we only got one paragraph, try splitting on single line breaks
                if (splitParagraphs.length === 1) {
                  splitParagraphs = analysis.split(/\n+/).filter(Boolean);
                }

                // If we still only have one paragraph, try to split on sentence patterns
                if (splitParagraphs.length === 1) {
                  // Look for patterns that indicate start of insights/recommendations
                  const insightStarters = /\b(To improve|To increase|Focus on|Consider|Implement|Investigate|Analyze the|Target|Address|Recommend)/i;
                  const match = analysis.match(insightStarters);
                  if (match && match.index) {
                    const analysisText = analysis.substring(0, match.index).trim();
                    const insightsText = analysis.substring(match.index).trim();
                    splitParagraphs = [analysisText, insightsText].filter(Boolean);
                  }
                }

                paragraphs = splitParagraphs;
              }
              const chartPosition = page.startIndex + index + 1;
              const bulletLines: string[] = [];
              const narrativeParagraphs: string[] = [];

              // Simple parsing: first paragraph = analysis, second paragraph = insights
              paragraphs.forEach((paragraph, index) => {
                const original = paragraph.trim();
                const normalized = normalizeInsightText(original);
                if (!normalized) {
                  return;
                }

                // First paragraph goes to analysis, second and beyond go to insights
                if (index === 0) {
                  narrativeParagraphs.push(normalized);
                } else {
                  bulletLines.push(normalized);
                }
              });

              return (
                <div key={chart.id} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.22em', color: primaryColor, fontWeight: 600 }}>
                        Chart {chartPosition}
                      </div>
                      <div style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', marginTop: '8px' }}>
                        {chart.name || 'Untitled Chart'}
                      </div>
                      <div style={{
                        marginTop: '10px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#0f172a',
                        background: 'rgba(59, 130, 246, 0.14)',
                        borderRadius: '999px',
                        padding: '6px 16px'
                      }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '999px', background: primaryColor }}></span>
                        {chart.type || 'Custom Visualization'}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    borderRadius: '18px',
                    border: '1px solid rgba(148, 163, 184, 0.24)',
                    background: '#f8fafc',
                    padding: '20px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '320px',
                    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.6)'
                  }}>
                    {thumbnail ? (
                      <img
                        src={thumbnail.dataUrl}
                        alt={`Visualization for ${chart.name || 'chart'}`}
                        style={{
                          width: '100%',
                          maxHeight: '360px',
                          objectFit: 'contain',
                          borderRadius: '14px',
                          background: '#ffffff'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '280px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        color: '#94a3b8',
                        border: '1px dashed #cbd5e1',
                        borderRadius: '14px',
                        background: '#ffffff'
                      }}>
                        {isCapturingAssets ? 'Rendering chart preview…' : 'Chart preview not available'}
                      </div>
                    )}
                  </div>

                  {config.includeAnalysis && (
                    <div style={{
                      borderRadius: '16px',
                      border: `1px solid ${primaryColor}`,
                      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(59, 130, 246, 0.02) 100%)',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px'
                    }}>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                        🤖 AI Commentary
                      </div>
                      {paragraphs.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          {/* Analysis Block */}
                          <div style={{
                            background: 'rgba(59, 130, 246, 0.08)',
                            borderRadius: '12px',
                            border: '1px solid rgba(59, 130, 246, 0.2)',
                            padding: '14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px'
                          }}>
                            <div style={{
                              fontSize: '14px',
                              fontWeight: 600,
                              color: '#0f172a',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              📊 Detailed Analysis
                            </div>
                            {narrativeParagraphs.length > 0 ? (
                              <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px',
                                fontSize: '13px',
                                color: '#1f2937',
                                lineHeight: 1.6
                              }}>
                                {narrativeParagraphs.map((text, idx) => (
                                  <p key={idx} style={{ margin: 0 }}>{text}</p>
                                ))}
                              </div>
                            ) : (
                              <div style={{
                                fontSize: '13px',
                                color: '#64748b',
                                fontStyle: 'italic'
                              }}>
                                No detailed analysis available for this chart.
                              </div>
                            )}
                          </div>

                          {/* Insights Block */}
                          <div style={{
                            background: 'rgba(34, 197, 94, 0.08)',
                            borderRadius: '12px',
                            border: '1px solid rgba(34, 197, 94, 0.2)',
                            padding: '14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px'
                          }}>
                            <div style={{
                              fontSize: '14px',
                              fontWeight: 600,
                              color: '#0f172a',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              💡 Key Insights
                            </div>
                            {bulletLines.length > 0 ? (
                              <div style={{
                                margin: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                fontSize: '13px',
                                color: '#1f2937',
                                lineHeight: 1.6
                              }}>
                                {bulletLines.map((line, idx) => (
                                  <p key={idx} style={{ margin: 0 }}>{line}</p>
                                ))}
                              </div>
                            ) : (
                              <div style={{
                                fontSize: '13px',
                                color: '#64748b',
                                fontStyle: 'italic'
                              }}>
                                No key insights available for this chart.
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div style={{
                          fontSize: '13px',
                          color: '#64748b',
                          textAlign: 'center',
                          padding: '12px',
                          background: 'rgba(148, 163, 184, 0.1)',
                          borderRadius: '10px',
                          border: '1px dashed rgba(148, 163, 184, 0.3)'
                        }}>
                          No AI analysis has been recorded for this chart yet. Generate insights to include commentary in the report.
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
          padding: '20px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)',
          borderBottom: '1px solid #e2e8f0'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 600, color: '#0f172a' }}>
              Configure Export Report
            </h2>
            <p style={{ margin: '6px 0 0 0', fontSize: '14px', color: '#475569' }}>
              Customize the layout, content, and branding for your generated report.
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
          gap: '28px',
          padding: '28px',
          overflow: 'hidden',
          minHeight: 0,
          flex: 1
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            height: 'calc(94vh - 200px)',
            maxHeight: 'calc(94vh - 200px)'
          }}>
            <div style={{
              background: 'white',
              borderRadius: '18px',
              border: '1px solid #e2e8f0',
              padding: '22px',
              boxShadow: '0 22px 44px rgba(15, 23, 42, 0.2)',
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#475569',
                marginBottom: '16px'
              }}>
                Live Preview
              </div>
              <div style={{
                background: '#e2e8f0',
                borderRadius: '14px',
                padding: '18px',
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
                    padding: '24px 20px 36px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '32px',
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#94a3b8 transparent'
                  }}
                >
                  {pages.map((page, index) => (
                    <div
                      key={index}
                      style={{
                        width: pageDimensions.width,
                        minHeight: pageDimensions.height,
                        background: '#ffffff',
                        borderRadius: '14px',
                        border: '1px solid #dbeafe',
                        boxShadow: '0 14px 32px rgba(15, 23, 42, 0.12)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        flexShrink: 0
                      }}
                    >
                      <div style={{
                        padding: '14px 24px',
                        fontSize: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.18em',
                        color: '#94a3b8',
                        borderBottom: '1px solid #e2e8f0',
                        background: 'linear-gradient(135deg, rgba(226, 232, 240, 0.6) 0%, rgba(248, 250, 252, 0.9) 100%)'
                      }}>
                        Page {index + 1} of {totalPages}
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        {renderPageContent(page, index)}
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
            gap: '16px',
            overflowY: 'auto',
            paddingRight: '8px',
            minHeight: 0,
            maxHeight: 'calc(94vh - 200px)',
            scrollbarWidth: 'thin',
            scrollbarColor: '#94a3b8 transparent'
          }}>
            <div style={cardContainerStyle}>
              <div style={cardTitleStyle}>Report Settings</div>
              <label style={fieldLabelStyle} htmlFor="report-title-input">Report Title</label>
              <input
                id="report-title-input"
                type="text"
                value={config.reportTitle}
                onChange={handleInputChange('reportTitle')}
                style={textInputStyle}
                placeholder="e.g. Q4 2024 Analytics Report"
              />

              <label style={{ ...fieldLabelStyle, marginTop: '12px' }} htmlFor="report-description-input">
                Description
              </label>
              <textarea
                id="report-description-input"
                value={config.description}
                onChange={handleInputChange('description')}
                style={textareaStyle}
                placeholder="Enter Description Here..."
              />

              <label style={{ ...fieldLabelStyle, marginTop: '12px' }} htmlFor="report-date-input">
                Report Date
              </label>
              <input
                id="report-date-input"
                type="date"
                value={config.reportDate}
                onChange={handleInputChange('reportDate')}
                style={{
                  ...textInputStyle,
                  width: 'auto'
                }}
              />
            </div>

            <div style={cardContainerStyle}>
              <div style={cardTitleStyle}>Content Options</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#0f172a' }}>
                <input
                  type="checkbox"
                  checked={config.includeCharts}
                  onChange={handleInputChange('includeCharts')}
                />
                Include Charts in Report
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '13px',
                  color: includeAnalysisDisabled ? '#94a3b8' : '#0f172a',
                  marginTop: '12px'
                }}
              >
                <input
                  type="checkbox"
                  checked={config.includeAnalysis}
                  onChange={handleInputChange('includeAnalysis')}
                  disabled={includeAnalysisDisabled}
                />
                <span style={includeAnalysisDisabled ? disabledCheckboxLabelStyle : undefined}>
                  Include AI Analysis Insights
                </span>
              </label>

            </div>

            <div style={cardContainerStyle}>
              <div style={cardTitleStyle}>Layout Options</div>

              <label style={fieldLabelStyle} htmlFor="page-size-select">
                Page Size
              </label>
              <select
                id="page-size-select"
                value={config.pageSize}
                onChange={handlePageSizeChange}
                style={{
                  ...textInputStyle,
                  width: 'auto'
                }}
              >
                <option value="A4">A4</option>
                <option value="Letter">Letter</option>
              </select>
            </div>

            <div style={cardContainerStyle}>
              <div style={cardTitleStyle}>Branding</div>
              <label style={fieldLabelStyle} htmlFor="company-name-input">Company Name</label>
              <input
                id="company-name-input"
                type="text"
                value={config.companyName}
                onChange={handleInputChange('companyName')}
                style={textInputStyle}
                placeholder="Your Company"
              />

              <label style={{ ...fieldLabelStyle, marginTop: '12px' }}>
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
                  marginTop: '6px',
                  fontSize: '12px',
                  color: '#64748b'
                }}>
                  {config.logoFileName}
                </div>
              )}

              <label style={{ ...fieldLabelStyle, marginTop: '12px' }} htmlFor="primary-color-input">
                Primary Color
              </label>
              <input
                id="primary-color-input"
                type="color"
                value={config.primaryColor}
                onChange={handleInputChange('primaryColor')}
                style={{
                  width: '48px',
                  height: '32px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              />

              <label style={{ ...fieldLabelStyle, marginTop: '12px' }} htmlFor="header-text-input">
                Header Text
              </label>
              <input
                id="header-text-input"
                type="text"
                value={config.headerText}
                onChange={handleInputChange('headerText')}
                style={textInputStyle}
                placeholder="Data Analysis Report"
              />

              <label style={{ ...fieldLabelStyle, marginTop: '12px' }} htmlFor="footer-text-input">
                Footer Text
              </label>
              <input
                id="footer-text-input"
                type="text"
                value={config.footerText}
                onChange={handleInputChange('footerText')}
                style={textInputStyle}
                placeholder="Confidential"
              />
            </div>
          </div>
        </div>

        <div style={{
          padding: '18px 24px',
          borderTop: '1px solid #e2e8f0',
          background: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '13px', color: '#64748b' }}>
            {totalSelectedCount} chart{totalSelectedCount === 1 ? '' : 's'} selected • {analysisAvailableCount} with AI insights
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={onBack}
              style={{
                background: 'white',
                border: '1px solid #e2e8f0',
                color: '#475569',
                borderRadius: '10px',
                padding: '10px 18px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Back
            </button>
            <button
              onClick={onGenerate}
              disabled={isCapturingAssets || totalSelectedCount === 0}
              style={{
                background: isCapturingAssets || totalSelectedCount === 0
                  ? '#a7f3d0'
                  : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                color: isCapturingAssets || totalSelectedCount === 0 ? '#166534' : 'white',
                border: 'none',
                borderRadius: '10px',
                padding: '10px 24px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isCapturingAssets || totalSelectedCount === 0 ? 'not-allowed' : 'pointer',
                boxShadow: isCapturingAssets || totalSelectedCount === 0
                  ? 'none'
                  : '0 18px 28px rgba(22, 163, 74, 0.22)'
              }}
            >
              {isCapturingAssets ? 'Preparing…' : 'Generate Report'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportConfigurationModal;
