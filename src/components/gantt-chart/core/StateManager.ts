/**
 * StateManager.ts
 * 甘特图状态管理类，负责状态维护、缓存优化和历史记录
 * @module StateManager
 */

import { 
  Task, 
  Dependency, 
  ViewMode, 
  TaskId, 
  GanttState, 
  ActionType, 
  GanttAction,
  Resource
} from './types';
import { deepMerge } from './utils';

/**
 * 视图设置接口
 * @interface ViewSettings
 */
export interface ViewSettings {
  /** 视图模式 */
  mode: ViewMode;
  /** 滚动位置 */
  scrollPosition: number;
  /** 缩放级别 */
  zoomLevel: number;
  /** 任务列表宽度 */
  taskListWidth: number;
  /** 时间线宽度 */
  timelineWidth: number;
  /** 开始日期 */
  startDate?: Date | string;
  /** 结束日期 */
  endDate?: Date | string;
  /** 比例 */
  scale?: number;
}

/**
 * 虚拟滚动配置接口
 * @interface VirtualScrollConfig
 */
export interface VirtualScrollConfig {
  /** 开始索引 */
  startIndex: number;
  /** 结束索引 */
  endIndex: number;
  /** 可见任务数量 */
  visibleCount: number;
  /** 缓冲区大小 */
  bufferSize: number;
  /** 总高度 */
  totalHeight: number;
  /** 行高 */
  rowHeight: number;
}

/**
 * 甘特图配置接口
 * @interface GanttConfig
 */
export interface GanttConfig {
  /** 列宽 */
  columnWidth: number;
  /** 行高 */
  rowHeight: number;
  /** 是否显示周末 */
  showWeekends: boolean;
  /** 是否显示今天线 */
  showToday: boolean;
  /** 是否显示行线 */
  showRowLines: boolean;
  /** 是否显示列线 */
  showColumnLines: boolean;
  /** 是否启用依赖关系 */
  enableDependencies: boolean;
  /** 是否启用拖拽 */
  enableDragging: boolean;
  /** 是否启用调整大小 */
  enableResizing: boolean;
  /** 是否启用进度条调整 */
  enableProgress: boolean;
  /** 是否尊重依赖关系 */
  respectDependencies: boolean;
  /** 语言设置 */
  locale: string;
}

/**
 * 缓存任务接口
 * @interface CachedTask
 */
export interface CachedTask extends Task {
  /** 依赖的任务ID列表 */
  dependencies: TaskId[];
  /** 被依赖的任务ID列表 */
  dependents: TaskId[];
  /** 任务层级 */
  level: number;
  /** 是否可见 */
  visible: boolean;
  /** 任务持续时间(天) */
  duration: number;
  /** 计算好的坐标 */
  layout?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * 状态管理器状态接口
 * @interface StateManagerState
 */
export interface StateManagerState {
  /** 任务列表 */
  tasks: Task[];
  /** 依赖关系列表 */
  dependencies: Dependency[];
  /** 被选中的任务ID列表 */
  selectedTaskIds: TaskId[];
  /** 视图设置 */
  viewSettings: ViewSettings;
  /** 虚拟滚动配置 */
  virtualScroll: VirtualScrollConfig;
  /** 甘特图配置 */
  config: GanttConfig;
  /** 资源列表 */
  resources?: Resource[];
}

/**
 * 状态订阅器类型
 */
export type StateSubscriber = (state: StateManagerState) => void;

/**
 * 状态管理器类，负责管理甘特图状态
 */
export class StateManager {
  /** 当前状态 */
  private _state: StateManagerState;
  /** 历史状态 */
  private _history: StateManagerState[] = [];
  /** 未来状态（用于重做） */
  private _future: StateManagerState[] = [];
  /** 最大历史记录数 */
  private _maxHistorySize: number = 10;
  /** 状态订阅者 */
  private _subscribers: Set<StateSubscriber> = new Set();
  /** 任务缓存 */
  private _taskCache: Map<TaskId, CachedTask> = new Map();
  /** 依赖关系缓存 */
  private _dependencyCache: Map<string, Dependency> = new Map();
  /** 布局缓存 */
  private _layoutCache: Map<TaskId, any> = new Map();
  /** 是否在批量更新中 */
  private _batchUpdate: boolean = false;
  /** 待处理的动作队列 */
  private _pendingActions: GanttAction[] = [];
  
