/**
 * 任务管理器
 * @module TaskManager
 * @description 负责任务的创建、编辑、删除和状态管理
 */

import { Task, TaskId, Dependency, DependencyType, TaskType } from './types';
import { DateUtils } from './utils';

/**
 * 任务管理器配置选项
 */
export interface TaskManagerOptions {
  /** 是否自动计算任务持续时间 */
  autoCalculateDuration?: boolean;
  /** 是否自动计算任务进度 */
  autoCalculateProgress?: boolean;
  /** 是否检查循环依赖 */
  checkCircularDependencies?: boolean;
  /** 默认任务类型 */
  defaultTaskType?: TaskType;
  /** 默认任务颜色 */
  defaultTaskColor?: string;
  /** 默认里程碑颜色 */
  defaultMilestoneColor?: string;
  /** 默认项目颜色 */
  defaultProjectColor?: string;
}

/**
 * 任务管理器类
 * 提供任务的创建、编辑、删除和状态管理功能
 */
export class TaskManager {
  /** 任务列表 */
  private tasks: Task[] = [];
  /** 依赖关系列表 */
  private dependencies: Dependency[] = [];
  /** 配置选项 */
  private options: TaskManagerOptions;
  /** 任务ID计数器 */
  private nextId: number = 1;

  /**
   * 创建任务管理器实例
   * @param options 配置选项
   */
  constructor(options: TaskManagerOptions = {}) {
    this.options = {
      autoCalculateDuration: true,
      autoCalculateProgress: false,
      checkCircularDependencies: true,
      defaultTaskType: 'task',
      defaultTaskColor: '#4e85c5',
      defaultMilestoneColor: '#722ed1',
      defaultProjectColor: '#fa8c16',
      ...options
    };
  }

  /**
   * 设置任务列表
   * @param tasks 任务列表
   */
  setTasks(tasks: Task[]): void {
    this.tasks = tasks;
    // 更新ID计数器
    this._updateNextId();
  }

  /**
   * 设置依赖关系列表
   * @param dependencies 依赖关系列表
   */
  setDependencies(dependencies: Dependency[]): void {
    this.dependencies = dependencies;
    // 检查循环依赖
    if (this.options.checkCircularDependencies) {
      this.checkCircularDependencies();
    }
  }

  /**
   * 获取任务列表
   * @returns 任务列表
   */
  getTasks(): Task[] {
    return [...this.tasks];
  }

  /**
   * 获取依赖关系列表
   * @returns 依赖关系列表
   */
  getDependencies(): Dependency[] {
    return [...this.dependencies];
  }

  /**
   * 创建新任务
   * @param taskData 任务数据
   * @returns 创建的任务
   */
  createTask(taskData: Partial<Task>): Task {
    // 生成唯一ID
    const id = taskData.id || this._generateId();

    // 设置默认值
    const start = taskData.start ? DateUtils.parseDate(taskData.start) : new Date();
    const end = taskData.end ? DateUtils.parseDate(taskData.end) : DateUtils.addDays(start, 1);

    // 根据任务类型设置默认颜色
    let color = taskData.color;
    if (!color) {
      switch (taskData.type) {
        case 'milestone':
          color = this.options.defaultMilestoneColor;
          break;
        case 'project':
          color = this.options.defaultProjectColor;
          break;
        default:
          color = this.options.defaultTaskColor;
      }
    }

    // 创建任务对象
    const newTask: Task = {
      id,
      name: taskData.name || `任务 ${id}`,
      start: DateUtils.format(start),
      end: DateUtils.format(end),
      type: taskData.type || this.options.defaultTaskType,
      progress: taskData.progress || 0,
      color,
      collapsed: taskData.collapsed || false,
      draggable: taskData.draggable !== false,
      resizable: taskData.resizable !== false,
      readonly: taskData.readonly || false,
      dependencies: taskData.dependencies || [],
      dependsOn: taskData.dependsOn || [],
      parentId: taskData.parentId,
      assignees: taskData.assignees || [],
      assignee: taskData.assignee,
      children: taskData.children || [],
      metadata: taskData.metadata || {},
      critical: taskData.critical || false
    };

    // 添加到任务列表
    this.tasks.push(newTask);

    // 如果有父任务，更新父任务的子任务列表
    if (newTask.parentId) {
      this._updateParentTaskChildren(newTask.parentId);
    }

    return newTask;
  }

  /**
   * 更新任务
   * @param taskId 任务ID
   * @param updates 更新数据
   * @returns 更新后的任务
   */
  updateTask(taskId: TaskId, updates: Partial<Task>): Task | null {
    const taskIndex = this.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return null;

    // 更新任务
    const updatedTask = {
      ...this.tasks[taskIndex],
      ...updates
    };

    // 处理日期格式
    if (updates.start) {
      updatedTask.start = DateUtils.format(DateUtils.parseDate(updates.start));
    }
    if (updates.end) {
      updatedTask.end = DateUtils.format(DateUtils.parseDate(updates.end));
    }

    // 更新任务列表
    this.tasks[taskIndex] = updatedTask;

    // 如果有父任务变化，更新父子关系
    if (updates.parentId !== undefined && updates.parentId !== this.tasks[taskIndex].parentId) {
      // 移除旧父任务的子任务引用
      const oldParentId = this.tasks[taskIndex].parentId;
      if (oldParentId !== undefined) {
        this._updateParentTaskChildren(oldParentId);
      }
      // 添加新父任务的子任务引用
      if (updates.parentId) {
        this._updateParentTaskChildren(updates.parentId);
      }
    }

    return updatedTask;
  }

