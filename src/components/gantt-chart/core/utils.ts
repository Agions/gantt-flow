/**
 * 甘特图工具函数库
 * @module utils
 * @description 提供日期处理、任务操作、DOM操作和导出功能等工具函数
 */
import {
  Task,
  Resource,
  Dependency,
  TaskId,
  ExportOptions,
} from './types';

// 动态导入配置
const dynamicImports = {
  htmlToImage: (): Promise<typeof import('html-to-image')> => import('html-to-image'),
  jsPDF: (): Promise<typeof import('jspdf')> => import('jspdf')
};

/**
 * 日期工具函数命名空间
 */
export const DateUtils = {
  /**
   * 解析日期字符串为Date对象
   * @param dateStr 日期字符串或日期对象
   * @returns Date对象
   */
  parseDate(dateStr: string | Date): Date {
    if (!dateStr) return new Date();
    if (dateStr instanceof Date) return dateStr;

    // 尝试解析ISO格式的日期字符串
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }

    // 尝试解析YYYY-MM-DD格式
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return new Date(
        parseInt(parts[0], 10),
        parseInt(parts[1], 10) - 1,
        parseInt(parts[2], 10)
      );
    }

    return new Date();
  },

  /**
   * 格式化日期为字符串
   * @param date 日期对象
   * @param format 格式化模式，默认为YYYY-MM-DD
   * @returns 格式化后的日期字符串
   */
  format(date: Date, format: string = 'YYYY-MM-DD'): string {
    if (!date) return '';

    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    return format
      .replace('YYYY', year.toString())
      .replace('MM', month < 10 ? `0${month}` : month.toString())
      .replace('DD', day < 10 ? `0${day}` : day.toString());
  },

  /**
   * 计算两个日期之间的天数差
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @returns 天数差
   */
  daysBetween(startDate: Date | string, endDate: Date | string): number {
    const start = startDate instanceof Date ? startDate : this.parseDate(startDate);
    const end = endDate instanceof Date ? endDate : this.parseDate(endDate);

    const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
    const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());

    return Math.floor((endUtc - startUtc) / (1000 * 60 * 60 * 24));
  },

  /**
   * 在日期上添加指定天数
   * @param date 原始日期
   * @param days 添加的天数
   * @returns 新的日期
   */
  addDays(date: Date | string, days: number): Date {
    const result = new Date(this.parseDate(date instanceof Date ? date : date).getTime());
    result.setDate(result.getDate() + days);
    return result;
  },

  /**
   * 在日期上添加指定月数
   * @param date 原始日期
   * @param months 添加的月数
   * @returns 新的日期
   */
  addMonths(date: Date | string, months: number): Date {
    const result = new Date(this.parseDate(date instanceof Date ? date : date).getTime());
    result.setMonth(result.getMonth() + months);
    return result;
  },

  /**
   * 获取给定日期所在月份的第一天
   * @param date 日期
   * @returns 当月第一天
   */
  getFirstDayOfMonth(date: Date | string): Date {
    const result = this.parseDate(date instanceof Date ? date : date);
    result.setDate(1);
    return result;
  },

  /**
   * 获取给定日期所在月份的最后一天
   * @param date 日期
   * @returns 当月最后一天
   */
  getLastDayOfMonth(date: Date | string): Date {
    const result = this.parseDate(date instanceof Date ? date : date);
    result.setMonth(result.getMonth() + 1);
    result.setDate(0);
    return result;
  },

  /**
   * 获取给定日期是一年中的第几周
   * @param date 日期
   * @returns 周数
   */
  getWeekNumber(date: Date | string): number {
    const parsedDate = this.parseDate(date instanceof Date ? date : date.toString());
    const startOfYear = new Date(parsedDate.getFullYear(), 0, 1);
    const days = Math.floor((parsedDate.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((parsedDate.getDay() + 1 + days) / 7);
  },

  /**
   * 获取月份名称
     * @param date 日期
     * @param short 是否返回缩写
     * @param locale 地区设置
     * @returns 月份名称
     */
  getMonthName(date: Date | string, short: boolean = false, locale: string = 'zh-CN'): string {
    const parsedDate = this.parseDate(date instanceof Date ? date : date.toString());
    const options: Intl.DateTimeFormatOptions = { month: short ? 'short' : 'long' };
    return parsedDate.toLocaleDateString(locale, options);
  },

  /**
   * 判断日期是否为工作日
   * @param date 日期
   * @returns 是否为工作日
   */
  isWeekday(date: Date | string): boolean {
    const parsedDate = this.parseDate(date instanceof Date ? date : date.toString());
    const day = parsedDate.getDay();
    return day !== 0 && day !== 6; // 0是周日，6是周六
  }
};

/**
 * 自动计算任务列表的日期范围
 * @param tasks 任务列表
 * @param padding 前后填充的天数
 * @returns 开始和结束日期
 */
export function calculateAutoDateRange(tasks: any[], padding: number = 7): { start: Date, end: Date } {
  if (!tasks || tasks.length === 0) {
    const today = new Date();
    return {
      start: DateUtils.addDays(today, -padding),
      end: DateUtils.addDays(today, padding)
    };
  }

  let earliest = new Date();
  let latest = new Date();
  let hasSetDates = false;

  tasks.forEach(task => {
    if (task.start) {
      const startDate = DateUtils.parseDate(task.start);
      if (!hasSetDates || startDate < earliest) {
        earliest = startDate;
      }
    }

    if (task.end) {
      const endDate = DateUtils.parseDate(task.end);
      if (!hasSetDates || endDate > latest) {
        latest = endDate;
      }
    }

    hasSetDates = true;
  });

  return {
    start: DateUtils.addDays(earliest, -padding),
    end: DateUtils.addDays(latest, padding)
  };
}

/**
 * 任务工具类
 * @namespace TaskUtils
 */
export const TaskUtils = {
  /**
   * 计算任务持续时间（天）
   * @param task 任务对象
   * @returns 持续天数
   */
  calculateDuration: (task: Task): number => {
    const start = task.start instanceof Date ? task.start : DateUtils.parseDate(task.start);
    const end = task.end instanceof Date ? task.end : DateUtils.parseDate(task.end);
    return DateUtils.daysBetween(start, end);
  },

  /**
   * 检查两个任务是否时间重叠
   * @param task1 第一个任务
   * @param task2 第二个任务
   * @returns 是否重叠
   */
  tasksOverlap: (task1: Task, task2: Task): boolean => {
    const start1 = DateUtils.parseDate(task1.start);
    const end1 = DateUtils.parseDate(task1.end);
    const start2 = DateUtils.parseDate(task2.start);
    const end2 = DateUtils.parseDate(task2.end);

    // 任务1在任务2之前 或 任务1在任务2之后
    return !(end1 < start2 || start1 > end2);
  },

  /**
   * 展平任务树为一维数组
   * @param tasks 任务树
   * @returns 展平后的任务数组
   */
  flattenTasks: (tasks: Task[]): Task[] => {
    const result: Task[] = [];

    const flatten = (taskList: Task[]) => {
      taskList.forEach(task => {
        result.push(task);
        if (task.children && task.children.length > 0) {
          flatten(task.children);
        }
      });
    };

    flatten(tasks);
    return result;
  },

  /**
   * 从扁平任务列表构建任务树
   * @param tasks 扁平任务列表
   * @returns 任务树
   */
  buildTaskTree: (tasks: Task[]): Task[] => {
    const taskMap = new Map<TaskId, Task>();
    const rootTasks: Task[] = [];

    // 首先创建任务映射
    tasks.forEach(task => {
      taskMap.set(task.id, { ...task, children: [] });
    });

    // 然后建立父子关系
    tasks.forEach(task => {
      if (task.parentId && taskMap.has(task.parentId)) {
        const parent = taskMap.get(task.parentId);
        if (parent && parent.children) {
          parent.children.push(taskMap.get(task.id) as Task);
        }
      } else {
        rootTasks.push(taskMap.get(task.id) as Task);
      }
    });

    return rootTasks;
  },

  /**
   * 自动排程任务
   * @param tasks 任务列表
   * @param dependencies 依赖关系列表
   * @returns 排程后的任务列表
   */
  autoScheduleTasks: (tasks: Task[], dependencies: Dependency[]): Task[] => {
    // 创建任务副本
    const tasksCopy = tasks.map(task => ({ ...task }));
    const taskMap = new Map<TaskId, Task>();

    // 创建任务映射
    tasksCopy.forEach(task => {
      taskMap.set(task.id, task);
    });

    // 检查是否有循环依赖
    if (TaskUtils.hasCyclicDependencies(dependencies)) {
      console.warn('检测到循环依赖，自动排程可能不准确');
    }

    // 按照依赖关系拓扑排序
    const visited = new Set<TaskId>();
    const result: Task[] = [];

    const visit = (taskId: TaskId) => {
      if (visited.has(taskId)) return;
      visited.add(taskId);

      // 查找所有前置依赖
      dependencies
        .filter(dep => dep.toId === taskId)
        .forEach(dep => {
          visit(dep.fromId);
        });

      const task = taskMap.get(taskId);
      if (task) result.push(task);
    };

    tasksCopy.forEach(task => {
      if (!visited.has(task.id)) {
        visit(task.id);
      }
    });

    // 按依赖关系调整任务日期
    result.forEach(task => {
      const incomingDeps = dependencies.filter(dep => dep.toId === task.id);

      if (incomingDeps.length > 0) {
        let maxEndDate = new Date(0);

        incomingDeps.forEach(dep => {
          const predecessor = taskMap.get(dep.fromId);
          if (predecessor) {
            const endDate = DateUtils.parseDate(predecessor.end);
            if (endDate > maxEndDate) {
              maxEndDate = new Date(endDate);
            }
          }
        });

        if (maxEndDate.getTime() > 0) {
          const newStartDate = DateUtils.addDays(maxEndDate, 1);
          const duration = TaskUtils.calculateDuration(task);
          const newEndDate = DateUtils.addDays(newStartDate, duration);

          task.start = DateUtils.format(newStartDate);
          task.end = DateUtils.format(newEndDate);
        }
      }
    });

    return result;
  },

  /**
   * 检查依赖关系中是否存在循环
   * @param dependencies 依赖关系列表
   * @returns 是否存在循环依赖
   */
  hasCyclicDependencies: (dependencies: Dependency[]): boolean => {
    const graph = new Map<TaskId, TaskId[]>();

    // 构建依赖图
    dependencies.forEach(dep => {
      if (!graph.has(dep.fromId)) {
        graph.set(dep.fromId, []);
      }
      graph.get(dep.fromId)?.push(dep.toId);
    });

    const visited = new Set<TaskId>();
    const recStack = new Set<TaskId>();

    const isCyclic = (nodeId: TaskId): boolean => {
      if (!visited.has(nodeId)) {
        visited.add(nodeId);
        recStack.add(nodeId);

        const neighbors = graph.get(nodeId) || [];
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor) && isCyclic(neighbor)) {
            return true;
          } else if (recStack.has(neighbor)) {
            return true;
          }
        }
      }

      recStack.delete(nodeId);
      return false;
    };

    // 对每个节点进行检查
    Array.from(graph.entries()).forEach(([nodeId]) => {
      if (!visited.has(nodeId) && isCyclic(nodeId)) {
        return true;
      }
    });

    return false;
  }
};

