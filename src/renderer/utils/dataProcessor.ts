import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { ColumnInfo } from '../types';
import { roundToMaxDecimals } from './numberUtils';

export interface ProcessedData {
  data: any[];
  columns: ColumnInfo[];
}

// Helper function to clean numeric values in data objects
function cleanNumericData(data: any[]): any[] {
  return data.map(row => {
    if (!row || typeof row !== 'object') return row;

    const cleaned: any = {};
    for (const [key, value] of Object.entries(row)) {
      if (typeof value === 'number' && !isNaN(value)) {
        cleaned[key] = roundToMaxDecimals(value);
      } else {
        cleaned[key] = value;
      }
    }
    return cleaned;
  });
}

export function processCSV(csvContent: string): Promise<ProcessedData> {
  return new Promise((resolve, reject) => {
    Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          reject(new Error(`CSV parsing error: ${results.errors[0].message}`));
          return;
        }

        const rawData = results.data as any[];
        const data = cleanNumericData(rawData);
        const columns = inferColumnTypes(data);

        resolve({ data, columns });
      },
      error: (error: any) => {
        reject(new Error(`CSV parsing error: ${error.message}`));
      }
    });
  });
}

export function processExcel(buffer: ArrayBuffer): ProcessedData {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
    header: 1,
    defval: null
  }) as any[][];

  if (jsonData.length === 0) {
    throw new Error('Excel file is empty');
  }

  // First row as headers
  const headers = jsonData[0] as string[];
  const dataRows = jsonData.slice(1);

  // Convert to objects
  const data = dataRows.map(row => {
    const obj: any = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] ?? null;
    });
    return obj;
  }).filter(row => Object.values(row).some(value => value !== null && value !== ''));

  const cleanedData = cleanNumericData(data);
  const columns = inferColumnTypes(cleanedData);

  return { data: cleanedData, columns };
}

export function processJSON(jsonContent: string): ProcessedData {
  try {
    const parsed = JSON.parse(jsonContent);
    let data: any[];

    if (Array.isArray(parsed)) {
      data = parsed;
    } else if (typeof parsed === 'object' && parsed !== null) {
      // If it's an object, try to find an array property
      const arrayKeys = Object.keys(parsed).filter(key => Array.isArray(parsed[key]));
      if (arrayKeys.length > 0) {
        data = parsed[arrayKeys[0]];
      } else {
        // Convert single object to array
        data = [parsed];
      }
    } else {
      throw new Error('JSON must contain an array or object');
    }

    if (data.length === 0) {
      throw new Error('No data found in JSON');
    }

    const cleanedData = cleanNumericData(data);
    const columns = inferColumnTypes(cleanedData);

    return { data: cleanedData, columns };
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid JSON format');
    }
    throw error;
  }
}

function inferColumnTypes(data: any[]): ColumnInfo[] {
  if (data.length === 0) return [];

  const sampleSize = Math.min(100, data.length);
  const sample = data.slice(0, sampleSize);
  
  // Get all unique column names
  const allColumns = new Set<string>();
  sample.forEach(row => {
    if (row && typeof row === 'object') {
      Object.keys(row).forEach(key => allColumns.add(key));
    }
  });

  return Array.from(allColumns).map(columnName => {
    const values = sample.map(row => row?.[columnName]).filter(v => v !== null && v !== undefined && v !== '');
    
    if (values.length === 0) {
      return {
        name: columnName,
        type: 'string' as const,
        nullable: true,
        unique: false
      };
    }

    const types = new Set();
    const uniqueValues = new Set();
    
    values.forEach(value => {
      uniqueValues.add(value);
      
      if (typeof value === 'number') {
        types.add('number');
      } else if (typeof value === 'boolean') {
        types.add('boolean');
      } else if (value instanceof Date) {
        types.add('date');
      } else if (typeof value === 'string') {
        // Try to parse as date
        const dateValue = new Date(value);
        if (!isNaN(dateValue.getTime()) && isValidDateString(value)) {
          types.add('date');
        } else {
          types.add('string');
        }
      } else {
        types.add('string');
      }
    });

    // Determine primary type
    let primaryType: 'string' | 'number' | 'date' | 'boolean' = 'string';
    
    if (types.has('number') && types.size === 1) {
      primaryType = 'number';
    } else if (types.has('boolean') && types.size === 1) {
      primaryType = 'boolean';
    } else if (types.has('date') && (types.size === 1 || (types.size === 2 && types.has('string')))) {
      primaryType = 'date';
    }

    return {
      name: columnName,
      type: primaryType,
      nullable: values.length < sample.length,
      unique: uniqueValues.size === values.length
    };
  });
}

function isValidDateString(value: string): boolean {
  // Check for common date formats
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
    /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY
    /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
    /^\d{1,2}\/\d{1,2}\/\d{4}$/, // M/D/YYYY or MM/DD/YYYY
  ];

  return datePatterns.some(pattern => pattern.test(value)) || 
         !isNaN(Date.parse(value));
}