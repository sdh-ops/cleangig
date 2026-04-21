'use client'

import { useRouter } from 'next/navigation'
import PullToRefresh from '@/components/common/PullToRefresh'

export default function RequestsRefreshBridge() {
  const router = useRouter()
  return <PullToRefresh onRefresh={() => router.refresh()} />
}