/**
 * UI工具类
 * @namespace UIUtils
 */
export const UIUtils = {
  /**
   * 生成随机颜色
   * @returns 随机颜色代码
   */
  randomColor: (): string => {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  },

  /**
   * 检测元素是否在可视区域内
   * @param element 元素
   * @param container 容器
   * @returns 是否在可视区域内
   */
  isElementInView: (element: HTMLElement, container: HTMLElement): boolean => {
    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    return (
      elementRect.top >= containerRect.top &&
      elementRect.left >= containerRect.left &&
      elementRect.bottom <= containerRect.bottom &&
      elementRect.right <= containerRect.right
    );
  }
};

/**
 * 导出工具类
 * @namespace ExportUtils
 */
export const ExportUtils = {
  /**
   * 导出甘特图为图片
   * @param element 甘特图元素
   * @param options 导出选项
   * @returns 图片数据URL
   */
  exportToImage: async (element: HTMLElement, options: ExportOptions = {}): Promise<string> => {
    // 根据ExportOptions类型定义提取属性
    const scale = options.scale || 2;
    const quality = options.quality || 0.92;
    const backgroundColor = '#FFFFFF'; // 默认背景色

    try {
      // 动态导入html-to-image库
      const htmlToImage = await dynamicImports.htmlToImage();

      return await htmlToImage.toPng(element, {
        backgroundColor,
        pixelRatio: scale,
        quality
      });
    } catch (error) {
      console.error('导出图片失败:', error);
      throw error;
    }
  },

  /**
   * 导出甘特图为PDF
   * @param element 甘特图元素
   * @param options 导出选项
   * @returns PDF Blob
   */
  exportToPDF: async (element: HTMLElement, options: ExportOptions = {}): Promise<Blob> => {
    // 根据ExportOptions类型定义提取属性
    const filename = options.filename || 'gantt-chart';

    try {
      // 动态导入库
      const htmlToImage = await dynamicImports.htmlToImage();
      const jsPDF = (await dynamicImports.jsPDF()).default;

      // 获取图片数据
      const dataUrl = await ExportUtils.exportToImage(element, options);

      // 创建PDF
      const pdf = new jsPDF({
        orientation: 'landscape', // 默认横向
        unit: 'mm'
      });

      // 获取图片尺寸
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const widthRatio = pdfWidth / imgProps.width;
      const heightRatio = pdfHeight / imgProps.height;
      const ratio = Math.min(widthRatio, heightRatio) * 0.9; // 留出一些边距

      const imgWidth = imgProps.width * ratio;
      const imgHeight = imgProps.height * ratio;
      const x = (pdfWidth - imgWidth) / 2;
      const y = (pdfHeight - imgHeight) / 2;

      pdf.addImage(dataUrl, 'PNG', x, y, imgWidth, imgHeight);

      return pdf.output('blob');
    } catch (error) {
      console.error('导出PDF失败:', error);
      throw error;
    }
  }
};