  /**
   * 构造函数
   * @param initialState 初始状态
   */
  constructor(initialState: Partial<StateManagerState> = {}) {
    // 设置默认状态
    this._state = {
      tasks: initialState.tasks || [],
      dependencies: initialState.dependencies || [],
      selectedTaskIds: initialState.selectedTaskIds || [],
      viewSettings: initialState.viewSettings || {
        mode: 'day',
        scrollPosition: 0,
        zoomLevel: 1,
        taskListWidth: 300,
        timelineWidth: 0
      },
      virtualScroll: initialState.virtualScroll || {
        startIndex: 0,
        endIndex: 0,
        visibleCount: 50,
        bufferSize: 20,
        totalHeight: 0,
        rowHeight: 40
      },
      config: initialState.config || {
        columnWidth: 40,
        rowHeight: 40,
        showWeekends: true,
        showToday: true,
        showRowLines: true,
        showColumnLines: true,
        enableDependencies: true,
        enableDragging: true,
        enableResizing: true,
        enableProgress: true,
        respectDependencies: true,
        locale: 'zh-CN'
      }
    };

    // 初始化缓存
    this._initializeCache();
  }

  /**
   * 当前状态的只读访问器
   * @returns {StateManagerState} 当前状态
   */
  public get state(): Readonly<StateManagerState> {
    return { ...this._state };
  }

  /**
   * 当前任务的只读访问器
   * @returns {ReadonlyArray<Task>} 当前任务列表
   */
  public get tasks(): ReadonlyArray<Task> {
    return [...this._state.tasks];
  }

  /**
   * 当前依赖关系的只读访问器
   * @returns {ReadonlyArray<Dependency>} 当前依赖关系列表
   */
  public get dependencies(): ReadonlyArray<Dependency> {
    return [...this._state.dependencies];
  }

  /**
   * 可以撤销的状态数量
   * @returns {number} 可撤销状态数量
   */
  public get undoStackSize(): number {
    return this._history.length;
  }

  /**
   * 可以重做的状态数量
   * @returns {number} 可重做状态数量
   */
  public get redoStackSize(): number {
    return this._future.length;
  }

  /**
   * 初始化缓存
   * @private
   */
  private _initializeCache(): void {
    this._taskCache.clear();
    this._dependencyCache.clear();
    this._layoutCache.clear();
    
    this._updateTaskCache();
    this._updateDependencyCache();
    this._calculateVirtualScrollMetrics();
  }

  /**
   * 更新任务缓存
   * @private
   */
  private _updateTaskCache(): void {
    // 检查是否需要更新任务缓存
    const shouldUpdate = this._shouldUpdateTaskCache();
    if (!shouldUpdate) {
      return;
    }
    
    // 创建基础任务缓存
    this._state.tasks.forEach(task => {
      const taskDuration = this._calculateTaskDuration(task);
      
      this._taskCache.set(task.id, {
        ...task,
        dependencies: [],
        dependents: [],
        level: 0,
        visible: true,
        duration: taskDuration
      });
    });

    // 更新依赖关系
    this._state.dependencies.forEach(dep => {
      const fromTask = this._taskCache.get(dep.fromId);
      const toTask = this._taskCache.get(dep.toId);

      if (fromTask && toTask) {
        // 确保不重复添加
        if (!fromTask.dependencies.includes(toTask.id)) {
          fromTask.dependencies.push(toTask.id);
        }
        
        if (!toTask.dependents.includes(fromTask.id)) {
          toTask.dependents.push(fromTask.id);
        }
      }
    });

    // 计算任务层级
    this._calculateTaskLevels();
    
    // 更新任务可见性（根据折叠状态）
    this._updateTaskVisibility();
  }
  
  /**
   * 检查是否需要更新任务缓存
   * @private
   */
  private _shouldUpdateTaskCache(): boolean {
    // 如果缓存为空，需要更新
    if (this._taskCache.size === 0) {
      return true;
    }
    
    // 检查任务数量是否变化
    if (this._taskCache.size !== this._state.tasks.length) {
      return true;
    }
    
    // 检查任务ID是否一致
    for (const task of this._state.tasks) {
      if (!this._taskCache.has(task.id)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 计算任务持续时间（天）
   * @param {Task} task - 任务对象
   * @returns {number} 持续天数
   * @private
   */
  private _calculateTaskDuration(task: Task): number {
    const start = new Date(task.start);
    const end = new Date(task.end);
    
    // 移除时间部分，只保留日期
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    
    // 计算毫秒差并转换为天数
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }

  /**
   * 更新任务可见性
   * @private
   */
  private _updateTaskVisibility(): void {
    // 找出所有被折叠的父任务
    const collapsedParentIds = new Set<TaskId>();
    
    for (const task of this._state.tasks) {
      if (task.collapsed && task.children && task.children.length > 0) {
        collapsedParentIds.add(task.id);
      }
    }
    
    // 递归设置子任务的可见性
    const setChildVisibility = (taskId: TaskId, visible: boolean): void => {
      for (const task of this._state.tasks) {
        if (task.parentId === taskId) {
          const cachedTask = this._taskCache.get(task.id);
          if (cachedTask) {
            cachedTask.visible = visible;
            
            // 如果是父任务，递归设置子任务可见性
            if (task.children && task.children.length > 0) {
              // 如果父任务被折叠，则子任务肯定不可见
              // 如果父任务展开，则子任务可见性取决于父任务的可见性
              const childVisible = visible && !task.collapsed;
              setChildVisibility(task.id, childVisible);
            }
          }
        }
      }
    };
    
    // 更新所有任务的可见性
    Array.from(collapsedParentIds).forEach(taskId => {
      setChildVisibility(taskId, false);
    });
  }

  /**
   * 更新依赖关系缓存
   * @private
   */
  private _updateDependencyCache(): void {
    // 检查是否需要更新依赖缓存
    const shouldUpdate = this._shouldUpdateDependencyCache();
    if (!shouldUpdate) {
      return;
    }
    
    this._dependencyCache.clear();
    
    this._state.dependencies.forEach(dep => {
      const key = `${dep.fromId}-${dep.toId}`;
      this._dependencyCache.set(key, { ...dep });
    });
  }
  
  /**
   * 检查是否需要更新依赖缓存
   * @private
   */
  private _shouldUpdateDependencyCache(): boolean {
    // 如果缓存为空，需要更新
    if (this._dependencyCache.size === 0) {
      return true;
    }
    
    // 检查依赖数量是否变化
    if (this._dependencyCache.size !== this._state.dependencies.length) {
      return true;
    }
    
    // 检查依赖关系是否一致
    for (const dep of this._state.dependencies) {
      const key = `${dep.fromId}-${dep.toId}`;
      if (!this._dependencyCache.has(key)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 计算任务层级
   * @private
   */
  private _calculateTaskLevels(): void {
    const visited = new Set<TaskId>();
    const visiting = new Set<TaskId>();

    // 使用DFS计算任务层级
    const calculateLevel = (taskId: TaskId, level: number = 0): void => {
      // 检测循环依赖
      if (visiting.has(taskId)) {
        console.warn('检测到循环依赖:', taskId);
        return;
      }

      // 如果已经访问过且层级更高，则跳过
      if (visited.has(taskId)) {
        const task = this._taskCache.get(taskId);
        if (task && task.level >= level) {
        return;
        }
      }

      visiting.add(taskId);
      
      const task = this._taskCache.get(taskId);
      if (task) {
        // 更新层级为最大值
        task.level = Math.max(task.level, level);

        // 处理子任务
        this._state.tasks.forEach(t => {
          if (t.parentId === taskId) {
            calculateLevel(t.id, level + 1);
          }
        });
        
        // 处理依赖任务
        task.dependencies.forEach(depId => {
          calculateLevel(depId, task.level + 1);
        });
      }

      visiting.delete(taskId);
      visited.add(taskId);
    };

    // 从所有没有父任务的任务开始计算
    const rootTasks = this._state.tasks.filter(t => !t.parentId);
    rootTasks.forEach(task => calculateLevel(task.id, 0));
  }

  /**
   * 计算虚拟滚动指标
   * @private
   */
  private _calculateVirtualScrollMetrics(): void {
    const { virtualScroll, config } = this._state;
    // 获取可见任务数量
    const visibleTasks = this.getVisibleTaskCount();
    
    // 更新总高度
    virtualScroll.totalHeight = visibleTasks * config.rowHeight;
    
    // 更新可见范围
    const scrollTop = this._state.viewSettings.scrollPosition;
    const rowHeight = config.rowHeight;
    
    const visibleStartIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - virtualScroll.bufferSize);
    const visibleEndIndex = Math.min(
      this._state.tasks.length,
      visibleStartIndex + virtualScroll.visibleCount + 2 * virtualScroll.bufferSize
    );

    virtualScroll.startIndex = visibleStartIndex;
    virtualScroll.endIndex = visibleEndIndex;
    virtualScroll.rowHeight = rowHeight;
  }

  /**
   * 保存当前状态到历史记录
   * @private
   */
  private _saveToHistory(): void {
    // 克隆当前状态并添加到历史记录
    const stateClone = JSON.parse(JSON.stringify(this._state));
    this._history.push(stateClone);
    
    // 清空未来状态
    this._future = [];
    
    // 限制历史记录大小
    if (this._history.length > this._maxHistorySize) {
      this._history.shift();
    }
  }
  
  /**
   * 批量更新任务
   * @param {Task[]} tasks - 要更新的任务列表
   */
  public batchUpdateTasks(tasks: Task[]): void {
    this.beginBatchUpdate();
    
    try {
      // 批量更新任务
      tasks.forEach(task => {
        const taskIndex = this._state.tasks.findIndex(t => t.id === task.id);
        
        if (taskIndex !== -1) {
          this.dispatch({
            type: ActionType.UPDATE_TASK,
            payload: {
              taskId: task.id,
              updates: task
            }
          });
        } else {
          this.dispatch({
            type: ActionType.ADD_TASK,
            payload: task
          });
        }
      });
      
      this.commitBatchUpdate();
    } catch (error) {
      console.error('批量更新任务失败:', error);
    }
  }

  /**
   * 获取可见任务数量
   * @returns {number} 可见任务数量
   */
  public getVisibleTaskCount(): number {
    // 计算所有可见任务的数量
    return Array.from(this._taskCache.values())
      .filter(task => task.visible)
      .length;
  }

  /**
   * 获取可见任务列表
   * @returns {Task[]} 可见任务列表
   */
  public getVisibleTasks(): Task[] {
    const { startIndex, endIndex } = this._state.virtualScroll;
    
    // 获取所有可见任务
    const visibleTasks = this._state.tasks.filter(task => {
      const cachedTask = this._taskCache.get(task.id);
      return cachedTask && cachedTask.visible;
    });
    
    // 应用虚拟滚动
    return visibleTasks.slice(startIndex, endIndex);
  }

  /**
   * 获取任务的缓存数据
   * @param {TaskId} taskId - 任务ID
   * @returns {CachedTask | undefined} 任务缓存数据
   */
  public getTaskCache(taskId: TaskId): CachedTask | undefined {
    return this._taskCache.get(taskId);
  }

  /**
   * 分派动作
   * @param {GanttAction} action - 甘特图动作
   */
  public dispatch(action: GanttAction): void {
    // 如果在批量更新模式中，添加到队列
    if (this._batchUpdate) {
      this._pendingActions.push(action);
      return;
    }
    
    // 保存当前状态用于撤销
    this._saveToHistory();
    
    // 处理动作
    this._handleAction(action);
    
    // 更新缓存
    this._initializeCache();
    
    // 通知订阅者
    this._notifySubscribers();
  }

  /**
   * 开始批量更新
   */
  public beginBatchUpdate(): void {
    this._batchUpdate = true;
    this._pendingActions = [];
  }

  /**
   * 提交批量更新
   */
  public commitBatchUpdate(): void {
    if (!this._batchUpdate || this._pendingActions.length === 0) {
      this._batchUpdate = false;
      return;
    }
    
    // 保存当前状态用于撤销
    this._saveToHistory();
    
    // 处理所有挂起的动作
    for (const action of this._pendingActions) {
      this._handleAction(action);
    }
    
    // 重置批量更新状态
    this._batchUpdate = false;
    this._pendingActions = [];
    
    // 更新缓存
    this._initializeCache();
    
    // 通知订阅者
    this._notifySubscribers();
  }

  /**
   * 处理动作
   * @param {GanttAction} action - 甘特图动作
   * @private
   */
  private _handleAction(action: GanttAction): void {
    switch (action.type) {
      case ActionType.ADD_TASK:
        this._state.tasks.push(action.payload);
        break;
        
      case ActionType.UPDATE_TASK:
        {
          const { taskId, updates } = action.payload;
          const taskIndex = this._state.tasks.findIndex(t => t.id === taskId);
          
          if (taskIndex !== -1) {
            this._state.tasks[taskIndex] = {
              ...this._state.tasks[taskIndex],
              ...updates
            };
          }
        }
        break;
        
      case ActionType.DELETE_TASK:
        {
          const taskId = action.payload;
          this._state.tasks = this._state.tasks.filter(t => t.id !== taskId);
          
          // 删除相关依赖
          this._state.dependencies = this._state.dependencies.filter(
            d => d.fromId !== taskId && d.toId !== taskId
          );
        }
        break;
        
      case ActionType.MOVE_TASK:
        {
          const { taskId, newStart, newEnd } = action.payload;
          const taskIndex = this._state.tasks.findIndex(t => t.id === taskId);
          
          if (taskIndex !== -1) {
            this._state.tasks[taskIndex] = {
              ...this._state.tasks[taskIndex],
              start: newStart,
              end: newEnd
            };
          }
        }
        break;
        
      case ActionType.ADD_DEPENDENCY:
        this._state.dependencies.push(action.payload);
        break;
        
      case ActionType.DELETE_DEPENDENCY:
        {
          const { fromId, toId } = action.payload;
          this._state.dependencies = this._state.dependencies.filter(
            d => !(d.fromId === fromId && d.toId === toId)
          );
        }
        break;
        
      case ActionType.CHANGE_VIEW:
        this._state.viewSettings.mode = action.payload;
        break;
        
      case ActionType.SET_DATES:
        {
          const { startDate, endDate } = action.payload;
          // 在此处处理日期变更，可能需要调整虚拟滚动等
        }
        break;
        
      case ActionType.SELECT_TASK:
        {
          const taskId = action.payload;
          
          if (!this._state.selectedTaskIds.includes(taskId)) {
            this._state.selectedTaskIds.push(taskId);
          }
        }
        break;
        
      case ActionType.DESELECT_TASK:
        {
          const taskId = action.payload;
          this._state.selectedTaskIds = this._state.selectedTaskIds.filter(
            id => id !== taskId
          );
        }
        break;
        
      default:
        console.warn(`未处理的动作类型: ${(action as any).type}`);
    }
  }

  /**
   * 撤销上一个操作
   * @returns {boolean} 是否成功撤销
   */
  public undo(): boolean {
    if (this._history.length === 0) {
      return false;
    }
    
    // 保存当前状态用于重做
    const currentState = JSON.parse(JSON.stringify(this._state));
    this._future.push(currentState);
    
    // 恢复上一个状态
    const previousState = this._history.pop()!;
    this._state = previousState;
    
    // 更新缓存
    this._initializeCache();
    
    // 通知订阅者
    this._notifySubscribers();
    
    return true;
  }

  /**
   * 重做上一个撤销的操作
   * @returns {boolean} 是否成功重做
   */
  public redo(): boolean {
    if (this._future.length === 0) {
      return false;
    }
    
    // 保存当前状态用于撤销
    const currentState = JSON.parse(JSON.stringify(this._state));
    this._history.push(currentState);
    
    // 恢复下一个状态
    const nextState = this._future.pop()!;
    this._state = nextState;
    
    // 更新缓存
    this._initializeCache();
    
    // 通知订阅者
    this._notifySubscribers();
    
    return true;
  }

  /**
   * 更新滚动位置
   * @param {number} scrollTop - 新的滚动位置
   */
  public updateScrollPosition(scrollTop: number): void {
    // 滚动位置更新不需要记录到历史记录中
    this._state.viewSettings.scrollPosition = scrollTop;
    this._calculateVirtualScrollMetrics();
    this._notifySubscribers();
  }

  /**
   * 更新任务列表
   * @param {Task[]} tasks - 新的任务列表
   */
  public updateTasks(tasks: Task[]): void {
    this._saveToHistory();
    this._state.tasks = [...tasks];
    this._initializeCache();
    this._notifySubscribers();
  }

  /**
   * 更新依赖关系列表
   * @param {Dependency[]} dependencies - 新的依赖关系列表
   */
  public updateDependencies(dependencies: Dependency[]): void {
    this._saveToHistory();
    this._state.dependencies = [...dependencies];
    this._initializeCache();
    this._notifySubscribers();
  }

  /**
   * 更新配置
   * @param {Partial<GanttConfig>} config - 配置更新
   */
  public updateConfig(config: Partial<GanttConfig>): void {
    this._saveToHistory();
    this._state.config = {
      ...this._state.config,
      ...config
    };
    this._calculateVirtualScrollMetrics();
    this._notifySubscribers();
  }

  /**
   * 更新视图设置
   * @param {Partial<ViewSettings>} settings - 视图设置更新
   */
  public updateViewSettings(settings: Partial<ViewSettings>): void {
    this._saveToHistory();
    this._state.viewSettings = {
      ...this._state.viewSettings,
      ...settings
    };
    this._calculateVirtualScrollMetrics();
    this._notifySubscribers();
  }

  /**
   * 切换任务折叠状态
   * @param {TaskId} taskId - 任务ID
   */
  public toggleTaskCollapse(taskId: TaskId): void {
    const taskIndex = this._state.tasks.findIndex(t => t.id === taskId);
    
    if (taskIndex !== -1) {
      this._saveToHistory();
      
      // 切换折叠状态
      const task = this._state.tasks[taskIndex];
      this._state.tasks[taskIndex] = {
        ...task,
        collapsed: !task.collapsed
      };
      
      this._initializeCache();
      this._notifySubscribers();
    }
  }

  /**
   * 订阅状态变化
   * @param {StateSubscriber} callback - 订阅回调
   * @returns {Function} 取消订阅的函数
   */
  public subscribe(callback: StateSubscriber): () => void {
    this._subscribers.add(callback);
    
    // 立即通知新订阅者当前状态
    callback(this._state);
    
    // 返回取消订阅的函数
    return () => {
      this._subscribers.delete(callback);
    };
  }

  /**
   * 通知所有订阅者
   * @private
   */
  private _notifySubscribers(): void {
    Array.from(this._subscribers).forEach(subscriber => {
      subscriber(this._state);
    });
  }
  
  /**
   * 清空历史记录
   */
  public clearHistory(): void {
    this._history = [];
    this._future = [];
  }
  
  /**
   * 设置最大历史记录大小
   * @param {number} size - 最大历史记录数量
   */
  public setMaxHistorySize(size: number): void {
    if (size > 0) {
      this._maxHistorySize = size;
      
      // 如果当前历史超出新的最大大小，则裁剪
      while (this._history.length > this._maxHistorySize) {
        this._history.shift();
      }
    }
  }
}

/**
 * 创建状态管理器实例
 * @param initialState 初始状态
 * @returns StateManager 实例
 */
export default function createStateManager(initialState: Partial<StateManagerState> = {}): StateManager {
  return new StateManager(initialState);
} 