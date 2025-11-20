import { useState, useEffect, useMemo } from 'react';
import { vscode } from '../../utils/vscode';
import type { WrikeTask } from '../../types/wrike';

interface GanttViewProps {
    folderId: string;
    onTaskSelect: (taskId: string) => void;
}

export function GanttView({ folderId, onTaskSelect }: GanttViewProps) {
    const [tasks, setTasks] = useState<WrikeTask[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        vscode.postMessage({ command: 'getTasks', payload: { folderId } });

        const handleMessage = (event: MessageEvent) => {
            if (event.data.command === 'getTasksResponse') {
                setTasks(event.data.payload);
                setLoading(false);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [folderId]);

    const tasksWithDates = useMemo(() => {
        return tasks.filter(t => t.dates?.start && t.dates?.due);
    }, [tasks]);

    const { minDate, maxDate, dayWidth } = useMemo(() => {
        if (tasksWithDates.length === 0) {
            return { minDate: new Date(), maxDate: new Date(), dayWidth: 40 };
        }

        const dates = tasksWithDates.flatMap(t => [
            new Date(t.dates!.start),
            new Date(t.dates!.due)
        ]);

        const min = new Date(Math.min(...dates.map(d => d.getTime())));
        const max = new Date(Math.max(...dates.map(d => d.getTime())));

        return { minDate: min, maxDate: max, dayWidth: 40 };
    }, [tasksWithDates]);

    const getDaysBetween = (start: Date, end: Date) => {
        return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    };

    const getBarPosition = (taskStart: Date, taskEnd: Date) => {
        const startOffset = getDaysBetween(minDate, taskStart);
        const duration = getDaysBetween(taskStart, taskEnd);

        return {
            left: `${startOffset * dayWidth}px`,
            width: `${Math.max(duration * dayWidth, 20)}px`
        };
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin w-8 h-8 border-4 border-green border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (tasksWithDates.length === 0) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <p className="text-secondary mb-2">No tasks with dates found</p>
                    <p className="text-sm text-secondary">Add start and due dates to tasks to view them in Gantt chart</p>
                </div>
            </div>
        );
    }

    const totalDays = getDaysBetween(minDate, maxDate);

    return (
        <div className="p-6 h-full overflow-auto">
            <div className="inline-block min-w-full">
                <div className="flex mb-4 sticky top-0 bg-white z-10 pb-2 border-b">
                    {Array.from({ length: totalDays + 1 }).map((_, i) => {
                        const date = new Date(minDate);
                        date.setDate(date.getDate() + i);
                        return (
                            <div
                                key={i}
                                className="text-xs text-secondary text-center border-l px-1"
                                style={{ width: `${dayWidth}px` }}
                            >
                                <div>{date.getDate()}</div>
                                <div className="text-[10px]">{date.toLocaleDateString('en', { month: 'short' })}</div>
                            </div>
                        );
                    })}
                </div>

                <div className="space-y-3">
                    {tasksWithDates.map(task => {
                        const pos = getBarPosition(new Date(task.dates!.start), new Date(task.dates!.due));
                        const isCompleted = task.status === 'Completed';

                        return (
                            <div key={task.id} className="relative h-12">
                                <div className="absolute top-0 left-0 right-0 flex items-center">
                                    <div className="w-48 pr-4 truncate">
                                        <button
                                            onClick={() => onTaskSelect(task.id)}
                                            className="text-sm font-medium text-primary hover:text-blue transition text-left truncate w-full"
                                        >
                                            {task.title}
                                        </button>
                                    </div>

                                    <div className="relative" style={{ marginLeft: pos.left, width: pos.width }}>
                                        <div className="h-8 bg-blue rounded overflow-hidden relative">
                                            {isCompleted && (
                                                <div className="absolute h-full bg-green" style={{ width: '100%' }} />
                                            )}
                                        </div>
                                        <div className="absolute inset-0 flex items-center justify-center text-xs text-white font-medium">
                                            {task.title.length > 20 ? `${task.title.slice(0, 20)}...` : task.title}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
