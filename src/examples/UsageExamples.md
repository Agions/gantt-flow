# 甘特图组件 (gantt-flow) 使用示例

本文档展示了如何在 Vue 和 React 框架中使用 `gantt-flow` 甘特图组件，以及如何使用新增的特性和功能。

## 基本信息

组件名称: `gantt-flow`  
版本: 1.1.2  
兼容框架: React、Vue  
npm 包地址: [https://www.npmjs.com/package/gantt-flow](https://www.npmjs.com/package/gantt-flow)

## React 使用示例

### 基础使用

```jsx
import React, { useRef } from "react"
import { EnhancedGanttChart } from "gantt-flow"
import "gantt-flow/style"

function BasicGanttChart() {
  const ganttRef = useRef(null)

  const tasks = [
    {
      id: "1",
      name: "需求分析",
      start: "2023-04-01",
      end: "2023-04-05",
      progress: 100,
      type: "task",
    },
    {
      id: "2",
      name: "设计阶段",
      start: "2023-04-06",
      end: "2023-04-15",
      progress: 80,
      type: "task",
    },
    {
      id: "3",
      name: "首版发布",
      start: "2023-04-20",
      end: "2023-04-20",
      progress: 0,
      type: "milestone",
    },
    {
      id: "4",
      name: "开发阶段",
      start: "2023-04-08",
      end: "2023-04-28",
      progress: 65,
      type: "project",
    },
  ]

  const dependencies = [
    { fromId: "1", toId: "2", type: "finish_to_start" },
    { fromId: "2", toId: "3", type: "finish_to_start" },
  ]

  return (
    <div style={{ height: "500px" }}>
      <EnhancedGanttChart
        ref={ganttRef}
        tasks={tasks}
        dependencies={dependencies}
        viewMode='week'
        onTaskClick={(task) => console.log("任务点击:", task)}
      />
    </div>
  )
}
```

### 使用主题系统

```jsx
import React, { useRef, useState } from "react"
import { EnhancedGanttChart } from "gantt-flow"
import "gantt-flow/style"

function ThemedGanttChart() {
  const ganttRef = useRef(null)
  const [currentTheme, setCurrentTheme] = useState("light")

  // 自定义主题
  const customTheme = {
    colors: {
      primary: "#6200ee",
      secondary: "#03dac6",
      success: "#4caf50",
      warning: "#fb8c00",
      error: "#b00020",
      background: "#f5f5f5",
      surface: "#ffffff",
      text: "#121212",
      border: "#e0e0e0",
      taskBackgroundDefault: "#bbdefb",
      taskBackgroundMilestone: "#d1c4e9",
      taskBackgroundProject: "#c8e6c9",
    },
    spacing: {
      unit: 8,
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      fontSize: {
        small: 12,
        medium: 14,
        large: 16,
      },
      fontWeight: {
        regular: 400,
        medium: 500,
        bold: 700,
      },
    },
  }

  const toggleTheme = () => {
    // 在预设主题间切换
    if (currentTheme === "light") {
      ganttRef.current.setTheme("dark")
      setCurrentTheme("dark")
    } else if (currentTheme === "dark") {
      ganttRef.current.setTheme(customTheme)
      setCurrentTheme("custom")
    } else {
      ganttRef.current.setTheme("light")
      setCurrentTheme("light")
    }
  }

  return (
    <div style={{ height: "500px" }}>
      <EnhancedGanttChart
        ref={ganttRef}
        tasks={
          [
            /* 任务数据 */
          ]
        }
        dependencies={
          [
            /* 依赖数据 */
          ]
        }
        viewMode='week'
        options={{
          theme: currentTheme === "custom" ? customTheme : currentTheme,
        }}
      />

      <div className='controls'>
        <button onClick={toggleTheme}>切换主题 (当前: {currentTheme})</button>
        <button onClick={() => ganttRef.current.toggleTheme()}>
          自动切换明暗主题
        </button>
      </div>
    </div>
  )
}
```

### 使用拖拽优化和自适应密度布局

```jsx
import React, { useRef } from "react"
import { EnhancedGanttChart } from "gantt-flow"
import "gantt-flow/style"

function AdvancedGanttChart() {
  const ganttRef = useRef(null)

  return (
    <div style={{ height: "500px" }}>
      <EnhancedGanttChart
        ref={ganttRef}
        tasks={
          [
            /* 大量任务数据 */
          ]
        }
        dependencies={
          [
            /* 依赖数据 */
          ]
        }
        viewMode='week'
        options={{
          // 启用拖拽优化
          enableDragGuides: true,
          snapToGrid: true,

          // 启用自适应密度布局
          adaptiveDensity: true,
          densityConfig: {
            compactThreshold: 100, // 超过100个任务启用紧凑模式
            comfortableThreshold: 20, // 少于20个任务启用舒适模式
          },

          // 其他设置
          allowTaskDrag: true,
          allowTaskResize: true,
          showTaskDetails: true,
        }}
      />
    </div>
  )
}
```

### 完整功能示例

```jsx
import React, { useRef, useState, useEffect } from "react"
import { EnhancedGanttChart } from "gantt-flow"
import "gantt-flow/style"

function CompleteGanttChart() {
  const ganttRef = useRef(null)
  const [tasks, setTasks] = useState([])
  const [dependencies, setDependencies] = useState([])
  const [viewMode, setViewMode] = useState("week")
  const [currentTheme, setCurrentTheme] = useState("light")

  useEffect(() => {
    // 加载示例数据
    const sampleTasks = [
      /* 数据省略 */
    ]

    const sampleDependencies = [
      /* 数据省略 */
    ]

    setTasks(sampleTasks)
    setDependencies(sampleDependencies)
  }, [])

  const handleTasksChange = (updatedTasks) => {
    setTasks(updatedTasks)
    // 可能需要保存到后端
  }

  const handleDependenciesChange = (updatedDeps) => {
    setDependencies(updatedDeps)
    // 可能需要保存到后端
  }

  return (
    <div className='gantt-dashboard'>
      <div className='toolbar'>
        <button onClick={() => ganttRef.current.undo()}>撤销</button>
        <button onClick={() => ganttRef.current.redo()}>重做</button>

        <select
          value={viewMode}
          onChange={(e) => {
            setViewMode(e.target.value)
            ganttRef.current.setViewMode(e.target.value)
          }}
        >
          <option value='day'>日视图</option>
          <option value='week'>周视图</option>
          <option value='month'>月视图</option>
          <option value='quarter'>季度视图</option>
          <option value='year'>年视图</option>
        </select>

        <button onClick={() => ganttRef.current.toggleTheme()}>切换主题</button>

        <button onClick={() => ganttRef.current.exportAsPNG()}>导出 PNG</button>

        <button onClick={() => ganttRef.current.exportAsPDF()}>导出 PDF</button>
      </div>

      <div className='gantt-container' style={{ height: "600px" }}>
        <EnhancedGanttChart
          ref={ganttRef}
          tasks={tasks}
          dependencies={dependencies}
          viewMode={viewMode}
          onTasksChange={handleTasksChange}
          onDependenciesChange={handleDependenciesChange}
          onTaskClick={(task) => console.log("任务点击:", task)}
          onTaskDoubleClick={(task) => console.log("任务双击:", task)}
          options={{
            theme: currentTheme,
            enableDragGuides: true,
            adaptiveDensity: true,
            showTaskDetails: true,
            allowTaskDrag: true,
            allowTaskResize: true,
            showWeekends: true,
            showToday: true,
          }}
        />
      </div>
    </div>
  )
}
```

## Vue 使用示例

### 基础使用

```vue
<template>
  <div style="height: 500px">
    <GanttChart
      ref="ganttChart"
      :tasks="tasks"
      :dependencies="dependencies"
      view-mode="week"
      @task-click="handleTaskClick"
    />
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
    start: "2023-04-01",
    end: "2023-04-05",
    progress: 100,
    type: "task",
  },
  {
    id: "2",
    name: "设计阶段",
    start: "2023-04-06",
    end: "2023-04-15",
    progress: 80,
    type: "task",
  },
  {
    id: "3",
    name: "首版发布",
    start: "2023-04-20",
    end: "2023-04-20",
    progress: 0,
    type: "milestone",
  },
  {
    id: "4",
    name: "开发阶段",
    start: "2023-04-08",
    end: "2023-04-28",
    progress: 65,
    type: "project",
  },
])

const dependencies = ref([
  { fromId: "1", toId: "2", type: "finish_to_start" },
  { fromId: "2", toId: "3", type: "finish_to_start" },
])

const handleTaskClick = (task) => {
  console.log("任务点击:", task)
}
</script>
```

### 使用主题系统

```vue
<template>
  <div style="height: 500px">
    <GanttChart
      ref="ganttChart"
      :tasks="tasks"
      :dependencies="dependencies"
      view-mode="week"
      :options="options"
    />

    <div class="controls">
      <button @click="toggleTheme">切换主题 (当前: {{ currentTheme }})</button>
      <button @click="ganttChart.toggleTheme()">自动切换明暗主题</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue"
import { GanttChart } from "gantt-flow/vue"
import "gantt-flow/style"

const ganttChart = ref(null)
const currentTheme = ref("light")

// 自定义主题
const customTheme = {
  colors: {
    primary: "#6200ee",
    secondary: "#03dac6",
    success: "#4caf50",
    warning: "#fb8c00",
    error: "#b00020",
    background: "#f5f5f5",
    surface: "#ffffff",
    text: "#121212",
    border: "#e0e0e0",
    taskBackgroundDefault: "#bbdefb",
    taskBackgroundMilestone: "#d1c4e9",
    taskBackgroundProject: "#c8e6c9",
  },
  spacing: {
    unit: 8,
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: {
      small: 12,
      medium: 14,
      large: 16,
    },
    fontWeight: {
      regular: 400,
      medium: 500,
      bold: 700,
    },
  },
}

const tasks = ref([
  /* 任务数据 */
])
const dependencies = ref([
  /* 依赖数据 */
])

const options = ref({
  theme: currentTheme.value,
})

const toggleTheme = () => {
  // 在预设主题间切换
  if (currentTheme.value === "light") {
    ganttChart.value.setTheme("dark")
    currentTheme.value = "dark"
    options.value.theme = "dark"
  } else if (currentTheme.value === "dark") {
    ganttChart.value.setTheme(customTheme)
    currentTheme.value = "custom"
    options.value.theme = customTheme
  } else {
    ganttChart.value.setTheme("light")
    currentTheme.value = "light"
    options.value.theme = "light"
  }
}
</script>
```

### 使用拖拽优化和自适应密度布局

```vue
<template>
  <div style="height: 500px">
    <GanttChart
      ref="ganttChart"
      :tasks="tasks"
      :dependencies="dependencies"
      view-mode="week"
      :options="options"
    />
  </div>
</template>

<script setup>
import { ref } from "vue"
import { GanttChart } from "gantt-flow/vue"
import "gantt-flow/style"

const ganttChart = ref(null)
const tasks = ref([
  /* 大量任务数据 */
])
const dependencies = ref([
  /* 依赖数据 */
])

const options = ref({
  // 启用拖拽优化
  enableDragGuides: true,
  snapToGrid: true,

  // 启用自适应密度布局
  adaptiveDensity: true,
  densityConfig: {
    compactThreshold: 100, // 超过100个任务启用紧凑模式
    comfortableThreshold: 20, // 少于20个任务启用舒适模式
  },

  // 其他设置
  allowTaskDrag: true,
  allowTaskResize: true,
  showTaskDetails: true,
})
</script>
```

### 完整功能示例

```vue
<template>
  <div class="gantt-dashboard">
    <div class="toolbar">
      <button @click="undo">撤销</button>
      <button @click="redo">重做</button>

      <select v-model="viewMode" @change="setViewMode">
        <option value="day">日视图</option>
        <option value="week">周视图</option>
        <option value="month">月视图</option>
        <option value="quarter">季度视图</option>
        <option value="year">年视图</option>
      </select>

      <button @click="toggleTheme">切换主题</button>
      <button @click="exportPNG">导出 PNG</button>
      <button @click="exportPDF">导出 PDF</button>
    </div>

    <div class="gantt-container" style="height: 600px">
      <GanttChart
        ref="ganttChart"
        :tasks="tasks"
        :dependencies="dependencies"
        :view-mode="viewMode"
        @tasks-change="handleTasksChange"
        @dependencies-change="handleDependenciesChange"
        @task-click="handleTaskClick"
        @task-double-click="handleTaskDoubleClick"
        :options="options"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"
import { GanttChart } from "gantt-flow/vue"
import "gantt-flow/style"

const ganttChart = ref(null)
const tasks = ref([])
const dependencies = ref([])
const viewMode = ref("week")
const currentTheme = ref("light")

const options = ref({
  theme: currentTheme.value,
  enableDragGuides: true,
  adaptiveDensity: true,
  showTaskDetails: true,
  allowTaskDrag: true,
  allowTaskResize: true,
  showWeekends: true,
  showToday: true,
})

onMounted(() => {
  // 加载示例数据
  const sampleTasks = [
    /* 数据省略 */
  ]

  const sampleDependencies = [
    /* 数据省略 */
  ]

  tasks.value = sampleTasks
  dependencies.value = sampleDependencies
})

const handleTasksChange = (updatedTasks) => {
  tasks.value = updatedTasks
  // 可能需要保存到后端
}

const handleDependenciesChange = (updatedDeps) => {
  dependencies.value = updatedDeps
  // 可能需要保存到后端
}

const handleTaskClick = (task) => {
  console.log("任务点击:", task)
}

const handleTaskDoubleClick = (task) => {
  console.log("任务双击:", task)
}

const undo = () => ganttChart.value.undo()
const redo = () => ganttChart.value.redo()
const setViewMode = () => ganttChart.value.setViewMode(viewMode.value)
const toggleTheme = () => ganttChart.value.toggleTheme()
const exportPNG = () => ganttChart.value.exportAsPNG()
const exportPDF = () => ganttChart.value.exportAsPDF()
</script>
```

## 高级功能

### 1. 使用自定义任务渲染

您可以通过插槽（Vue）或渲染属性（React）来自定义任务的渲染方式：

```vue
<!-- Vue 自定义任务渲染 -->
<GanttChart>
  <template #task="{ task, isDragging, isResizing }">
    <div 
      class="custom-task" 
      :class="{ 
        'is-dragging': isDragging,
        'is-resizing': isResizing,
        [`task-type-${task.type}`]: true
      }"
    >
      <div class="task-header">{{ task.name }}</div>
      <div class="task-body">
        <div class="task-progress" :style="{ width: `${task.progress}%` }"></div>
      </div>
      <div class="task-footer">
        <span class="task-dates">{{ task.start }} - {{ task.end }}</span>
      </div>
    </div>
  </template>
</GanttChart>
```

```jsx
{
  /* React 自定义任务渲染 */
}
;<EnhancedGanttChart
  taskRenderer={(task, { isDragging, isResizing }) => (
    <div
      className={`custom-task ${isDragging ? "is-dragging" : ""} ${
        isResizing ? "is-resizing" : ""
      } task-type-${task.type}`}
    >
      <div className='task-header'>{task.name}</div>
      <div className='task-body'>
        <div
          className='task-progress'
          style={{ width: `${task.progress}%` }}
        ></div>
      </div>
      <div className='task-footer'>
        <span className='task-dates'>
          {task.start} - {task.end}
        </span>
      </div>
    </div>
  )}
/>
```

### 2. 国际化支持

```jsx
// React 国际化示例
<EnhancedGanttChart
  options={{
    locale: "zh-CN", // 或 'en-US', 'ja-JP', 等
    localeOptions: {
      months: [
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
      ],
      weekdays: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"],
      today,
      // 其他本地化选项...
    },
  }}
/>
```

### 3. 可访问性支持

组件内置支持键盘导航和屏幕阅读器，符合 WCAG 2.1 标准。

```jsx
// React 可访问性配置
<EnhancedGanttChart
  options={{
    a11y: {
      enabled: true,
      taskLabelFormat:
        "任务: {name}, 开始: {start}, 结束: {end}, 进度: {progress}%",
      announceChanges: true,
    },
  }}
/>
```

## 与后端集成

### REST API 集成示例

```jsx
// React 与 REST API 集成
import React, { useEffect, useState, useRef } from "react"
import { EnhancedGanttChart } from "gantt-flow"
import "gantt-flow/style"

function GanttWithAPI() {
  const ganttRef = useRef(null)
  const [tasks, setTasks] = useState([])
  const [dependencies, setDependencies] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 加载数据
    const loadData = async () => {
      try {
        setLoading(true)
        const tasksResponse = await fetch("/api/tasks")
        const tasksData = await tasksResponse.json()

        const dependenciesResponse = await fetch("/api/dependencies")
        const dependenciesData = await dependenciesResponse.json()

        setTasks(tasksData)
        setDependencies(dependenciesData)
      } catch (error) {
        console.error("加载数据失败:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const handleTasksChange = async (updatedTasks) => {
    try {
      await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedTasks),
      })

      setTasks(updatedTasks)
    } catch (error) {
      console.error("更新任务失败:", error)
    }
  }

  if (loading) {
    return <div>加载中...</div>
  }

  return (
    <EnhancedGanttChart
      ref={ganttRef}
      tasks={tasks}
      dependencies={dependencies}
      onTasksChange={handleTasksChange}
      // 其他属性...
    />
  )
}
```

## 性能优化建议

1. **使用虚拟滚动**：对于大量任务(>1000)，确保启用虚拟滚动

   ```jsx
   <EnhancedGanttChart options={{ enableVirtualization: true }} />
   ```

2. **按需加载数据**：对于大型项目，考虑分页加载数据

   ```jsx
   const loadMoreTasks = async (startDate, endDate) => {
     const response = await fetch(
       `/api/tasks?start=${startDate}&end=${endDate}`
     )
     const newTasks = await response.json()
     setTasks((prev) => [...prev, ...newTasks])
   }
   ```

3. **限制重新渲染**：使用记忆化和引用相等来减少不必要的重新渲染

   ```jsx
   const memoizedTasks = useMemo(() => tasks, [tasks.length])
   ```

4. **优化拖拽性能**：在拖拽大型项目时减少视觉效果
   ```jsx
   <EnhancedGanttChart
     options={{
       lightweightDragging: true, // 拖拽时使用轻量级渲染
       showDependenciesDuringDrag: false, // 拖拽时不显示依赖关系
     }}
   />
   ```

## 常见问题解答

### 如何在 TypeScript 项目中使用？

包含完整的 TypeScript 类型定义，可直接导入：

```typescript
import { EnhancedGanttChart, Task, Dependency } from "gantt-flow"
import type { GanttOptions, ViewMode } from "gantt-flow"

const tasks: Task[] = [
  {
    id: "1",
    name: "任务1",
    start: "2023-04-01",
    end: "2023-04-05",
    progress: 50,
    type: "task",
  },
]
```

### 如何在 Next.js 项目中使用？

在 Next.js 项目中，由于组件包含浏览器 API，需要使用动态导入和客户端组件：

```jsx
// 在 Next.js 应用中使用
"use client"

import dynamic from "next/dynamic"
import "gantt-flow/style"

// 使用动态导入避免 SSR 问题
const GanttChart = dynamic(
  () => import("gantt-flow").then((mod) => mod.EnhancedGanttChart),
  { ssr: false }
)

export default function GanttPage() {
  return (
    <div style={{ height: "500px" }}>
      <GanttChart
        tasks={
          [
            /* 任务数据 */
          ]
        }
        // 其他属性...
      />
    </div>
  )
}
```
