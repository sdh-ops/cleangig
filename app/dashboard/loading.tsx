import React from 'react'
import Skeleton from '@/components/common/Skeleton'

export default function Loading() {
    return (
        <div className="bg-background-light dark:bg-background-dark min-h-screen flex justify-center w-full">
            <div className="relative flex h-full w-full max-w-md flex-col overflow-hidden pb-[72px] px-4">
                {/* Header Skeleton */}
                <div className="flex items-center justify-between py-4 mb-6 pt-6">
                    <Skeleton width="100px" height="24px" />
                    <Skeleton variant="circle" width="32px" height="32px" />
                </div>

                {/* Banner Skeleton */}
                <Skeleton height="140px" className="mb-6" />

                {/* Stats Skeleton */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <Skeleton height="80px" />
                    <Skeleton height="80px" />
                </div>

                {/* List Title Skeleton */}
                <div className="flex justify-between items-center mb-4">
                    <Skeleton width="120px" height="20px" />
                    <Skeleton width="60px" height="14px" />
                </div>

                {/* List Item Skeletons */}
                <div className="space-y-4">
                    <Skeleton height="80px" />
                    <Skeleton height="80px" />
                    <Skeleton height="80px" />
                </div>
            </div>
        </div>
    )
}