/**
 * 示例生成器
 * @namespace ExampleGenerator
 */
export const ExampleGenerator = {
  /**
   * 生成示例任务数据
   * @param count 要生成的任务数量
   * @param startDate 开始日期，默认为当前日期
   * @returns 任务和依赖关系数据
   */
  generateSampleTasks(count: number = 10, startDate?: Date | string): { tasks: Task[], dependencies: Dependency[] } {
    // 确保startDate是Date对象
    const start = startDate
      ? (startDate instanceof Date ? startDate : DateUtils.parseDate(startDate))
      : new Date();

    const tasks: Task[] = [];
    const dependencies: Dependency[] = [];

    // 生成项目任务
    const projectTask: Task = {
      id: 'project_1',
      name: '示例项目',
      start: DateUtils.format(start),
      end: DateUtils.format(DateUtils.addDays(start, count * 3 + 10)),
      progress: 0,
      type: 'project'
    };

    tasks.push(projectTask);

    // 生成普通任务
    for (let i = 0; i < count; i++) {
      const taskStart = DateUtils.addDays(start, i * 3);
      const taskEnd = DateUtils.addDays(taskStart, 2 + Math.floor(Math.random() * 5));
      const progress = Math.floor(Math.random() * 100);

      const task: Task = {
        id: `task_${i + 1}`,
        name: `任务 ${i + 1}`,
        start: DateUtils.format(taskStart),
        end: DateUtils.format(taskEnd),
        progress,
        type: 'task'
      };

      tasks.push(task);

      // 任务依赖前一个任务（除了第一个任务）
      if (i > 0) {
        dependencies.push({
          fromId: `task_${i}`,
          toId: `task_${i + 1}`,
          type: 'finish_to_start'
        });
      }

      // 所有任务依赖项目任务
      dependencies.push({
        fromId: 'project_1',
        toId: `task_${i + 1}`,
        type: 'start_to_start'
      });
    }

    // 添加一个里程碑
    const milestoneDate = DateUtils.addDays(start, count * 3);
    tasks.push({
      id: 'milestone_1',
      name: '项目完成',
      start: DateUtils.format(milestoneDate),
      end: DateUtils.format(milestoneDate),
      progress: 0,
      type: 'milestone'
    });

    // 里程碑依赖最后一个任务
    dependencies.push({
      fromId: `task_${count}`,
      toId: 'milestone_1',
      type: 'finish_to_start'
    });

    return { tasks, dependencies };
  },

  /**
   * 生成示例任务
   * @param count 任务数量
   * @returns 示例任务列表
   */
  generateTasks: (count: number = 10): Task[] => {
    const tasks: Task[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const taskTypes = ['task', 'milestone', 'project'];
    const colors = ['#4e85c5', '#9c27b0', '#ff9800', '#4caf50', '#e91e63'];

    for (let i = 0; i < count; i++) {
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() + i * 2);

      const durationDays = Math.floor(Math.random() * 10) + 1;
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + durationDays);

      tasks.push({
        id: `task-${i + 1}`,
        name: `示例任务 ${i + 1}`,
        start: DateUtils.format(startDate),
        end: DateUtils.format(endDate),
        progress: Math.floor(Math.random() * 100),
        type: taskTypes[i % taskTypes.length] as any,
        color: colors[i % colors.length],
        collapsed: false,
        draggable: true,
        resizable: true
      });
    }

    return tasks;
  },

  /**
   * 生成示例依赖关系
   * @param tasks 任务列表
   * @param count 依赖关系数量
   * @returns 示例依赖关系列表
   */
  generateDependencies: (tasks: Task[], count: number = 5): Dependency[] => {
    const dependencies: Dependency[] = [];
    const taskIds = tasks.map(task => task.id);

    if (taskIds.length < 2 || count <= 0) return dependencies;

    for (let i = 0; i < Math.min(count, taskIds.length - 1); i++) {
      dependencies.push({
        fromId: taskIds[i],
        toId: taskIds[i + 1],
        type: "finish_to_start"  // 使用正确的依赖类型
      });
    }

    return dependencies;
  },

  /**
   * 生成示例资源
   * @param count 资源数量
   * @returns 示例资源列表
   */
  generateResources: (count: number = 5): Resource[] => {
    const resources: Resource[] = [];
    const roles = ['开发', '设计', '测试', '产品', '项目管理'];

    for (let i = 0; i < count; i++) {
      resources.push({
        id: `resource-${i + 1}`,
        name: `资源 ${i + 1}`,
        color: UIUtils.randomColor(),
        role: roles[i % roles.length],
        cost: Math.floor(Math.random() * 500) + 100,
        availability: Math.floor(Math.random() * 50) + 50
      });
    }

    return resources;
  }
};

