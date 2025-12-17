/**
 * 增强型甘特图组件
 * 封装了常用操作和工具函数，提供更简单的API接口
 *
 * @module EnhancedGanttChart
 */
import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useImperativeHandle,
} from "react"
import {
  Task,
  Dependency,
  Resource,
  ViewMode,
  ExportOptions,
} from "../core/types"
import utils, { daysBetween, addDays, formatDate } from "../core/utils"
import createStateManager, { ViewSettings } from "../core/StateManager"
import html2canvas from "html2canvas"
import { jsPDF } from "jspdf"
import { VirtualizedList } from "./VirtualizedList"
import { DragGuide } from "../components/DragGuide"

// 从utils中提取需要的工具
const { ExampleGenerator } = utils

/** 日期范围接口 */
interface DateRange {
  startDate: string
  endDate: string
}

/** 甘特图配置选项 */
interface GanttOptions {
  viewMode?: ViewMode
  theme?: any
  allowTaskResize?: boolean
  allowTaskDrag?: boolean
  readOnly?: boolean
  [key: string]: any
}

/** 增强型甘特图接口 */
export interface EnhancedGanttChartProps {
  /** 任务列表 */
  tasks?: Task[]
  /** 依赖关系列表 */
  dependencies?: Dependency[]
  /** 资源列表 */
  resources?: Resource[]
  /** 甘特图配置项 */
  options?: GanttOptions
  /** 展示模式 */
  viewMode?: ViewMode
  /** 示例数据数量（如果不提供tasks，将生成示例数据） */
  sampleCount?: number
  /** 当任务变更时的回调 */
  onTasksChange?: (tasks: Task[]) => void
  /** 当依赖关系变更时的回调 */
  onDependenciesChange?: (dependencies: Dependency[]) => void
  /** 当任务被点击时的回调 */
  onTaskClick?: (task: Task) => void
  /** 当任务被双击时的回调 */
  onTaskDoubleClick?: (task: Task) => void
  /** 日期范围变更时的回调 */
  onDateRangeChange?: (range: DateRange) => void
  /** 自定义类名 */
  className?: string
  /** 自定义样式 */
  style?: React.CSSProperties
}

/**
 * 增强型甘特图组件
 * 封装了常用操作和实用功能，使用更加简单
 */
export const EnhancedGanttChart = React.forwardRef<
  any,
  EnhancedGanttChartProps
