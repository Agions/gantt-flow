/**
 * ErrorBoundary.tsx
 * React 错误边界组件，用于捕获子组件树中的 JavaScript 错误
 * @module ErrorBoundary
 */
import React, { Component, ErrorInfo, ReactNode } from "react"

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * 错误边界组件
 * 捕获子组件树中的 JavaScript 错误，记录错误，并显示备用 UI
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // 更新 state 使下一次渲染能够显示降级后的 UI
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 可以将错误日志上报给服务器
    console.error("ErrorBoundary caught an error:", error, errorInfo)

    // 调用自定义错误处理函数
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // 自定义降级 UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // 默认错误 UI
      return (
        <div className='gantt-error-boundary'>
          <div className='gantt-error-content'>
            <h2 className='gantt-error-title'>出错了</h2>
            <p className='gantt-error-message'>
              甘特图组件遇到了一个错误。请刷新页面或联系技术支持。
            </p>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className='gantt-error-details'>
                <summary>错误详情</summary>
                <pre className='gantt-error-stack'>
                  {this.state.error.toString()}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            <button
              className='gantt-error-retry'
              onClick={() => window.location.reload()}
            >
              刷新页面
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * 函数式错误边界 Hook
 * 用于在函数组件中捕获错误
 */
export function useErrorHandler() {
  const handleError = (error: Error, errorInfo?: ErrorInfo) => {
    console.error("Error caught by error handler:", error, errorInfo)

    // 这里可以添加错误上报逻辑
    // 例如：sendErrorToServer(error, errorInfo);
  }

  return { handleError }
}

/**
 * 默认错误 UI 组件
 */
export function DefaultErrorFallback({
  error,
  resetError,
}: {
  error: Error | null
  resetError: () => void
}) {
  return (
    <div className='gantt-error-fallback'>
      <div className='gantt-error-icon'>⚠️</div>
      <h3 className='gantt-error-heading'>组件加载失败</h3>
      <p className='gantt-error-text'>{error?.message || "发生未知错误"}</p>
      <div className='gantt-error-actions'>
        <button className='gantt-error-button primary' onClick={resetError}>
          重试
        </button>
        <button
          className='gantt-error-button secondary'
          onClick={() => window.location.reload()}
        >
          刷新页面
        </button>
      </div>
    </div>
  )
}

export default ErrorBoundary
