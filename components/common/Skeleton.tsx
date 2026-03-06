'use client'

import React from 'react'

interface SkeletonProps {
    className?: string
    variant?: 'text' | 'rect' | 'circle'
    width?: string | number
    height?: string | number
}

export default function Skeleton({ className = '', variant = 'rect', width, height }: SkeletonProps) {
    const baseClass = "animate-pulse bg-slate-200 dark:bg-slate-700"
    const variantClass =
        variant === 'circle' ? "rounded-full" :
            variant === 'text' ? "rounded h-4 mb-2" : "rounded-xl"

    return (
        <div
            className={`${baseClass} ${variantClass} ${className}`}
            style={{
                width: width || (variant === 'text' ? '100%' : undefined),
                height: height || (variant === 'text' ? undefined : '100%')
            }}
        />
    )
}