>((props, ref) => {
  const {
    tasks: propsTasks,
    dependencies: propsDependencies,
    options = {},
    viewMode = "day",
    sampleCount = 10,
    onTasksChange,
    onDependenciesChange,
    onTaskClick,
    onTaskDoubleClick,
    onDateRangeChange,
  } = props

  // 引用甘特图实例
  const ganttRef = useRef<any>(null)

  // 引用状态管理器
  const stateManagerRef = useRef<ReturnType<typeof createStateManager> | null>(
    null
  )

  // 内部状态
  const [tasks, setTasks] = useState<Task[]>([])
  const [dependencies, setDependencies] = useState<Dependency[]>([])
  const [currentViewMode, setCurrentViewMode] = useState<ViewMode>(viewMode)
  const [draggingTask, setDraggingTask] = useState<Task | null>(null)
  const [resizingTask, setResizingTask] = useState<{
    task: Task
    type: "left" | "right"
  } | null>(null)
  const [startDate, setStartDate] = useState<Date>(new Date())
  const [endDate, setEndDate] = useState<Date>(new Date())
  const [visibleTasks, setVisibleTasks] = useState<Task[]>([])

  // 拖拽相关状态
  const [snapPoints, setSnapPoints] = useState<{ x: number[]; y: number[] }>({
    x: [],
    y: [],
  })
  const [currentPosition, setCurrentPosition] = useState<{
    x: number
    y: number
  }>({ x: 0, y: 0 })
  const [showGuides, setShowGuides] = useState<boolean>(false)
  const [snapDistance, setSnapDistance] = useState<number>(5) // 磁吸阈值（像素）

  // refs
  const containerRef = useRef<HTMLDivElement>(null)
  const mainAreaRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const tasksRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  // 初始化示例数据（如果没有提供任务）
  useEffect(() => {
    if (!propsTasks || propsTasks.length === 0) {
      const sampleTasks = ExampleGenerator.generateTasks(sampleCount)
      const sampleDependencies = ExampleGenerator.generateDependencies(
        sampleTasks,
        Math.floor(sampleCount / 2)
      )
      setTasks(sampleTasks)
      setDependencies(sampleDependencies)
    } else {
      setTasks(propsTasks)
      setDependencies(propsDependencies || [])
    }
  }, [propsTasks, propsDependencies, sampleCount])

  // 初始化状态管理器
  useEffect(() => {
    if (tasks.length > 0 && !stateManagerRef.current) {
      stateManagerRef.current = createStateManager({
        tasks,
        dependencies,
      })

      // 手动更新视图设置
      stateManagerRef.current.updateViewSettings({
        mode: currentViewMode,
      } as ViewSettings)

      // 订阅状态变更
      const unsubTasksListener = stateManagerRef.current.subscribe((state) => {
        setTasks([...state.tasks])
        if (onTasksChange) onTasksChange([...state.tasks])
      })

      const unsubDepsListener = stateManagerRef.current.subscribe((state) => {
        setDependencies([...state.dependencies])
        if (onDependenciesChange) onDependenciesChange([...state.dependencies])
      })

      const unsubRangeListener = stateManagerRef.current.subscribe((state) => {
        if (onDateRangeChange) {
          // 从任务中计算日期范围
          const dates = state.tasks
            .map((t) => [new Date(t.start), new Date(t.end)])
            .flat()
          const minDate = new Date(Math.min(...dates.map((d) => d.getTime())))
          const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())))

          onDateRangeChange({
            startDate: formatDate(minDate),
            endDate: formatDate(maxDate),
          })
        }
      })

      // 返回清理函数
      return () => {
        unsubTasksListener()
        unsubDepsListener()
        unsubRangeListener()
      }
    }

    return undefined
  }, [
    tasks.length,
    dependencies.length,
    onTasksChange,
    onDependenciesChange,
    onDateRangeChange,
    tasks,
    dependencies,
    currentViewMode,
  ])

  // 更新视图模式
  useEffect(() => {
    if (currentViewMode !== viewMode) {
      setCurrentViewMode(viewMode)
      if (ganttRef.current) {
        ganttRef.current.setViewMode(viewMode)
      }

      if (stateManagerRef.current) {
        stateManagerRef.current.updateViewSettings({
          mode: viewMode,
        } as ViewSettings)
      }
    }
  }, [viewMode, currentViewMode])

  // 更新任务状态的回调
  const handleTaskUpdate = useCallback(
    (updatedTask: Task) => {
      if (stateManagerRef.current) {
        // 找到并更新特定任务
        const currentTasks = [...tasks]
        const taskIndex = currentTasks.findIndex((t) => t.id === updatedTask.id)
        if (taskIndex !== -1) {
          currentTasks[taskIndex] = updatedTask
          stateManagerRef.current.updateTasks(currentTasks)
        }
      }
    },
    [tasks]
  )

  // 更新依赖关系的回调
  const handleDependencyUpdate = useCallback(
    (updatedDependency: Dependency) => {
      if (stateManagerRef.current) {
        // 找到并更新特定依赖关系
        const currentDependencies = [...dependencies]
        const depIndex = currentDependencies.findIndex(
          (d) =>
            d.fromId === updatedDependency.fromId &&
            d.toId === updatedDependency.toId
        )
        if (depIndex !== -1) {
          currentDependencies[depIndex] = updatedDependency
          stateManagerRef.current.updateDependencies(currentDependencies)
        }
      }
    },
    [dependencies]
  )

  // 添加新任务
  const handleAddTask = useCallback(
    (task: Partial<Task>) => {
      if (stateManagerRef.current) {
        const newTask: Task = {
          id: `task_${Date.now()}`,
          name: task.name || "新任务",
          start: task.start || formatDate(new Date()),
          end: task.end || formatDate(addDays(new Date(), 1)),
          progress: task.progress || 0,
          type: task.type || "task",
          ...task,
        }

        const updatedTasks = [...tasks, newTask]
        stateManagerRef.current.updateTasks(updatedTasks)
      }
    },
    [tasks]
  )

  // 删除任务
  const handleRemoveTask = useCallback(
    (taskId: string) => {
      if (stateManagerRef.current) {
        const updatedTasks = tasks.filter((t) => t.id !== taskId)
        stateManagerRef.current.updateTasks(updatedTasks)
      }
    },
    [tasks]
  )

  // 导出为图片
  const handleExportImage = useCallback(
    async (options?: ExportOptions) => {
      console.log("EnhancedGanttChart: 开始导出PNG", options)
      if (!containerRef.current) {
        console.error("EnhancedGanttChart: 容器引用不存在")
        throw new Error("甘特图容器未初始化")
      }

      try {
        const defaultOptions = {
          fileName: "甘特图",
          backgroundColor: "#ffffff",
          scale: 2,
          includeHeader: true,
          headerText: "项目甘特图",
        }

        const exportOptions = { ...defaultOptions, ...options }
        const { fileName, backgroundColor, scale, includeHeader, headerText } =
          exportOptions

        // 创建完整内容的临时容器，不使用虚拟滚动
        const tempContainer = document.createElement("div")
        tempContainer.style.background = backgroundColor || "#ffffff"
        tempContainer.style.padding = "20px"

        // 计算包含所有任务的日期范围
        const allTaskDates = tasks
          .map((task) => [new Date(task.start), new Date(task.end)])
          .flat()
        const minDate = new Date(
          Math.min(...allTaskDates.map((date) => date.getTime()))
        )
        const maxDate = new Date(
          Math.max(...allTaskDates.map((date) => date.getTime()))
        )

        // 计算列宽
        let columnWidth = 40 // 默认日视图列宽
        switch (viewMode) {
          case "week":
            columnWidth = 150
            break
          case "month":
            columnWidth = 300
            break
          default:
            columnWidth = 40
        }

        // 计算包含所有任务的总宽度和高度
        const totalDays = daysBetween(minDate, maxDate) + 1
        const totalWidth = totalDays * columnWidth + 40 // 40是侧边栏宽度
        const totalHeight = tasks.length * 40 + 80 // 包含所有任务行的高度
        const days = daysBetween(minDate, maxDate) // 使用完整日期范围计算天数

        tempContainer.style.width = `${totalWidth}px`
        tempContainer.style.height = `${totalHeight}px`
        tempContainer.style.position = "absolute"
        tempContainer.style.left = "-9999px" // 隐藏临时容器
        tempContainer.style.top = "-9999px"
        tempContainer.style.zIndex = "1000"
        tempContainer.style.overflow = "hidden"

        // 添加标题
        if (includeHeader) {
          const header = document.createElement("div")
          header.style.fontSize = "24px"
          header.style.fontWeight = "bold"
          header.style.marginBottom = "15px"
          header.style.textAlign = "center"
          header.style.color = "#333"
          header.textContent = headerText || "项目甘特图"
          tempContainer.appendChild(header)
        }

        // 渲染完整的甘特图内容，不使用虚拟滚动
        const ganttContent = document.createElement("div")
        ganttContent.style.position = "relative"
        ganttContent.style.width = `${totalWidth}px`
        ganttContent.style.height = `${tasks.length * 40 + 40}px` // 包含时间线和所有任务

        // 渲染时间线
        const timelineClone = containerRef.current
          .querySelector(".gantt-chart-timeline")
          ?.cloneNode(true) as HTMLElement
        if (timelineClone) {
          ganttContent.appendChild(timelineClone)
        } else {
          // 如果没有找到时间线元素，创建一个简化的时间线
          const timeline = document.createElement("div")
          timeline.style.position = "relative"
          timeline.style.height = "40px"
          timeline.style.backgroundColor = "#f5f5f5"
          timeline.style.borderBottom = "1px solid #e8e8e8"
          ganttContent.appendChild(timeline)
        }

        // 渲染完整任务列表（不使用虚拟滚动）
        const tasksContainer = document.createElement("div")
        tasksContainer.style.position = "relative"
        tasksContainer.style.height = `${tasks.length * 40}px`

        // 渲染网格背景
        const gridContainer = document.createElement("div")
        gridContainer.style.position = "absolute"
        gridContainer.style.top = "0"
        gridContainer.style.left = "0"
        gridContainer.style.width = "100%"
        gridContainer.style.height = "100%"
        gridContainer.style.pointerEvents = "none"
        gridContainer.style.zIndex = "1"

        // 添加网格线
        for (let i = 0; i <= days; i++) {
          const gridLine = document.createElement("div")
          gridLine.style.position = "absolute"
          gridLine.style.left = `${i * columnWidth}px`
          gridLine.style.top = "0"
          gridLine.style.width = "1px"
          gridLine.style.height = "100%"
          gridLine.style.backgroundColor = mergedOptions.theme.gridLine
          gridContainer.appendChild(gridLine)
        }

        // 添加行分隔线
        for (let i = 0; i <= tasks.length; i++) {
          const rowLine = document.createElement("div")
          rowLine.style.position = "absolute"
          rowLine.style.left = "0"
          rowLine.style.top = `${i * 40}px`
          rowLine.style.width = "100%"
          rowLine.style.height = "1px"
          rowLine.style.backgroundColor = mergedOptions.theme.gridLine
          gridContainer.appendChild(rowLine)
        }

        tasksContainer.appendChild(gridContainer)

        // 渲染所有任务
        tasks.forEach((task, index) => {
          const taskElement = document.createElement("div")
          taskElement.style.position = "absolute"
          taskElement.style.top = `${index * 40 + 8}px`

          // 计算任务位置和宽度，直接在函数内部计算，避免依赖外部函数
          const start =
            typeof task.start === "string" ? new Date(task.start) : task.start
          const end =
            typeof task.end === "string" ? new Date(task.end) : task.end
          // 计算列宽
          let taskColumnWidth = 40 // 默认日视图列宽
          switch (viewMode) {
            case "week":
              taskColumnWidth = 150
              break
            case "month":
              taskColumnWidth = 300
              break
            default:
              taskColumnWidth = 40
          }
          const daysDiff = daysBetween(start, end) + 1 // 包括结束日
          const left = daysBetween(minDate, start) * taskColumnWidth
          const width = daysDiff * taskColumnWidth

          // 设置任务样式
          taskElement.style.left = `${left}px`
          taskElement.style.width = `${width}px`
          taskElement.style.height = "24px"
          taskElement.style.backgroundColor = mergedOptions.theme.taskBackground
          taskElement.style.border = `1px solid ${mergedOptions.theme.taskBorder}`
          taskElement.style.borderRadius = "4px"
          taskElement.style.boxSizing = "border-box"
          taskElement.style.zIndex = "5"

          // 添加进度条
          if (task.progress !== undefined && task.type !== "milestone") {
            const progressBar = document.createElement("div")
            progressBar.style.position = "absolute"
            progressBar.style.top = "0"
            progressBar.style.left = "0"
            progressBar.style.height = "100%"
            progressBar.style.width = `${task.progress}%`
            progressBar.style.backgroundColor = mergedOptions.theme.primary
            progressBar.style.borderRadius = "3px 0 0 3px"
            taskElement.appendChild(progressBar)
          }

          // 添加任务名称
          const taskName = document.createElement("div")
          taskName.style.position = "absolute"
          taskName.style.top = "0"
          taskName.style.left = "10px"
          taskName.style.height = "100%"
          taskName.style.display = "flex"
          taskName.style.alignItems = "center"
          taskName.style.color = "#333"
          taskName.style.fontSize = "12px"
          taskName.style.whiteSpace = "nowrap"
          taskName.style.overflow = "hidden"
          taskName.style.textOverflow = "ellipsis"
          taskName.style.paddingRight = "10px"
          taskName.style.zIndex = "1"
          taskName.textContent = task.name
          taskElement.appendChild(taskName)

          tasksContainer.appendChild(taskElement)
        })

        ganttContent.appendChild(tasksContainer)
        tempContainer.appendChild(ganttContent)

        // 将临时容器添加到DOM
        document.body.appendChild(tempContainer)

        // 确保所有内容都已渲染
        await new Promise((resolve) => setTimeout(resolve, 100))

        console.log("EnhancedGanttChart: 使用html2canvas捕获图像")
        // 使用html2canvas捕获图像
        const canvas = await html2canvas(tempContainer, {
          backgroundColor: backgroundColor || "#ffffff",
          scale: scale || 2,
          useCORS: true,
          allowTaint: true,
          logging: true,
          width: tempContainer.offsetWidth,
          height: tempContainer.offsetHeight,
          windowWidth: tempContainer.offsetWidth,
          windowHeight: tempContainer.offsetHeight,
        })

        // 移除临时容器
        document.body.removeChild(tempContainer)

        console.log("EnhancedGanttChart: 图像生成成功，准备下载")
        // 导出图像
        const link = document.createElement("a")
        link.download = `${fileName || "gantt-chart"}.png`
        link.href = canvas.toDataURL("image/png")
        link.click()

        return link.href
      } catch (error) {
        console.error("EnhancedGanttChart: 导出PNG失败", error)
        throw error
      }
    },
    [tasks, startDate, endDate, viewMode, daysBetween]
  )

  // 导出为PDF
  const handleExportPDF = useCallback(
    async (options?: ExportOptions) => {
      console.log("EnhancedGanttChart: 开始导出PDF", options)
      if (!containerRef.current) {
        console.error("EnhancedGanttChart: 容器引用不存在")
        throw new Error("甘特图容器未初始化")
      }

      try {
        const defaultOptions = {
          fileName: "甘特图",
          backgroundColor: "#ffffff",
          scale: 2,
          includeHeader: true,
          headerText: "项目甘特图",
          orientation: "landscape",
        }

        const exportOptions = { ...defaultOptions, ...options }
        const {
          fileName,
          backgroundColor,
          scale,
          includeHeader,
          headerText,
          orientation,
        } = exportOptions

        // 创建完整内容的临时容器，不使用虚拟滚动
        const tempContainer = document.createElement("div")
        tempContainer.style.background = backgroundColor || "#ffffff"
        tempContainer.style.padding = "20px"

        // 计算包含所有任务的日期范围
        const allTaskDates = tasks
          .map((task) => [new Date(task.start), new Date(task.end)])
          .flat()
        const minDate = new Date(
          Math.min(...allTaskDates.map((date) => date.getTime()))
        )
        const maxDate = new Date(
          Math.max(...allTaskDates.map((date) => date.getTime()))
        )

        // 计算列宽
        let pdfColumnWidth = 40 // 默认日视图列宽
        switch (viewMode) {
          case "week":
            pdfColumnWidth = 150
            break
          case "month":
            pdfColumnWidth = 300
            break
          default:
            pdfColumnWidth = 40
        }

        // 计算包含所有任务的总宽度和高度
        const totalDays = daysBetween(minDate, maxDate) + 1
        const totalWidth = totalDays * pdfColumnWidth + 40 // 40是侧边栏宽度
        const totalHeight = tasks.length * 40 + 80 // 包含所有任务行的高度

        tempContainer.style.width = `${totalWidth}px`
        tempContainer.style.height = `${totalHeight}px`
        tempContainer.style.position = "absolute"
        tempContainer.style.left = "-9999px" // 隐藏临时容器
        tempContainer.style.top = "-9999px"
        tempContainer.style.zIndex = "1000"
        tempContainer.style.overflow = "hidden"

        // 添加标题
        if (includeHeader) {
          const header = document.createElement("div")
          header.style.fontSize = "24px"
          header.style.fontWeight = "bold"
          header.style.marginBottom = "15px"
          header.style.textAlign = "center"
          header.style.color = "#333"
          header.textContent = headerText || "项目甘特图"
          tempContainer.appendChild(header)
        }

        // 渲染完整的甘特图内容，不使用虚拟滚动
        const ganttContent = document.createElement("div")
        ganttContent.style.position = "relative"
        ganttContent.style.width = `${totalWidth}px`
        ganttContent.style.height = `${tasks.length * 40 + 40}px` // 包含时间线和所有任务

        // 渲染时间线
        const timelineClone = containerRef.current
          .querySelector(".gantt-chart-timeline")
          ?.cloneNode(true) as HTMLElement
        if (timelineClone) {
          ganttContent.appendChild(timelineClone)
        } else {
          // 如果没有找到时间线元素，创建一个简化的时间线
          const timeline = document.createElement("div")
          timeline.style.position = "relative"
          timeline.style.height = "40px"
          timeline.style.backgroundColor = "#f5f5f5"
          timeline.style.borderBottom = "1px solid #e8e8e8"
          ganttContent.appendChild(timeline)
        }

        // 渲染完整任务列表（不使用虚拟滚动）
        const tasksContainer = document.createElement("div")
        tasksContainer.style.position = "relative"
        tasksContainer.style.height = `${tasks.length * 40}px`

        // 渲染网格背景
        const gridContainer = document.createElement("div")
        gridContainer.style.position = "absolute"
        gridContainer.style.top = "0"
        gridContainer.style.left = "0"
        gridContainer.style.width = "100%"
        gridContainer.style.height = "100%"
        gridContainer.style.pointerEvents = "none"
        gridContainer.style.zIndex = "1"

        // 计算天数和列宽 - 使用完整日期范围
        const days = daysBetween(minDate, maxDate)
        let pdfGridColumnWidth = 40 // 默认日视图列宽
        switch (viewMode) {
          case "week":
            pdfGridColumnWidth = 150
            break
          case "month":
            pdfGridColumnWidth = 300
            break
          default:
            pdfGridColumnWidth = 40
        }

        // 添加网格线
        for (let i = 0; i <= days; i++) {
          const gridLine = document.createElement("div")
          gridLine.style.position = "absolute"
          gridLine.style.left = `${i * pdfColumnWidth}px`
          gridLine.style.top = "0"
          gridLine.style.width = "1px"
          gridLine.style.height = "100%"
          gridLine.style.backgroundColor = mergedOptions.theme.gridLine
          gridContainer.appendChild(gridLine)
        }

        // 添加行分隔线
        for (let i = 0; i <= tasks.length; i++) {
          const rowLine = document.createElement("div")
          rowLine.style.position = "absolute"
          rowLine.style.left = "0"
          rowLine.style.top = `${i * 40}px`
          rowLine.style.width = "100%"
          rowLine.style.height = "1px"
          rowLine.style.backgroundColor = mergedOptions.theme.gridLine
          gridContainer.appendChild(rowLine)
        }

        tasksContainer.appendChild(gridContainer)

        // 渲染所有任务
        tasks.forEach((task, index) => {
          const taskElement = document.createElement("div")
          taskElement.style.position = "absolute"
          taskElement.style.top = `${index * 40 + 8}px`

          // 计算任务位置和宽度，直接在函数内部计算，避免依赖外部函数
          const start =
            typeof task.start === "string" ? new Date(task.start) : task.start
          const end =
            typeof task.end === "string" ? new Date(task.end) : task.end
          // 计算列宽
          let pdfTaskColumnWidth = 40 // 默认日视图列宽
          switch (viewMode) {
            case "week":
              pdfTaskColumnWidth = 150
              break
            case "month":
              pdfTaskColumnWidth = 300
              break
            default:
              pdfTaskColumnWidth = 40
          }
          const daysDiff = daysBetween(start, end) + 1 // 包括结束日
          const left = daysBetween(minDate, start) * pdfTaskColumnWidth
          const width = daysDiff * pdfTaskColumnWidth

          // 设置任务样式
          taskElement.style.left = `${left}px`
          taskElement.style.width = `${width}px`
          taskElement.style.height = "24px"
          taskElement.style.backgroundColor = mergedOptions.theme.taskBackground
          taskElement.style.border = `1px solid ${mergedOptions.theme.taskBorder}`
          taskElement.style.borderRadius = "4px"
          taskElement.style.boxSizing = "border-box"
          taskElement.style.zIndex = "5"

          // 添加进度条
          if (task.progress !== undefined && task.type !== "milestone") {
            const progressBar = document.createElement("div")
            progressBar.style.position = "absolute"
            progressBar.style.top = "0"
            progressBar.style.left = "0"
            progressBar.style.height = "100%"
            progressBar.style.width = `${task.progress}%`
            progressBar.style.backgroundColor = mergedOptions.theme.primary
            progressBar.style.borderRadius = "3px 0 0 3px"
            taskElement.appendChild(progressBar)
          }

          // 添加任务名称
          const taskName = document.createElement("div")
          taskName.style.position = "absolute"
          taskName.style.top = "0"
          taskName.style.left = "10px"
          taskName.style.height = "100%"
          taskName.style.display = "flex"
          taskName.style.alignItems = "center"
          taskName.style.color = "#333"
          taskName.style.fontSize = "12px"
          taskName.style.whiteSpace = "nowrap"
          taskName.style.overflow = "hidden"
          taskName.style.textOverflow = "ellipsis"
          taskName.style.paddingRight = "10px"
          taskName.style.zIndex = "1"
          taskName.textContent = task.name
          taskElement.appendChild(taskName)

          tasksContainer.appendChild(taskElement)
        })

        ganttContent.appendChild(tasksContainer)
        tempContainer.appendChild(ganttContent)

        // 将临时容器添加到DOM
        document.body.appendChild(tempContainer)

        // 确保所有内容都已渲染
        await new Promise((resolve) => setTimeout(resolve, 100))

        console.log("EnhancedGanttChart: 使用html2canvas捕获图像用于PDF")
        // 使用html2canvas捕获图像
        const canvas = await html2canvas(tempContainer, {
          backgroundColor: backgroundColor || "#ffffff",
          scale: scale || 2,
          useCORS: true,
          allowTaint: true,
          logging: true,
          width: tempContainer.offsetWidth,
          height: tempContainer.offsetHeight,
          windowWidth: tempContainer.offsetWidth,
          windowHeight: tempContainer.offsetHeight,
        })

        // 移除临时容器
        document.body.removeChild(tempContainer)

        console.log("EnhancedGanttChart: 图像生成成功，创建PDF")
        // 创建PDF
        const pdf = new jsPDF({
          orientation: orientation === "portrait" ? "portrait" : "landscape",
          unit: "mm",
        })

        // 计算PDF尺寸
        const imgWidth = orientation === "portrait" ? 210 - 20 : 297 - 20 // A4尺寸减去边距
        const imgHeight = (canvas.height * imgWidth) / canvas.width

        // 添加图像到PDF
        pdf.addImage(
          canvas.toDataURL("image/png"),
          "PNG",
          10, // x坐标
          10, // y坐标
          imgWidth,
          imgHeight
        )

        console.log("EnhancedGanttChart: PDF创建成功，准备下载")
        // 保存PDF
        pdf.save(`${fileName || "gantt-chart"}.pdf`)

        // 返回PDF的数据URI
        return pdf.output("datauristring")
      } catch (error) {
        console.error("EnhancedGanttChart: 导出PDF失败", error)
        throw error
      }
    },
    [tasks, startDate, endDate, viewMode, daysBetween]
  )

  // 撤销操作
  const handleUndo = useCallback(() => {
    if (stateManagerRef.current) {
      stateManagerRef.current.undo()
    }
  }, [])

  // 重做操作
  const handleRedo = useCallback(() => {
    if (stateManagerRef.current) {
      stateManagerRef.current.redo()
    }
  }, [])

  // 滚动到指定任务
  const handleScrollToTask = useCallback((taskId: string) => {
    if (ganttRef.current) {
      ganttRef.current.scrollToTask(taskId)
    }
  }, [])

  // 暴露给父组件的方法
  useImperativeHandle(ref, () => ({
    // 原始甘特图方法
    setViewMode: (mode: ViewMode) => {
      if (ganttRef.current) {
        ganttRef.current.setViewMode(mode)
        setCurrentViewMode(mode)
      }
    },
    scrollToTask: handleScrollToTask,

    // 导出和全屏方法
    exportAsPNG: handleExportImage,
    exportAsPDF: handleExportPDF,
    enterFullscreen: () => {
      if (!containerRef.current) {
        throw new Error("甘特图容器未初始化")
      }

      try {
        // 请求全屏
        if (containerRef.current.requestFullscreen) {
          containerRef.current.requestFullscreen()
        } else if ((containerRef.current as any).webkitRequestFullscreen) {
          ;(containerRef.current as any).webkitRequestFullscreen()
        } else if ((containerRef.current as any).msRequestFullscreen) {
          ;(containerRef.current as any).msRequestFullscreen()
        } else {
          console.warn("浏览器不支持全屏API")
        }
      } catch (error) {
        console.error("进入全屏失败:", error)
        throw error
      }
    },

    // 增强的方法
    addTask: handleAddTask,
    updateTask: handleTaskUpdate,
    removeTask: handleRemoveTask,
    updateDependency: handleDependencyUpdate,
    undo: handleUndo,
    redo: handleRedo,
    canUndo: () =>
      (stateManagerRef.current && stateManagerRef.current.undoStackSize > 0) ||
      false,
    canRedo: () =>
      (stateManagerRef.current && stateManagerRef.current.redoStackSize > 0) ||
      false,
    getStateManager: () => stateManagerRef.current,
  }))

  // 默认选项与用户选项合并
  const defaultOptions = {
    allowTaskDrag: true,
    allowTaskResize: true,
    enableDependencies: true,
    showProgress: true,
    readOnly: false,
    showWeekends: true,
    showToday: true,
    theme: {
      primary: "#1890ff",
      secondary: "#13c2c2",
      success: "#52c41a",
      warning: "#faad14",
      error: "#f5222d",
      taskBackground: "#e6f7ff",
      taskBorder: "#91d5ff",
      milestoneColor: "#722ed1",
      criticalTaskBackground: "#fff2f0",
      criticalTaskBorder: "#ff4d4f",
      gridLine: "#f0f0f0",
      fontFamily: "sans-serif",
      fontSize: 12,
    },
  }

  const mergedOptions = {
    ...defaultOptions,
    ...options,
    theme: {
      ...defaultOptions.theme,
      ...(options.theme || {}),
    },
  }

  // 计算日期范围
  useEffect(() => {
    // 根据任务找出最早和最晚的日期
    if (tasks.length > 0) {
      let earliest = new Date()
      let latest = new Date()

      tasks.forEach((task) => {
        const start =
          typeof task.start === "string" ? new Date(task.start) : task.start
        const end = typeof task.end === "string" ? new Date(task.end) : task.end

        if (start < earliest) {
          earliest = new Date(start)
        }

        if (end > latest) {
          latest = new Date(end)
        }
      })

      // 添加一些缓冲
      earliest.setDate(earliest.getDate() - 7)
      latest.setDate(latest.getDate() + 7)

      setStartDate(earliest)
      setEndDate(latest)
    } else {
      // 默认显示当前月
      const today = new Date()
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)

      setStartDate(firstDay)
      setEndDate(lastDay)
    }
  }, [tasks])

  // 根据视图模式和日期范围渲染任务
  useEffect(() => {
    setVisibleTasks(tasks)
  }, [tasks, startDate, endDate, viewMode])

  // 计算日期在甘特图上的位置
  const calculateOffsetFromDate = (date: Date): number => {
    const days = daysBetween(startDate, date)
    let columnWidth = 30 // 默认像素宽度

    switch (viewMode) {
      case "day":
        columnWidth = 40
        break
      case "week":
        columnWidth = 150
        break
      case "month":
        columnWidth = 300
        break
    }

    return days * columnWidth
  }

  // 根据偏移计算日期
  const calculateDateFromOffset = (offset: number): Date => {
    let columnWidth = 30 // 默认像素宽度

    switch (viewMode) {
      case "day":
        columnWidth = 40
        break
      case "week":
        columnWidth = 150
        break
      case "month":
        columnWidth = 300
        break
    }

    const days = Math.floor(offset / columnWidth)
    const result = new Date(startDate)
    result.setDate(result.getDate() + days)

    return result
  }

  // 计算任务宽度
  const calculateTaskWidth = (task: Task): number => {
    const start =
      typeof task.start === "string" ? new Date(task.start) : task.start
    const end = typeof task.end === "string" ? new Date(task.end) : task.end
    const days = daysBetween(start, end) + 1 // 包括结束日

    let columnWidth = 30 // 默认像素宽度

    switch (viewMode) {
      case "day":
        columnWidth = 40
        break
      case "week":
        columnWidth = 150
        break
      case "month":
        columnWidth = 300
        break
    }

    return days * columnWidth
  }

  // 计算磁吸点
  const calculateSnapPoints = useCallback(() => {
    const xPoints: number[] = []
    const yPoints: number[] = []

    // 为每个任务的开始和结束点添加磁吸点
    visibleTasks.forEach((task, index) => {
      const startX = calculateOffsetFromDate(new Date(task.start))
      const endX = startX + calculateTaskWidth(task)
      const y = index * 40 + 20 // 任务中心y坐标

      xPoints.push(startX, endX)
      yPoints.push(y)
    })

    return { x: xPoints, y: yPoints }
  }, [visibleTasks, viewMode])

  // 查找最近的磁吸点
  const findNearestSnapPoint = useCallback(
    (position: number, points: number[]): number => {
      return points.reduce((nearest, point) => {
        const distance = Math.abs(position - point)
        if (
          distance < snapDistance &&
          distance < Math.abs(position - nearest)
        ) {
          return point
        }
        return nearest
      }, position)
    },
    [snapDistance]
  )

  // 应用磁吸效果
  const applySnap = useCallback(
    (position: number, axis: "x" | "y"): number => {
      const points = axis === "x" ? snapPoints.x : snapPoints.y
      return findNearestSnapPoint(position, points)
    },
    [snapPoints, findNearestSnapPoint]
  )

  // 渲染时间线
  const renderTimeline = () => {
    const days = daysBetween(startDate, endDate)
    let columnWidth = 30 // 默认像素宽度

    switch (viewMode) {
      case "day":
        columnWidth = 40
        break
      case "week":
        columnWidth = 150
        break
      case "month":
        columnWidth = 300
        break
    }

    const items = []

    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)

      let label = ""

      switch (viewMode) {
        case "day":
          label = `${date.getDate()}/${date.getMonth() + 1}`
          break
        case "week":
          // 对于周视图，仅在周一显示日期
          if (date.getDay() === 1) {
            // 周一
            label = `${date.getDate()}/${date.getMonth() + 1}`
          }
          break
        case "month":
          // 对于月视图，仅在月初显示日期
          if (date.getDate() === 1) {
            const monthNames = [
              "一月",
              "二月",
              "三月",
              "四月",
              "五月",
              "六月",
              "七月",
              "八月",
              "九月",
              "十月",
              "十一月",
              "十二月",
            ]
            label = monthNames[date.getMonth()]
          }
          break
      }

      if (label) {
        items.push(
          <div
            key={`timeline-${i}`}
            style={{
              position: "absolute",
              left: i * columnWidth,
              top: 0,
              width: columnWidth,
              height: "100%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontSize: mergedOptions.theme.fontSize,
              fontFamily: mergedOptions.theme.fontFamily,
              color: "#666",
              borderRight: `1px solid ${mergedOptions.theme.gridLine}`,
              boxSizing: "border-box",
            }}
          >
            {label}
          </div>
        )
      }
    }

    return (
      <div
        ref={timelineRef}
        style={{
          position: "relative",
          height: 40,
          width: (days + 1) * columnWidth,
          overflowX: "hidden",
          backgroundColor: "#f9f9f9",
          borderBottom: "1px solid #e8e8e8",
        }}
      >
        {items}
      </div>
    )
  }

  // 渲染网格
  const renderGrid = () => {
    const days = daysBetween(startDate, endDate)
    let columnWidth = 30 // 默认像素宽度

    switch (viewMode) {
      case "day":
        columnWidth = 40
        break
      case "week":
        columnWidth = 150
        break
      case "month":
        columnWidth = 300
        break
    }

    const verticalLines = []

    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)

      // 周末使用不同颜色
      const isWeekend = date.getDay() === 0 || date.getDay() === 6

      verticalLines.push(
        <div
          key={`grid-${i}`}
          style={{
            position: "absolute",
            left: i * columnWidth,
            top: 0,
            width: columnWidth,
            height: "100%",
            backgroundColor:
              isWeekend && mergedOptions.showWeekends
                ? "#f9f9f9"
                : "transparent",
            borderRight: `1px solid ${mergedOptions.theme.gridLine}`,
            boxSizing: "border-box",
          }}
        />
      )
    }

    // 今天线
    if (mergedOptions.showToday) {
      const today = new Date()
      if (today >= startDate && today <= endDate) {
        const todayOffset = calculateOffsetFromDate(today)

        verticalLines.push(
          <div
            key='today-line'
            style={{
              position: "absolute",
              left: todayOffset,
              top: 0,
              width: 2,
              height: "100%",
              backgroundColor: mergedOptions.theme.primary,
              pointerEvents: "none",
              zIndex: 9,
            }}
          />
        )
      }
    }

    return (
      <div
        ref={gridRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: (days + 1) * columnWidth,
          height: visibleTasks.length * 40,
          minHeight: "100%",
        }}
      >
        {verticalLines}

        {/* 任务行背景 */}
        {visibleTasks.map((task, index) => (
          <div
            key={`row-${task.id}`}
            style={{
              position: "absolute",
              left: 0,
              top: index * 40,
              width: "100%",
              height: 40,
              borderBottom: `1px solid ${mergedOptions.theme.gridLine}`,
              boxSizing: "border-box",
            }}
          />
        ))}
      </div>
    )
  }

  // 渲染任务
  const renderTasks = () => {
    return (
      <div
        ref={tasksRef}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
        }}
      >
        {visibleTasks.map((task, index) => {
          const start =
            typeof task.start === "string" ? new Date(task.start) : task.start
          const left = calculateOffsetFromDate(start)
          const width = calculateTaskWidth(task)

          if (task.type === "milestone") {
            // 渲染里程碑
            return (
              <div
                key={`task-${task.id}`}
                style={{
                  position: "absolute",
                  left: left - 10, // 调整里程碑中心点
                  top: index * 40 + 10,
                  cursor: mergedOptions.readOnly ? "default" : "pointer",
                }}
                className='gantt-milestone'
                onClick={() => onTaskClick?.(task)}
                onDoubleClick={() => onTaskDoubleClick?.(task)}
              >
                <div className='gantt-milestone-label'>{task.name}</div>
              </div>
            )
          } else {
            // 渲染普通任务
            return (
              <div
                key={`task-${task.id}`}
                style={{
                  position: "absolute",
                  left,
                  top: index * 40 + 8,
                  width,
                  backgroundColor: mergedOptions.theme.taskBackground,
                  borderColor: mergedOptions.theme.taskBorder,
                  cursor: mergedOptions.readOnly ? "default" : "move",
                }}
                className='gantt-task'
                onClick={() => onTaskClick?.(task)}
                onDoubleClick={() => onTaskDoubleClick?.(task)}
                onMouseDown={(e) => {
                  if (mergedOptions.readOnly || !mergedOptions.allowTaskDrag)
                    return
                  e.preventDefault()
                  setDraggingTask(task)
                }}
              >
                <div
                  className='gantt-task-progress'
                  style={{
                    width: `${task.progress || 0}%`,
                    backgroundColor: mergedOptions.theme.primary,
                  }}
                />

                <div className='gantt-task-label'>{task.name}</div>

                {mergedOptions.allowTaskResize && !mergedOptions.readOnly && (
                  <>
                    <div
                      className='gantt-task-resize-handle left'
                      onMouseDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setResizingTask({ task, type: "left" })
                      }}
                    />
                    <div
                      className='gantt-task-resize-handle right'
                      onMouseDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setResizingTask({ task, type: "right" })
                      }}
                    />
                  </>
                )}
              </div>
            )
          }
        })}
      </div>
    )
  }

  // 渲染依赖线
  const renderDependencies = () => {
    if (!mergedOptions.enableDependencies || !svgRef.current) {
      return null
    }

    return (
      <svg
        ref={svgRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          overflow: "visible",
          pointerEvents: "none",
        }}
        className='gantt-dependencies'
      >
        <defs>
          <marker
            id='arrowhead'
            markerWidth='6'
            markerHeight='6'
            refX='5'
            refY='3'
            orient='auto'
          >
            <polygon points='0 0, 6 3, 0 6' fill='#8c8c8c' />
          </marker>
        </defs>

        {dependencies.map((dep) => {
          const sourceTask = tasks.find((t) => t.id === dep.fromId)
          const targetTask = tasks.find((t) => t.id === dep.toId)

          if (!sourceTask || !targetTask) {
            return null
          }

          const sourceIndex = visibleTasks.findIndex(
            (t) => t.id === sourceTask.id
          )
          const targetIndex = visibleTasks.findIndex(
            (t) => t.id === targetTask.id
          )

          if (sourceIndex === -1 || targetIndex === -1) {
            return null
          }

          const sourceStart =
            typeof sourceTask.start === "string"
              ? new Date(sourceTask.start)
              : sourceTask.start

          const sourceEnd =
            typeof sourceTask.end === "string"
              ? new Date(sourceTask.end)
              : sourceTask.end

          const targetStart =
            typeof targetTask.start === "string"
              ? new Date(targetTask.start)
              : targetTask.start

          const sourceLeft = calculateOffsetFromDate(sourceStart)
          const sourceRight = sourceLeft + calculateTaskWidth(sourceTask)
          const sourceY = sourceIndex * 40 + 20 // 中心点

          const targetLeft = calculateOffsetFromDate(targetStart)
          const targetY = targetIndex * 40 + 20 // 中心点

          // 依赖类型
          let startX = sourceRight
          let startY = sourceY
          let midX = (sourceRight + targetLeft) / 2

          return (
            <path
              key={`dep-${dep.fromId}-${dep.toId}`}
              d={`M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${targetY} L ${targetLeft} ${targetY}`}
              className='gantt-dependency-line'
            />
          )
        })}
      </svg>
    )
  }

  // 计算磁吸点的useEffect
  useEffect(() => {
    if (draggingTask || resizingTask) {
      const points = calculateSnapPoints()
      setSnapPoints(points)
      setShowGuides(true)
    } else {
      setShowGuides(false)
    }
  }, [draggingTask, resizingTask, calculateSnapPoints])

  // 处理任务拖拽
  useEffect(() => {
    if (!draggingTask) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!mainAreaRef.current) return

      const rect = mainAreaRef.current.getBoundingClientRect()
      let x = e.clientX - rect.left + mainAreaRef.current.scrollLeft

      // 应用磁吸效果
      x = applySnap(x, "x")

      // 更新当前位置，用于显示辅助线
      setCurrentPosition({ x, y: 0 })

      // 计算新的开始日期
      const newStart = calculateDateFromOffset(x)

      // 更新任务的位置
      const updatedTasks = tasks.map((t) => {
        if (t.id === draggingTask.id) {
          const oldStart =
            typeof t.start === "string" ? new Date(t.start) : t.start
          const oldEnd = typeof t.end === "string" ? new Date(t.end) : t.end

          // 计算天数差额
          const daysDiff = daysBetween(oldStart, newStart)

          // 更新结束日期，保持持续时间不变
          const newEnd = new Date(oldEnd)
          newEnd.setDate(newEnd.getDate() + daysDiff)

          return {
            ...t,
            start: newStart,
            end: newEnd,
          }
        }
        return t
      })

      // 更新任务，通过 stateManager 确保状态一致性
      if (stateManagerRef.current) {
        stateManagerRef.current.updateTasks(updatedTasks)
      } else {
        // 如果 stateManager 尚未初始化，直接更新可见任务
        setVisibleTasks(updatedTasks)
      }
    }

    const handleMouseUp = () => {
      if (draggingTask) {
        // 提交变更
        if (stateManagerRef.current) {
          // 状态已经通过 updateTasks 更新，不需要再调用 onTasksChange
        } else {
          // 如果 stateManager 尚未初始化，直接调用 onTasksChange
          onTasksChange?.(visibleTasks)
        }
        setDraggingTask(null)
        setShowGuides(false)
      }
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
      setShowGuides(false)
    }
  }, [draggingTask, tasks, onTasksChange, applySnap])

  // 处理任务大小调整
  useEffect(() => {
    if (!resizingTask) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!mainAreaRef.current) return

      const rect = mainAreaRef.current.getBoundingClientRect()
      let x = e.clientX - rect.left + mainAreaRef.current.scrollLeft

      // 应用磁吸效果
      x = applySnap(x, "x")

      // 更新当前位置，用于显示辅助线
      setCurrentPosition({ x, y: 0 })

      // 计算新的日期
      const newDate = calculateDateFromOffset(x)

      // 根据调整类型更新任务
      const updatedTasks = tasks.map((t) => {
        if (t.id === resizingTask.task.id) {
          if (resizingTask.type === "left") {
            // 确保开始日期不能晚于结束日期
            const endDate = typeof t.end === "string" ? new Date(t.end) : t.end
            if (newDate >= endDate) {
              return t
            }

            return {
              ...t,
              start: newDate,
            }
          } else if (resizingTask.type === "right") {
            // 确保结束日期不能早于开始日期
            const startDate =
              typeof t.start === "string" ? new Date(t.start) : t.start
            if (newDate <= startDate) {
              return t
            }

            return {
              ...t,
              end: newDate,
            }
          }
        }
        return t
      })

      // 更新任务，通过 stateManager 确保状态一致性
      if (stateManagerRef.current) {
        stateManagerRef.current.updateTasks(updatedTasks)
      } else {
        // 如果 stateManager 尚未初始化，直接更新可见任务
        setVisibleTasks(updatedTasks)
      }
    }

    const handleMouseUp = () => {
      if (resizingTask) {
        // 提交变更
        if (stateManagerRef.current) {
          // 状态已经通过 updateTasks 更新，不需要再调用 onTasksChange
        } else {
          // 如果 stateManager 尚未初始化，直接调用 onTasksChange
          onTasksChange?.(visibleTasks)
        }
        setResizingTask(null)
        setShowGuides(false)
      }
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
      setShowGuides(false)
    }
  }, [resizingTask, calculateDateFromOffset, tasks, onTasksChange, applySnap])

  // 渲染甘特图
  return (
    <div
      ref={containerRef}
      className='gantt-chart-container'
      style={{ height: "100%" }}
    >
      <div
        ref={mainAreaRef}
        className='gantt-chart-main'
        style={{
          position: "relative",
          height: "100%",
          overflowX: "auto",
          overflowY: "hidden",
        }}
      >
        {renderTimeline()}

        <div style={{ position: "relative", height: "calc(100% - 40px)" }}>
          {/* 使用虚拟滚动列表 */}
          <VirtualizedList
            items={visibleTasks}
            renderItem={(task, index) => (
              <div
                key={`task-${task.id}`}
                style={{
                  position: "relative",
                  height: 40,
                  width: "100%",
                }}
              >
                {/* 渲染单个任务行 */}
                <div
                  style={{
                    position: "absolute",
                    left: calculateOffsetFromDate(new Date(task.start)),
                    top: 8,
                    width: calculateTaskWidth(task),
                    backgroundColor: mergedOptions.theme.taskBackground,
                    borderColor: mergedOptions.theme.taskBorder,
                    border: `1px solid ${mergedOptions.theme.taskBorder}`,
                    borderRadius: 4,
                    cursor: mergedOptions.readOnly ? "default" : "move",
                    boxSizing: "border-box",
                    zIndex: 5,
                  }}
                  className='gantt-task'
                  onClick={() => onTaskClick?.(task)}
                  onDoubleClick={() => onTaskDoubleClick?.(task)}
                  onMouseDown={(e) => {
                    if (mergedOptions.readOnly || !mergedOptions.allowTaskDrag)
                      return
                    e.preventDefault()
                    setDraggingTask(task)
                  }}
                >
                  {/* 进度条 */}
                  <div
                    className='gantt-task-progress'
                    style={{
                      width: `${task.progress || 0}%`,
                      backgroundColor: mergedOptions.theme.primary,
                      height: "100%",
                      borderRadius: "3px 0 0 3px",
                    }}
                  />

                  {/* 任务名称 */}
                  <div
                    className='gantt-task-label'
                    style={{
                      position: "absolute",
                      left: 10,
                      top: 0,
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      color: "#333",
                      fontSize: 12,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      paddingRight: 10,
                    }}
                  >
                    {task.name}
                  </div>

                  {/* 调整大小的手柄 */}
                  {mergedOptions.allowTaskResize && !mergedOptions.readOnly && (
                    <>
                      {/* 左侧调整大小手柄 */}
                      <div
                        className='gantt-task-resize-handle left'
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          width: 6,
                          height: "100%",
                          cursor: "ew-resize",
                          backgroundColor: "transparent",
                          zIndex: 6,
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setResizingTask({ task, type: "left" })
                        }}
                      />
                      {/* 右侧调整大小手柄 */}
                      <div
                        className='gantt-task-resize-handle right'
                        style={{
                          position: "absolute",
                          right: 0,
                          top: 0,
                          width: 6,
                          height: "100%",
                          cursor: "ew-resize",
                          backgroundColor: "transparent",
                          zIndex: 6,
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setResizingTask({ task, type: "right" })
                        }}
                      />
                    </>
                  )}
                </div>
              </div>
            )}
            itemHeight={40}
            containerHeight={
              containerRef.current?.clientHeight
                ? containerRef.current.clientHeight - 80
                : 800
            }
            overscan={10}
            onVisibleItemsChange={(startIndex, endIndex) => {
              console.log(`Visible items: ${startIndex} to ${endIndex}`)
            }}
            style={{
              zIndex: 3, // 确保虚拟滚动列表显示在网格背景之上，但低于依赖线和拖拽辅助线
              position: "relative", // 确保 z-index 生效
            }}
          />

          {/* 网格背景 */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: `${tasks.length * 40}px`,
              pointerEvents: "none",
              zIndex: 1, // 网格背景层级最低
            }}
          >
            {renderGrid()}
          </div>

          {/* 依赖线 */}
          <div style={{ zIndex: 4, position: "relative" }}>
            {renderDependencies()}
          </div>

          {/* 拖拽辅助线 */}
          <div style={{ zIndex: 6, position: "relative" }}>
            <DragGuide
              theme={mergedOptions.theme}
              snapPoints={snapPoints}
              currentPosition={currentPosition}
              showGuides={showGuides}
            />
          </div>
        </div>
      </div>
    </div>
  )
})

// 添加displayName
EnhancedGanttChart.displayName = "EnhancedGanttChart"
