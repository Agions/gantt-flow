# GanttFlow - 甘特图组件

GanttFlow 是一个功能强大、高性能的甘特图组件，支持任务管理、依赖关系、多种视图模式和丰富的交互功能，同时支持 React 和 Vue。

![版本](https://img.shields.io/npm/v/gantt-flow.svg)
![下载量](https://img.shields.io/npm/dm/gantt-flow.svg)
![许可证](https://img.shields.io/npm/l/gantt-flow.svg)

## 特性

- 🚀 **高性能渲染**：使用虚拟滚动和缓存优化，轻松处理数千条任务数据
- 📊 **多视图模式**：支持日、周、月、季度和年视图
- 🔄 **拖拽与调整**：拖动任务或调整任务时长，带有磁吸效果和辅助线
- 🎯 **差异化任务卡片**：区分普通任务、里程碑和项目，提供丰富的微交互
- 🔗 **依赖关系**：支持任务间的多种依赖关系
- 🔙 **撤销/重做**：完整的操作历史记录
- 💾 **导出功能**：支持导出为 PNG、PDF 或 Excel
- 🎨 **自适应主题系统**：支持日/夜间模式自动切换，可完全自定义样式和主题
- 📱 **响应式设计**：适配各种屏幕尺寸
- 🧮 **自适应密度布局**：根据任务数量自动调整布局密度
- 🌍 **国际化支持**：支持多语言和本地化
- 🧩 **框架通用**：同时支持 React 和 Vue

## 效果展示

查看 [在线演示](https://agions.github.io/gantt-flow/)

## 快速开始

### 安装

```bash
# npm
npm install gantt-flow

# yarn
yarn add gantt-flow

# pnpm
pnpm add gantt-flow
```

### React 使用

```jsx
import React, { useRef } from "react"
import { EnhancedGanttChart } from "gantt-flow"
import "gantt-flow/style"

function App() {
  const ganttRef = useRef(null)

  // 示例任务数据
  const tasks = [
    {
      id: "1",
      name: "需求分析",
      start: "2023-03-01",
      end: "2023-03-05",
      progress: 100,
      type: "task",
    },
    {
      id: "2",
      name: "设计阶段",
      start: "2023-03-06",
      end: "2023-03-10",
      progress: 80,
      type: "task",
    },
    {
      id: "3",
      name: "发布里程碑",
      start: "2023-03-15",
      end: "2023-03-15",
      progress: 0,
      type: "milestone",
    },
  ]

  // 示例依赖关系
  const dependencies = [
    {
      fromId: "1",
      toId: "2",
      type: "finish_to_start",
    },
    {
      fromId: "2",
      toId: "3",
      type: "finish_to_start",
    },
  ]

  return (
    <div style={{ height: "500px" }}>
      <EnhancedGanttChart
        ref={ganttRef}
        tasks={tasks}
        dependencies={dependencies}
        viewMode='week'
        onTaskClick={(task) => console.log("任务点击:", task)}
        options={{
          theme: "light", // 或 'dark', 或自定义主题对象
          enableDragGuides: true,
          adaptiveDensity: true,
        }}
      />

      {/* 示例工具栏 */}
      <div className='toolbar'>
        <button onClick={() => ganttRef.current.undo()}>撤销</button>
        <button onClick={() => ganttRef.current.redo()}>重做</button>
        <button onClick={() => ganttRef.current.exportAsPNG()}>导出PNG</button>
        <button onClick={() => ganttRef.current.toggleTheme()}>切换主题</button>
      </div>
    </div>
  )
}
```

### Vue 使用

```vue
<template>
  <div style="height: 500px">
    <GanttChart
      ref="ganttChart"
      :tasks="tasks"
      :dependencies="dependencies"
      view-mode="week"
      @task-click="onTaskClick"
      :options="options"
    />

    <div class="toolbar">
      <button @click="undo">撤销</button>
      <button @click="redo">重做</button>
      <button @click="exportPNG">导出PNG</button>
      <button @click="toggleTheme">切换主题</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue"
import { GanttChart } from "gantt-flow/vue"
import "gantt-flow/style"

const ganttChart = ref(null)

const tasks = ref([
  {
    id: "1",
    name: "需求分析",
    start: "2023-03-01",
    end: "2023-03-05",
    progress: 100,
    type: "task",
  },
  {
    id: "2",
    name: "设计阶段",
    start: "2023-03-06",
    end: "2023-03-10",
    progress: 80,
    type: "task",
  },
  {
    id: "3",
    name: "发布里程碑",
    start: "2023-03-15",
    end: "2023-03-15",
    progress: 0,
    type: "milestone",
  },
])

const dependencies = ref([
  {
    fromId: "1",
    toId: "2",
    type: "finish_to_start",
  },
  {
    fromId: "2",
    toId: "3",
    type: "finish_to_start",
  },
])

const options = ref({
  theme: "light", // 或 'dark', 或自定义主题对象
  enableDragGuides: true,
  adaptiveDensity: true,
})

const onTaskClick = (task) => {
  console.log("任务点击:", task)
}

const undo = () => ganttChart.value.undo()
const redo = () => ganttChart.value.redo()
const exportPNG = () => ganttChart.value.exportAsPNG()
const toggleTheme = () => ganttChart.value.toggleTheme()
</script>
```

## 核心 API

### `<EnhancedGanttChart>` 属性

| 属性                   | 类型                                      | 默认值 | 描述                                   |
| ---------------------- | ----------------------------------------- | ------ | -------------------------------------- |
| `tasks`                | Task[]                                    | []     | 任务数据列表                           |
| `dependencies`         | Dependency[]                              | []     | 依赖关系列表                           |
| `resources`            | Resource[]                                | []     | 资源列表                               |
| `viewMode`             | 'day'\|'week'\|'month'\|'quarter'\|'year' | 'day'  | 视图模式                               |
| `sampleCount`          | number                                    | 10     | 如果不提供 tasks，则生成的示例任务数量 |
| `options`              | GanttOptions                              | {}     | 详细配置选项                           |
| `onTasksChange`        | (tasks: Task[]) => void                   | -      | 任务变更回调                           |
| `onDependenciesChange` | (deps: Dependency[]) => void              | -      | 依赖变更回调                           |
| `onTaskClick`          | (task: Task) => void                      | -      | 任务点击回调                           |
| `onTaskDoubleClick`    | (task: Task) => void                      | -      | 任务双击回调                           |
| `onDateRangeChange`    | (range: DateRange) => void                | -      | 日期范围变更回调                       |

### `GanttOptions` 配置项

```typescript
{
  // 主题设置
  theme: 'light' | 'dark' | ThemeConfig, // 可以是预设主题或自定义主题配置

  // 新增功能开关
  enableDragGuides: true,   // 启用拖拽辅助线和磁吸效果
  adaptiveDensity: true,    // 启用自适应密度布局
  showTaskDetails: true,    // 显示任务详情

  // 原有功能开关
  allowTaskDrag: true,        // 允许任务拖拽
  allowTaskResize: true,      // 允许任务调整大小
  readOnly: false,            // 只读模式
  enableDependencies: true,   // 启用依赖关系
  showProgress: true,         // 显示进度条
  showWeekends: true,         // 显示周末
  showToday: true,            // 显示今天线

  // 其他配置
  dateFormat: 'YYYY-MM-DD',   // 日期格式
  columnWidth: 40,            // 列宽(像素)
  rowHeight: 40,              // 行高(像素)
  workingDays: [1,2,3,4,5],   // 工作日(1-5表示周一至周五)
}
```

### 主题系统

新增的主题系统支持：

```typescript
// 预设主题
options: {
  theme: 'light' | 'dark' // 使用预设主题
}

// 自定义主题
options: {
  theme: {
    colors: {
      primary: '#1890ff',
      secondary: '#13c2c2',
      success: '#52c41a',
      warning: '#faad14',
      error: '#f5222d',
      background: '#ffffff',
      surface: '#f5f5f5',
      text: '#000000',
      border: '#e8e8e8',
      // 更多颜色...
    },
    spacing: {
      unit: 8, // 基础间距单位
      // 更多间距配置...
    },
    typography: {
      fontFamily: 'Roboto, sans-serif',
      fontSize: {
        small: 12,
        medium: 14,
        large: 16
      },
      fontWeight: {
        regular: 400,
        medium: 500,
        bold: 700
      }
    },
    animation: {
      duration: 300, // ms
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
    },
    shadows: {
      small: '0 2px 4px rgba(0,0,0,0.1)',
      medium: '0 4px 8px rgba(0,0,0,0.1)',
      large: '0 8px 16px rgba(0,0,0,0.1)'
    }
  }
}
```

### 方法

通过 `ref` 访问组件实例可以使用以下方法：

- `addTask(task: Partial<Task>)`: 添加新任务
- `updateTask(task: Task)`: 更新任务
- `removeTask(taskId: string)`: 删除任务
- `setViewMode(mode: ViewMode)`: 设置视图模式
- `scrollToTask(taskId: string)`: 滚动到指定任务
- `exportAsPNG(options?: ExportOptions)`: 导出为 PNG
- `exportAsPDF(options?: ExportOptions)`: 导出为 PDF
- `undo()`: 撤销操作
- `redo()`: 重做操作
- `toggleTheme()`: 切换主题（如果使用预设主题）
- `setTheme(theme: 'light' | 'dark' | ThemeConfig)`: 设置特定主题

## 数据结构

### Task (任务)

```typescript
interface Task {
  id: string // 唯一标识符
  name: string // 任务名称
  start: string // 开始日期 (YYYY-MM-DD)
  end: string // 结束日期 (YYYY-MM-DD)
  progress?: number // 进度 (0-100)
  type?: "task" | "milestone" | "project" // 任务类型，默认为 'task'
  parentId?: string // 父任务ID (可选)
  color?: string // 自定义颜色 (可选)
  collapsed?: boolean // 是否折叠子任务 (可选)
  metadata?: any // 自定义元数据 (可选)
}
```

### Dependency (依赖关系)

```typescript
interface Dependency {
  fromId: string // 源任务ID
  toId: string // 目标任务ID
  type:
    | "finish_to_start"
    | "start_to_start"
    | "finish_to_finish"
    | "start_to_finish"
  metadata?: any // 自定义元数据 (可选)
}
```

### Resource (资源)

```typescript
interface Resource {
  id: string // 唯一标识符
  name: string // 资源名称
  color?: string // 自定义颜色 (可选)
  capacity?: number // 资源容量 (可选, 0-100)
  metadata?: any // 自定义元数据 (可选)
}
```

## 新增功能详解

### 1. 自适应主题系统

自动适应用户系统的明暗模式偏好，或手动切换主题：

```jsx
// React 中切换主题
const toggleTheme = () => {
  ganttRef.current.toggleTheme()
}

// 或直接设置特定主题
const setDarkTheme = () => {
  ganttRef.current.setTheme("dark")
}

// 设置自定义主题
const setCustomTheme = () => {
  ganttRef.current.setTheme({
    colors: {
      primary: "#6200ee",
      // 其他颜色...
    },
    // 其他主题配置...
  })
}
```

### 2. 任务卡片设计

针对不同类型的任务提供差异化设计：

- **普通任务**：完整显示进度条、名称和可拖动/调整大小
- **里程碑**：特殊的菱形设计，突出显示重要时间点
- **项目**：突出显示轮廓，包含子任务汇总信息

任务卡片包含丰富的微交互效果，如悬停放大、拖拽时的动画和点击反馈。

### 3. 拖拽优化

拖拽体验升级：

- **磁吸效果**：当任务接近其他任务边界或时间线时自动吸附
- **动态辅助线**：拖拽时显示对齐辅助线
- **视觉反馈**：拖拽和调整大小时的实时视觉反馈

```jsx
// 启用拖拽辅助功能
<EnhancedGanttChart
  // ...其他属性
  options={{
    enableDragGuides: true,
    // ...其他选项
  }}
/>
```

### 4. 自适应密度布局

根据任务数量自动调整布局密度，支持三种密度模式：

- **紧凑模式**：适用于大量任务，行高更小，信息更精简
- **正常模式**：平衡显示任务细节和整体视图
- **舒适模式**：适用于任务较少时，提供更多细节和更大的交互区域

```jsx
// 启用自适应密度布局
<EnhancedGanttChart
  // ...其他属性
  options={{
    adaptiveDensity: true,
    // 可选：自定义密度阈值
    densityConfig: {
      compactThreshold: 100, // 任务数量超过100启用紧凑模式
      comfortableThreshold: 20, // 任务数量少于20启用舒适模式
    },
    // ...其他选项
  }}
/>
```

## 示例

详细示例请查看 `src/examples/UsageExamples.md` 文件或访问[在线演示](https://agions.github.io/gantt-chart-component/)。

## 浏览器兼容性

- Chrome (最新版)
- Firefox (最新版)
- Safari (最新版)
- Edge (最新版)
- IE11 (需要 polyfills)

## 许可证

MIT

## 支持与贡献

如果您有问题或建议，请提交 [issue](https://github.com/Agions/gantt-chart-component/issues)。

欢迎提交 Pull Request 来改进这个项目。请查看 [CONTRIBUTING.md](https://github.com/Agions/gantt-chart-component/blob/main/CONTRIBUTING.md) 了解如何贡献。
