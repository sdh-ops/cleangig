export default function Loading() {
    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col items-center justify-center p-4">
            <div className="relative">
                <div className="w-16 h-16 border-4 border-primary/20 rounded-full"></div>
                <div className="w-16 h-16 border-4 border-primary rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary">
                    <span className="material-symbols-outlined text-[24px]">cleaning_services</span>
                </div>
            </div>
            <p className="mt-4 text-slate-500 dark:text-slate-400 font-bold text-sm animate-pulse">
                실시간 데이터를 불러오는 중...
            </p>
        </div>
    );
}
