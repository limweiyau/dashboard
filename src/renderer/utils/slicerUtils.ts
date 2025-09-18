import { DataTable, ColumnInfo, Slicer, ProjectData } from '../types';

/**
 * Detects columns that can be used as universal slicers across multiple tables
 * A column qualifies as universal if:
 * 1. It exists in at least 2 tables
 * 2. It has similar data types across tables
 * 3. It has overlapping values between tables
 */
export function detectUniversalSlicers(projectData: ProjectData): string[] {
  const allTables = [
    {
      id: 'main',
      name: projectData.name || 'Main Dataset',
      columns: projectData.columns,
      data: projectData.data
    },
    ...projectData.tables
  ];

  // If only one table, return all columns as universal candidates
  if (allTables.length === 1) {
    return allTables[0].columns.map(col => col.name);
  }

  const universalCandidates: string[] = [];

  // Get all unique column names across tables
  const allColumnNames = new Set<string>();
  allTables.forEach(table => {
    table.columns.forEach(col => allColumnNames.add(col.name));
  });

  // Check each column name for universality
  for (const columnName of allColumnNames) {
    const tablesWithColumn = allTables.filter(table =>
      table.columns.some(col => col.name === columnName)
    );

    // Must exist in at least 2 tables
    if (tablesWithColumn.length < 2) continue;

    // Check if data types are compatible across tables
    const columnTypes = tablesWithColumn.map(table =>
      table.columns.find(col => col.name === columnName)?.type
    );

    const uniqueTypes = [...new Set(columnTypes)];
    if (uniqueTypes.length > 1) {
      // Allow string/number combination for potential categorical data
      const hasOnlyStringNumber = uniqueTypes.every(type => type === 'string' || type === 'number');
      if (!hasOnlyStringNumber) continue;
    }

    // Check for overlapping values between tables
    const valueSets = tablesWithColumn.map(table => {
      const uniqueValues = [...new Set(
        table.data
          .map(row => row[columnName])
          .filter(val => val !== null && val !== undefined && val !== '')
          .map(val => String(val).toLowerCase().trim())
      )];
      return new Set(uniqueValues);
    });

    // Check if there's any overlap between value sets
    let hasOverlap = false;
    for (let i = 0; i < valueSets.length - 1; i++) {
      for (let j = i + 1; j < valueSets.length; j++) {
        const intersection = [...valueSets[i]].filter(x => valueSets[j].has(x));
        if (intersection.length > 0) {
          hasOverlap = true;
          break;
        }
      }
      if (hasOverlap) break;
    }

    if (hasOverlap) {
      universalCandidates.push(columnName);
    }
  }

  return universalCandidates;
}

/**
 * Gets all unique values for a column across specified tables
 */
export function getColumnValues(
  columnName: string,
  tables: (DataTable | { id: string; name: string; data: any[]; columns: ColumnInfo[] })[]
): any[] {
  const allValues = new Set();

  tables.forEach(table => {
    if (table.columns.some(col => col.name === columnName)) {
      table.data.forEach(row => {
        const value = row[columnName];
        if (value !== null && value !== undefined && value !== '') {
          allValues.add(value);
        }
      });
    }
  });

  return Array.from(allValues).sort();
}

/**
 * Creates a new slicer
 */
export function createSlicer(
  name: string,
  columnName: string,
  type: 'universal' | 'table-specific',
  tableId?: string,
  availableValues: any[] = [],
  filterType: 'dropdown' | 'multi-select' | 'date-range' = 'multi-select'
): Slicer {
  return {
    id: `slicer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    columnName,
    tableId,
    type,
    filterType,
    selectedValues: [],
    availableValues,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Determines the best filter type for a column based on its data
 * Only allows string/categorical and date columns for filtering
 */
export function suggestFilterType(
  columnName: string,
  tables: (DataTable | { id: string; name: string; data: any[]; columns: ColumnInfo[] })[]
): 'dropdown' | 'multi-select' | 'date-range' | null {
  const values = getColumnValues(columnName, tables);
  const sampleValue = values[0];

  if (!sampleValue || values.length === 0) {
    return null;
  }

  // Only check for dates if column name explicitly contains common date indicators
  // AND the values actually look like dates
  const explicitDateIndicators = ['date', 'created_at', 'updated_at', 'timestamp', 'time'];
  const isExplicitDateColumn = explicitDateIndicators.some(indicator =>
    columnName.toLowerCase().includes(indicator)
  );

  // Only consider it a date if:
  // 1. Column name explicitly suggests dates AND
  // 2. Values are actually parseable as dates AND
  // 3. More than 50% of values are valid dates
  if (isExplicitDateColumn) {
    const dateValues = values.filter(value => {
      if (value instanceof Date) return true;
      if (typeof value === 'string') {
        const parsed = Date.parse(value);
        return !isNaN(parsed) && value.length > 6; // Avoid short strings that might parse as dates
      }
      return false;
    });

    // Only treat as date if majority of values are clearly dates
    if (dateValues.length > values.length * 0.5) {
      return 'date-range';
    }
  }

  // Check if it's purely numeric - if so, exclude from filtering
  const numericValues = values.filter(value =>
    typeof value === 'number' ||
    (typeof value === 'string' && !isNaN(Number(value)) && value.trim() !== '')
  );

  if (numericValues.length === values.length && values.length > 0) {
    // All values are numeric - don't allow filtering
    return null;
  }

  // For categorical/string data only
  const uniqueValues = [...new Set(values)];

  // Use dropdown for many unique values, multi-select for fewer
  return uniqueValues.length > 15 ? 'dropdown' : 'multi-select';
}

/**
 * Applies slicer filters to data
 * Only handles string/categorical and date filters
 */
export function applySlicersToData(
  data: any[],
  appliedSlicers: string[],
  allSlicers: Slicer[]
): any[] {
  if (!appliedSlicers.length) return data;

  const activeSlicers = allSlicers.filter(slicer =>
    appliedSlicers.includes(slicer.id) && slicer.selectedValues.length > 0
  );

  if (!activeSlicers.length) return data;

  return data.filter(row => {
    return activeSlicers.every(slicer => {
      const cellValue = row[slicer.columnName];

      if (cellValue === null || cellValue === undefined) return false;

      switch (slicer.filterType) {
        case 'dropdown':
        case 'multi-select':
          return slicer.selectedValues.includes(cellValue);

        case 'date-range':
          if (slicer.selectedValues.length === 2) {
            const dateValue = new Date(cellValue);
            const startDate = new Date(slicer.selectedValues[0]);
            const endDate = new Date(slicer.selectedValues[1]);
            return dateValue >= startDate && dateValue <= endDate;
          } else {
            return slicer.selectedValues.includes(cellValue);
          }

        default:
          return slicer.selectedValues.includes(cellValue);
      }
    });
  });
}

/**
 * Gets tables that contain a specific column
 */
export function getTablesWithColumn(
  columnName: string,
  projectData: ProjectData
): string[] {
  const tableIds: string[] = [];

  // Check main dataset
  if (projectData.columns.some(col => col.name === columnName)) {
    tableIds.push('main');
  }

  // Check additional tables
  projectData.tables.forEach(table => {
    if (table.columns.some(col => col.name === columnName)) {
      tableIds.push(table.id);
    }
  });

  return tableIds;
}