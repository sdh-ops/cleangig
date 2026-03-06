'use client';

import React, { useState } from 'react';

interface CalendarEvent {
    id: string;
    date: Date;
    title: string;
    status?: string;
    color?: string;
    link?: string;
}

interface Props {
    events: CalendarEvent[];
    onEventClick?: (id: string) => void;
}

const CalendarView = ({ events, onEventClick }: Props) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    const totalDays = daysInMonth(year, month);
    const startDay = firstDayOfMonth(year, month);

    const calendarDays = [];
    // Previous month padding
    for (let i = 0; i < startDay; i++) {
        calendarDays.push(null);
    }
    // Current month days
    for (let i = 1; i <= totalDays; i++) {
        calendarDays.push(i);
    }

    const getEventsForDay = (day: number) => {
        return events.filter(e =>
            e.date.getFullYear() === year &&
            e.date.getMonth() === month &&
            e.date.getDate() === day
        );
    };

    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            {/* Calendar Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-50 dark:border-slate-800">
                <button onClick={prevMonth} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
                    <span className="material-symbols-outlined text-slate-400">chevron_left</span>
                </button>
                <h3 className="text-lg font-black tracking-tight">{year}년 {month + 1}월</h3>
                <button onClick={nextMonth} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
                    <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                </button>
            </div>

            {/* Week Header */}
            <div className="grid grid-cols-7 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                {dayNames.map((d, i) => (
                    <div key={d} className={`py-2 text-center text-[10px] font-bold ${i === 0 ? 'text-rose-500' : i === 6 ? 'text-blue-500' : 'text-slate-400'}`}>
                        {d}
                    </div>
                ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 auto-rows-[80px]">
                {calendarDays.map((day, idx) => {
                    const dayEvents = day ? getEventsForDay(day) : [];
                    const isToday = day &&
                        new Date().getDate() === day &&
                        new Date().getMonth() === month &&
                        new Date().getFullYear() === year;

                    return (
                        <div
                            key={idx}
                            className={`border-r border-b border-slate-50 dark:border-slate-800 p-1 flex flex-col gap-1 overflow-hidden ${day ? '' : 'bg-slate-50/20 dark:bg-slate-800/10'}`}
                        >
                            {day && (
                                <>
                                    <div className="flex justify-between items-center mb-0.5">
                                        <span className={`text-[11px] font-bold flex items-center justify-center size-5 rounded-full ${isToday ? 'bg-primary text-white' : (idx % 7 === 0 ? 'text-rose-500' : idx % 7 === 6 ? 'text-blue-500' : 'text-slate-600 dark:text-slate-400')}`}>
                                            {day}
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-0.5 overflow-y-auto scrollbar-none">
                                        {dayEvents.slice(0, 3).map(e => (
                                            <div
                                                key={e.id}
                                                onClick={() => onEventClick?.(e.id)}
                                                className={`text-[9px] px-1 py-0.5 rounded-sm truncate cursor-pointer font-bold border-l-2 leading-tight ${e.color || 'bg-primary/10 text-primary border-primary'}`}
                                            >
                                                {e.title}
                                            </div>
                                        ))}
                                        {dayEvents.length > 3 && (
                                            <div className="text-[8px] text-slate-400 font-bold pl-1">+{dayEvents.length - 3}건 더보기</div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CalendarView;
