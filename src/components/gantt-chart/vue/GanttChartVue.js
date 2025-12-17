/**
 * Vue组件入口文件
 * 由于Rollup配置问题，我们需要一个JS文件来导出Vue组件
 */
// 手动创建组件对象而不是导入.vue文件
import GanttChartCore from '../core/GanttChartCore';
import { ref, defineComponent, onMounted, onUnmounted, computed, watch } from 'vue';
import '../styles/gantt-chart.css';

// 创建Vue组件
const GanttChartVue = defineComponent({
  name: 'GanttChartVue',
  props: {
    tasks: {
      type: Array,
      default: () => []
    },
    resources: {
      type: Array,
      default: () => []
    },
    dependencies: {
      type: Array,
      default: () => []
    },
    startDate: {
      type: Date,
      default: null
    },
    endDate: {
      type: Date,
      default: null
    },
    viewMode: {
      type: String,
      default: 'day',
      validator: (value) => ['day', 'week', 'month', 'quarter', 'year'].includes(value)
    },
    columnWidth: {
      type: Number,
      default: 40
    },
    rowHeight: {
      type: Number,
      default: 40
    },
    headerHeight: {
      type: Number,
      default: 50
    },
    // 新增配置选项
    allowTaskDrag: {
      type: Boolean,
      default: true
    },
    allowTaskResize: {
      type: Boolean,
      default: true
    },
    enableDependencies: {
      type: Boolean,
      default: true
    },
    showProgress: {
      type: Boolean,
      default: true
    },
    showWeekends: {
      type: Boolean,
      default: true
    },
    showToday: {
      type: Boolean,
      default: true
    },
    readOnly: {
      type: Boolean,
      default: false
    },
    theme: {
      type: Object,
      default: () => ({})
    },
    // 虚拟滚动配置
    virtualScrolling: {
      type: Boolean,
      default: false
    },
    visibleTaskCount: {
      type: Number,
      default: 50
    },
    bufferSize: {
      type: Number,
      default: 10
    }
  },
  emits: [
    'taskClick', 
    'taskDrag', 
    'taskDoubleClick',
    'dateChange',
    'progressChange',
    'viewChange',
    'taskToggle',
    'dependenciesChange',
    'tasksChange',
    'scroll',
    'render'
  ],
  setup(props, { emit, expose }) {
    const ganttContainer = ref(null);
    const ganttChart = ref(null);
    
    const computedStyle = computed(() => ({
      width: '100%',
      height: '100%',
      overflow: 'auto'
    }));
    
    // 创建甘特图选项对象
    const createChartOptions = () => ({
      tasks: props.tasks,
      resources: props.resources,
      dependencies: props.dependencies,
      startDate: props.startDate,
      endDate: props.endDate,
      viewMode: props.viewMode,
      columnWidth: props.columnWidth,
      rowHeight: props.rowHeight,
      headerHeight: props.headerHeight,
      allowTaskDrag: props.allowTaskDrag,
      allowTaskResize: props.allowTaskResize,
      enableDependencies: props.enableDependencies,
      showProgress: props.showProgress,
      showWeekends: props.showWeekends,
      showToday: props.showToday,
      readOnly: props.readOnly,
      theme: props.theme,
      virtualScrolling: props.virtualScrolling,
      visibleTaskCount: props.visibleTaskCount,
      bufferSize: props.bufferSize,
      onTaskClick: (task, event) => {
        emit('taskClick', task, event);
      },
      onTaskDrag: (task, event, newStart, newEnd) => {
        emit('taskDrag', task, event, newStart, newEnd);
      },
      onTaskDoubleClick: (task, event) => {
        emit('taskDoubleClick', task, event);
      },
      onDateChange: (startDate, endDate) => {
        emit('dateChange', startDate, endDate);
      },
      onProgressChange: (task, progress) => {
        emit('progressChange', task, progress);
      },
      onViewChange: (viewMode) => {
        emit('viewChange', viewMode);
      },
      onDependenciesChange: (dependencies) => {
        emit('dependenciesChange', dependencies);
      },
      onTasksChange: (tasks) => {
        emit('tasksChange', tasks);
      },
      onScroll: (scrollPosition) => {
        emit('scroll', scrollPosition);
      },
      onRender: () => {
        emit('render');
      }
    });
    
    // 初始化甘特图
    onMounted(() => {
      if (ganttContainer.value) {
        ganttChart.value = new GanttChartCore(createChartOptions());
        ganttChart.value.render(ganttContainer.value);
      }
    });
    
    // 当属性变化时更新甘特图
    watch(
      () => [
        props.tasks,
        props.resources, 
        props.dependencies,
        props.viewMode,
        props.columnWidth,
        props.rowHeight,
        props.allowTaskDrag,
        props.allowTaskResize,
        props.enableDependencies,
        props.showProgress,
        props.showWeekends,
        props.showToday,
        props.readOnly,
        props.theme,
        props.virtualScrolling,
        props.visibleTaskCount,
        props.bufferSize
      ],
      () => {
        if (ganttChart.value) {
          ganttChart.value.updateOptions(createChartOptions());
        }
      },
      { deep: true }
    );
    
    // 组件销毁时清理
    onUnmounted(() => {
      if (ganttChart.value) {
        ganttChart.value.destroy();
      }
      if (ganttContainer.value) {
        ganttContainer.value.innerHTML = '';
      }
    });
    
    // 暴露公共方法
    expose({
      // 设置视图模式
      setViewMode: (mode) => {
        if (ganttChart.value) {
          ganttChart.value.setViewMode(mode);
        }
      },
      // 滚动到指定任务
      scrollToTask: (taskId) => {
        if (ganttChart.value) {
          ganttChart.value.scrollToTask(taskId);
        }
      },
      // 滚动到指定日期
      scrollToDate: (date) => {
        if (ganttChart.value) {
          ganttChart.value.scrollToDate(date);
        }
      },
      // 导出为PNG
      exportAsPNG: (options) => {
        if (ganttChart.value) {
          return ganttChart.value.exportAsPNG(options);
        }
        return Promise.reject('甘特图未初始化');
      },
      // 导出为PDF
      exportAsPDF: (options) => {
        if (ganttChart.value) {
          return ganttChart.value.exportAsPDF(options);
        }
        return Promise.reject('甘特图未初始化');
      },
      // 自动排程
      autoSchedule: (respectDependencies = true) => {
        if (ganttChart.value) {
          return ganttChart.value.autoSchedule(respectDependencies);
        }
        return [];
      },
      // 应用主题
      applyTheme: (theme) => {
        if (ganttChart.value) {
          ganttChart.value.applyTheme(theme);
        }
      },
      // 获取可见任务
      getVisibleTasks: () => {
        if (ganttChart.value) {
          return ganttChart.value.getVisibleTasks();
        }
        return [];
      },
      // 撤销操作
      undo: () => {
        if (ganttChart.value) {
          return ganttChart.value.undo();
        }
        return false;
      },
      // 重做操作
      redo: () => {
        if (ganttChart.value) {
          return ganttChart.value.redo();
        }
        return false;
      }
    });
    
    return {
      ganttContainer,
      computedStyle
    };
  },
  // 定义模板
  template: `
    <div 
      ref="ganttContainer" 
      class="gantt-chart-vue"
      :style="computedStyle"
    ></div>
  `
});

export default GanttChartVue; 