/**
 * TaskManager.test.ts
 * TaskManager 单元测试
 * @module TaskManager.test
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { TaskManager, TaskManagerOptions } from './TaskManager';
import { Task, Dependency, TaskType } from './types';

describe('TaskManager', () => {
  let taskManager: TaskManager;
  const defaultOptions: TaskManagerOptions = {
    autoCalculateDuration: true,
    autoCalculateProgress: false,
    checkCircularDependencies: true,
    defaultTaskType: 'task',
    defaultTaskColor: '#4e85c5',
    defaultMilestoneColor: '#722ed1',
    defaultProjectColor: '#fa8c16'
  };

  beforeEach(() => {
    taskManager = new TaskManager(defaultOptions);
  });

  describe('createTask', () => {
    it('should create a task with valid data', () => {
      const task = taskManager.createTask({
        name: 'Test Task',
        start: '2024-01-01',
        end: '2024-01-05'
      });

      expect(task).toBeDefined();
      expect(task.name).toBe('Test Task');
      expect(task.id).toBeDefined();
      expect(task.start).toBe('2024-01-01');
      expect(task.end).toBe('2024-01-05');
      expect(task.type).toBe('task');
      expect(task.progress).toBe(0);
    });

    it('should create a milestone task', () => {
      const task = taskManager.createTask({
        name: 'Milestone',
        start: '2024-01-01',
        end: '2024-01-01',
        type: 'milestone'
      });

      expect(task.type).toBe('milestone');
      expect(task.color).toBe('#722ed1');
    });

    it('should create a project task', () => {
      const task = taskManager.createTask({
        name: 'Project',
        start: '2024-01-01',
        end: '2024-01-31',
        type: 'project'
      });

      expect(task.type).toBe('project');
      expect(task.color).toBe('#fa8c16');
    });

    it('should use custom color when provided', () => {
      const task = taskManager.createTask({
        name: 'Custom Color Task',
        start: '2024-01-01',
        end: '2024-01-05',
        color: '#ff0000'
      });

      expect(task.color).toBe('#ff0000');
    });

    it('should set default values for optional properties', () => {
      const task = taskManager.createTask({
        name: 'Default Values Task',
        start: '2024-01-01',
        end: '2024-01-05'
      });

      expect(task.collapsed).toBe(false);
      expect(task.draggable).toBe(true);
      expect(task.resizable).toBe(true);
      expect(task.readonly).toBe(false);
      expect(task.dependencies).toEqual([]);
      expect(task.dependsOn).toEqual([]);
      expect(task.children).toEqual([]);
      expect(task.metadata).toEqual({});
      expect(task.critical).toBe(false);
    });

    it('should throw error with invalid dates', () => {
      expect(() => {
        taskManager.createTask({
          name: 'Invalid Task',
          start: 'invalid-date',
          end: '2024-01-05'
        });
      }).toThrow();
    });
  });

  describe('updateTask', () => {
    beforeEach(() => {
      taskManager.createTask({
        id: 'task-1',
        name: 'Original Task',
        start: '2024-01-01',
        end: '2024-01-05'
      });
    });

    it('should update an existing task', () => {
      const updatedTask = taskManager.updateTask('task-1', {
        name: 'Updated Task',
        progress: 50
      });

      expect(updatedTask).toBeDefined();
      expect(updatedTask?.name).toBe('Updated Task');
      expect(updatedTask?.progress).toBe(50);
      expect(updatedTask?.start).toBe('2024-01-01'); // 保持不变
    });

    it('should return null for non-existent task', () => {
      const result = taskManager.updateTask('non-existent', {
        name: 'Updated'
      });

      expect(result).toBeNull();
    });

    it('should update task dates correctly', () => {
      const updatedTask = taskManager.updateTask('task-1', {
        start: '2024-02-01',
        end: '2024-02-10'
      });

      expect(updatedTask?.start).toBe('2024-02-01');
      expect(updatedTask?.end).toBe('2024-02-10');
    });
  });

  describe('deleteTask', () => {
    beforeEach(() => {
      taskManager.createTask({
        id: 'task-1',
        name: 'Task to Delete',
        start: '2024-01-01',
        end: '2024-01-05'
      });
    });

    it('should delete an existing task', () => {
      const result = taskManager.deleteTask('task-1');

      expect(result).toBe(true);
      expect(taskManager.getTasks()).toHaveLength(0);
    });

    it('should return false for non-existent task', () => {
      const result = taskManager.deleteTask('non-existent');

      expect(result).toBe(false);
    });

    it('should delete child tasks when parent is deleted', () => {
      // 先删除 beforeEach 创建的任务，确保干净的测试环境
      taskManager.deleteTask('task-1');

      taskManager.createTask({
        id: 'parent',
        name: 'Parent Task',
        start: '2024-01-01',
        end: '2024-01-10'
      });

      taskManager.createTask({
        id: 'child',
        name: 'Child Task',
        start: '2024-01-01',
        end: '2024-01-05',
        parentId: 'parent'
      });

      // 验证子任务已被添加到父任务的 children 数组
      const parentTask = taskManager.getTasks().find(t => t.id === 'parent');
      expect(parentTask?.children).toHaveLength(1);
      expect(parentTask?.children?.[0].id).toBe('child');

      taskManager.deleteTask('parent');

      // 删除父任务后，子任务也应该被删除
      expect(taskManager.getTasks()).toHaveLength(0);
    });
  });

  describe('createDependency', () => {
    beforeEach(() => {
      taskManager.createTask({
        id: 'task-1',
        name: 'Task 1',
        start: '2024-01-01',
        end: '2024-01-05'
      });

      taskManager.createTask({
        id: 'task-2',
        name: 'Task 2',
        start: '2024-01-06',
        end: '2024-01-10'
      });
    });

    it('should create a dependency between two tasks', () => {
      const dependency = taskManager.createDependency('task-1', 'task-2', 'finish_to_start');

      expect(dependency).toBeDefined();
      expect(dependency?.fromId).toBe('task-1');
      expect(dependency?.toId).toBe('task-2');
      expect(dependency?.type).toBe('finish_to_start');
    });

    it('should return null for non-existent tasks', () => {
      const dependency = taskManager.createDependency('non-existent-1', 'non-existent-2', 'finish_to_start');

      expect(dependency).toBeNull();
    });

    it('should return existing dependency if already exists', () => {
      const dep1 = taskManager.createDependency('task-1', 'task-2', 'finish_to_start');
      const dep2 = taskManager.createDependency('task-1', 'task-2', 'finish_to_start');

      expect(dep1).toBe(dep2);
    });

    it('should detect circular dependencies', () => {
      taskManager.createDependency('task-1', 'task-2', 'finish_to_start');

      // 创建循环依赖
      const circularDep = taskManager.createDependency('task-2', 'task-1', 'finish_to_start');

      expect(circularDep).toBeNull();
    });
  });

  describe('deleteDependency', () => {
    beforeEach(() => {
      taskManager.createTask({
        id: 'task-1',
        name: 'Task 1',
        start: '2024-01-01',
        end: '2024-01-05'
      });

      taskManager.createTask({
        id: 'task-2',
        name: 'Task 2',
        start: '2024-01-06',
        end: '2024-01-10'
      });

      taskManager.createDependency('task-1', 'task-2', 'finish_to_start');
    });

    it('should delete an existing dependency', () => {
      const result = taskManager.deleteDependency('task-1', 'task-2');

      expect(result).toBe(true);
      expect(taskManager.getDependencies()).toHaveLength(0);
    });

    it('should return false for non-existent dependency', () => {
      const result = taskManager.deleteDependency('non-existent-1', 'non-existent-2');

      expect(result).toBe(false);
    });
  });

  describe('checkCircularDependencies', () => {
    beforeEach(() => {
      taskManager.createTask({
        id: 'task-1',
        name: 'Task 1',
        start: '2024-01-01',
        end: '2024-01-05'
      });

      taskManager.createTask({
        id: 'task-2',
        name: 'Task 2',
        start: '2024-01-06',
        end: '2024-01-10'
      });

      taskManager.createTask({
        id: 'task-3',
        name: 'Task 3',
        start: '2024-01-11',
        end: '2024-01-15'
      });
    });

    it('should return false when no circular dependencies exist', () => {
      taskManager.createDependency('task-1', 'task-2', 'finish_to_start');
      taskManager.createDependency('task-2', 'task-3', 'finish_to_start');

      expect(taskManager.checkCircularDependencies()).toBe(false);
    });

    it('should detect circular dependencies', () => {
      // 使用 setDependencies 直接设置依赖关系，绕过创建时的循环检测
      // 因为 createDependency 会阻止创建导致循环的依赖
      taskManager.setDependencies([
        { fromId: 'task-1', toId: 'task-2', type: 'finish_to_start' },
        { fromId: 'task-2', toId: 'task-3', type: 'finish_to_start' },
        { fromId: 'task-3', toId: 'task-1', type: 'finish_to_start' }
      ]);

      expect(taskManager.checkCircularDependencies()).toBe(true);
    });
  });

  describe('getTasksByType', () => {
    beforeEach(() => {
      taskManager.createTask({
        id: 'task-1',
        name: 'Regular Task',
        start: '2024-01-01',
        end: '2024-01-05',
        type: 'task'
      });

      taskManager.createTask({
        id: 'milestone-1',
        name: 'Milestone',
        start: '2024-01-06',
        end: '2024-01-06',
        type: 'milestone'
      });

      taskManager.createTask({
        id: 'project-1',
        name: 'Project',
        start: '2024-01-01',
        end: '2024-01-31',
        type: 'project'
      });
    });

    it('should return all regular tasks', () => {
      const tasks = taskManager.getTasksByType('task');

      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe('task-1');
    });

    it('should return all milestones', () => {
      const tasks = taskManager.getTasksByType('milestone');

      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe('milestone-1');
    });

    it('should return all projects', () => {
      const tasks = taskManager.getTasksByType('project');

      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe('project-1');
    });
  });

  describe('getDescendantTasks', () => {
    beforeEach(() => {
      taskManager.createTask({
        id: 'parent',
        name: 'Parent Task',
        start: '2024-01-01',
        end: '2024-01-31'
      });

      taskManager.createTask({
        id: 'child-1',
        name: 'Child Task 1',
        start: '2024-01-01',
        end: '2024-01-10',
        parentId: 'parent'
      });

      taskManager.createTask({
        id: 'child-2',
        name: 'Child Task 2',
        start: '2024-01-11',
        end: '2024-01-20',
        parentId: 'parent'
      });

      taskManager.createTask({
        id: 'grandchild',
        name: 'Grandchild Task',
        start: '2024-01-11',
        end: '2024-01-15',
        parentId: 'child-1'
      });
    });

    it('should return all descendant tasks', () => {
      const descendants = taskManager.getDescendantTasks('parent');

      expect(descendants).toHaveLength(3);
      expect(descendants.map(t => t.id)).toEqual(expect.arrayContaining(['child-1', 'child-2', 'grandchild']));
    });

    it('should return empty array for task with no descendants', () => {
      const descendants = taskManager.getDescendantTasks('child-2');

      expect(descendants).toHaveLength(0);
    });

    it('should return empty array for non-existent task', () => {
      const descendants = taskManager.getDescendantTasks('non-existent');

      expect(descendants).toHaveLength(0);
    });
  });

  describe('getAncestorTasks', () => {
    beforeEach(() => {
      taskManager.createTask({
        id: 'grandparent',
        name: 'Grandparent Task',
        start: '2024-01-01',
        end: '2024-01-31'
      });

      taskManager.createTask({
        id: 'parent',
        name: 'Parent Task',
        start: '2024-01-01',
        end: '2024-01-20',
        parentId: 'grandparent'
      });

      taskManager.createTask({
        id: 'child',
        name: 'Child Task',
        start: '2024-01-01',
        end: '2024-01-10',
        parentId: 'parent'
      });
    });

    it('should return all ancestor tasks', () => {
      const ancestors = taskManager.getAncestorTasks('child');

      expect(ancestors).toHaveLength(2);
      expect(ancestors[0].id).toBe('parent');
      expect(ancestors[1].id).toBe('grandparent');
    });

    it('should return empty array for task with no ancestors', () => {
      const ancestors = taskManager.getAncestorTasks('grandparent');

      expect(ancestors).toHaveLength(0);
    });
  });

  describe('calculateTaskDuration', () => {
    it('should calculate duration correctly', () => {
      const task: Task = {
        id: 'task-1',
        name: 'Test Task',
        start: '2024-01-01',
        end: '2024-01-05'
      };

      const duration = taskManager.calculateTaskDuration(task);

      expect(duration).toBe(5); // 5 天
    });

    it('should calculate duration for same day', () => {
      const task: Task = {
        id: 'task-1',
        name: 'Test Task',
        start: '2024-01-01',
        end: '2024-01-01'
      };

      const duration = taskManager.calculateTaskDuration(task);

      expect(duration).toBe(1); // 1 天
    });
  });

  describe('calculateProjectProgress', () => {
    beforeEach(() => {
      taskManager.createTask({
        id: 'project-1',
        name: 'Project',
        start: '2024-01-01',
        end: '2024-01-31',
        type: 'project'
      });

      taskManager.createTask({
        id: 'task-1',
        name: 'Task 1',
        start: '2024-01-01',
        end: '2024-01-10',
        progress: 100,
        parentId: 'project-1'
      });

      taskManager.createTask({
        id: 'task-2',
        name: 'Task 2',
        start: '2024-01-11',
        end: '2024-01-20',
        progress: 50,
        parentId: 'project-1'
      });

      taskManager.createTask({
        id: 'task-3',
        name: 'Task 3',
        start: '2024-01-21',
        end: '2024-01-30',
        progress: 0,
        parentId: 'project-1'
      });
    });

    it('should calculate project progress correctly', () => {
      const progress = taskManager.calculateProjectProgress('project-1');

      expect(progress).toBe(50); // (100 + 50 + 0) / 3 = 50
    });

    it('should return 0 for project with no tasks', () => {
      taskManager.createTask({
        id: 'project-2',
        name: 'Empty Project',
        start: '2024-01-01',
        end: '2024-01-31',
        type: 'project'
      });

      const progress = taskManager.calculateProjectProgress('project-2');

      expect(progress).toBe(0);
    });

    it('should return 0 for non-existent project', () => {
      const progress = taskManager.calculateProjectProgress('non-existent');

      expect(progress).toBe(0);
    });
  });
});