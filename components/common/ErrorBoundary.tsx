'use client'

import { Component, type ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'

interface State { hasError: boolean; error?: string }

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error.message }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error.message, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-canvas px-6 text-center safe-top">
          <div className="text-5xl mb-5">😵</div>
          <h1 className="text-[20px] font-black text-ink mb-2">앗, 오류가 발생했어요</h1>
          <p className="text-[15px] text-text-muted font-semibold mb-8 leading-relaxed">
            일시적인 문제가 생겼어요.<br />새로고침하면 대부분 해결됩니다.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false })
              window.location.reload()
            }}
            className="btn btn-primary gap-2"
          >
            <RefreshCw size={16} />
            새로고침
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
