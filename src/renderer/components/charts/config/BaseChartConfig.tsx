import React from 'react';
import { ChartConfiguration } from '../../../types/charts';

export interface BaseChartConfigProps {
  config: ChartConfiguration;
  onConfigChange: (config: Partial<ChartConfiguration>) => void;
  isDataSelection?: boolean;
}

export interface ChartTypeConfigProps extends BaseChartConfigProps {
  columns: any[];
  numericColumns: any[];
}

// Base configuration component that other chart configs can extend
export const BaseChartConfig: React.FC<BaseChartConfigProps> = ({
  config,
  onConfigChange,
  children
}) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }}>
      {children}
    </div>
  );
};

export default BaseChartConfig;