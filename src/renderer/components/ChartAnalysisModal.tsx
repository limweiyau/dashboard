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
}

const ChartAnalysisModal: React.FC<ChartAnalysisModalProps> = ({
  chart,
  chartData,
  analysis,
  isOpen,
  onClose,
  onRegenerate,
  isRegenerating
}) => {
  if (!isOpen) return null;

  const config = chart.config as ChartConfiguration;

  // Calculate chart dimensions for modal (slightly smaller than full size)
  const getModalChartDimensions = (templateId: string) => {
    const baseWidth = 700; // Smaller than full size for modal
    const baseHeight = 400; // 16:9 aspect ratio maintained

    switch (templateId) {
      case 'pie-chart':
        return { width: 450, height: 450 };
      default:
        return { width: baseWidth, height: baseHeight };
    }
  };

  const dimensions = getModalChartDimensions(config.templateId || chart.type);

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
        width: '90vw',
        maxWidth: '1200px',
        maxHeight: '90vh',
        overflow: 'hidden',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '24px 32px',
          borderBottom: '2px solid #f1f5f9',
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: '700',
              color: '#1e293b',
              marginBottom: '4px'
            }}>
              {chart.config.title || 'Chart Analysis'}
            </h2>
            <p style={{
              margin: 0,
              fontSize: '14px',
              color: '#64748b'
            }}>
              AI-powered insights and analysis
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={onRegenerate}
              disabled={isRegenerating}
              style={{
                padding: '10px 16px',
                background: isRegenerating
                  ? 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)'
                  : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
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
                padding: '8px',
                background: 'none',
                border: 'none',
                borderRadius: '6px',
                fontSize: '20px',
                color: '#64748b',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                width: '36px',
                height: '36px',
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
          overflow: 'hidden'
        }}>
          {/* Chart Section */}
          <div style={{
            width: '55%',
            padding: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #fefefe 0%, #f8fafc 100%)',
            borderRight: '2px solid #f1f5f9'
          }}>
            {chartData ? (
              <ChartRenderer
                config={config}
                data={chartData}
                width={dimensions.width}
                height={dimensions.height}
                forceDisableAnimation={false}
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

          {/* Analysis Section */}
          <div style={{
            width: '45%',
            padding: '32px',
            overflow: 'auto',
            background: 'white'
          }}>
            <div style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#1e293b',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              🤖 AI Analysis & Insights
            </div>

            <div style={{
              fontSize: '14px',
              lineHeight: '1.6',
              color: '#374151',
              whiteSpace: 'pre-wrap'
            }}>
              {analysis || 'No analysis available. Click "Regenerate" to generate insights for this chart.'}
            </div>

            {/* Analysis Footer */}
            <div style={{
              marginTop: '24px',
              padding: '16px',
              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
              borderRadius: '8px',
              border: '1px solid #bae6fd'
            }}>
              <div style={{
                fontSize: '12px',
                fontWeight: '600',
                color: '#0369a1',
                marginBottom: '4px'
              }}>
                💡 Tip
              </div>
              <div style={{
                fontSize: '11px',
                color: '#0c4a6e',
                lineHeight: '1.4'
              }}>
                This analysis is generated by AI based on your chart data. Use it as a starting point for deeper investigation.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartAnalysisModal;