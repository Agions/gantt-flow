import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Task } from './components/gantt-chart/core/types';
import { ExportOptions } from './components/gantt-chart/core/types';
import { TaskFilter } from './components/gantt-chart/enhanced/TaskFilter';
import { EnhancedGanttChart } from './components/gantt-chart/enhanced/EnhancedGanttChart';
import { ViewModeSelector } from './components/gantt-chart/enhanced/ViewModeSelector';
import { TaskDetails } from './components/gantt-chart/enhanced/TaskDetails';
import { TaskList } from './components/gantt-chart/enhanced/TaskList';
import { TaskToolbar } from './components/gantt-chart/enhanced/TaskToolbar';
import { useGanttData } from './hooks/useGanttData';
import { useCriticalPath } from './hooks/useCriticalPath';
import './components/gantt-chart/styles/TaskFilter.css';
import './components/gantt-chart/styles/EnhancedGanttChart.css';
import './components/gantt-chart/styles/TaskList.css';
import './App.css';

// 添加项目统计仪表盘组件
interface ProjectStatsProps {
  tasks: Task[];
}

const ProjectStatsDashboard: React.FC<ProjectStatsProps> = ({ tasks }) => {
  // 计算完成率
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => (task.progress ?? 0) === 100).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  // 计算进行中任务
  const inProgressTasks = tasks.filter(task => {
    const progress = task.progress ?? 0;
    return progress > 0 && progress < 100;
  }).length;
  
  // 计算未开始任务
  const notStartedTasks = tasks.filter(task => (task.progress ?? 0) === 0).length;
  
  // 计算按时完成率
  const today = new Date();
  const overdueTasksCount = tasks.filter(task => {
    const endDate = new Date(task.end);
    return (task.progress ?? 0) < 100 && endDate < today;
  }).length;
  
  const onTimeRate = totalTasks > 0 ? Math.round(((totalTasks - overdueTasksCount) / totalTasks) * 100) : 100;
  
  // 计算环形进度条的stroke-dashoffset
  const circumference = 2 * Math.PI * 54; // 2πr，r=54
  const strokeDashoffset = circumference - (circumference * completionRate) / 100;
  
  // 生成CSS变量
  const ringStyle = { 
    '--stroke-dashoffset': strokeDashoffset + 'px'
  } as React.CSSProperties;
  
  // 状态条CSS变量
  const completeBarStyle = { 
    '--width-value': `${completionRate}%` 
  } as React.CSSProperties;
  
  const progressBarStyle = { 
    '--width-value': `${Math.round(inProgressTasks / totalTasks * 100)}%` 
  } as React.CSSProperties;
  
  const notStartedBarStyle = { 
    '--width-value': `${Math.round(notStartedTasks / totalTasks * 100)}%` 
  } as React.CSSProperties;

  return (
    <div className="stats-dashboard">
      <div className="stats-header">
        <h3 className="stats-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight: '8px'}}>
            <path d="M16 8V16M12 11V16M8 14V16M6 20H18C19.1046 20 20 19.1046 20 18V6C20 4.89543 19.1046 4 18 4H6C4.89543 4 4 4.89543 4 6V18C4 19.1046 4.89543 20 6 20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          项目进度概览
        </h3>
      </div>
      
      <div className="stats-body">
        <div className="progress-container">
          <div className="progress-ring-container">
            <div className="progress-ring" style={ringStyle}>
              <svg viewBox="0 0 120 120" width="120" height="120">
                <circle 
                  cx="60" 
                  cy="60" 
                  r="54" 
                  fill="none" 
                  stroke="var(--color-gray-200)" 
                  strokeWidth="12" 
                />
                <circle 
                  cx="60" 
                  cy="60" 
                  r="54" 
                  fill="none" 
                  stroke="var(--color-primary)" 
                  strokeWidth="12" 
                  strokeDasharray={circumference}
                  transform="rotate(-90 60 60)"
                  strokeLinecap="round"
                />
              </svg>
              <div className="progress-percent">
                <div className="big-number">{completionRate}%</div>
                <span>完成率</span>
              </div>
            </div>
          </div>
          
          <div className="project-stats-grid">
            <div className="stat-box vertical">
              <div className="stat-icon status-complete">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 11L12 14L20 6M5 18L3 16M21 18L19 16M5 6L3 8M21 6L19 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-number">{completedTasks}</div>
                <span className="stat-label">完成任务</span>
              </div>
            </div>
            
            <div className="stat-box vertical">
              <div className="stat-icon status-progress">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 8V12L15 15M12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-number">{inProgressTasks}</div>
                <span className="stat-label">进行中</span>
              </div>
            </div>
            
            <div className="stat-box vertical">
              <div className="stat-icon status-not-started">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 9V12M12 15H12.01M5.07183 19H18.9282C20.4678 19 21.4301 17.3333 20.6603 16L13.7321 4C12.9623 2.66667 11.0378 2.66667 10.268 4L3.33978 16C2.56998 17.3333 3.53223 19 5.07183 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-number">{notStartedTasks}</div>
                <span className="stat-label">未开始</span>
              </div>
            </div>
            
            <div className="stat-box vertical">
              <div className="stat-icon status-ontime">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 6.10457 9.89543 7 11 7H13C14.1046 7 15 6.10457 15 5M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5M9 14L11 16L15 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-number">{onTimeRate}%</div>
                <span className="stat-label">按时完成率</span>
              </div>
            </div>
          </div>
        </div>

        <div className="task-status-distribution">
          <h4 className="distribution-title">任务状态分布</h4>
          <div className="status-bars">
            <div className="status-bar-container">
              <div className="status-label">完成</div>
              <div className="status-bar-wrapper">
                <div 
                  className="status-bar status-complete" 
                  style={completeBarStyle}
                ></div>
              </div>
              <div className="status-value">{completionRate}%</div>
            </div>
            
            <div className="status-bar-container">
              <div className="status-label">进行中</div>
              <div className="status-bar-wrapper">
                <div 
                  className="status-bar status-progress" 
                  style={progressBarStyle}
                ></div>
              </div>
              <div className="status-value">{Math.round(inProgressTasks / totalTasks * 100)}%</div>
            </div>
            
            <div className="status-bar-container">
              <div className="status-label">未开始</div>
              <div className="status-bar-wrapper">
                <div 
                  className="status-bar status-not-started" 
                  style={notStartedBarStyle}
                ></div>
              </div>
              <div className="status-value">{Math.round(notStartedTasks / totalTasks * 100)}%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  // 添加类型定义
  type GanttChartRef = {
    exportAsPNG: (options?: ExportOptions) => Promise<string>;
    exportAsPDF: (options?: ExportOptions) => Promise<string>;
    enterFullscreen: () => void;
    scrollToTask: (taskId: string) => void;
    setViewMode: (mode: 'day' | 'week' | 'month') => void;
    exportData?: () => any; // 添加导出数据的方法
  };

  const ganttRef = useRef<GanttChartRef | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const {
    tasks,
    dependencies,
    handleTasksChange,
    handleDependenciesChange,
    addTask,
    deleteTask,
    updateTask,
    undo,
    redo,
    resetData,
    canUndo,
    canRedo
  } = useGanttData();

  const [filteredTasks, setFilteredTasks] = useState<Task[]>(tasks);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');

  const { criticalTasks } = useCriticalPath(tasks, dependencies);

  const [exportingPng, setExportingPng] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [importingData, setImportingData] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 当任务变化时，更新过滤后的任务列表
  useEffect(() => {
    setFilteredTasks(tasks);
  }, [tasks]);

  // 处理任务过滤 - 使用useCallback记忆化
  const handleFilterChange = useCallback((filtered: Task[]) => {
    setFilteredTasks(filtered);
  }, []);

  // 处理任务选择 - 使用useCallback记忆化
  const handleTaskSelect = useCallback((task: Task) => {
    setSelectedTask(task);
    if (ganttRef.current) {
      ganttRef.current.scrollToTask(String(task.id));
    }
  }, []);
  
  // 处理视图模式变更 - 使用useCallback记忆化
  const handleViewModeChange = useCallback((mode: 'day' | 'week' | 'month') => {
    setViewMode(mode);
    if (ganttRef.current) {
      ganttRef.current.setViewMode(mode);
    }
  }, []);

  // 处理添加任务 - 使用useCallback记忆化
  const handleAddTask = useCallback((taskName: string) => {
    const newTask = addTask({ name: taskName });
    // 选择新创建的任务
    setSelectedTask(newTask);
  }, [addTask]);
  
  // 处理重置数据 - 使用useCallback记忆化
  const handleReset = useCallback(() => {
    if (window.confirm('确定要重置所有数据吗？这将删除所有您的更改。')) {
      resetData();
      setSelectedTask(null);
    }
  }, [resetData]);

  // 切换侧边栏状态
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  // 使用useMemo缓存甘特图配置
  const ganttOptions = useMemo(() => ({
    allowTaskDrag: true,
    allowTaskResize: true,
    enableDependencies: true,
    showProgress: true,
    theme: {
      primary: 'var(--color-primary)',
      secondary: 'var(--color-info)',
      success: 'var(--color-success)',
      warning: 'var(--color-warning)',
      error: '#f72585',
      taskBorder: 'var(--color-primary-light)',
      taskBackground: '#e0e7ff',
      milestoneColor: 'var(--color-info)',
      criticalTaskBackground: '#ffe0f0',
      criticalTaskBorder: '#f72585',
      dependencyLineColor: 'var(--color-primary-light)'
    }
  }), []);

  /**
   * 导出功能实现
   * 
   * 注意: 所有异步操作都添加了完整的类型安全处理:
   * 1. 返回值类型明确为 string (dataUrl)
   * 2. 错误处理使用 unknown 类型，并进行类型守卫
   * 3. 确保所有状态变更在各种场景下都能被正确执行
   */

  // 导出为PNG
  const exportAsPNG = useCallback(() => {
    console.log("导出PNG按钮被点击");
    if (exportingPng || exportingPdf) {
      alert('有导出操作正在进行中，请稍候再试');
      return;
    }

    setExportingPng(true);
    if (ganttRef.current) {
      console.log("甘特图实例存在，开始导出PNG");
      try {
        ganttRef.current.exportAsPNG({
          filename: '项目甘特图',
          backgroundColor: '#ffffff',
          includeHeader: true,
          headerText: '产品研发与上线项目甘特图'
        }).then((dataUrl: string) => {
          console.log("PNG导出成功");
          setExportingPng(false);
        }).catch((error: unknown) => {
          console.error("PNG导出失败:", error);
          const errorMessage = error instanceof Error ? error.message : '未知错误';
          alert(`导出PNG失败: ${errorMessage}`);
          setExportingPng(false);
        });
      } catch (error: unknown) {
        console.error("调用exportAsPNG方法出错:", error);
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        alert(`导出PNG出错: ${errorMessage}`);
        setExportingPng(false);
      }
    } else {
      console.warn("甘特图组件尚未初始化");
      alert('甘特图组件尚未初始化，请稍后再试');
      setExportingPng(false);
    }
  }, [exportingPng, exportingPdf]);

  // 导出为PDF
  const exportAsPDF = useCallback(() => {
    console.log("导出PDF按钮被点击");
    if (exportingPng || exportingPdf) {
      alert('有导出操作正在进行中，请稍候再试');
      return;
    }

    setExportingPdf(true);
    if (ganttRef.current) {
      console.log("甘特图实例存在，开始导出PDF");
      try {
        ganttRef.current.exportAsPDF({
          filename: '项目甘特图',
          backgroundColor: '#ffffff',
          includeHeader: true,
          headerText: '产品研发与上线项目甘特图',
          orientation: 'landscape'
        }).then((dataUrl: string) => {
          console.log("PDF导出成功");
          setExportingPdf(false);
        }).catch((error: unknown) => {
          console.error("PDF导出失败:", error);
          const errorMessage = error instanceof Error ? error.message : '未知错误';
          alert(`导出PDF失败: ${errorMessage}`);
          setExportingPdf(false);
        });
      } catch (error: unknown) {
        console.error("调用exportAsPDF方法出错:", error);
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        alert(`导出PDF出错: ${errorMessage}`);
        setExportingPdf(false);
      }
    } else {
      console.warn("甘特图组件尚未初始化");
      alert('甘特图组件尚未初始化，请稍后再试');
      setExportingPdf(false);
    }
  }, [exportingPng, exportingPdf]);

  // 导出甘特图完整数据（任务和依赖关系）
  const exportGanttData = useCallback(() => {
    console.log("导出甘特图数据按钮被点击");
    if (exportingPng || exportingPdf || exportingData) {
      alert('有导出操作正在进行中，请稍候再试');
      return;
    }

    setExportingData(true);
    try {
      // 准备导出数据
      const dataToExport = {
        tasks: tasks,
        dependencies: dependencies,
        exportDate: new Date().toISOString(),
        version: '1.0.0'
      };
      
      // 转换为JSON字符串
      const jsonStr = JSON.stringify(dataToExport, null, 2);
      
      // 创建Blob
      const blob = new Blob([jsonStr], { type: 'application/json' });
      
      // 创建下载链接
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `甘特图数据_${new Date().toISOString().slice(0, 10)}.json`;
      
      // 触发下载
      document.body.appendChild(link);
      link.click();
      
      // 清理
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        console.log("甘特图数据导出成功");
        setExportingData(false);
      }, 100);
    } catch (error: unknown) {
      console.error("导出甘特图数据失败:", error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      alert(`导出甘特图数据失败: ${errorMessage}`);
      setExportingData(false);
    }
  }, [tasks, dependencies, exportingPng, exportingPdf, exportingData]);

  // 全屏显示
  const toggleFullscreen = useCallback(() => {
    console.log("全屏按钮被点击");
    if (!chartContainerRef.current) {
      console.warn("图表容器尚未初始化");
      return;
    }
    
    try {
      if (!document.fullscreenElement) {
        // 进入全屏
        console.log("请求进入全屏模式");
        chartContainerRef.current.requestFullscreen().catch((err: unknown) => {
          console.error("无法进入全屏模式:", err);
          const errorMessage = err instanceof Error ? err.message : '未知错误';
          alert(`无法进入全屏模式: ${errorMessage}`);
        });
      } else {
        // 退出全屏
        console.log("退出全屏模式");
        document.exitFullscreen();
      }
    } catch (error: unknown) {
      console.error("全屏操作出错:", error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      alert(`全屏操作失败: ${errorMessage}`);
    }
  }, []);

  // 导入甘特图数据
  const importGanttData = useCallback(() => {
    if (exportingPng || exportingPdf || exportingData || importingData) {
      alert('有导出/导入操作正在进行中，请稍候再试');
      return;
    }
    
    // 触发文件选择器
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [exportingPng, exportingPdf, exportingData, importingData]);

  // 处理文件选择
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setImportingData(true);
    
    // 读取文件
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target?.result as string);
        
        // 验证数据格式
        if (!jsonData.tasks || !jsonData.dependencies) {
          throw new Error('文件格式无效，缺少任务或依赖关系数据');
        }
        
        // 确认导入
        if (window.confirm(`确定要导入此数据吗？这将替换所有现有数据。\n发现 ${jsonData.tasks.length} 个任务和 ${jsonData.dependencies.length} 个依赖关系。`)) {
          // 更新数据
          handleTasksChange(jsonData.tasks);
          handleDependenciesChange(jsonData.dependencies);
          
          alert('数据导入成功！');
        }
        
      } catch (error: unknown) {
        console.error("导入数据失败:", error);
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        alert(`导入数据失败: ${errorMessage}`);
      } finally {
        setImportingData(false);
        // 重置文件输入框
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    
    reader.onerror = () => {
      alert('读取文件出错');
      setImportingData(false);
      // 重置文件输入框
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    
    reader.readAsText(file);
  }, [handleTasksChange, handleDependenciesChange]);

  return (
    <div className="app-container">
      {/* 添加微妙的背景效果 */}
      <div className="app-background">
        <div className="app-background-shape app-background-shape-1"></div>
        <div className="app-background-shape app-background-shape-2"></div>
      </div>

      {/* 粒子背景 */}
      <div className="particles-container">
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
      </div>

      {/* 头部导航 */}
      <header className="app-header">
        <div className="logo-container">
          <span className="logo-icon">📊</span>
          <h1>甘特图专业版</h1>
        </div>
        <nav className="app-nav">
          <Link to="/">首页</Link>
          <Link to="/features">功能特点</Link>
          <Link to="/demo">演示</Link>
          <a 
            className="github-button" 
            href="https://github.com/Agions/gantt-flow" 
          target="_blank" 
          rel="noopener noreferrer"
        >
            <span className="github-icon">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.73.083-.73 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.4 3-.405 1.02.005 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.605-.015 2.895-.015 3.285 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z"/>
              </svg>
            </span>
            GitHub
          </a>
        </nav>
        <button className="mobile-menu-button" aria-label="Menu">
          <span></span>
          <span></span>
          <span></span>
        </button>
      </header>

      <div className="app-main">
        {/* 侧边栏 */}
        <aside className={`app-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <button className="sidebar-toggle" onClick={toggleSidebar} title={sidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}>
            {sidebarCollapsed ? '›' : '‹'}
          </button>
          
          {/* 项目统计仪表盘 - 添加在侧边栏顶部 */}
          <div className="sidebar-section stats-section">
            <ProjectStatsDashboard tasks={tasks} />
          </div>
          
          <div className="sidebar-section">
            <h3>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight: '8px'}}>
                <path d="M16 2V6M8 2V6M3 10H21M5 4H19C20.1046 4 21 4.89543 21 6V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V6C3 4.89543 3.89543 4 5 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              工具栏
            </h3>
            <TaskToolbar 
              onAddTask={handleAddTask}
              onUndo={undo}
              onRedo={redo}
              onReset={handleReset}
              canUndo={canUndo}
              canRedo={canRedo}
            />
          </div>
          
          <div className="sidebar-section">
            <h3>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight: '8px'}}>
                <path d="M12 6V12L16 14M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              视图控制
            </h3>
            <ViewModeSelector 
              currentMode={viewMode} 
              onModeChange={handleViewModeChange} 
            />
          </div>
          
          {selectedTask && (
            <div className="sidebar-section">
              <h3>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight: '8px'}}>
                  <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 6.10457 9.89543 7 11 7H13C14.1046 7 15 6.10457 15 5M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5M12 12H15M12 16H15M9 12H9.01M9 16H9.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                任务详情
              </h3>
              
              <div className="task-details-card">
                <div className="task-details-header">
                  <h4 className="task-details-title">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="icon">
                      <path d="M9 11.5L11 13.5L15 9.5M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    选中的任务
                  </h4>
                  <span className={`task-type-badge ${criticalTasks.has(String(selectedTask.id)) ? 'critical' : ''}`}>
                    {criticalTasks.has(String(selectedTask.id)) ? '关键任务' : '普通任务'}
                  </span>
                </div>
                <div className="task-details-body">
                  <TaskDetails 
                    task={selectedTask} 
                    isCritical={criticalTasks.has(String(selectedTask.id))} 
                  />
                </div>
              </div>
            </div>
          )}
          
          <div className="sidebar-section">
            <h3>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight: '8px'}}>
                <path d="M3 4.5H17M3 9H13M3 13.5H9M13.5 13.5L17.5 17.5M17.5 13.5L13.5 17.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              任务过滤
            </h3>
            <div className="filter-section">
              <div className="filter-group">
                <label className="filter-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight: '6px'}}>
                    <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  搜索任务
                </label>
                <input 
                  type="text" 
                  className="search-input" 
                  placeholder="搜索任务..."
                />
              </div>
              
              <div className="filter-group">
                <label className="filter-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight: '6px'}}>
                    <path d="M12 15V17M12 7V13M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  状态
                </label>
                <select className="select-control">
                  <option value="all">全部状态</option>
                  <option value="not-started">未开始</option>
                  <option value="in-progress">进行中</option>
                  <option value="completed">已完成</option>
                  <option value="delayed">已延期</option>
                </select>
              </div>
              
              <div className="filter-group">
                <label className="filter-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight: '6px'}}>
                    <path d="M9 3H5C3.89543 3 3 3.89543 3 5V9C3 10.1046 3.89543 11 5 11H9C10.1046 11 11 10.1046 11 9V5C11 3.89543 10.1046 3 9 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M19 3H15C13.8954 3 13 3.89543 13 5V9C13 10.1046 13.8954 11 15 11H19C20.1046 11 21 10.1046 21 9V5C21 3.89543 20.1046 3 19 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 13H5C3.89543 13 3 13.8954 3 15V19C3 20.1046 3.89543 21 5 21H9C10.1046 21 11 20.1046 11 19V15C11 13.8954 10.1046 13 9 13Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M19 13H15C13.8954 13 13 13.8954 13 15V19C13 20.1046 13.8954 21 15 21H19C20.1046 21 21 20.1046 21 19V15C21 13.8954 20.1046 13 19 13Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  类型
                </label>
                <select className="select-control">
                  <option value="all">全部类型</option>
                  <option value="task">任务</option>
                  <option value="milestone">里程碑</option>
                  <option value="project">项目</option>
                </select>
              </div>
              
              <div className="filter-group">
                <label className="filter-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight: '6px'}}>
                    <path d="M8 7V3M16 7V3M7 11H17M5 21H19C20.1046 21 21 20.1046 21 19V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V19C3 20.1046 3.89543 21 5 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  开始日期
                </label>
                <div className="date-range">
                  <input 
                    type="date" 
                    className="date-input" 
                    placeholder="起始日期"
                  />
                  <span className="date-range-separator">至</span>
                  <input 
                    type="date" 
                    className="date-input" 
                    placeholder="结束日期"
                  />
                </div>
              </div>
              
              <div className="filter-group">
                <label className="filter-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight: '6px'}}>
                    <path d="M8 7V3M16 7V3M7 11H17M5 21H19C20.1046 21 21 20.1046 21 19V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V19C3 20.1046 3.89543 21 5 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  结束日期
                </label>
                <div className="date-range">
                  <input 
                    type="date" 
                    className="date-input" 
                    placeholder="起始日期"
                  />
                  <span className="date-range-separator">至</span>
                  <input 
                    type="date" 
                    className="date-input" 
                    placeholder="结束日期"
                  />
                </div>
              </div>
              
              <button className="reset-button">
                重置筛选
              </button>
              
              {filteredTasks.length > 0 && (
                <div className="filter-results">
                  <span className="result-count">筛选结果 ({filteredTasks.length})</span>
                </div>
              )}
            </div>
            
            <TaskFilter 
              tasks={tasks} 
              onFilterChange={handleFilterChange} 
              onTaskSelect={handleTaskSelect}
            />
          </div>
        </aside>

        {/* 主内容区 */}
        <main className="app-content">
          <section className="content-card main-chart-container">
            <div className="card-header">
              <h2>项目甘特图</h2>
              <div className="card-actions">
                <button 
                  className={`action-button ${importingData ? 'processing' : ''}`} 
                  title="导入数据" 
                  onClick={importGanttData}
                  disabled={exportingPng || exportingPdf || exportingData || importingData}
                >
                  <span>{importingData ? '⏳' : '📂'}</span>
                </button>
                <button 
                  className={`action-button ${exportingData ? 'processing' : ''}`} 
                  title="导出数据" 
                  onClick={exportGanttData}
                  disabled={exportingPng || exportingPdf || exportingData || importingData}
                >
                  <span>{exportingData ? '⏳' : '💾'}</span>
                </button>
          <button 
                  className={`action-button ${exportingPng ? 'processing' : ''}`} 
                  title="导出为PNG" 
                  onClick={exportAsPNG}
                  disabled={exportingPng || exportingPdf || exportingData || importingData}
                >
                  <span>{exportingPng ? '⏳' : '📷'}</span>
          </button>
          <button 
                  className={`action-button ${exportingPdf ? 'processing' : ''}`} 
                  title="导出为PDF" 
                  onClick={exportAsPDF}
                  disabled={exportingPng || exportingPdf || exportingData || importingData}
                >
                  <span>{exportingPdf ? '⏳' : '📄'}</span>
          </button>
          <button 
                  className="action-button" 
                  title="全屏" 
                  onClick={toggleFullscreen}
                  disabled={exportingPng || exportingPdf || exportingData || importingData}
                >
                  <span>⛶</span>
          </button>
                {/* 隐藏的文件输入框 */}
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept=".json"
                  onChange={handleFileSelect}
                />
        </div>
      </div>

            {/* 导出提示信息 */}
            {(exportingPng || exportingPdf || exportingData) && (
              <div className="export-status-message">
                <div className="loading-spinner"></div>
                <span>正在{
                  exportingPng ? '导出PNG' : 
                  exportingPdf ? '导出PDF' : 
                  '导出数据'
                }，请稍候...</span>
                <span className="export-note">（大型图表可能需要几秒钟时间）</span>
              </div>
            )}

            <div className="chart-container" ref={chartContainerRef}>
          <EnhancedGanttChart
            tasks={tasks}
            dependencies={dependencies}
            viewMode={viewMode}
            onTasksChange={handleTasksChange}
            onDependenciesChange={handleDependenciesChange}
                onTaskClick={handleTaskSelect}
                options={ganttOptions}
            ref={ganttRef}
          />
        </div>
          </section>

          <section className="content-card task-list-container">
            <TaskList 
              tasks={filteredTasks}
              criticalTasks={criticalTasks}
          onTaskSelect={handleTaskSelect}
              onTaskDelete={deleteTask}
              onTaskUpdate={updateTask}
        />
          </section>
        </main>
      </div>

      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-section">
            <h3>甘特图专业版</h3>
            <p>专业的项目管理工具，让您的项目规划更高效</p>
          </div>
          <div className="footer-section">
            <h3>相关链接</h3>
            <ul>
              <li><Link to="/features">功能特点</Link></li>
              <li><Link to="/demo">在线演示</Link></li>
              <li><a href="#docs">使用文档</a></li>
              <li><a href="https://github.com/Agions/gantt-flow" target="_blank" rel="noopener noreferrer">GitHub</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h3>联系我</h3>
            <p>邮箱: 1051736049@qq.com</p>
            <div className="social-links">
              {/* <a href="#" title="微信" aria-label="微信">
                <span></span>
              </a>
              <a href="#" title="知乎" aria-label="知乎">
                <span>📘</span>
              </a>
              <a href="#" title="掘金" aria-label="掘金">
                <span>📝</span>
              </a> */}
                </div>
                </div>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} 甘特图专业版 | 保留所有权利</p>
      </div>
      </footer>
    </div>
  );
}

export default App; 