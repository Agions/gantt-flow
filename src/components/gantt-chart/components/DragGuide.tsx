import React from 'react';

interface ThemeConfig {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
  taskBackground: string;
  taskBorder: string;
  [key: string]: string;
}

interface DragGuideProps {
  theme: ThemeConfig;
  snapPoints: {
    x: number[];
    y: number[];
  };
  currentPosition: {
    x: number;
    y: number;
  };
  showGuides: boolean;
}

export const DragGuide: React.FC<DragGuideProps> = ({
  theme,
  snapPoints,
  currentPosition,
  showGuides
}) => {
  const SNAP_THRESHOLD = 5; // 磁吸阈值（像素）
  
  // 查找最近的磁吸点
  const findNearestSnapPoint = (position: number, points: number[]) => {
    return points.reduce((nearest, point) => {
      const distance = Math.abs(position - point);
      if (distance < SNAP_THRESHOLD && distance < Math.abs(position - nearest)) {
        return point;
      }
      return nearest;
    }, position);
  };
  
  // 计算需要显示的辅助线
  const getGuideLines = () => {
    if (!showGuides) return { vertical: [], horizontal: [] };
    
    const vertical = snapPoints.x
      .filter(x => Math.abs(x - currentPosition.x) < SNAP_THRESHOLD)
      .map(x => ({
        position: x,
        start: 0,
        end: '100%'
      }));
      
    const horizontal = snapPoints.y
      .filter(y => Math.abs(y - currentPosition.y) < SNAP_THRESHOLD)
      .map(y => ({
        position: y,
        start: 0,
        end: '100%'
      }));
      
    return { vertical, horizontal };
  };
  
  const { vertical, horizontal } = getGuideLines();
  
  return (
    <div className="drag-guides" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
      {/* 垂直辅助线 */}
      {vertical.map((line, index) => (
        <div
          key={`v-${index}`}
          style={{
            position: 'absolute',
            left: line.position,
            top: line.start,
            height: line.end,
            width: '1px',
            backgroundColor: theme.primary,
            opacity: 0.5,
            boxShadow: `0 0 2px ${theme.primary}`,
            transition: 'opacity 0.3s ease'
          }}
        />
      ))}
      
      {/* 水平辅助线 */}
      {horizontal.map((line, index) => (
        <div
          key={`h-${index}`}
          style={{
            position: 'absolute',
            top: line.position,
            left: line.start,
            width: line.end,
            height: '1px',
            backgroundColor: theme.primary,
            opacity: 0.5,
            boxShadow: `0 0 2px ${theme.primary}`,
            transition: 'opacity 0.3s ease'
          }}
        />
      ))}
      
      {/* 磁吸点指示器 */}
      {(vertical.length > 0 || horizontal.length > 0) && (
        <div
          style={{
            position: 'absolute',
            left: findNearestSnapPoint(currentPosition.x, snapPoints.x),
            top: findNearestSnapPoint(currentPosition.y, snapPoints.y),
            width: 10,
            height: 10,
            backgroundColor: theme.primary,
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            opacity: 0.8,
            transition: 'all 0.3s ease'
          }}
        />
      )}
    </div>
  );
}; 