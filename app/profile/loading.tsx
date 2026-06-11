import Skeleton from '@/components/common/Skeleton'

export default function Loading() {
  return (
    <div className="sseuksak-shell">
      {/* Profile hero */}
      <div className="px-5 pt-5 pb-6 bg-canvas-soft">
        <div className="flex items-center gap-4">
          <Skeleton variant="circle" width="64px" height="64px" />
          <div className="flex-1">
            <Skeleton width="130px" height="22px" className="mb-2" />
            <Skeleton width="90px" height="16px" />
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <Skeleton height="56px" />
          <Skeleton height="56px" />
          <Skeleton height="56px" />
        </div>
      </div>
      <div className="px-5 pt-5 pb-28 space-y-4">
        <Skeleton height="76px" />
        <Skeleton height="180px" />
        <Skeleton height="140px" />
      </div>
    </div>
  )
}
