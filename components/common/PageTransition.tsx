'use client';

export default function PageTransition({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen flex flex-col animate-fade-in">
            {children}
        </div>
    );
}
