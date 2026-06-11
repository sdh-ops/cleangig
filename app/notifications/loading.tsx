import Skeleton from '@/components/common/Skeleton'

export default function Loading() {
  return (
    <div className="sseuksak-shell">
      <div className="flex items-center h-14 px-4 border-b border-line-soft">
        <Skeleton width="80px" height="22px" />
      </div>
      <div className="flex-1 px-5 pt-4 pb-28 flex flex-col gap-2.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card p-4 flex items-start gap-3">
            <Skeleton width="40px" height="40px" className="rounded-full shrink-0" />
            <div className="flex-1 flex flex-col gap-1.5">
              <Skeleton width="60%" height="16px" />
              <Skeleton width="90%" height="14px" />
              <Skeleton width="40%" height="13px" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
