/**
 * 核心工具函数测试
 */
import { daysBetween, addDays, formatDate, parseDate, debounce, throttle } from './utils';

describe('核心工具函数测试', () => {
  describe('日期处理函数', () => {
    test('daysBetween应该正确计算两个日期之间的天数', () => {
      const start = new Date('2023-01-01');
      const end = new Date('2023-01-10');
      expect(daysBetween(start, end)).toBe(9);
    });

    test('daysBetween应该返回0如果两个日期相同', () => {
      const date = new Date('2023-01-01');
      expect(daysBetween(date, date)).toBe(0);
    });

    test('daysBetween应该处理不同月份的日期', () => {
      const start = new Date('2023-01-28');
      const end = new Date('2023-02-05');
      expect(daysBetween(start, end)).toBe(8);
    });

    test('addDays应该正确添加天数', () => {
      const date = new Date('2023-01-01');
      const result = addDays(date, 5);
      expect(result.getDate()).toBe(6);
    });

    test('addDays应该处理月份变化', () => {
      const date = new Date('2023-01-31');
      const result = addDays(date, 1);
      expect(result.getMonth()).toBe(1); // February
      expect(result.getDate()).toBe(1);
    });

    test('formatDate应该格式化日期为YYYY-MM-DD', () => {
      const date = new Date('2023-01-01');
      expect(formatDate(date)).toBe('2023-01-01');
    });

    test('parseDate应该将字符串转换为日期对象', () => {
      const dateStr = '2023-01-01';
      const result = parseDate(dateStr);
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2023);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(1);
    });

    test('parseDate应该返回原始日期对象如果输入是日期', () => {
      const date = new Date('2023-01-01');
      const result = parseDate(date);
      expect(result).toBe(date);
    });
  });

  describe('其他工具函数', () => {
    test('debounce函数应该延迟执行', async () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn();
      expect(mockFn).not.toHaveBeenCalled();

      // 等待100ms后检查
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    test('debounce函数应该取消之前的调用', async () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn();
      debouncedFn(); // 取消之前的调用

      await new Promise(resolve => setTimeout(resolve, 150));
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    test('throttle函数应该限制执行频率', async () => {
      const mockFn = jest.fn();
      const throttledFn = throttle(mockFn, 100);

      throttledFn();
      throttledFn();
      throttledFn();

      expect(mockFn).toHaveBeenCalledTimes(1);

      // 等待 200ms 后检查，确保所有定时器都已执行完毕
      await new Promise(resolve => setTimeout(resolve, 200));
      expect(mockFn).toHaveBeenCalledTimes(2);

      // 再次调用，确保可以执行
      throttledFn();
      expect(mockFn).toHaveBeenCalledTimes(3);
    });
  });
});