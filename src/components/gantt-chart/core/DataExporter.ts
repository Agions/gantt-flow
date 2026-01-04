/**
 * 甘特图数据导出工具
 * 提供将甘特图数据导出为Excel、CSV或JSON等格式的功能
 */

import { Task, Dependency, Resource } from './types';

/**
 * 导出格式枚举
 */
export enum ExportFormat {
  CSV = 'csv',
  JSON = 'json',
  EXCEL = 'excel'
}

/**
 * 导出选项接口
 */
export interface ExportOptions {
  /** 导出文件名（不含扩展名） */
  fileName?: string;
  /** 是否包含表头 */
  includeHeader?: boolean;
  /** 日期格式 */
  dateFormat?: string;
  /** 要导出的字段列表，为空则导出所有字段 */
  fields?: string[];
  /** 分隔符（仅用于CSV） */
  delimiter?: string;
  /** 是否导出扩展字段 */
  exportExtendedFields?: boolean;
  /** 是否美化JSON */
  prettyJSON?: boolean;
  /** 导出任务列表 */
  exportTasks?: boolean;
  /** 导出依赖关系 */
  exportDependencies?: boolean;
  /** 导出资源列表 */
  exportResources?: boolean;
}

/**
 * 数据导出器类
 */
export class DataExporter {
  /** 任务数据 */
  private tasks: Task[] = [];
  /** 依赖关系数据 */
  private dependencies: Dependency[] = [];
  /** 资源数据 */
  private resources: Resource[] = [];
  /** 默认导出选项 */
  private defaultOptions: ExportOptions = {
    fileName: 'gantt-data',
    includeHeader: true,
    dateFormat: 'YYYY-MM-DD',
    delimiter: ',',
    exportExtendedFields: true,
    prettyJSON: true,
    exportTasks: true,
    exportDependencies: true,
    exportResources: true
  };

  /**
   * 创建数据导出器
   * @param tasks 任务数据
   * @param dependencies 依赖关系数据
   * @param resources 资源数据
   */
  constructor(tasks: Task[] = [], dependencies: Dependency[] = [], resources: Resource[] = []) {
    this.tasks = tasks;
    this.dependencies = dependencies;
    this.resources = resources;
  }

  /**
   * 设置任务数据
   * @param tasks 任务数据
   */
  public setTasks(tasks: Task[]): void {
    this.tasks = tasks;
  }

  /**
   * 设置依赖关系数据
   * @param dependencies 依赖关系数据
   */
  public setDependencies(dependencies: Dependency[]): void {
    this.dependencies = dependencies;
  }

  /**
   * 设置资源数据
   * @param resources 资源数据
   */
  public setResources(resources: Resource[]): void {
    this.resources = resources;
  }

  /**
   * 导出数据
   * @param format 导出格式
   * @param options 导出选项
   * @returns Promise<void>
   */
  public async export(format: ExportFormat, options: ExportOptions = {}): Promise<void> {
    const mergedOptions = { ...this.defaultOptions, ...options };

    switch (format) {
      case ExportFormat.CSV:
        this.exportAsCSV(mergedOptions);
        break;
      case ExportFormat.JSON:
        this.exportAsJSON(mergedOptions);
        break;
      case ExportFormat.EXCEL:
        await this.exportAsExcel(mergedOptions);
        break;
      default:
        console.error(`不支持的导出格式: ${format}`);
    }
  }

  /**
   * 导出为CSV
   * @param options 导出选项
   */
  private exportAsCSV(options: ExportOptions): void {
    const { fileName, includeHeader, delimiter, exportTasks, exportDependencies, exportResources } = options;

    // 导出任务
    if (exportTasks && this.tasks.length > 0) {
      const tasksCsv = this.generateCSV(this.tasks, 'tasks', options);
      this.downloadFile(`${fileName}-tasks.csv`, tasksCsv, 'text/csv');
    }

    // 导出依赖关系
    if (exportDependencies && this.dependencies.length > 0) {
      const dependenciesCsv = this.generateCSV(this.dependencies, 'dependencies', options);
      this.downloadFile(`${fileName}-dependencies.csv`, dependenciesCsv, 'text/csv');
    }

    // 导出资源
    if (exportResources && this.resources.length > 0) {
      const resourcesCsv = this.generateCSV(this.resources, 'resources', options);
      this.downloadFile(`${fileName}-resources.csv`, resourcesCsv, 'text/csv');
    }
  }

  /**
   * 导出为JSON
   * @param options 导出选项
   */
  private exportAsJSON(options: ExportOptions): void {
    const { fileName, prettyJSON, exportTasks, exportDependencies, exportResources } = options;
    const data: any = {};

    if (exportTasks) {
      data.tasks = this.tasks;
    }

    if (exportDependencies) {
      data.dependencies = this.dependencies;
    }

    if (exportResources) {
      data.resources = this.resources;
    }

    // 将数据转换为JSON字符串
    const jsonString = prettyJSON
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data);

