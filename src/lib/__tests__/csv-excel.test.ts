import { describe, it, expect } from 'vitest';
import {
  exportToCSV,
  parseCSV,
  generateCSVTemplate,
} from '../import-export/csv-excel';

describe('CSV Import/Export', () => {
  describe('exportToCSV', () => {
    it('should export data to CSV', () => {
      const data = [
        { name: 'John', age: 30, city: 'NYC' },
        { name: 'Jane', age: 25, city: 'LA' },
      ];
      const csv = exportToCSV(data);
      
      expect(csv).toContain('name,age,city');
      expect(csv).toContain('John,30,NYC');
      expect(csv).toContain('Jane,25,LA');
    });

    it('should handle empty data', () => {
      const csv = exportToCSV([]);
      expect(csv).toBe('');
    });

    it('should escape special characters', () => {
      const data = [{ name: 'John, Jr.', description: 'Line 1\nLine 2' }];
      const csv = exportToCSV(data);
      
      expect(csv).toContain('"John, Jr."');
    });

    it('should use custom delimiter', () => {
      const data = [{ name: 'John', age: 30 }];
      const csv = exportToCSV(data, { delimiter: ';' });
      
      expect(csv).toContain('name;age');
    });

    it('should exclude headers when requested', () => {
      const data = [{ name: 'John', age: 30 }];
      const csv = exportToCSV(data, { includeHeaders: false });
      
      expect(csv).not.toContain('name,age');
      expect(csv).toContain('John,30');
    });

    it('should export only specified columns', () => {
      const data = [{ name: 'John', age: 30, city: 'NYC' }];
      const csv = exportToCSV(data, { columns: ['name', 'city'] });
      
      expect(csv).toContain('name,city');
      expect(csv).toContain('John,NYC');
      expect(csv).not.toContain('30');
    });
  });

  describe('parseCSV', () => {
    it('should parse CSV string', () => {
      const csv = 'name,age\nJohn,30\nJane,25';
      const data = parseCSV(csv);
      
      expect(data).toHaveLength(2);
      expect(data[0]).toEqual({ name: 'John', age: '30' });
      expect(data[1]).toEqual({ name: 'Jane', age: '25' });
    });

    it('should handle quoted values', () => {
      const csv = 'name,description\n"John, Jr.","Line 1\nLine 2"';
      const data = parseCSV(csv);
      
      expect(data[0].name).toBe('John, Jr.');
    });

    it('should skip empty lines', () => {
      const csv = 'name,age\nJohn,30\n\nJane,25\n';
      const data = parseCSV(csv);
      
      expect(data).toHaveLength(2);
    });

    it('should use custom delimiter', () => {
      const csv = 'name;age\nJohn;30';
      const data = parseCSV(csv, { delimiter: ';' });
      
      expect(data[0]).toEqual({ name: 'John', age: '30' });
    });

    it('should handle data without headers', () => {
      const csv = 'John,30\nJane,25';
      const data = parseCSV(csv, { hasHeaders: false });
      
      expect(data[0]).toHaveProperty('column_0');
      expect(data[0]).toHaveProperty('column_1');
    });
  });

  describe('generateCSVTemplate', () => {
    it('should generate places template', () => {
      const template = generateCSVTemplate('places');
      
      expect(template).toContain('name,category,description');
      expect(template).toContain('Örnek Mekan');
    });

    it('should generate users template', () => {
      const template = generateCSVTemplate('users');
      
      expect(template).toContain('name,email,role');
      expect(template).toContain('Ahmet Yılmaz');
    });

    it('should generate events template', () => {
      const template = generateCSVTemplate('events');
      
      expect(template).toContain('title,description');
      expect(template).toContain('Şanlıurfa Festivali');
    });
  });
});