/**
 * 深度合并对象
 * @param objects 要合并的对象
 * @returns 合并后的对象
 */
export function deepMerge<T>(...objects: any[]): T {
  const result: any = {};

  objects.forEach(obj => {
    if (!obj) return;

    Object.keys(obj).forEach(key => {
      const value = obj[key];

      if (Array.isArray(value)) {
        result[key] = [...value];
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = deepMerge(result[key] || {}, value);
      } else {
        result[key] = value;
      }
    });
  });

  return result as T;
}

// 辅助功能函数

/**
 * 防抖函数
 * @param func 要执行的函数
 * @param wait 等待时间（毫秒）
 * @param immediate 是否立即执行
 * @returns 防抖处理后的函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate: boolean = false
): (...args: Parameters<T>) => void {
  let timeout: number | null = null;

  return function (this: any, ...args: Parameters<T>): void {
    const context = this;
    const later = function () {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };

    const callNow = immediate && !timeout;

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(later, wait) as unknown as number;

    if (callNow) {
      func.apply(context, args);
    }
  };
}

/**
 * 节流函数
 * @param func 要执行的函数
 * @param limit 限制时间（毫秒）
 * @returns 节流处理后的函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let lastFunc: number | null = null;
  let lastRan: number = 0;

  return function (this: any, ...args: Parameters<T>): void {
    const context = this;
    const now = Date.now();

    if (now - lastRan >= limit) {
      // 如果已经超过限制时间，立即执行
      func.apply(context, args);
      lastRan = now;
    } else {
      // 否则设置定时器，在剩余时间后执行
      if (lastFunc) {
        clearTimeout(lastFunc);
      }

      lastFunc = window.setTimeout(() => {
        func.apply(context, args);
        lastRan = Date.now();
        lastFunc = null;
      }, limit - (now - lastRan));
    }
  };
}

// 导出随机颜色简便函数
export const randomColor = UIUtils.randomColor;

// 为兼容性保留旧的函数名
export const formatDate = DateUtils.format.bind(DateUtils);
export const parseDate = DateUtils.parseDate.bind(DateUtils);
export const daysBetween = DateUtils.daysBetween.bind(DateUtils);
export const addDays = DateUtils.addDays.bind(DateUtils);
export const getWeekNumber = DateUtils.getWeekNumber.bind(DateUtils);
export const getMonthName = DateUtils.getMonthName.bind(DateUtils);

// 导出默认对象
export default {
  DateUtils,
  TaskUtils,
  UIUtils,
  ExportUtils,
  ExampleGenerator,
  calculateAutoDateRange,
  randomColor,
  debounce,
  throttle,
  deepMerge
}; 