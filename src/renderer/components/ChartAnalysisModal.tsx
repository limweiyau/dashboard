import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Chart, ProjectData } from '../types';
import { ChartConfiguration, ChartData } from '../types/charts';
import ChartRenderer from './charts/ChartRenderer';
import { parseAnalysisContent } from '../utils/analysisParser';

interface ChartAnalysisModalProps {
  chart: Chart;
  chartData: ChartData | null;
  analysis: string;
  isOpen: boolean;
  onClose: () => void;
  onRegenerate: () => void;
  onAnalysisUpdate: (analysisContent: string, insightsContent: string) => void;
  isRegenerating: boolean;
  appliedFilters?: Array<{
    name: string;
    column: string;
    selectedValues: any[];
  }>;
}

interface EditableTextProps {
  content: string;
  isEditing: boolean;
  onEditingChange: (editing: boolean) => void;
  onChange: (content: string) => void;
  placeholder: string;
  title: string;
  icon: string;
  bgGradient: string;
  borderColor: string;
  textColor: string;
}

const EditableText: React.FC<EditableTextProps> = ({
  content,
  isEditing,
  onEditingChange,
  onChange,
  placeholder,
  title,
  icon,
  bgGradient,
  borderColor,
  textColor
}) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [draftValue, setDraftValue] = useState(content);

  // Keep local draft aligned with upstream value when not editing
  useEffect(() => {
    if (!isEditing) {
      setDraftValue(content);
    }
  }, [content, isEditing]);

  // Auto-resize textarea without disturbing caret
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      const cursorStart = textarea.selectionStart;
      const cursorEnd = textarea.selectionEnd;

      textarea.style.height = 'auto';
      const newHeight = Math.max(textarea.scrollHeight, 80);
      textarea.style.height = newHeight + 'px';

      textarea.setSelectionRange(cursorStart, cursorEnd);
    }
  }, []);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      setDraftValue(content);
      adjustTextareaHeight();
    }
  }, [isEditing, content, adjustTextareaHeight]);

  return (
    <div
      style={{
        background: bgGradient,
        border: `2px solid ${borderColor}`,
        borderRadius: '16px',
        padding: '20px',
        cursor: isEditing ? 'default' : 'pointer',
        transition: 'all 0.2s ease',
        position: 'relative'
      }}
      onClick={() => !isEditing && onEditingChange(true)}
      onMouseEnter={(e) => {
        if (!isEditing) {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isEditing) {
          e.currentTarget.style.transform = 'translateY(0px)';
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
    >
      <h3
        style={{
          margin: '0 0 16px 0',
          fontSize: '16px',
          fontWeight: '700',
          color: textColor,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        {icon} {title}
        {!isEditing && content && (
          <span
            style={{
              fontSize: '11px',
              fontWeight: '400',
              color: textColor,
              opacity: 0.7,
              marginLeft: 'auto'
            }}
          >
            Click to edit
          </span>
        )}
      </h3>
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={draftValue}
          onChange={(e) => {
            const newValue = e.target.value;
            setDraftValue(newValue);
            onChange(newValue);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              onEditingChange(false);
            }
          }}
          placeholder={placeholder}
          autoFocus
          style={{
            width: '100%',
            minHeight: '80px',
            fontSize: '14px',
            lineHeight: '1.6',
            color: textColor,
            background: 'rgba(255, 255, 255, 0.9)',
            border: '2px solid rgba(255, 255, 255, 0.5)',
            borderRadius: '8px',
            padding: '12px',
            fontFamily: 'inherit',
            resize: 'vertical',
            outline: 'none',
            transition: 'all 0.2s ease',
            boxSizing: 'border-box',
            overflow: 'hidden'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = borderColor;
            e.target.style.background = 'white';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'rgba(255, 255, 255, 0.5)';
            e.target.style.background = 'rgba(255, 255, 255, 0.9)';
            onEditingChange(false);
          }}
          onInput={(e) => {
            const textarea = e.target as HTMLTextAreaElement;
            const cursorStart = textarea.selectionStart;
            const cursorEnd = textarea.selectionEnd;

            textarea.style.height = 'auto';
            const newHeight = Math.max(textarea.scrollHeight, 80);
            textarea.style.height = newHeight + 'px';

            requestAnimationFrame(() => {
              textarea.setSelectionRange(cursorStart, cursorEnd);
            });
          }}
        />
      ) : (
        <div
          style={{
            fontSize: '14px',
            lineHeight: '1.6',
            color: textColor,
            whiteSpace: 'pre-wrap',
            minHeight: content ? 'auto' : '80px',
            padding: content ? '0' : '12px 0'
          }}
        >
          {content || (
            <span style={{ opacity: 0.6, fontStyle: 'italic' }}>{placeholder}</span>
          )}
        </div>
      )}
    </div>
  );
};

const ChartAnalysisModal: React.FC<ChartAnalysisModalProps> = ({
  chart,
  chartData,
  analysis,
  isOpen,
  onClose,
  onRegenerate,
  onAnalysisUpdate,
  isRegenerating,
  appliedFilters = []
}) => {
  if (!isOpen) return null;

  // Parse analysis into sections using shared utility
  const parseAnalysis = useCallback((analysisText: string) => {
    return parseAnalysisContent(analysisText);
  }, []);

  // State for editable content
  const [localAnalysis, setLocalAnalysis] = useState(() => parseAnalysis(analysis));
  const [editingAnalysis, setEditingAnalysis] = useState(false);
  const [editingInsights, setEditingInsights] = useState(false);

  // Update local state when analysis prop changes, but not while editing
  useEffect(() => {
    if (!editingAnalysis && !editingInsights) {
      setLocalAnalysis(parseAnalysis(analysis));
    }
  }, [analysis, parseAnalysis, editingAnalysis, editingInsights]);

  // Auto-save with debounce
  const saveTimeout = React.useRef<NodeJS.Timeout>();
  const saveAnalysis = useCallback((analysisContent: string, insightsContent: string) => {
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
    }
    saveTimeout.current = setTimeout(() => {
      onAnalysisUpdate(analysisContent, insightsContent);
    }, 1000); // 1 second debounce
  }, [onAnalysisUpdate]);

  // Prevent re-renders during editing by blocking certain props changes
  const isEditing = editingAnalysis || editingInsights;

  const handleAnalysisChange = useCallback((newContent: string) => {
    setLocalAnalysis(prev => {
      const updated = { ...prev, analysisContent: newContent };
      saveAnalysis(updated.analysisContent, updated.insightsContent);
      return updated;
    });
  }, [saveAnalysis]);

  const handleInsightsChange = useCallback((newContent: string) => {
    setLocalAnalysis(prev => {
      const updated = { ...prev, insightsContent: newContent };
      saveAnalysis(updated.analysisContent, updated.insightsContent);
      return updated;
    });
  }, [saveAnalysis]);

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

  // Memoize chart to prevent re-renders during editing
  const memoizedChart = useMemo(() => {
    if (!chartData) {
      return (
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
      );
    }

    return (
      <ChartRenderer
        config={{
          ...config,
          paddingHorizontal: config.paddingHorizontal || 20,
          paddingVertical: config.paddingVertical || 20
        }}
        data={chartData}
        width={dimensions.width}
        height={dimensions.height}
        forceDisableAnimation={editingAnalysis || editingInsights} // Disable animation during editing
        tooltipZIndex={2100}
      />
    );
  }, [chartData, config, dimensions.width, dimensions.height, editingAnalysis, editingInsights]);

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
      padding: '10px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        width: '98vw',
        maxWidth: '1800px',
        height: 'auto',
        maxHeight: '95vh',
        overflow: 'hidden',
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
          overflow: 'auto',
          minHeight: '500px'
        }}>
          {/* Chart Section */}
          <div style={{
            flex: '0 0 75%',
            maxWidth: '75%',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #fefefe 0%, #f8fafc 100%)',
            borderRight: '2px solid #f1f5f9',
            overflow: 'hidden'
          }}>
            <div style={{ maxWidth: '100%', maxHeight: '100%' }}>
              {memoizedChart}
            </div>
          </div>

          {/* Right Panel */}
          <div style={{
            flex: '1 1 25%',
            maxWidth: '25%',
            display: 'flex',
            flexDirection: 'column',
            background: '#f8fafc',
            padding: '20px',
            gap: '16px',
            overflow: 'auto'
          }}>
            {analysis ? (
              <>
                {/* Editable Analysis Section */}
                <EditableText
                  content={localAnalysis.analysisContent}
                  isEditing={editingAnalysis}
                  onEditingChange={setEditingAnalysis}
                  onChange={handleAnalysisChange}
                  placeholder="Click to add your analysis of the chart data patterns, trends, and key findings..."
                  title="Analysis"
                  icon="📊"
                  bgGradient="linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)"
                  borderColor="#93c5fd"
                  textColor="#1e3a8a"
                />

                {/* Editable Insights Section */}
                <EditableText
                  content={localAnalysis.insightsContent}
                  isEditing={editingInsights}
                  onEditingChange={setEditingInsights}
                  onChange={handleInsightsChange}
                  placeholder="Click to add actionable insights and recommendations based on the analysis..."
                  title="Insights"
                  icon="💡"
                  bgGradient="linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)"
                  borderColor="#86efac"
                  textColor="#14532d"
                />

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
            ) : (
              <>
                {/* Empty state with editable sections */}
                <EditableText
                  content=""
                  isEditing={editingAnalysis}
                  onEditingChange={setEditingAnalysis}
                  onChange={handleAnalysisChange}
                  placeholder="Click to add your analysis of the chart data patterns, trends, and key findings..."
                  title="Analysis"
                  icon="📊"
                  bgGradient="linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)"
                  borderColor="#93c5fd"
                  textColor="#1e3a8a"
                />

                <EditableText
                  content=""
                  isEditing={editingInsights}
                  onEditingChange={setEditingInsights}
                  onChange={handleInsightsChange}
                  placeholder="Click to add actionable insights and recommendations based on the analysis..."
                  title="Insights"
                  icon="💡"
                  bgGradient="linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)"
                  borderColor="#86efac"
                  textColor="#14532d"
                />

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
                    AI Analysis Available
                  </h3>
                  <p style={{
                    margin: 0,
                    fontSize: '14px',
                    color: '#64748b',
                    lineHeight: '1.5'
                  }}>
                    Click "Regenerate" in the header to generate AI-powered insights, or click the sections above to add your own analysis.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartAnalysisModal;
