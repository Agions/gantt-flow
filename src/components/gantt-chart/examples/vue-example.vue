<template>
  <div class="gantt-chart-vue-example">
    <h2>甘特图 Vue 组件示例</h2>
    
    <div class="toolbar">
      <div class="view-modes">
        <button 
          v-for="mode in viewModes"  :key="mode.value"
          :class="{ active: currentViewMode === mode.value }"
          @click="setViewMode(mode.value)"
        >
          {{ mode.label }}
        </button>
      </div>
      
      <div class="actions">
        <button @click="addTask" :disabled="!canAddTask">添加任务</button>
        <button @click="undo" :disabled="!canUndo">撤销</button>
        <button @click="redo" :disabled="!canRedo">重做</button>
        <button @click="exportPNG">导出 PNG</button>
      </div>
    </div>
    
    <div class="gantt-container">
      <!-- 使用导入的甘特图组件 -->
      <GanttChart
        ref="ganttChart"
        :tasks="tasks"
        :dependencies="dependencies"
        :options="options"
        :viewMode="currentViewMode"
        @task-click="handleTaskClick"
        @task-double-click="handleTaskDoubleClick"
        @tasks-change="handleTasksChange"
        @dependencies-change="handleDependenciesChange"
      />
    </div>
    
    <div v-if="selectedTask" class="task-details">
      <h3>选中的任务</h3>
      <div class="detail-row">
        <span class="label">ID:</span>
        <span class="value">{{ selectedTask.id }}</span>
      </div>
      <div class="detail-row">
        <span class="label">名称:</span>
        <span class="value">{{ selectedTask.name }}</span>
      </div>
      <div class="detail-row">
        <span class="label">开始日期:</span>
        <span class="value">{{ selectedTask.start }}</span>
      </div>
      <div class="detail-row">
        <span class="label">结束日期:</span>
        <span class="value">{{ selectedTask.end }}</span>
      </div>
      <div class="detail-row">
        <span class="label">进度:</span>
        <span class="value">{{ selectedTask.progress }}%</span>
      </div>
      <div class="detail-row">
        <span class="label">类型:</span>
        <span class="value">{{ selectedTask.type }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, reactive, onMounted, computed } from 'vue';
import GanttChart from '../vue/GanttChartVue.vue';
import { Task, Dependency, Resource } from '../core/types';
import utils from '../core/utils';

const { ExampleGenerator, DateUtils } = utils;

export default defineComponent({
  name: 'GanttChartVueExample',
  components: {
    GanttChart
  },
  setup() {
    // 视图模式
    const viewModes = [
      { value: 'day', label: '日' },
      { value: 'week', label: '周' },
      { value: 'month', label: '月' },
    ];
    const currentViewMode = ref('week');
    
    // 甘特图参考
    const ganttChart = ref(null);
    
    // 任务数据
    const tasks = ref([]);
    const dependencies = ref([]);
    const selectedTask = ref(null);
    
    // 配置选项
    const options = reactive({
      theme: {
        primary: '#1890ff',
        secondary: '#13c2c2',
        success: '#52c41a',
        warning: '#faad14',
        error: '#f5222d',
      },
      allowTaskDrag: true,
      allowTaskResize: true,
      showWeekends: true,
      showToday: true,
      enableDependencies: true
    });
    
    // 计算属性
    const canUndo = computed(() => {
      return ganttChart.value?.canUndo?.() || false;
    });
    
    const canRedo = computed(() => {
      return ganttChart.value?.canRedo?.() || false;
    });
    
    const canAddTask = computed(() => {
      return tasks.value.length > 0;
    });
    
    // 方法
    const setViewMode = (mode) => {
      currentViewMode.value = mode;
      ganttChart.value?.setViewMode(mode);
    };
    
    const handleTaskClick = (task) => {
      console.log('任务点击:', task);
      selectedTask.value = task;
    };
    
    const handleTaskDoubleClick = (task) => {
      console.log('任务双击:', task);
      // 这里可以打开编辑对话框等
    };
    
    const handleTasksChange = (updatedTasks) => {
      console.log('任务数据变更:', updatedTasks);
      tasks.value = updatedTasks;
    };
    
    const handleDependenciesChange = (updatedDependencies) => {
      console.log('依赖关系变更:', updatedDependencies);
      dependencies.value = updatedDependencies;
    };
    
    const addTask = () => {
      if (!ganttChart.value) return;
      
      // 使用当前日期作为新任务的开始日期
      const today = new Date();
      
      const newTask = {
        name: `新任务 ${new Date().toLocaleTimeString()}`,
        start: DateUtils.format(today),
        end: DateUtils.format(DateUtils.addDays(today, 3)),
        progress: 0,
        type: 'task'
      };
      
      ganttChart.value.addTask(newTask);
    };
    
    const undo = () => {
      ganttChart.value?.undo();
    };
    
    const redo = () => {
      ganttChart.value?.redo();
    };
    
    const exportPNG = () => {
      ganttChart.value?.exportAsPNG({
        fileName: '甘特图导出',
        scale: 2
      });
    };
    
    // 生命周期
    onMounted(() => {
      // 初始化示例数据
      tasks.value = ExampleGenerator.generateTasks(12);
      dependencies.value = ExampleGenerator.generateDependencies(tasks.value, 6);
    });
    
    return {
      viewModes,
      currentViewMode,
      ganttChart,
      tasks,
      dependencies,
      selectedTask,
      options,
      canUndo,
      canRedo,
      canAddTask,
      setViewMode,
      handleTaskClick,
      handleTaskDoubleClick,
      handleTasksChange,
      handleDependenciesChange,
      addTask,
      undo,
      redo,
      exportPNG
    };
  }
});
</script>

<style scoped>
.gantt-chart-vue-example {
  font-family: 'Microsoft YaHei', Arial, sans-serif;
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

h2 {
  margin-bottom: 20px;
  color: #1890ff;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
}

.view-modes, .actions {
  display: flex;
  gap: 8px;
}

button {
  background-color: #f0f0f0;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  padding: 4px 12px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

button:hover {
  background-color: #e6f7ff;
  border-color: #91d5ff;
}

button.active {
  background-color: #1890ff;
  border-color: #1890ff;
  color: white;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.gantt-container {
  height: 500px;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  margin-bottom: 20px;
}

.task-details {
  padding: 15px;
  background-color: #f5f5f5;
  border-radius: 4px;
  margin-top: 15px;
}

.task-details h3 {
  margin-top: 0;
  color: #1890ff;
  font-size: 16px;
  margin-bottom: 12px;
}

.detail-row {
  display: flex;
  margin-bottom: 8px;
}

.label {
  width: 80px;
  font-weight: bold;
  color: #333;
}

.value {
  flex: 1;
}
</style> 