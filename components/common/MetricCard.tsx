import React from 'react'

type Props = {
  label: string
  value: string | number
  unit?: string
  delta?: { value: number; positive?: boolean; label?: string }
  icon?: React.ReactNode
  tone?: 'default' | 'brand' | 'ink'
}

export default function MetricCard({ label, value, unit, delta, icon, tone = 'default' }: Props) {
  const bg =
    tone === 'brand' ? 'bg-brand text-white' : tone === 'ink' ? 'bg-ink text-white' : 'bg-surface'
  const labelCls = tone === 'default' ? 'text-text-soft' : 'text-white/70'
  const valueCls = tone === 'default' ? 'text-ink' : 'text-white'
  const borderCls = tone === 'default' ? 'border border-line-soft' : ''
  return (
    <div className={`${bg} ${borderCls} rounded-2xl p-4 shadow-xs`}>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-bold ${labelCls}`}>{label}</span>
        {icon && <div className="opacity-70">{icon}</div>}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className={`t-money text-2xl ${valueCls}`}>{value}</span>
        {unit && <span className={`text-xs font-bold ${labelCls}`}>{unit}</span>}
      </div>
      {delta && (
        <div className="mt-1 text-[11px] font-bold">
          <span className={delta.positive ? 'text-success' : 'text-danger'}>
            {delta.positive ? '▲' : '▼'} {Math.abs(delta.value)}%
          </span>
          {delta.label && <span className={`ml-1.5 ${labelCls}`}>{delta.label}</span>}
        </div>
      )}
    </div>
  )
}
