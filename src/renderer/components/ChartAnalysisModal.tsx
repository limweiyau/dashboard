import React from 'react';
import { Chart, ProjectData } from '../types';
import { ChartConfiguration, ChartData } from '../types/charts';
import ChartRenderer from './charts/ChartRenderer';

interface ChartAnalysisModalProps {
  chart: Chart;
  chartData: ChartData | null;
  analysis: string;
  isOpen: boolean;
  onClose: () => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
  appliedFilters?: Array<{
    name: string;
    column: string;
    selectedValues: any[];
  }>;
}

const ChartAnalysisModal: React.FC<ChartAnalysisModalProps> = ({
  chart,
  chartData,
  analysis,
  isOpen,
  onClose,
  onRegenerate,
  isRegenerating,
  appliedFilters = []
}) => {
  if (!isOpen) return null;

  const config = chart.config as ChartConfiguration;

  // Use exact same dimensions calculation as Your Charts for true 1:1 replica
  const getChartDisplayConfig = (chartType: string, templateId?: string) => {
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const type = (templateId || chartType || '').toLowerCase();
    const isCompactChart = ['pie', 'donut', 'gauge', 'circle'].some(keyword => type.includes(keyword));

    const columns = viewportWidth >= 880 ? 2 : 1;
    const horizontalPadding = 48;
    const gap = 20;
    const availableWidth = viewportWidth - horizontalPadding - gap * (columns - 1);
    const targetCardWidth = Math.floor(availableWidth / Math.max(columns, 1));
    const fullRowWidth = columns > 1 ? availableWidth : targetCardWidth;

    const minWidthForWideChart = Math.max(640, Math.round(viewportWidth * 0.55));
    const builderPreviewWidth = Math.min(
      Math.max((viewportWidth * 0.6) - 40, 320),
      viewportWidth - 200
    );

    const previewWidth = Math.min(Math.max(builderPreviewWidth, minWidthForWideChart), fullRowWidth - 40);
    const chartWidth = Math.round(previewWidth);
    const baseHeight = Math.max(Math.round(chartWidth * 9 / 16), 480);
    const chartHeight = baseHeight;

    return {
      isCompact: isCompactChart,
      chartWidth,
      chartHeight
    };
  };

  const chartConfig = getChartDisplayConfig(chart.type, config.templateId);
  const dimensions = {
    width: chartConfig.chartWidth,
    height: chartConfig.chartHeight
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        width: '95vw',
        maxWidth: '1600px',
        height: 'auto',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '12px 24px',
          borderBottom: '1px solid #f1f5f9',
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: '600',
              color: '#1e293b'
            }}>
              {chart.config.title || 'Chart Analysis'}
            </h2>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={onRegenerate}
              disabled={isRegenerating}
              style={{
                padding: '6px 12px',
                background: isRegenerating
                  ? 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)'
                  : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: isRegenerating ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: isRegenerating ? 0.7 : 1
              }}
              onMouseEnter={(e) => {
                if (!isRegenerating) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #d97706 0%, #b45309 100%)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isRegenerating) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
                  e.currentTarget.style.transform = 'translateY(0px)';
                }
              }}
            >
              {isRegenerating ? 'Regenerating...' : 'Regenerate'}
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '4px',
                background: 'none',
                border: 'none',
                borderRadius: '4px',
                fontSize: '16px',
                color: '#64748b',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f1f5f9';
                e.currentTarget.style.color = '#1e293b';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'none';
                e.currentTarget.style.color = '#64748b';
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div style={{
          display: 'flex',
          flex: 1,
          overflow: 'visible',
          minHeight: '500px'
        }}>
          {/* Chart Section */}
          <div style={{
            minWidth: `${dimensions.width + 40}px`, // Chart width + padding
            flexShrink: 0,
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #fefefe 0%, #f8fafc 100%)',
            borderRight: '2px solid #f1f5f9',
            overflow: 'visible'
          }}>
            {chartData ? (
              <ChartRenderer
                config={{
                  ...config,
                  paddingHorizontal: config.paddingHorizontal || 20,
                  paddingVertical: config.paddingVertical || 20
                }}
                data={chartData}
                width={dimensions.width}
                height={dimensions.height}
                forceDisableAnimation={false}
                tooltipZIndex={2100}
              />
            ) : (
              <div style={{
                width: `${dimensions.width}px`,
                height: `${dimensions.height}px`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                border: '2px dashed #cbd5e1',
                borderRadius: '12px'
              }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>📊</div>
                <div style={{ fontSize: '14px', color: '#64748b', textAlign: 'center' }}>Chart Preview</div>
              </div>
            )}
          </div>

          {/* Right Panel */}
          <div style={{
            flex: 1,
            minWidth: '400px',
            display: 'flex',
            flexDirection: 'column',
            background: '#f8fafc',
            padding: '20px',
            gap: '16px',
            overflow: 'auto'
          }}>
            {analysis ? (
              (() => {
                // Split analysis into sections, removing any "Analysis:" or "Insights:" prefixes
                const sections = analysis.split(/(?:\n\s*){2,}/).filter(section => section.trim());

                // Clean sections by removing common prefixes
                const cleanedSections = sections.map(section =>
                  section.replace(/^(Analysis|Insights|Recommendations?):\s*/i, '').trim()
                ).filter(section => section.length > 0);

                // Distribute content across two sections (removed recommendations)
                const analysisContent = cleanedSections[0] || '';
                const insightsContent = cleanedSections.slice(1).join('\n\n') ||
                  (cleanedSections.length > 1 ? cleanedSections[cleanedSections.length - 1] : '');

                return (
                  <>
                    {/* Analysis Section */}
                    <div style={{
                      background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                      border: '2px solid #93c5fd',
                      borderRadius: '16px',
                      padding: '20px'
                    }}>
                      <h3 style={{
                        margin: '0 0 16px 0',
                        fontSize: '16px',
                        fontWeight: '700',
                        color: '#1e40af',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        📊 Analysis
                      </h3>
                      <div style={{
                        fontSize: '14px',
                        lineHeight: '1.6',
                        color: '#1e3a8a',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {analysisContent}
                      </div>
                    </div>

                    {/* Insights Section */}
                    {insightsContent && (
                      <div style={{
                        background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
                        border: '2px solid #86efac',
                        borderRadius: '16px',
                        padding: '20px'
                      }}>
                        <h3 style={{
                          margin: '0 0 16px 0',
                          fontSize: '16px',
                          fontWeight: '700',
                          color: '#166534',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          💡 Insights
                        </h3>
                        <div style={{
                          fontSize: '14px',
                          lineHeight: '1.6',
                          color: '#14532d',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {insightsContent}
                        </div>
                      </div>
                    )}

                    {/* Applied Filters Section */}
                    {appliedFilters.length > 0 ? (
                      <div style={{
                        background: 'linear-gradient(135deg, #fef7ff 0%, #f3e8ff 100%)',
                        border: '2px solid #c084fc',
                        borderRadius: '16px',
                        padding: '20px'
                      }}>
                        <h3 style={{
                          margin: '0 0 16px 0',
                          fontSize: '16px',
                          fontWeight: '700',
                          color: '#7c3aed',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          🔍 Applied Filters
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {appliedFilters.map((filter, index) => (
                            <div key={index} style={{
                              background: 'rgba(255, 255, 255, 0.9)',
                              padding: '10px 14px',
                              borderRadius: '10px',
                              border: '1px solid #c084fc',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <div style={{
                                fontSize: '14px',
                                fontWeight: '600',
                                color: '#7c3aed',
                                minWidth: '80px'
                              }}>
                                {filter.name}
                              </div>
                              <div style={{
                                fontSize: '13px',
                                color: '#6b46c1',
                                textAlign: 'right',
                                flex: 1,
                                marginLeft: '12px'
                              }}>
                                {filter.selectedValues.length === 1 ? (
                                  `"${filter.selectedValues[0]}"`
                                ) : filter.selectedValues.length <= 3 ? (
                                  filter.selectedValues.map(val => `"${val}"`).join(', ')
                                ) : (
                                  `${filter.selectedValues.length} values: ${filter.selectedValues.slice(0, 2).map(val => `"${val}"`).join(', ')}...`
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                        border: '2px dashed #cbd5e1',
                        borderRadius: '16px',
                        padding: '20px',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</div>
                        <h3 style={{
                          margin: '0 0 8px 0',
                          fontSize: '16px',
                          fontWeight: '600',
                          color: '#475569'
                        }}>
                          No Filters Applied
                        </h3>
                        <p style={{
                          margin: 0,
                          fontSize: '14px',
                          color: '#64748b',
                          lineHeight: '1.5'
                        }}>
                          This analysis includes all available data. Add filters to focus on specific segments.
                        </p>
                      </div>
                    )}
                  </>
                );
              })()
            ) : (
              <div style={{
                background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                border: '2px dashed #cbd5e1',
                borderRadius: '16px',
                padding: '40px 20px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤖</div>
                <h3 style={{
                  margin: '0 0 8px 0',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#475569'
                }}>
                  No Analysis Yet
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: '14px',
                  color: '#64748b',
                  lineHeight: '1.5'
                }}>
                  Click "Regenerate" in the header to generate AI-powered insights for this chart.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartAnalysisModal;