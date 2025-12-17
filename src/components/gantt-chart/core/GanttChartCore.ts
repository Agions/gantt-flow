/**
 * GanttChartCore.ts
 * 甘特图核心类，负责图表渲染、事件处理和数据管理
 * @module GanttChartCore
 */
import {
  GanttChartOptions,
  Task,
  TaskId,
  ViewMode,
  DragData,
  DragType,
  ResizeType,
  VirtualWindow,
  ExportOptions,
  Dependency,
  Resource
} from "./types";
import {
  DateUtils,
  TaskUtils,
  UIUtils,
  ExportUtils,
  debounce,
  throttle
} from "./utils";
import createStateManager, { StateManager } from './StateManager';
import createImageExporter, { ImageExporter } from './ImageExporter';
import createDataExporter, { DataExporter } from './DataExporter';
import createPrintManager, { PrintManager } from './PrintManager';
import createTaskManager, { TaskManager } from './TaskManager';

/**
 * 甘特图事件类型
 */
enum GanttEventType {
  TASK_CLICK = 'task:click',
  TASK_DBLCLICK = 'task:dblclick',
  TASK_DRAG_START = 'task:dragstart',
  TASK_DRAG = 'task:drag',
  TASK_DRAG_END = 'task:dragend',
  TASK_RESIZE_START = 'task:resizestart',
  TASK_RESIZE = 'task:resize',
  TASK_RESIZE_END = 'task:resizeend',
  TASK_PROGRESS_CHANGE = 'task:progress',
  DEPENDENCY_CLICK = 'dependency:click',
  VIEW_CHANGE = 'view:change',
  DATE_CHANGE = 'date:change',
  SCROLL = 'scroll',
  RENDER = 'render',
  ERROR = 'error'
}

/**
 * 事件回调类型
 */
type EventCallback = (...args: any[]) => void;

/**
 * 事件映射类型
 */
interface EventMap {
  [eventName: string]: EventCallback[];
}

/**
 * 甘特图核心类
 * 负责图表渲染、事件处理和数据管理
 */
export class GanttChartCore {
  /** 配置选项 */
  private readonly _options: GanttChartOptions;
  /** 任务列表 */
  private _tasks: Task[];
  /** 依赖关系列表 */
  private _dependencies: Dependency[];
  /** 开始日期 */
  private _startDate: Date;
  /** 结束日期 */
  private _endDate: Date;
  /** DOM 元素 */
  private _element: HTMLElement | null = null;
  /** 事件监听器映射 */
  private _eventListeners: Map<string, Function[]> = new Map();
  /** 状态管理器 */
  private _stateManager: StateManager;

  /** 虚拟滚动相关属性 */
  private _virtualScrolling: boolean = false;
  private _visibleTaskCount: number = 50;
  private _bufferSize: number = 10;
  private _visibleTasks: Task[] = [];
  private _scrollTop: number = 0;
  private _containerHeight: number = 0;

  /** 监听器和观察者 */
  private _resizeObserver: ResizeObserver | null = null;
  private _mutationObserver: MutationObserver | null = null;
  private _intersectionObserver: IntersectionObserver | null = null;

  /** 事件处理函数引用 */
  private readonly _onMouseMove: (e: MouseEvent) => void;
  private readonly _onMouseUp: (e: MouseEvent) => void;
  private readonly _onResizeMove: (e: MouseEvent) => void;
  private readonly _onResizeEnd: (e: MouseEvent) => void;
  private readonly _onTaskClick: (e: MouseEvent) => void;
  private readonly _onTaskDoubleClick: (e: MouseEvent) => void;
  private readonly _handleScroll: () => void;

  /** 拖拽数据 */
  private _dragData: DragData | null = null;

  /** 渲染标志 */
  private _needsRender: boolean = false;
  private _animationFrameId: number | null = null;

  /** 主题配置 */
  private _theme: Record<string, string | undefined> = {};

  /** 图片导出工具 */
  private imageExporter: ImageExporter;

  /** 数据导出工具 */
  private dataExporter: DataExporter;

  /** 打印管理器 */
  private printManager: PrintManager;

  /** 任务管理器 */
  private taskManager: TaskManager;

  /** 是否已销毁 */
  private isDestroyed: boolean = false;

  /** 缩放级别 */
  private zoomLevel: number = 1;

  /**
   * 创建甘特图实例
   * @param {GanttChartOptions} options - 甘特图配置选项
   */
  constructor(options: GanttChartOptions) {
    // 配置和数据初始化
    this._options = this._prepareOptions(options);
    this._tasks = options.tasks || [];
    this._dependencies = options.dependencies || [];
    this._startDate = options.startDate ? DateUtils.parseDate(options.startDate) : new Date();
    this._endDate = options.endDate ? DateUtils.parseDate(options.endDate) : this._calculateEndDate();

    // 虚拟滚动设置
    this._virtualScrolling = options.virtualScrolling || false;
    this._visibleTaskCount = options.visibleTaskCount || 50;
    this._bufferSize = options.bufferSize || 10;

    // 绑定方法到实例
    this._onMouseMove = this._onMouseMoveHandler.bind(this);
    this._onMouseUp = this._onMouseUpHandler.bind(this);
    this._onResizeMove = this._onResizeMoveHandler.bind(this);
    this._onResizeEnd = this._onResizeEndHandler.bind(this);
    this._onTaskClick = this._handleTaskClick.bind(this);
    this._onTaskDoubleClick = this._handleTaskDoubleClick.bind(this);

    // 性能优化：使用防抖和节流
    this._handleScroll = debounce(this._handleScrollHandler.bind(this), 16);

    // 初始化状态管理器
    this._stateManager = createStateManager({
      tasks: this._tasks,
      dependencies: this._dependencies,
      resources: options.resources || [],
      selectedTaskIds: [],
      viewSettings: {
        mode: options.viewMode || 'day',
        scrollPosition: 0,
        zoomLevel: 1,
        taskListWidth: 300,
        timelineWidth: 0,
        startDate: this._startDate,
        endDate: this._endDate
      },
      virtualScroll: {
        startIndex: 0,
        endIndex: 0,
        visibleCount: this._visibleTaskCount,
        bufferSize: this._bufferSize,
        totalHeight: 0,
        rowHeight: options.rowHeight || 40
      },
      config: {
        columnWidth: options.columnWidth || 60,
        rowHeight: options.rowHeight || 40,
        showWeekends: options.showWeekends !== undefined ? options.showWeekends : true,
        showToday: options.showToday !== undefined ? options.showToday : true,
        showRowLines: options.showRowLines !== undefined ? options.showRowLines : true,
        showColumnLines: options.showColumnLines !== undefined ? options.showColumnLines : true,
        enableDragging: options.enableDragging !== undefined ? options.enableDragging : true,
        enableResizing: options.enableResizing !== undefined ? options.enableResizing : true,
        enableProgress: options.enableProgress !== undefined ? options.enableProgress : true,
        enableDependencies: options.enableDependencies !== undefined ? options.enableDependencies : true,
        respectDependencies: options.respectDependencies !== undefined ? options.respectDependencies : true,
        locale: options.locale || 'zh-CN'
      }
    });

    // 初始化主题
    this._initializeTheme();

    // 初始化任务管理器
    this.taskManager = createTaskManager({
      autoCalculateDuration: true,
      autoCalculateProgress: false,
      checkCircularDependencies: true
    });
    this.taskManager.setTasks(this._tasks);
    this.taskManager.setDependencies(this._dependencies);

    // 初始化导出工具
    this.imageExporter = createImageExporter(this._element!);
    this.dataExporter = createDataExporter(
      this._tasks,
      this._dependencies,
      options.resources || []
    );
    this.printManager = createPrintManager(this._element!);

    // 初始化渲染
    this.render(this._element!);

    // 添加事件监听器
    this.attachEventListeners();
  }

  /**
   * 获取任务列表的只读副本
   * @returns {ReadonlyArray<Task>} 任务列表
   */
  public get tasks(): ReadonlyArray<Task> {
    return [...this._tasks];
  }

  /**
   * 获取依赖关系列表的只读副本
   * @returns {ReadonlyArray<Dependency>} 依赖关系列表
   */
  public get dependencies(): ReadonlyArray<Dependency> {
    return [...this._dependencies];
  }

  /**
   * 获取当前开始日期
   * @returns {Date} 开始日期
   */
  public get startDate(): Date {
    return new Date(this._startDate);
  }

  /**
   * 获取当前结束日期
   * @returns {Date} 结束日期
   */
  public get endDate(): Date {
    return new Date(this._endDate);
  }

  /**
   * 获取当前视图模式
   * @returns {ViewMode} 视图模式
   */
  public get viewMode(): ViewMode {
    return this._stateManager.state.viewSettings.mode;
  }

  /**
   * 计算甘特图结束日期
   */
  private _calculateEndDate(): Date {
    if (!this._tasks.length) {
      const date = new Date()
      date.setMonth(date.getMonth() + 1)
      return date
    }
    return this._tasks.reduce((max, task) => {
      const end = new Date(task.end)
      return end > max ? end : max
    }, new Date(this._tasks[0].end))
  }

  /**
   * 渲染甘特图到指定DOM元素
   */
  render(element: HTMLElement): void {
    if (!element) return
    this._element = element
    // 清空容器
    while (element.firstChild) {
      element.removeChild(element.firstChild)
    }

    // 性能优化：监听容器大小变化
    if (this._resizeObserver) {
      this._resizeObserver.disconnect()
    }
    this._resizeObserver = new ResizeObserver(this._handleResizeHandler.bind(this))
    this._resizeObserver.observe(element)

    // 初始化虚拟滚动
    if (this._virtualScrolling) {
      this._containerHeight = element.clientHeight
      this._initVirtualScrolling()
    }

    // 创建甘特图容器
    const container = document.createElement("div")
    container.className = "gantt-container"

    // 添加表头
    const header = this._createHeader()
    container.appendChild(header)

    // 添加任务区域
    const taskContainer = this._createTaskContainer()
    container.appendChild(taskContainer)

    // 如果开启依赖关系显示，则添加SVG图层
    if (this._options.enableDependencies) {
      const dependencyLayer = this._createDependencyLayer()
      container.appendChild(dependencyLayer)
    }

    element.appendChild(container)

    // 绑定事件
    this._bindEvents()
  }

  /**
   * 创建时间轴表头
   */
  private _createHeader(): HTMLElement {
    const header = document.createElement("div")
    header.className = "gantt-header"

    const timeline = document.createElement("div")
    timeline.className = "gantt-timeline"

    const totalDays = DateUtils.daysBetween(this._startDate, this._endDate)
    const columnWidth = this._options.columnWidth || 40

    for (let i = 0; i <= totalDays; i++) {
      const date = new Date(this._startDate)
      date.setDate(date.getDate() + i)

      const dayLabel = document.createElement("div")
      dayLabel.className = "gantt-day"
      dayLabel.style.width = `${columnWidth}px`

      if (this._options.viewMode === "day") {
        dayLabel.textContent = String(date.getDate())
      } else if (this._options.viewMode === "week") {
        dayLabel.textContent = String(DateUtils.getWeekNumber(date))
      } else if (this._options.viewMode === "month") {
        dayLabel.textContent = DateUtils.getMonthName(date, true)
      } else {
        dayLabel.textContent = String(date.getDate())
      }

      timeline.appendChild(dayLabel)
    }

    header.appendChild(timeline)
    return header
  }

  /**
   * 创建任务区域
   */
  private _createTaskContainer(): HTMLElement {
    const taskContainer = document.createElement("div")
    taskContainer.className = "gantt-task-container"

    const columnWidth = this._options.columnWidth || 40
    const rowHeight = this._options.rowHeight || 40

    // 如果启用虚拟滚动，设置容器样式
    if (this._virtualScrolling) {
      taskContainer.style.position = "relative"
      taskContainer.style.height = `${this._tasks.length * rowHeight}px`
      taskContainer.classList.add("gantt-virtual-scroll")
    }

    // 确定要渲染的任务
    const tasksToRender = this._virtualScrolling ? this._visibleTasks : this._tasks

    // 遍历任务并创建任务行
    tasksToRender.forEach((task) => {
      const taskRow = document.createElement("div")
      taskRow.className = "gantt-task-row"

      // 如果是虚拟滚动，设置任务行的位置
      if (this._virtualScrolling) {
        const taskIndex = this._tasks.findIndex((t) => t.id === task.id)
        taskRow.style.position = "absolute"
        taskRow.style.top = `${taskIndex * rowHeight}px`
        taskRow.style.width = "100%"
      }

      // 任务标签
      const taskLabel = document.createElement("div")
      taskLabel.className = "gantt-task-label"

      // 创建标签文本容器以支持溢出省略
      const labelText = document.createElement("div")
      labelText.className = "gantt-task-label-text"
      labelText.textContent = task.name
      taskLabel.appendChild(labelText)

      taskRow.appendChild(taskLabel)

      // 任务条
      const taskBar = document.createElement("div")
      taskBar.className = "gantt-task-bar"

      // 添加任务类型样式
      if (task.type) {
        taskBar.classList.add(task.type)
      }

      const offset = this._getTaskOffset(task)
      const width = this._getTaskWidth(task)
      // 200px 为任务标签占用的宽度
      taskBar.style.left = `${offset + 200}px`
      taskBar.style.width = `${width}px`
      taskBar.style.backgroundColor = task.color || "#4e85c5"
      taskBar.setAttribute("data-task-id", String(task.id))

      // 如果有进度，添加进度条
      if (
        task.progress !== undefined &&
        this._options.enableProgress !== false
      ) {
        const progressBar = document.createElement("div")
        progressBar.className = "gantt-task-progress"
        progressBar.style.width = `${Math.min(
          100,
          Math.max(0, task.progress)
        )}%`
        taskBar.appendChild(progressBar)
      }

      // 如果开启拖拽，则设置样式和添加拖拽手柄
      if (this._options.enableDragging !== false && task.draggable !== false) {
        taskBar.style.cursor = "move"
      }

      // 如果开启调整大小，添加调整大小的手柄
      if (this._options.enableResizing !== false && task.resizable !== false) {
        const leftHandle = document.createElement("div")
        leftHandle.className = "gantt-task-resize-handle left"
        leftHandle.setAttribute("data-resize", "left")

        const rightHandle = document.createElement("div")
        rightHandle.className = "gantt-task-resize-handle right"
        rightHandle.setAttribute("data-resize", "right")

        taskBar.appendChild(leftHandle)
        taskBar.appendChild(rightHandle)
      }

      taskRow.appendChild(taskBar)
      taskContainer.appendChild(taskRow)
    })

    // 如果启用显示今天线
    if (this._options.showToday) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const todayOffset = this._getDateOffset(today)
      if (todayOffset >= 0) {
        const todayLine = document.createElement("div")
        todayLine.className = "gantt-today-line"
        todayLine.style.left = `${todayOffset + 200}px`
        taskContainer.appendChild(todayLine)
      }
    }

    return taskContainer
  }

  /**
   * 获取日期相对于起始日期的偏移量（以像素为单位）
   */
  private _getDateOffset(date: Date): number {
    const columnWidth = this._options.columnWidth || 40
    const diffDays = DateUtils.daysBetween(this._startDate, date)
    return diffDays * columnWidth
  }

  /**
   * 获取任务相对于起始日期的偏移量（以像素为单位）
   * @param {Task} task - 任务对象
   * @returns {number} 偏移量
   * @private
   */
  private _getTaskOffset(task: Task): number {
    const columnWidth = this._options.columnWidth || 40;
    const startDate = DateUtils.parseDate(task.start);
    const diffDays = DateUtils.daysBetween(this._startDate, startDate);
    return diffDays * columnWidth;
  }

  /**
   * 获取任务条的宽度（以像素为单位）
   * @param {Task} task - 任务对象
   * @returns {number} 宽度
   * @private
   */
  private _getTaskWidth(task: Task): number {
    const columnWidth = this._options.columnWidth || 40;
    const taskStart = DateUtils.parseDate(task.start);
    const taskEnd = DateUtils.parseDate(task.end);
    const diffDays = DateUtils.daysBetween(taskStart, taskEnd);
    return (diffDays + 1) * columnWidth;
  }

  /**
   * 创建依赖关系的SVG图层
   */
  private _createDependencyLayer(): HTMLElement {
    const svgNS = "http://www.w3.org/2000/svg"
    const svg = document.createElementNS(svgNS, "svg")
    svg.classList.add("gantt-dependency-layer")
    svg.style.position = "absolute"
    svg.style.top = "0"
    svg.style.left = "0"
    svg.style.width = "100%"
    svg.style.height = "100%"

    if (this._options.dependencies) {
      this._options.dependencies.forEach((dep) => {
        const fromBar = this._element?.querySelector(
          `[data-task-id='${dep.fromId}']`
        ) as HTMLElement
        const toBar = this._element?.querySelector(
          `[data-task-id='${dep.toId}']`
        ) as HTMLElement
        if (fromBar && toBar && this._element) {
          const containerRect = this._element.getBoundingClientRect()
          const fromRect = fromBar.getBoundingClientRect()
          const toRect = toBar.getBoundingClientRect()

          const x1 = fromRect.right - containerRect.left
          const y1 = fromRect.top + fromRect.height / 2 - containerRect.top
          const x2 = toRect.left - containerRect.left
          const y2 = toRect.top + toRect.height / 2 - containerRect.top

          const line = document.createElementNS(svgNS, "line")
          line.setAttribute("x1", String(x1))
          line.setAttribute("y1", String(y1))
          line.setAttribute("x2", String(x2))
          line.setAttribute("y2", String(y2))
          line.setAttribute("stroke", "#FF0000")
          line.setAttribute("stroke-width", "2")

          svg.appendChild(line)
        }
      })
    }

    return svg as unknown as HTMLElement
  }

  /**
   * 绑定任务条的事件（拖拽、点击、双击、调整大小等）
   */
  private _bindEvents(): void {
    if (!this._element) return

    const bars = this._element.querySelectorAll(".gantt-task-bar")
    bars.forEach((bar) => {
      // 拖拽事件
      if (this._options.enableDragging !== false) {
        bar.addEventListener("mousedown", this._onMouseDown.bind(this) as EventListener)
      }

      // 点击事件
      bar.addEventListener("click", (e: Event) => {
        const taskId = (e.currentTarget as HTMLElement).getAttribute("data-task-id")
        const task = this._tasks.find((t) => String(t.id) === taskId)
        if (task && this._options.onTaskClick) {
          this._options.onTaskClick(task, e as MouseEvent)
        }
      })

      // 双击事件
      bar.addEventListener("dblclick", (e: Event) => {
        const taskId = (e.currentTarget as HTMLElement).getAttribute("data-task-id")
        const task = this._tasks.find((t) => String(t.id) === taskId)
        if (task && this._options.onTaskDoubleClick) {
          this._options.onTaskDoubleClick(task, e as MouseEvent)
        }
      })

      // 调整大小事件
      if (this._options.enableResizing !== false) {
        const resizeHandles = bar.querySelectorAll(".gantt-task-resize-handle")
        resizeHandles.forEach((handle) => {
          handle.addEventListener("mousedown", (e: Event) => {
            e.stopPropagation() // 阻止冒泡，避免触发拖拽
            this._onResizeStart(e as MouseEvent)
          })
        })
      }

      // 进度条拖拽事件
      if (this._options.enableProgress !== false) {
        bar.addEventListener("mousemove", (e: Event) => {
          const mouseEvent = e as MouseEvent;
          const taskId = (e.currentTarget as HTMLElement).getAttribute("data-task-id")
          const task = this._tasks.find((t) => String(t.id) === taskId)
          if (!task) return

          // 计算鼠标在任务条内的相对位置
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
          const relativeX = mouseEvent.clientX - rect.left
          const percent = Math.min(100, Math.max(0, (relativeX / rect.width) * 100))

          // 显示进度提示
          if (mouseEvent.buttons === 1 && this._options.onProgressChange) {
            this._options.onProgressChange(task, percent)
          }
        })
      }
    })

    // 视图切换事件
    if (this._options.onViewChange) {
      const viewModes: ViewMode[] = ["day", "week", "month", "quarter", "year"]
      viewModes.forEach((mode) => {
        const button = this._element?.querySelector(`.gantt-view-${mode}`)
        if (button) {
          button.addEventListener("click", () => {
            if (this._options.onViewChange) {
              this._options.onViewChange(mode)
            }
          })
        }
      })
    }
  }

  /**
   * 鼠标按下事件处理（开始拖拽）
   */
  private _onMouseDown(e: MouseEvent): void {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    const taskId = target.getAttribute("data-task-id");
    const task = this._tasks.find((t) => String(t.id) === taskId);
    if (task && (task.draggable !== false || task.draggable === undefined)) {
      target.classList.add("dragging");
      this._dragData = {
        bar: target,
        task,
        startX: e.clientX,
        originalLeft: parseInt(target.style.left, 10) || 0,
        originalWidth: parseInt(target.style.width, 10) || 0,
        type: "move" // 添加必要的type属性
      };
      document.addEventListener("mousemove", this._onMouseMove);
      document.addEventListener("mouseup", this._onMouseUp);
    }
  }

  /**
   * 开始调整大小事件处理
   */
  private _onResizeStart(e: MouseEvent): void {
    e.preventDefault();
    const handle = e.target as HTMLElement;
    const resizeType = handle.getAttribute("data-resize") as ResizeType;
    const bar = handle.parentElement as HTMLElement;

    if (!bar) return;

    const taskId = bar.getAttribute("data-task-id");
    const task = this._tasks.find((t) => String(t.id) === taskId);
    if (!task || task.resizable === false) return;

    bar.classList.add("resizing");

    // 设置调整大小数据
    this._dragData = {
      bar,
      task,
      startX: e.clientX,
      originalLeft: parseInt(bar.style.left, 10) || 0,
      originalWidth: parseInt(bar.style.width, 10) || 0,
      resizeType,
      type: resizeType === "left" ? "resize_left" : "resize_right" // 添加必要的type属性
    };

    document.addEventListener("mousemove", this._onResizeMove);
    document.addEventListener("mouseup", this._onResizeEnd);
  }

  /**
   * 调整大小移动事件处理
   */
  private _onResizeMoveHandler(e: MouseEvent): void {
    if (!this._dragData || !this._dragData.resizeType) return

    const deltaX = e.clientX - this._dragData.startX
    const columnWidth = this._options.columnWidth || 40

    if (this._dragData.resizeType === "right") {
      // 调整右侧（改变宽度）
      let newWidth = Math.max(columnWidth, this._dragData.originalWidth + deltaX)
      // 吸附到网格
      newWidth = Math.round(newWidth / columnWidth) * columnWidth
      this._dragData.bar.style.width = `${newWidth}px`
    } else if (this._dragData.resizeType === "left") {
      // 调整左侧（改变左边距和宽度）
      let newLeft = this._dragData.originalLeft + deltaX
      let newWidth = this._dragData.originalWidth - deltaX

      // 确保最小宽度
      if (newWidth < columnWidth) {
        newWidth = columnWidth
        newLeft = this._dragData.originalLeft + this._dragData.originalWidth - columnWidth
      }

      // 吸附到网格
      newLeft = Math.round(newLeft / columnWidth) * columnWidth
      newWidth = Math.round(newWidth / columnWidth) * columnWidth

      this._dragData.bar.style.left = `${newLeft}px`
      this._dragData.bar.style.width = `${newWidth}px`
    }

    // 计算新的日期
    const currentLeft = parseInt(this._dragData.bar.style.left, 10) - 200 // 减去标签宽度
    const currentWidth = parseInt(this._dragData.bar.style.width, 10)
    const shiftDays = Math.round(currentLeft / columnWidth)
    const durationDays = Math.round(currentWidth / columnWidth)

    const newStart = DateUtils.addDays(this._startDate, shiftDays)
    const newEnd = DateUtils.addDays(this._startDate, shiftDays + durationDays - 1)

    if (this._options.onTaskDrag) {
      this._options.onTaskDrag(this._dragData.task, e, newStart, newEnd)
    }
  }

  /**
   * 调整大小结束事件处理
   */
  private _onResizeEndHandler(e: MouseEvent): void {
    if (!this._dragData || !this._dragData.resizeType) return

    const columnWidth = this._options.columnWidth || 40
    const currentLeft = parseInt(this._dragData.bar.style.left, 10) - 200 // 减去标签宽度
    const currentWidth = parseInt(this._dragData.bar.style.width, 10)

    // 计算新的开始和结束日期
    const shiftDays = Math.round(currentLeft / columnWidth)
    const durationDays = Math.round(currentWidth / columnWidth)

    const newStart = DateUtils.addDays(this._startDate, shiftDays)
    const newEnd = DateUtils.addDays(this._startDate, shiftDays + durationDays - 1)

    if (this._options.onDateChange) {
      this._options.onDateChange(newStart, newEnd)
    }

    document.removeEventListener("mousemove", this._onResizeMove)
    document.removeEventListener("mouseup", this._onResizeEnd)
    this._dragData = null
  }

  /**
   * 鼠标移动事件处理（拖拽过程）
   */
  private _onMouseMoveHandler(e: MouseEvent): void {
    if (!this._dragData) return
    const deltaX = e.clientX - this._dragData.startX
    const columnWidth = this._options.columnWidth || 40

    // 计算新的位置
    let newLeft = this._dragData.originalLeft + deltaX
    // 吸附到网格
    newLeft = Math.round(newLeft / columnWidth) * columnWidth
    this._dragData.bar.style.left = `${newLeft}px`

    // 计算新的日期
    const daysShifted = Math.round(deltaX / columnWidth)
    const newStart = DateUtils.addDays(DateUtils.parseDate(this._dragData.task.start), daysShifted)
    const newEnd = DateUtils.addDays(DateUtils.parseDate(this._dragData.task.end), daysShifted)

    if (this._options.onDateChange) {
      this._options.onDateChange(newStart, newEnd)
    }
  }

  /**
   * 鼠标松开事件处理（拖拽结束）
   */
  private _onMouseUpHandler(e: MouseEvent): void {
    if (this._dragData) {
      // 移除拖拽样式
      this._dragData.bar.classList.remove("dragging")

      const columnWidth = this._options.columnWidth || 40
      const currentLeft = parseInt(this._dragData.bar.style.left, 10)
      // 计算天数变化: 减去标签宽度200
      const shiftDays = Math.round((currentLeft - 200) / columnWidth)
      const newStart = DateUtils.addDays(this._startDate, shiftDays)

      // 计算任务持续天数，根据原始任务时间
      const originalDuration = DateUtils.daysBetween(
        DateUtils.parseDate(this._dragData.task.start),
        DateUtils.parseDate(this._dragData.task.end)
      )
      const newEnd = DateUtils.addDays(newStart, originalDuration)

      // 移除日期提示
      if (this._element) {
        const tooltip = this._element.querySelector(".gantt-drag-tooltip")
        if (tooltip) {
          tooltip.remove()
        }
      }

      // 添加动画效果
      this._dragData.bar.style.transition = "transform 0.2s ease"
      this._dragData.bar.style.transform = "scale(1.05)"
      setTimeout(() => {
        if (this._dragData && this._dragData.bar) {
          this._dragData.bar.style.transform = "scale(1)"
        }
      }, 200)

      // 触发回调
      if (this._options.onTaskDrag) {
        this._options.onTaskDrag(this._dragData.task, e, newStart, newEnd)
      }

      this._dragData = null
      document.removeEventListener("mousemove", this._onMouseMove)
      document.removeEventListener("mouseup", this._onMouseUp)
    }
  }

  /**
   * 更新任务数据
   */
  updateTasks(tasks: Task[]): void {
    this._tasks = tasks
    this._endDate = this._calculateEndDate()
    // 更新任务管理器
    this.taskManager.setTasks(tasks);
    if (this._element) {
      this.render(this._element)
    }
  }

  /**
   * 创建新任务
   * @param taskData 任务数据
   * @returns 创建的任务
   */
  createTask(taskData: Partial<Task>): Task {
    const newTask = this.taskManager.createTask(taskData);
    // 更新内部任务列表
    this._tasks = this.taskManager.getTasks();
    this._endDate = this._calculateEndDate();
    // 重新渲染
    if (this._element) {
      this.render(this._element);
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
    const updatedTask = this.taskManager.updateTask(taskId, updates);
    if (updatedTask) {
      // 更新内部任务列表
      this._tasks = this.taskManager.getTasks();
      this._endDate = this._calculateEndDate();
      // 重新渲染
      if (this._element) {
        this.render(this._element);
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
    const success = this.taskManager.deleteTask(taskId);
    if (success) {
      // 更新内部任务列表和依赖关系
      this._tasks = this.taskManager.getTasks();
      this._dependencies = this.taskManager.getDependencies();
      this._endDate = this._calculateEndDate();
      // 重新渲染
      if (this._element) {
        this.render(this._element);
      }
    }
    return success;
  }

  /**
   * 创建依赖关系
   * @param fromId 源任务ID
   * @param toId 目标任务ID
   * @param type 依赖关系类型
   * @param lag 延迟天数
   * @returns 创建的依赖关系
   */
  createDependency(fromId: TaskId, toId: TaskId, type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish' = 'finish_to_start', lag: number = 0): Dependency | null {
    const dependency = this.taskManager.createDependency(fromId, toId, type, lag);
    if (dependency) {
      // 更新内部依赖关系列表
      this._dependencies = this.taskManager.getDependencies();
      // 重新渲染
      if (this._element) {
        this.render(this._element);
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
    const success = this.taskManager.deleteDependency(fromId, toId);
    if (success) {
      // 更新内部依赖关系列表
      this._dependencies = this.taskManager.getDependencies();
      // 重新渲染
      if (this._element) {
        this.render(this._element);
      }
    }
    return success;
  }

  /**
   * 检查循环依赖
   * @returns 是否存在循环依赖
   */
  checkCircularDependencies(): boolean {
    return this.taskManager.checkCircularDependencies();
  }

  /**
   * 获取所有里程碑任务
   * @returns 里程碑任务列表
   */
  getMilestones(): Task[] {
    return this.taskManager.getMilestones();
  }

  /**
   * 获取所有项目任务
   * @returns 项目任务列表
   */
  getProjects(): Task[] {
    return this.taskManager.getProjects();
  }

  /**
   * 获取所有普通任务
   * @returns 普通任务列表
   */
  getRegularTasks(): Task[] {
    return this.taskManager.getRegularTasks();
  }

  /**
   * 更新配置
   */
  updateOptions(options: Partial<GanttChartOptions>): void {
    Object.assign(this._options, options)

    // 更新虚拟滚动相关配置
    if (options.virtualScrolling !== undefined) {
      this._virtualScrolling = options.virtualScrolling
    }
    if (options.visibleTaskCount !== undefined) {
      this._visibleTaskCount = options.visibleTaskCount
    }
    if (options.bufferSize !== undefined) {
      this._bufferSize = options.bufferSize
    }

    // 更新开始和结束日期
    if (options.startDate) {
      this._startDate = DateUtils.parseDate(options.startDate);
    }
    if (options.endDate) {
      this._endDate = DateUtils.parseDate(options.endDate);
    }

    if (this._element) {
      this.render(this._element)
    }
  }

  /**
   * 初始化虚拟滚动
   */
  private _initVirtualScrolling(): void {
    if (!this._element) return

    // 计算可见任务
    this._updateVisibleTasks()

    // 添加滚动事件监听
    this._element.addEventListener("scroll", this._handleScroll)
  }

  /**
   * 处理滚动事件
   */
  private _handleScrollHandler(): void {
    if (!this._element || !this._virtualScrolling) return

    const newScrollTop = this._element.scrollTop
    if (Math.abs(newScrollTop - this._scrollTop) > 10) {
      this._scrollTop = newScrollTop
      this._updateVisibleTasks()
      this._renderVisibleTasks()
    }
  }

  /**
   * 更新可见任务列表
   */
  private _updateVisibleTasks(): void {
    if (!this._virtualScrolling || !this._element) return

    const rowHeight = this._options.rowHeight || 40
    const scrollTop = this._element.scrollTop

    // 计算开始和结束索引
    const startIndex = Math.max(
      0,
      Math.floor(scrollTop / rowHeight) - this._bufferSize
    )
    const endIndex = Math.min(
      this._tasks.length,
      startIndex + this._visibleTaskCount + 2 * this._bufferSize
    )

    // 更新可见任务
    this._visibleTasks = this._tasks.slice(startIndex, endIndex)
  }

  /**
   * 渲染可见任务
   */
  private _renderVisibleTasks(): void {
    if (!this._element) return

    const taskContainer = this._element.querySelector(".gantt-task-container") as HTMLElement
    if (!taskContainer) return

    // 清空任务容器
    while (taskContainer.firstChild) {
      taskContainer.removeChild(taskContainer.firstChild)
    }

    // 渲染可见任务
    const tasks = this._virtualScrolling ? this._visibleTasks : this._tasks
    const rowHeight = this._options.rowHeight || 40

    tasks.forEach((task) => {
      const taskRow = document.createElement("div")
      taskRow.className = "gantt-task-row"

      // 如果是虚拟滚动，设置任务行的位置
      if (this._virtualScrolling) {
        const taskIndex = this._tasks.findIndex((t) => t.id === task.id)
        taskRow.style.position = "absolute"
        taskRow.style.top = `${taskIndex * rowHeight}px`
        taskRow.style.width = "100%"
      }

      // 任务标签
      const taskLabel = document.createElement("div")
      taskLabel.className = "gantt-task-label"
      taskLabel.textContent = task.name
      taskRow.appendChild(taskLabel)

      // 任务条
      const taskBar = document.createElement("div")
      taskBar.className = "gantt-task-bar"

      const offset = this._getTaskOffset(task)
      const width = this._getTaskWidth(task)
      taskBar.style.left = `${offset + 200}px`
      taskBar.style.width = `${width}px`
      taskBar.style.backgroundColor = task.color || "#4e85c5"
      taskBar.setAttribute("data-task-id", String(task.id))

      // 如果有进度，添加进度条
      if (task.progress !== undefined) {
        const progressBar = document.createElement("div")
        progressBar.className = "gantt-task-progress"
        progressBar.style.width = `${Math.min(
          100,
          Math.max(0, task.progress)
        )}%`
        taskBar.appendChild(progressBar)
      }

      // 如果开启拖拽，则设置样式
      if (this._options.enableDragging !== false) {
        taskBar.style.cursor = "move"
      }

      taskRow.appendChild(taskBar)
      taskContainer.appendChild(taskRow)
    })

    // 设置容器高度以适应所有任务
    if (this._virtualScrolling) {
      taskContainer.style.height = `${this._tasks.length * rowHeight}px`
      taskContainer.style.position = "relative"
    }
  }

  /**
   * 处理容器大小变化
   */
  private _handleResizeHandler(): void {
    if (!this._element) return

    this._containerHeight = this._element.clientHeight
    if (this._virtualScrolling) {
      this._updateVisibleTasks()
      this._renderVisibleTasks()
    }
  }

  /**
   * 防抖函数
   */
  private _debounce(func: Function, wait: number): () => void {
    let timeout: number | null = null
    return () => {
      const later = () => {
        timeout = null
        func()
      }
      if (timeout !== null) {
        clearTimeout(timeout)
      }
      timeout = window.setTimeout(later, wait) as unknown as number
    }
  }

  /**
   * 滚动到指定任务
   * @param taskId 任务ID
   */
  scrollToTask(taskId: number | string): void {
    if (!this._element) return

    // 找到任务
    const task = this._tasks.find(t => t.id === taskId)
    if (!task) return

    // 计算任务在甘特图中的位置
    const taskIndex = this._tasks.indexOf(task)
    if (taskIndex === -1) return

    // 计算任务在视图中的位置并滚动
    const rowHeight = this._options.rowHeight || 40
    const scrollTop = taskIndex * rowHeight

    this._element.scrollTo({
      top: scrollTop,
      behavior: 'smooth'
    })

    // 计算水平位置并滚动
    const taskStart = DateUtils.parseDate(task.start)
    const daysDiff = DateUtils.daysBetween(this._startDate, taskStart)
    const columnWidth = this._options.columnWidth || 40
    const scrollLeft = daysDiff * columnWidth

    this._element.scrollTo({
      left: scrollLeft,
      behavior: 'smooth'
    })
  }

  /**
   * 滚动到指定日期
   * @param date 目标日期
   */
  scrollToDate(date: Date | string): void {
    if (!this._element) return

    const targetDate = typeof date === 'string' ? DateUtils.parseDate(date) : date

    // 计算日期在视图中的位置并滚动
    const daysDiff = DateUtils.daysBetween(this._startDate, targetDate)
    const columnWidth = this._options.columnWidth || 40
    const scrollLeft = daysDiff * columnWidth

    this._element.scrollTo({
      left: scrollLeft,
      behavior: 'smooth'
    })
  }

  /**
   * 设置视图模式
   * @param mode 视图模式
   */
  setViewMode(mode: ViewMode): void {
    if (!this._element) return

    // 更新视图模式
    this._options.viewMode = mode

    // 重新渲染
    this.render(this._element)

    // 触发视图变更回调
    if (this._options.onViewChange) {
      this._options.onViewChange(mode)
    }
  }

  /**
   * 获取当前可见的任务
   * @returns 可见任务数组
   */
  getVisibleTasks(): Task[] {
    if (this._virtualScrolling) {
      return this._visibleTasks
    } else {
      return this._tasks
    }
  }

  /**
   * 导出为PNG图片
   * @param options 导出选项
   * @returns 数据URL的Promise
   */
  async exportAsPNG(options: ExportOptions = {}): Promise<string> {
    if (!this._element) return Promise.reject("甘特图未渲染");

    try {
      // 使用utils中的exportToImage工具函数，传递正确的options对象
      const dataUrl = await ExportUtils.exportToImage(this._element, options);
      return dataUrl;
    } catch (error) {
      console.error("导出PNG失败:", error);
      return Promise.reject(error);
    }
  }

  /**
   * 导出为PDF文档
   * @param options 导出选项
   * @returns PDF Blob的Promise
   */
  async exportAsPDF(options: ExportOptions = {}): Promise<Blob> {
    if (!this._element) return Promise.reject("甘特图未渲染");

    try {
      // 使用utils中的exportToPDF工具函数，传递正确的options对象
      return await ExportUtils.exportToPDF(this._element, options);
    } catch (error) {
      console.error("导出PDF失败:", error);
      return Promise.reject(error);
    }
  }

  /**
   * 自动排程功能
   * 根据依赖关系自动调整任务的开始和结束时间
   * @param respectDependencies 是否尊重依赖关系
   * @returns 调整后的任务数组
   */
  autoSchedule(respectDependencies: boolean = true): Task[] {
    // 创建任务副本以避免修改原始数据
    const scheduledTasks = JSON.parse(JSON.stringify(this._tasks)) as Task[];

    if (respectDependencies) {
      // 按依赖关系排序任务（拓扑排序）
      const taskMap = new Map<string | number, Task>();
      const visited = new Set<string | number>();
      const visitedInCurrentPath = new Set<string | number>();
      const sortedTasks: Task[] = [];

      // 构建任务映射
      scheduledTasks.forEach(task => {
        taskMap.set(task.id, task);
      });

      // 深度优先搜索进行拓扑排序
      const dfs = (taskId: string | number) => {
        if (visitedInCurrentPath.has(taskId)) {
          // 检测到循环依赖
          console.warn(`检测到循环依赖，包含任务ID: ${taskId}`);
          return;
        }

        if (visited.has(taskId)) {
          return;
        }

        visited.add(taskId);
        visitedInCurrentPath.add(taskId);

        const task = taskMap.get(taskId);
        if (task && task.dependsOn) {
          task.dependsOn.forEach(depId => {
            dfs(depId);
          });
        }

        visitedInCurrentPath.delete(taskId);
        if (task) {
          sortedTasks.push(task);
        }
      };

      // 对所有任务执行DFS
      scheduledTasks.forEach(task => {
        if (!visited.has(task.id)) {
          dfs(task.id);
        }
      });

      // 根据依赖关系调整任务日期
      sortedTasks.forEach(task => {
        if (task.dependsOn && task.dependsOn.length > 0) {
          let maxEndDate = new Date(0); // 初始化为最早的日期

          // 找到所有依赖任务的最晚结束日期
          task.dependsOn.forEach(depId => {
            const dependencyTask = taskMap.get(depId);
            if (dependencyTask) {
              const endDate = DateUtils.parseDate(dependencyTask.end);
              if (endDate > maxEndDate) {
                maxEndDate = new Date(endDate);
              }
            }
          });

          // 调整当前任务的开始日期为依赖任务的最晚结束日期之后的一天
          if (maxEndDate.getTime() > 0) {
            const startDate = DateUtils.addDays(maxEndDate, 1);
            const taskDuration = DateUtils.daysBetween(DateUtils.parseDate(task.start), DateUtils.parseDate(task.end));
            const endDate = DateUtils.addDays(startDate, taskDuration);

            task.start = DateUtils.format(startDate);
            task.end = DateUtils.format(endDate);
          }
        }
      });
    }

    // 触发自动排程完成回调
    if (this._options.onAutoScheduleComplete) {
      this._options.onAutoScheduleComplete(scheduledTasks);
    }

    // 更新任务并重新渲染
    this.updateTasks(scheduledTasks);

    return scheduledTasks;
  }

  /**
   * 应用主题
   * @param theme 主题配置对象
   */
  applyTheme(theme: any): void {
    if (!this._element) return;

    // 默认主题 - 支持更多自定义选项
    const defaultTheme = {
      // 基础颜色
      primary: '#4e85c5',
      secondary: '#13c2c2',
      success: '#52c41a',
      warning: '#faad14',
      error: '#f5222d',
      textPrimary: '#000000d9',
      textSecondary: '#00000073',
      borderColor: '#d9d9d9',
      backgroundColor: '#ffffff',

      // 字体设置
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',

      // 任务相关
      taskColor: '#4e85c5',
      taskBackgroundColor: '#e6f7ff',
      taskBorderColor: '#91d5ff',
      taskHoverColor: '#1890ff',
      taskSelectedColor: '#096dd9',
      taskProgressColor: '#52c41a',
      taskProgressBackgroundColor: '#f6ffed',

      // 里程碑相关
      milestoneColor: '#722ed1',
      milestoneBorderColor: '#d3adf7',
      milestoneBackgroundColor: '#f9f0ff',
      milestoneHoverColor: '#531dab',

      // 项目相关
      projectColor: '#fa8c16',
      projectBorderColor: '#ffd591',
      projectBackgroundColor: '#fff7e6',
      projectHoverColor: '#d46b08',

      // 依赖线相关
      dependencyLineColor: '#bfbfbf',
      dependencyLineWidth: '2',

      // 今日线相关
      todayLineColor: '#ff4d4f',
      todayLineWidth: '2',

      // 网格相关
      gridLineColor: '#f0f0f0',
      weekendBackgroundColor: '#fafafa',

      // 边框和阴影
      borderRadius: '4px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',

      // 交互相关
      cursorMove: 'move',
      cursorResize: 'ew-resize',
      cursorPointer: 'pointer',

      // 选择相关
      selectionColor: '#1890ff',
      selectionBackgroundColor: 'rgba(24, 144, 255, 0.1)',

      // 拖拽相关
      dragShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',

      // 辅助线
      guideLineColor: '#1890ff',
      guideLineWidth: '1px',
      guideLineStyle: 'dashed',

      // 滚动条
      scrollbarWidth: '8px',
      scrollbarTrackColor: '#f0f0f0',
      scrollbarThumbColor: '#c1c1c1',
      scrollbarThumbHoverColor: '#a8a8a8',

      // 文本样式
      textTask: '#333',
      textMilestone: '#333',
      textProject: '#333'
    };

    // 合并用户主题
    const currentTheme = { ...defaultTheme, ...theme };

    // 创建样式元素
    let styleEl = document.getElementById('gantt-custom-theme');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'gantt-custom-theme';
      document.head.appendChild(styleEl);
    }

    // 应用主题 - 支持更细粒度的样式控制
    styleEl.textContent = `
      /* 容器基础样式 */
      .gantt-container {
        font-family: ${currentTheme.fontFamily};
        font-size: ${currentTheme.fontSize};
        background-color: ${currentTheme.backgroundColor};
        color: ${currentTheme.textPrimary};
        border-color: ${currentTheme.borderColor};
        
        /* CSS变量定义，方便在组件中使用 */
        --gantt-primary-color: ${currentTheme.primary};
        --gantt-secondary-color: ${currentTheme.secondary};
        --gantt-success-color: ${currentTheme.success};
        --gantt-warning-color: ${currentTheme.warning};
        --gantt-error-color: ${currentTheme.error};
        --gantt-text-primary: ${currentTheme.textPrimary};
        --gantt-text-secondary: ${currentTheme.textSecondary};
        --gantt-border-color: ${currentTheme.borderColor};
        --gantt-background-color: ${currentTheme.backgroundColor};
        --gantt-border-radius: ${currentTheme.borderRadius};
        --gantt-box-shadow: ${currentTheme.boxShadow};
      }
      
      /* 任务条样式 */
      .gantt-task-bar {
        background-color: ${currentTheme.taskBackgroundColor};
        border-color: ${currentTheme.taskBorderColor};
        border: 1px solid ${currentTheme.taskBorderColor};
        border-radius: ${currentTheme.borderRadius};
        box-shadow: ${currentTheme.boxShadow};
        color: ${currentTheme.textTask};
        cursor: ${currentTheme.cursorMove};
        transition: all 0.3s ease;
      }
      
      /* 任务条悬停样式 */
      .gantt-task-bar:hover {
        background-color: ${currentTheme.taskHoverColor};
        border-color: ${currentTheme.taskHoverColor};
        transform: translateY(-1px);
        box-shadow: ${currentTheme.dragShadow};
      }
      
      /* 任务条选中样式 */
      .gantt-task-bar.selected {
        background-color: ${currentTheme.selectionBackgroundColor};
        border-color: ${currentTheme.selectionColor};
        box-shadow: 0 0 0 2px ${currentTheme.selectionColor};
      }
      
      /* 任务进度条样式 */
      .gantt-task-progress {
        background-color: ${currentTheme.taskProgressColor};
        border-radius: ${currentTheme.borderRadius} 0 0 ${currentTheme.borderRadius};
        transition: width 0.3s ease;
      }
      
      /* 里程碑样式 */
      .gantt-milestone {
        background-color: ${currentTheme.milestoneBackgroundColor};
        border-color: ${currentTheme.milestoneBorderColor};
        border: 2px solid ${currentTheme.milestoneBorderColor};
        border-radius: 50%;
        color: ${currentTheme.textMilestone};
        cursor: ${currentTheme.cursorPointer};
        transition: all 0.3s ease;
      }
      
      /* 里程碑悬停样式 */
      .gantt-milestone:hover {
        background-color: ${currentTheme.milestoneHoverColor};
        border-color: ${currentTheme.milestoneHoverColor};
        transform: scale(1.1);
        box-shadow: ${currentTheme.dragShadow};
      }
      
      /* 项目任务样式 */
      .gantt-task-bar.project {
        background-color: ${currentTheme.projectBackgroundColor};
        border-color: ${currentTheme.projectBorderColor};
        border: 2px solid ${currentTheme.projectBorderColor};
        color: ${currentTheme.textProject};
      }
      
      /* 项目任务悬停样式 */
      .gantt-task-bar.project:hover {
        background-color: ${currentTheme.projectHoverColor};
        border-color: ${currentTheme.projectHoverColor};
      }
      
      /* 依赖线样式 */
      .gantt-dependency-line {
        stroke: ${currentTheme.dependencyLineColor};
        stroke-width: ${currentTheme.dependencyLineWidth};
        transition: stroke 0.3s ease;
      }
      
      /* 依赖线悬停样式 */
      .gantt-dependency-line:hover {
        stroke: ${currentTheme.primary};
        stroke-width: ${parseInt(currentTheme.dependencyLineWidth) + 1}px;
      }
      
      /* 今日线样式 */
      .gantt-today-line {
        background-color: ${currentTheme.todayLineColor};
        width: ${currentTheme.todayLineWidth};
        opacity: 0.8;
        transition: all 0.3s ease;
      }
      
      /* 网格线样式 */
      .gantt-grid-line {
        border-color: ${currentTheme.gridLineColor};
      }
      
      /* 周末背景样式 */
      .gantt-weekend {
        background-color: ${currentTheme.weekendBackgroundColor};
      }
      
      /* 拖拽时的阴影效果 */
      .gantt-task-bar.dragging {
        opacity: 0.8;
        box-shadow: ${currentTheme.dragShadow};
        z-index: 1000;
      }
      
      /* 辅助线样式 */
      .gantt-guide-line {
        background-color: ${currentTheme.guideLineColor};
        width: ${currentTheme.guideLineWidth};
        opacity: 0.7;
        z-index: 999;
      }
      
      /* 调整大小手柄样式 */
      .gantt-task-resize-handle {
        cursor: ${currentTheme.cursorResize};
        transition: all 0.3s ease;
      }
      
      /* 调整大小手柄悬停样式 */
      .gantt-task-resize-handle:hover {
        background-color: ${currentTheme.primary};
        transform: scale(1.2);
      }
      
      /* 任务标签样式 */
      .gantt-task-label {
        color: ${currentTheme.textTask};
        font-size: ${currentTheme.fontSize};
        font-weight: 400;
      }
      
      /* 滚动条样式 */
      ::-webkit-scrollbar {
        width: ${currentTheme.scrollbarWidth};
        height: ${currentTheme.scrollbarWidth};
      }
      
      ::-webkit-scrollbar-track {
        background: ${currentTheme.scrollbarTrackColor};
      }
      
      ::-webkit-scrollbar-thumb {
        background: ${currentTheme.scrollbarThumbColor};
        border-radius: 4px;
      }
      
      ::-webkit-scrollbar-thumb:hover {
        background: ${currentTheme.scrollbarThumbHoverColor};
      }
      
      /* 选中区域样式 */
      .gantt-selection-area {
        background-color: ${currentTheme.selectionBackgroundColor};
        border: 1px dashed ${currentTheme.selectionColor};
        opacity: 0.5;
      }
    `;
  }

  /**
   * 准备和验证选项
   * @param {GanttChartOptions} options - 原始选项
   * @returns {GanttChartOptions} 处理后的选项
   * @private
   */
  private _prepareOptions(options: GanttChartOptions): GanttChartOptions {
    // 默认选项
    const defaultOptions: Partial<GanttChartOptions> = {
      columnWidth: 40,
      rowHeight: 40,
      headerHeight: 50,
      showWeekends: true,
      showToday: true,
      showRowLines: true,
      showColumnLines: true,
      enableDependencies: true,
      enableDragging: true,
      enableResizing: true,
      enableProgress: true,
      viewMode: 'day'
    };

    // 合并默认选项和用户选项
    return { ...defaultOptions, ...options };
  }

  /**
   * 初始化主题
   * @private
   */
  private _initializeTheme(): void {
    // 默认主题
    const defaultTheme: Record<string, string> = {
      primary: '#1E88E5',
      secondary: '#757575',
      success: '#4CAF50',
      warning: '#FFC107',
      error: '#F44336',
      textPrimary: '#212121',
      textSecondary: '#757575',
      borderColor: '#E0E0E0',
      backgroundColor: '#FFFFFF',
      taskColor: '#1E88E5',
      milestoneColor: '#9C27B0',
      projectColor: '#2196F3',
      dependencyLineColor: '#90A4AE'
    };

    // 合并自定义主题
    this._theme = { ...defaultTheme, ...(this._options.theme || {}) } as Record<string, string>;
  }

  /**
   * 处理任务点击事件
   * @param {MouseEvent} e - 鼠标事件
   * @private
   */
  private _handleTaskClick(e: MouseEvent): void {
    const taskBar = e.currentTarget as HTMLElement;
    const taskId = taskBar.getAttribute('data-task-id');
    if (!taskId) return;

    const task = this._tasks.find(t => String(t.id) === taskId);
    if (task && this._options.onTaskClick) {
      this._options.onTaskClick(task, e);
    }
  }

  /**
   * 处理任务双击事件
   * @param {MouseEvent} e - 鼠标事件
   * @private
   */
  private _handleTaskDoubleClick(e: MouseEvent): void {
    const taskBar = e.currentTarget as HTMLElement;
    const taskId = taskBar.getAttribute('data-task-id');
    if (!taskId) return;

    const task = this._tasks.find(t => String(t.id) === taskId);
    if (task && this._options.onTaskDoubleClick) {
      this._options.onTaskDoubleClick(task, e);
    }
  }

  /**
   * 注册事件监听器
   * @param eventName 事件名称
   * @param callback 回调函数
   * @returns 取消注册的函数
   */
  public on(eventName: string, callback: EventCallback): () => void {
    if (!this._eventListeners.has(eventName)) {
      this._eventListeners.set(eventName, []);
    }

    this._eventListeners.get(eventName)?.push(callback);

    return () => {
      if (this._eventListeners.has(eventName)) {
        this._eventListeners.get(eventName)?.filter(cb => cb !== callback);
      }
    };
  }

  /**
   * 触发事件
   * @param eventName 事件名称
   * @param args 参数列表
   */
  private trigger(eventName: string, ...args: any[]): void {
    if (this._eventListeners.has(eventName)) {
      this._eventListeners.get(eventName)?.forEach(callback => {
        callback(...args);
      });
    }
  }

  /**
   * 附加DOM事件监听器
   */
  private attachEventListeners(): void {
    // 具体实现略，需要添加对滚动、点击、拖拽等事件的处理
  }

  /**
   * 销毁甘特图
   */
  public destroy(): void {
    if (this.isDestroyed) return;

    // 移除所有事件监听器
    this._eventListeners.clear();

    // 清空容器
    if (this._element) {
      this._element.innerHTML = '';
    }

    // 标记为已销毁
    this.isDestroyed = true;
  }
}

// 添加默认导出，支持Vue组件的默认导入
export default GanttChartCore;
