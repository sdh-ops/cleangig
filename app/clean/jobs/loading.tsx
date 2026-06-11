import Skeleton from '@/components/common/Skeleton'

export default function Loading() {
  return (
    <div className="sseuksak-shell">
      {/* Header */}
      <div className="flex items-center justify-between h-14 px-4 border-b border-line-soft">
        <Skeleton width="90px" height="22px" />
        <Skeleton width="70px" height="32px" className="rounded-full" />
      </div>
      <div className="flex-1 px-5 pt-4 pb-28">
        {/* Job cards */}
        <div className="space-y-3">
          <Skeleton height="140px" />
          <Skeleton height="140px" />
          <Skeleton height="140px" />
        </div>
      </div>
    </div>
  )
}
