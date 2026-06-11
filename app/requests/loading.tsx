import Skeleton from '@/components/common/Skeleton'

export default function Loading() {
  return (
    <div className="sseuksak-shell">
      {/* Header */}
      <div className="flex items-center h-14 px-4 border-b border-line-soft">
        <Skeleton width="90px" height="22px" />
      </div>
      <div className="flex-1 px-5 pt-4 pb-28">
        {/* Filter chips */}
        <div className="flex gap-2 mb-5">
          <Skeleton width="64px" height="32px" className="rounded-full" />
          <Skeleton width="64px" height="32px" className="rounded-full" />
          <Skeleton width="64px" height="32px" className="rounded-full" />
        </div>
        {/* Job cards */}
        <div className="space-y-3">
          <Skeleton height="120px" />
          <Skeleton height="120px" />
          <Skeleton height="120px" />
        </div>
      </div>
    </div>
  )
}
