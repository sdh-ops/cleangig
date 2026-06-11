import Skeleton from '@/components/common/Skeleton'

export default function Loading() {
  return (
    <div className="sseuksak-shell">
      <div className="flex items-center h-14 px-4 border-b border-line-soft gap-3">
        <Skeleton width="32px" height="32px" className="rounded-full" />
        <Skeleton width="120px" height="20px" />
      </div>
      <div className="flex-1 px-5 pt-4 pb-28 flex flex-col gap-4">
        <Skeleton height="100px" />
        <Skeleton height="160px" />
        <Skeleton height="80px" />
        <Skeleton height="120px" />
      </div>
    </div>
  )
}
