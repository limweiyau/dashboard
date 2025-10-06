export type ExportStage = 'selection' | 'config';

export type ExportOrientation = 'portrait' | 'landscape';
export type ExportPageSize = 'A4' | 'Letter';
export type ConfidentialStatus = 'Public' | 'Internal' | 'Confidential' | 'Restricted';

export interface ExecutiveHighlight {
  metric: string;      // The big number/percentage (e.g., "42%", "$2.5M", "3x")
  label: string;       // Short description (e.g., "Revenue Growth", "Cost Savings")
  trend?: 'up' | 'down' | 'neutral';  // Optional trend indicator
}

export interface ExportReportConfig {
  reportTitle: string;
  description: string;
  reportDate: string;
  includeCharts: boolean;
  includeAnalysis: boolean;
  includeAIAnalysis: boolean;
  includeAIInsights: boolean;
  analysisSummary: string;
  includeExecutiveSummary: boolean;
  executiveSummaryContent: string; // HTML content for display and editing
  executiveSummaryPlainText?: string; // Plain text for character counting
  executiveHighlights: ExecutiveHighlight[];
  orientation: ExportOrientation;
  pageSize: ExportPageSize;
  companyName: string;
  logoFile?: File | null;
  logoDataUrl?: string | null;
  logoFileName?: string | null;
  primaryColor: string;
  headerText: string;
  footerText: string;
  confidentialStatus: ConfidentialStatus;
}
