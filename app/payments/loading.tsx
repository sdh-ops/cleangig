import Skeleton from '@/components/common/Skeleton'

export default function Loading() {
  return (
    <div className="sseuksak-shell">
      <div className="flex items-center h-14 px-4 border-b border-line-soft">
        <Skeleton width="80px" height="22px" />
      </div>
      <div className="flex-1 px-5 pt-4 pb-28">
        <div className="grid grid-cols-2 gap-3 mb-5">
          <Skeleton height="72px" />
          <Skeleton height="72px" />
        </div>
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-4 flex items-center gap-3">
              <Skeleton width="44px" height="44px" className="rounded-xl shrink-0" />
              <div className="flex-1 flex flex-col gap-1.5">
                <Skeleton width="50%" height="15px" />
                <Skeleton width="70%" height="14px" />
                <Skeleton width="40%" height="13px" />
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <Skeleton width="70px" height="16px" />
                <Skeleton width="50px" height="13px" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
