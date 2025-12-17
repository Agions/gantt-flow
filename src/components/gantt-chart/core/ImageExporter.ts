/**
 * 甘特图图片导出工具类
 * 提供将甘特图导出为PNG或PDF的功能
 */

import { Task, ViewMode } from './types';

export interface ExportOptions {
  /** 文件名（不含扩展名） */
  fileName?: string;
  /** 背景颜色 */
  backgroundColor?: string;
  /** 是否包含图例 */
  includeLegend?: boolean;
  /** 是否包含页眉（标题等） */
  includeHeader?: boolean;
  /** 自定义页眉文本 */
  headerText?: string;
  /** 自定义水印文本 */
  watermarkText?: string;
  /** 图表宽度，为空则使用当前视图宽度 */
  width?: number;
  /** 图表高度，为空则使用当前视图高度 */
  height?: number;
  /** 像素比例，用于控制图像质量 */
  pixelRatio?: number;
  /** 是否裁剪空白区域 */
  cropWhitespace?: boolean;
}

/**
 * 甘特图导出工具类
 * 提供将甘特图导出为PNG或PDF的功能
 */
export class ImageExporter {
  /** 甘特图容器元素 */
  private container: HTMLElement;
  /** 默认导出选项 */
  private defaultOptions: ExportOptions = {
    fileName: 'gantt-chart',
    backgroundColor: '#ffffff',
    includeLegend: true,
    includeHeader: true,
    headerText: '甘特图',
    pixelRatio: window.devicePixelRatio || 1,
    cropWhitespace: true
  };

  /**
   * 创建一个新的图片导出器
   * @param container 甘特图容器元素
   */
  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * 导出为PNG图片
   * @param options 导出选项
   * @returns Promise<void> 导出完成的Promise
   */
  public async exportAsPNG(options: ExportOptions = {}): Promise<void> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const canvas = await this.createCanvas(mergedOptions);
    this.downloadImage(canvas, `${mergedOptions.fileName}.png`, 'image/png');
  }

  /**
   * 导出为JPEG图片
   * @param options 导出选项
   * @param quality JPEG质量 (0-1)
   * @returns Promise<void> 导出完成的Promise
   */
  public async exportAsJPEG(options: ExportOptions = {}, quality: number = 0.9): Promise<void> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const canvas = await this.createCanvas(mergedOptions);
    this.downloadImage(canvas, `${mergedOptions.fileName}.jpg`, 'image/jpeg', quality);
  }

  /**
   * 导出为PDF文档
   * @param options 导出选项
   * @returns Promise<void> 导出完成的Promise
   */
  public async exportAsPDF(options: ExportOptions = {}): Promise<void> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const canvas = await this.createCanvas(mergedOptions);
    
    try {
      // 尝试使用动态导入加载jsPDF
      const { jsPDF } = await import('jspdf');
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`${mergedOptions.fileName}.pdf`);
    } catch (error) {
      console.warn('使用jsPDF导出PDF失败，将使用浏览器打印功能');
      this.exportAsPNG(options);
    }
  }

  /**
   * 创建包含甘特图的Canvas元素
   * @param options 导出选项
   * @returns Promise<HTMLCanvasElement> 包含甘特图的Canvas元素
   */
  private async createCanvas(options: ExportOptions): Promise<HTMLCanvasElement> {
    const { width, height, pixelRatio, backgroundColor, includeHeader, headerText, watermarkText } = options;
    
    // 克隆节点以避免修改原始DOM
    const clonedContainer = this.container.cloneNode(true) as HTMLElement;
    
    // 设置尺寸
    const containerWidth = width || this.container.offsetWidth;
    const containerHeight = height || this.container.offsetHeight;
    
    // 创建Canvas
    const canvas = document.createElement('canvas');
    canvas.width = containerWidth * pixelRatio!;
    canvas.height = containerHeight * pixelRatio!;
    const ctx = canvas.getContext('2d')!;
    
    // 缩放以支持高DPI显示
    ctx.scale(pixelRatio!, pixelRatio!);
    
    // 绘制背景
    ctx.fillStyle = backgroundColor!;
    ctx.fillRect(0, 0, containerWidth, containerHeight);
    
    // 准备克隆的容器用于绘制
    document.body.appendChild(clonedContainer);
    clonedContainer.style.position = 'absolute';
    clonedContainer.style.top = '-9999px';
    clonedContainer.style.left = '-9999px';
    clonedContainer.style.width = `${containerWidth}px`;
    clonedContainer.style.height = `${containerHeight}px`;
    clonedContainer.style.overflow = 'hidden';
    
    // 使用html2canvas或类似库将DOM转换为Canvas
    // 这里使用内联SVG和foreignObject来实现简单的HTML渲染到Canvas
    try {
      const svgData = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${containerWidth}" height="${containerHeight}">
          <foreignObject width="100%" height="100%">
            ${new XMLSerializer().serializeToString(clonedContainer)}
          </foreignObject>
        </svg>
      `;
      
      const img = new Image();
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      await new Promise<void>((resolve) => {
        img.onload = () => {
          ctx.drawImage(img, 0, 0, containerWidth, containerHeight);
          
          // 添加页眉
          if (includeHeader && headerText) {
            ctx.fillStyle = '#333333';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(headerText, containerWidth / 2, 20);
          }
          
          // 添加水印
          if (watermarkText) {
            ctx.save();
            ctx.globalAlpha = 0.1;
            ctx.fillStyle = '#000000';
            ctx.font = '24px Arial';
            ctx.translate(containerWidth / 2, containerHeight / 2);
            ctx.rotate(-Math.PI / 6);
            ctx.textAlign = 'center';
            ctx.fillText(watermarkText, 0, 0);
            ctx.restore();
          }
          
          URL.revokeObjectURL(url);
          resolve();
        };
        img.src = url;
      });
    } finally {
      // 清理临时DOM元素
      if (document.body.contains(clonedContainer)) {
        document.body.removeChild(clonedContainer);
      }
    }
    
    return canvas;
  }

  /**
   * 下载Canvas为图片
   * @param canvas Canvas元素
   * @param fileName 文件名
   * @param mimeType MIME类型
   * @param quality 图片质量 (仅用于JPEG)
   */
  private downloadImage(
    canvas: HTMLCanvasElement, 
    fileName: string, 
    mimeType: string = 'image/png', 
    quality: number = 0.95
  ): void {
    const dataUrl = canvas.toDataURL(mimeType, quality);
    const link = document.createElement('a');
    link.download = fileName;
    link.href = dataUrl;
    link.click();
  }

  /**
   * 获取当前可见任务
   * @param tasks 所有任务
   * @param viewMode 当前视图模式
   * @returns 可见的任务数组
   */
  private getVisibleTasks(tasks: Task[], viewMode: ViewMode): Task[] {
    // 实际实现时，需要根据当前滚动位置和视图模式来确定可见任务
    // 这里只是一个简单的实现，实际应用中需要更复杂的逻辑
    return tasks;
  }
}

// 导出默认的实例创建函数
export default function createImageExporter(container: HTMLElement): ImageExporter {
  return new ImageExporter(container);
} 