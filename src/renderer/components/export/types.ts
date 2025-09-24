export type ExportStage = 'selection' | 'config';

export type ExportOrientation = 'portrait' | 'landscape';
export type ExportPageSize = 'A4' | 'Letter';

export interface ExportReportConfig {
  reportTitle: string;
  description: string;
  reportDate: string;
  includeCharts: boolean;
  includeAnalysis: boolean;
  analysisSummary: string;
  orientation: ExportOrientation;
  pageSize: ExportPageSize;
  companyName: string;
  logoFile?: File | null;
  logoDataUrl?: string | null;
  logoFileName?: string | null;
  primaryColor: string;
  headerText: string;
  footerText: string;
}