  /**
   * 删除任务
   * @param taskId 任务ID
   * @returns 是否删除成功
   */
  deleteTask(taskId: TaskId): boolean {
    const taskIndex = this.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return false;

    const task = this.tasks[taskIndex];

    // 收集所有需要删除的任务ID（包括所有后代）
    // 使用 parentId 从 tasks 列表查找子任务，而非依赖 children 数组
    const tasksToDelete = new Set<TaskId>();

    const collectTasksToDelete = (id: TaskId) => {
      tasksToDelete.add(id);
      // 从 tasks 列表中查找所有 parentId 为当前 id 的任务
      this.tasks
        .filter(t => t.parentId === id)
        .forEach(child => collectTasksToDelete(child.id));
    };

    collectTasksToDelete(taskId);

    // 保存父任务ID用于后续更新
    const parentId = task.parentId;

    // 删除所有相关依赖关系
    this.dependencies = this.dependencies.filter(
      d => !tasksToDelete.has(d.fromId) && !tasksToDelete.has(d.toId)
    );

    // 从任务列表中删除所有任务
    this.tasks = this.tasks.filter(t => !tasksToDelete.has(t.id));

    // 更新父任务的子任务列表（如果父任务没有被删除）
    if (parentId && !tasksToDelete.has(parentId)) {
      this._updateParentTaskChildren(parentId);
    }

    return true;
  }

  /**
   * 创建依赖关系
   * @param fromId 源任务ID
   * @param toId 目标任务ID
   * @param type 依赖关系类型
   * @param lag 延迟天数
   * @returns 创建的依赖关系
   */
  createDependency(fromId: TaskId, toId: TaskId, type: DependencyType = 'finish_to_start', lag: number = 0): Dependency | null {
    // 检查源任务和目标任务是否存在
    const fromTask = this.tasks.find(t => t.id === fromId);
    const toTask = this.tasks.find(t => t.id === toId);
    if (!fromTask || !toTask) return null;

    // 检查是否已经存在相同的依赖关系
    const existingDependency = this.dependencies.find(
      dep => dep.fromId === fromId && dep.toId === toId && dep.type === type
    );
    if (existingDependency) return existingDependency;

    // 创建依赖关系
    const dependency: Dependency = {
      fromId,
      toId,
      type,
      lag
    };

    // 添加到依赖关系列表
    this.dependencies.push(dependency);

    // 更新任务的依赖关系引用
    this._updateTaskDependencies();

    // 检查循环依赖
    if (this.options.checkCircularDependencies) {
      if (this._checkCircularDependency(dependency)) {
        // 如果检测到循环依赖，删除刚刚创建的依赖关系
        this.dependencies.pop();
        this._updateTaskDependencies();
        return null;
      }
    }

    return dependency;
  }

  /**
   * 删除依赖关系
   * @param fromId 源任务ID
   * @param toId 目标任务ID
   * @returns 是否删除成功
   */
  deleteDependency(fromId: TaskId, toId: TaskId): boolean {
    const depIndex = this.dependencies.findIndex(
      dep => dep.fromId === fromId && dep.toId === toId
    );
    if (depIndex === -1) return false;

    // 删除依赖关系
    this.dependencies.splice(depIndex, 1);

    // 更新任务的依赖关系引用
    this._updateTaskDependencies();

    return true;
  }

  /**
   * 更新任务的依赖关系引用
   * @private
   */
  private _updateTaskDependencies(): void {
    // 清空所有任务的依赖关系
    this.tasks.forEach(task => {
      task.dependsOn = [];
      task.dependencies = [];
    });

    // 更新依赖关系
    this.dependencies.forEach(dep => {
      // 更新源任务的依赖关系列表
      const fromTask = this.tasks.find(t => t.id === dep.fromId);
      if (fromTask) {
        if (!fromTask.dependencies) {
          fromTask.dependencies = [];
        }
        fromTask.dependencies.push(dep.toId);
      }

      // 更新目标任务的依赖关系列表
      const toTask = this.tasks.find(t => t.id === dep.toId);
      if (toTask) {
        if (!toTask.dependsOn) {
          toTask.dependsOn = [];
        }
        toTask.dependsOn.push(dep.fromId);
      }
    });
  }

  /**
   * 更新父任务的子任务列表
   * @param parentId 父任务ID
   * @private
   */
  private _updateParentTaskChildren(parentId: TaskId): void {
    const parentTask = this.tasks.find(t => t.id === parentId);
    if (!parentTask) return;

    // 获取所有直接子任务
    const children = this.tasks.filter(t => t.parentId === parentId);
    parentTask.children = children;
  }

