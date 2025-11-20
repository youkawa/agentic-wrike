import { useState, useEffect, useMemo } from 'react';
import { vscode } from '../../utils/vscode';
import type { WrikeTask, WrikeWorkflow } from '../../types/wrike';

interface BoardViewProps {
    folderId: string;
    onTaskSelect: (taskId: string) => void;
}

interface Column {
    id: string;
    name: string;
    color: string;
    tasks: WrikeTask[];
}

export function BoardView({ folderId, onTaskSelect }: BoardViewProps) {
    const [tasks, setTasks] = useState<WrikeTask[]>([]);
    const [workflows, setWorkflows] = useState<WrikeWorkflow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        vscode.postMessage({ command: 'getTasks', payload: { folderId } });
        vscode.postMessage({ command: 'getWorkflows' });

        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            switch (message.command) {
                case 'getTasksResponse':
                    setTasks(message.payload);
                    setLoading(false);
                    break;
                case 'getWorkflowsResponse':
                    setWorkflows(message.payload);
                    break;
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [folderId]);

    const columns = useMemo(() => {
        const cols: Column[] = [];

        workflows.forEach(workflow => {
            workflow.customStatuses.forEach(status => {
                cols.push({
                    id: status.id,
                    name: status.name,
                    color: status.color || '#1890ff',
                    tasks: tasks.filter(t => t.customStatusId === status.id)
                });
            });
        });

        return cols;
    }, [tasks, workflows]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin w-8 h-8 border-4 border-green border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="flex gap-4 p-6 overflow-x-auto h-full">
            {columns.map(column => (
                <div key={column.id} className="flex-shrink-0 w-80 wrike-card flex flex-col max-h-full">
                    <div className="flex items-center justify-between p-4 border-b">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: column.color }}></div>
                            <h3 className="font-bold text-primary">{column.name}</h3>
                        </div>
                        <span className="text-sm text-secondary">{column.tasks.length}</span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {column.tasks.map(task => (
                            <button
                                key={task.id}
                                onClick={() => onTaskSelect(task.id)}
                                className="w-full wrike-card p-4 text-left hover:shadow-md transition"
                            >
                                <h4 className="font-medium text-primary mb-2">{task.title}</h4>
                                {task.briefDescription && (
                                    <p className="text-sm text-secondary truncate">{task.briefDescription}</p>
                                )}
                                <div className="flex items-center gap-2 mt-3 text-xs text-secondary">
                                    {task.importance && (
                                        <span className={`px-2 py-1 rounded ${task.importance === 'High' ? 'bg-red-50 text-red' :
                                                task.importance === 'Normal' ? 'bg-blue-50 text-blue' :
                                                    'bg-gray-50 text-gray'
                                            }`}>
                                            {task.importance}
                                        </span>
                                    )}
                                </div>
                            </button>
                        ))}
                        {column.tasks.length === 0 && (
                            <p className="text-center text-secondary py-8 text-sm">No tasks</p>
                        )}
                    </div>
                </div>
            ))}

            {columns.length === 0 && (
                <div className="flex items-center justify-center w-full">
                    <p className="text-secondary">No workflows configured</p>
                </div>
            )}
        </div>
    );
}
