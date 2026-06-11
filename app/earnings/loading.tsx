import Skeleton from '@/components/common/Skeleton'

export default function Loading() {
  return (
    <div className="sseuksak-shell">
      {/* Header */}
      <div className="flex items-center h-14 px-4 border-b border-line-soft">
        <Skeleton width="90px" height="22px" />
      </div>
      <div className="flex-1 px-5 pt-4 pb-28">
        {/* Summary card */}
        <Skeleton height="120px" className="mb-4" />
        {/* Stat row */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Skeleton height="72px" />
          <Skeleton height="72px" />
        </div>
        {/* Payment list */}
        <div className="space-y-3">
          <Skeleton height="80px" />
          <Skeleton height="80px" />
          <Skeleton height="80px" />
        </div>
      </div>
    </div>
  )
}