  /**
   * 检查循环依赖
   * @returns 是否存在循环依赖
   */
  checkCircularDependencies(): boolean {
    // 构建依赖图
    const graph = new Map<TaskId, TaskId[]>();
    this.dependencies.forEach(dep => {
      if (!graph.has(dep.fromId)) {
        graph.set(dep.fromId, []);
      }
      graph.get(dep.fromId)!.push(dep.toId);
    });

    // 使用DFS检测循环
    const visited = new Set<TaskId>();
    const recursionStack = new Set<TaskId>();

    const hasCycle = (taskId: TaskId): boolean => {
      if (recursionStack.has(taskId)) {
        return true; // 检测到循环
      }

      if (visited.has(taskId)) {
        return false; // 已访问过，无循环
      }

      visited.add(taskId);
      recursionStack.add(taskId);

      const dependencies = graph.get(taskId) || [];
      for (const depId of dependencies) {
        if (hasCycle(depId)) {
          return true;
        }
      }

      recursionStack.delete(taskId);
      return false;
    };

    // 检查所有任务
    for (const task of this.tasks) {
      if (hasCycle(task.id)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 检查特定依赖关系是否导致循环依赖
   * @param dependency 依赖关系
   * @returns 是否导致循环依赖
   * @private
   * @deprecated 使用 checkCircularDependencies 代替
   */
  private _checkCircularDependency(dependency: Dependency): boolean {
    // 这个方法已被 checkCircularDependencies 替代
    return this.checkCircularDependencies();
  }
  /**
   * 生成唯一任务ID
   * @returns 唯一ID
   * @private
   */
  private _generateId(): number {
    while (this.tasks.some(t => t.id === this.nextId)) {
      this.nextId++;
    }
    return this.nextId;
  }

  /**
   * 更新ID计数器
   * @private
   */
  private _updateNextId(): void {
    if (this.tasks.length === 0) {
      this.nextId = 1;
      return;
    }

    // 找到最大的数字ID
    const maxId = Math.max(
      ...this.tasks
        .map(t => typeof t.id === 'number' ? t.id : 0)
        .filter(id => id > 0)
    );

    this.nextId = maxId + 1;
  }

  /**
   * 获取任务的所有后代任务
   * @param taskId 任务ID
   * @returns 后代任务列表
   */
  getDescendantTasks(taskId: TaskId): Task[] {
    const descendants: Task[] = [];
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return descendants;

    const collectDescendants = (currentTask: Task) => {
      if (currentTask.children) {
        currentTask.children.forEach(child => {
          descendants.push(child);
          collectDescendants(child);
        });
      }
    };

    collectDescendants(task);
    return descendants;
  }

  /**
   * 获取任务的所有祖先任务
   * @param taskId 任务ID
   * @returns 祖先任务列表（从直接父任务到最远祖先）
   */
  getAncestorTasks(taskId: TaskId): Task[] {
    const ancestors: Task[] = [];
    let currentTask: Task | undefined = this.tasks.find(t => t.id === taskId);

    while (currentTask && currentTask.parentId) {
      const parent = this.tasks.find(t => t.id === currentTask!.parentId);
      if (parent) {
        ancestors.push(parent);
        currentTask = parent;
      } else {
        break;
      }
    }

    return ancestors;
  }

  /**
   * 根据类型获取任务列表
   * @param type 任务类型
   * @returns 任务列表
   */
  getTasksByType(type: TaskType): Task[] {
    return this.tasks.filter(t => t.type === type);
  }

  /**
   * 获取所有里程碑任务
   * @returns 里程碑任务列表
   */
  getMilestones(): Task[] {
    return this.getTasksByType('milestone');
  }

  /**
   * 获取所有项目任务
   * @returns 项目任务列表
   */
  getProjects(): Task[] {
    return this.getTasksByType('project');
  }

  /**
   * 获取所有普通任务
   * @returns 普通任务列表
   */
  getRegularTasks(): Task[] {
    return this.getTasksByType('task');
  }

  /**
   * 计算任务的持续时间（天数）
   * @param task 任务
   * @returns 持续时间（天数）
   */
  calculateTaskDuration(task: Task): number {
    const start = DateUtils.parseDate(task.start);
    const end = DateUtils.parseDate(task.end);
    return DateUtils.daysBetween(start, end) + 1;
  }

  /**
   * 计算项目的完成进度
   * @param projectId 项目ID
   * @returns 完成进度（0-100）
   */
  calculateProjectProgress(projectId: TaskId): number {
    const project = this.tasks.find(t => t.id === projectId && t.type === 'project');
    if (!project) return 0;

    // 获取项目的所有子任务
    const directChildren = project.children || [];
    const allTasks = [...directChildren, ...this.getDescendantTasks(projectId)];
    if (allTasks.length === 0) return 0;

    // 计算总进度
    const totalProgress = allTasks.reduce((sum, task) => sum + (task.progress || 0), 0);
    return Math.round(totalProgress / allTasks.length);
  }
}

// 导出默认的实例创建函数
export default function createTaskManager(options?: TaskManagerOptions): TaskManager {
  return new TaskManager(options);
}