    // 下载JSON文件
    this.downloadFile(`${fileName}.json`, jsonString, 'application/json');
  }

  /**
   * 导出为Excel
   * @param options 导出选项
   */
  private async exportAsExcel(options: ExportOptions): Promise<void> {
    try {
      // 使用 exceljs 替代 xlsx（修复安全漏洞）
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();

      // 导出任务
      if (options.exportTasks && this.tasks.length > 0) {
        const tasksSheet = workbook.addWorksheet('任务');
        if (this.tasks.length > 0) {
          // 添加表头
          const headers = Object.keys(this.tasks[0]);
          tasksSheet.addRow(headers);
          // 添加数据行
          this.tasks.forEach(task => {
            tasksSheet.addRow(headers.map(h => (task as any)[h]));
          });
        }
      }

      // 导出依赖关系
      if (options.exportDependencies && this.dependencies.length > 0) {
        const dependenciesSheet = workbook.addWorksheet('依赖关系');
        if (this.dependencies.length > 0) {
          const headers = Object.keys(this.dependencies[0]);
          dependenciesSheet.addRow(headers);
          this.dependencies.forEach(dep => {
            dependenciesSheet.addRow(headers.map(h => (dep as any)[h]));
          });
        }
      }

      // 导出资源
      if (options.exportResources && this.resources.length > 0) {
        const resourcesSheet = workbook.addWorksheet('资源');
        if (this.resources.length > 0) {
          const headers = Object.keys(this.resources[0]);
          resourcesSheet.addRow(headers);
          this.resources.forEach(res => {
            resourcesSheet.addRow(headers.map(h => (res as any)[h]));
          });
        }
      }

      // 生成并下载Excel文件
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${options.fileName}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.warn('使用exceljs库导出Excel失败，将数据导出为CSV。');
      this.exportAsCSV(options);
    }
  }

  /**
   * 生成CSV字符串
   * @param data 要转换的数据数组
   * @param type 数据类型
   * @param options 导出选项
   * @returns CSV字符串
   */
  private generateCSV(data: any[], type: 'tasks' | 'dependencies' | 'resources', options: ExportOptions): string {
    if (!data || data.length === 0) {
      return '';
    }

    const { includeHeader, delimiter, fields, exportExtendedFields, dateFormat } = options;
    const rows: string[] = [];

    // 获取所有字段
    let allFields = this.getFields(data, type);

    // 如果指定了字段，则使用指定的字段
    if (fields && fields.length > 0) {
      allFields = allFields.filter(field => fields.includes(field));
    }

    // 如果不导出扩展字段，则排除自定义字段
    if (!exportExtendedFields) {
      const standardFields = this.getStandardFields(type);
      allFields = allFields.filter(field => standardFields.includes(field));
    }

    // 生成表头
    if (includeHeader) {
      rows.push(allFields.join(delimiter));
    }

    // 生成数据行
    data.forEach(item => {
      const values = allFields.map(field => {
        const value = this.getNestedValue(item, field);
        return this.formatValue(value, dateFormat);
      });
      rows.push(values.join(delimiter));
    });

    return rows.join('\n');
  }

  /**
   * 获取嵌套对象的值
   * @param obj 对象
   * @param path 路径（点号分隔）
   * @returns 值
   */
  private getNestedValue(obj: any, path: string): any {
    const keys = path.split('.');
    return keys.reduce((value, key) => (value && value[key] !== undefined) ? value[key] : '', obj);
  }

  /**
   * 格式化值
   * @param value 值
   * @param dateFormat 日期格式
   * @returns 格式化后的字符串
   */
  private formatValue(value: any, dateFormat?: string): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'string') {
      // 如果字符串包含分隔符或换行符，则用引号包裹
      if (value.includes(',') || value.includes('\n') || value.includes('"')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }

    if (value instanceof Date) {
      // 格式化日期
      if (dateFormat) {
        // 简单的日期格式化，实际使用时可以使用专业的日期库
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, '0');
        const day = String(value.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      return value.toISOString();
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }

  /**
   * 获取数据的所有字段
   * @param data 数据数组
   * @param type 数据类型
   * @returns 字段数组
   */
  private getFields(data: any[], type: 'tasks' | 'dependencies' | 'resources'): string[] {
    const fields = new Set<string>();

    // 添加标准字段
    this.getStandardFields(type).forEach(field => fields.add(field));

    // 如果需要，扫描所有对象查找其他字段
    data.forEach(item => {
      Object.keys(item).forEach(key => {
        if (key !== 'metadata') {
          fields.add(key);
        } else if (item.metadata && typeof item.metadata === 'object') {
          // 添加元数据字段
          Object.keys(item.metadata).forEach(metaKey => {
            fields.add(`metadata.${metaKey}`);
          });
        }
      });
    });

    return Array.from(fields);
  }

  /**
   * 获取标准字段
   * @param type 数据类型
   * @returns 标准字段数组
   */
  private getStandardFields(type: 'tasks' | 'dependencies' | 'resources'): string[] {
    switch (type) {
      case 'tasks':
        return ['id', 'name', 'start', 'end', 'progress', 'type', 'resourceId', 'parentId', 'duration', 'color', 'milestone', 'collapsed'];
      case 'dependencies':
        return ['id', 'predecessorId', 'successorId', 'type', 'lag'];
      case 'resources':
        return ['id', 'name', 'color', 'role', 'cost', 'availability'];
      default:
        return [];
    }
  }

  /**
   * 下载文件
   * @param fileName 文件名
   * @param content 文件内容
   * @param mimeType MIME类型
   */
  private downloadFile(fileName: string, content: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }
}

// 导出默认的实例创建函数
export default function createDataExporter(
  tasks: Task[] = [],
  dependencies: Dependency[] = [],
  resources: Resource[] = []
): DataExporter {
  return new DataExporter(tasks, dependencies, resources);
} 