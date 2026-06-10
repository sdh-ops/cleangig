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
  const isDark = tone === 'brand' || tone === 'ink'

  const containerCls =
    tone === 'brand'
      ? 'bg-gradient-to-br from-brand to-brand-dark text-white shadow-brand-sm'
      : tone === 'ink'
      ? 'bg-ink text-white'
      : 'bg-surface border border-line-soft shadow-xs'

  const labelCls = isDark ? 'text-white/65' : 'text-text-soft'
  const valueCls = isDark ? 'text-white' : 'text-ink'
  const iconCls = isDark ? 'bg-white/15 text-white' : 'bg-brand-softer text-brand-dark'

  return (
    <div className={`${containerCls} rounded-2xl p-4 relative overflow-hidden`}>
      {/* Subtle inner texture for dark cards */}
      {isDark && (
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '14px 14px' }}
        />
      )}

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <span className={`text-[13.5px] font-bold ${labelCls}`}>{label}</span>
          {icon && (
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconCls}`}>
              {icon}
            </div>
          )}
        </div>

        <div className="flex items-baseline gap-1 mt-1">
          <span className={`num-display text-[28px] leading-none ${valueCls}`}>{value}</span>
          {unit && <span className={`text-[15px] font-bold ${labelCls}`}>{unit}</span>}
        </div>

        {delta && (
          <div className="mt-1.5 text-[13.5px] font-bold">
            <span className={delta.positive ? (isDark ? 'text-brand-light' : 'text-success') : (isDark ? 'text-white/60' : 'text-danger')}>
              {delta.positive ? '▲' : '▼'} {Math.abs(delta.value)}%
            </span>
            {delta.label && (
              <span className={`ml-1.5 ${labelCls}`}>{delta.label}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
