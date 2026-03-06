import React from 'react'
import Skeleton from '@/components/common/Skeleton'

export default function Loading() {
    return (
        <div className="bg-background-light dark:bg-background-dark min-h-screen flex justify-center w-full">
            <div className="relative flex h-full w-full max-w-md flex-col overflow-hidden pb-[72px] px-4">
                {/* Profile Header Skeleton */}
                <div className="flex items-center gap-4 py-8 mt-4">
                    <Skeleton variant="circle" width="60px" height="60px" />
                    <div className="flex-1">
                        <Skeleton width="120px" height="24px" className="mb-2" />
                        <Skeleton width="80px" height="16px" />
                    </div>
                </div>

                {/* Summary Card Skeleton */}
                <Skeleton height="120px" className="mb-8" />

                {/* Tabs/Categories Skeleton */}
                <div className="flex gap-4 mb-6">
                    <Skeleton width="80px" height="32px" className="rounded-full" />
                    <Skeleton width="80px" height="32px" className="rounded-full" />
                    <Skeleton width="80px" height="32px" className="rounded-full" />
                </div>

                {/* Job List Skeletons */}
                <div className="space-y-4">
                    <Skeleton height="160px" />
                    <Skeleton height="160px" />
                </div>
            </div>
        </div>
    )
}
