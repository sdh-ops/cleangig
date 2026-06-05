import Link from 'next/link'
import React from 'react'

type Props = {
  icon?: React.ReactNode
  title: string
  description?: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
}

export default function EmptyState({ icon, title, description, actionLabel, actionHref, onAction }: Props) {
  const action = actionLabel && (
    actionHref ? (
      <Link href={actionHref} className="btn btn-primary mt-5 inline-flex">{actionLabel}</Link>
    ) : (
      <button className="btn btn-primary mt-5 inline-flex" onClick={onAction}>{actionLabel}</button>
    )
  )
  return (
    <div className="flex flex-col items-center text-center py-12 px-6">
      {icon && (
        <div className="w-16 h-16 rounded-2xl bg-brand-softer text-brand-dark flex items-center justify-center mb-4 shadow-xs">
          {icon}
        </div>
      )}
      <h3 className="text-[16px] font-extrabold text-ink">{title}</h3>
      {description && (
        <p className="t-caption mt-1.5 max-w-[260px] leading-relaxed">{description}</p>
      )}
      {action}
    </div>
  )
}
