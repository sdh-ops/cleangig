import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="bg-background-light dark:bg-background-dark min-h-screen flex flex-col items-center justify-center font-display text-slate-900 dark:text-slate-100 max-w-md mx-auto relative px-6 text-center">
            <div className="mb-6 flex items-center justify-center w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500">
                <span className="material-symbols-outlined text-5xl">sentiment_dissatisfied</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight mb-2">404</h1>
            <h2 className="text-xl font-bold mb-4">페이지를 찾을 수 없습니다</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-xs leading-relaxed">
                접근하려는 페이지의 주소가 잘못되었거나, 페이지가 삭제/이동되었습니다. 다시 한 번 확인해주세요.
            </p>

            <Link
                href="/"
                className="w-full max-w-[200px] h-14 bg-primary text-white font-bold rounded-xl flex items-center justify-center hover:bg-primary/90 transition-colors shadow-sm"
            >
                홈으로 돌아가기
            </Link>
        </div>
    );
}
