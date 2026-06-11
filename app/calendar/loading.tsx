import Skeleton from '@/components/common/Skeleton'

export default function Loading() {
  return (
    <div className="sseuksak-shell">
      {/* Header */}
      <div className="flex items-center justify-between h-14 px-4 border-b border-line-soft">
        <Skeleton width="110px" height="22px" />
        <div className="flex gap-2">
          <Skeleton variant="circle" width="32px" height="32px" />
          <Skeleton variant="circle" width="32px" height="32px" />
        </div>
      </div>
      <div className="flex-1 px-5 pt-4 pb-28">
        {/* Month grid */}
        <Skeleton height="280px" className="mb-5" />
        {/* Day list */}
        <div className="space-y-3">
          <Skeleton height="90px" />
          <Skeleton height="90px" />
        </div>
      </div>
    </div>
  )
}
