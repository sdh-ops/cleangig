import Skeleton from '@/components/common/Skeleton'

export default function Loading() {
  return (
    <div className="sseuksak-shell">
      {/* Header */}
      <div className="flex items-center justify-between h-14 px-4 border-b border-line-soft">
        <Skeleton width="90px" height="22px" />
        <Skeleton variant="circle" width="34px" height="34px" />
      </div>
      <div className="flex-1 px-5 pt-4 pb-28">
        {/* Space cards */}
        <div className="space-y-3">
          <Skeleton height="150px" />
          <Skeleton height="150px" />
          <Skeleton height="150px" />
        </div>
      </div>
    </div>
  )
}
