import { useEffect, useState, useCallback } from 'react';
import { Plus, Calendar, Flag, Loader2, RefreshCw } from 'lucide-react';
import type { WrikeTask } from '../types/wrike';
import { vscode } from '../utils/vscode';

interface TaskListProps {
    folderId: string;
    onTaskSelect: (taskId: string) => void;
    selectedTaskId: string | null;
}

export function TaskList({ folderId, onTaskSelect, selectedTaskId }: TaskListProps) {
    const [tasks, setTasks] = useState<WrikeTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [showQuickAdd, setShowQuickAdd] = useState(false);

    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [importanceFilter, setImportanceFilter] = useState('All');

    // Batch operation states
    const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
    const [bulkStatus, setBulkStatus] = useState('');
    const [isPolling, setIsPolling] = useState(false);

    const loadTasks = useCallback((isBackground = false) => {
        if (!isBackground) setLoading(true);
        else setIsPolling(true);

        vscode.postMessage({
            command: 'getTasks',
            payload: { folderId }
        });
    }, [folderId]);

    // Initial load and message handling
    useEffect(() => {
        loadTasks();

        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            switch (message.command) {
                case 'getTasksResponse':
                    setTasks(message.payload);
                    setLoading(false);
                    setIsPolling(false);
                    break;
                case 'taskCreated': // Listen for creation success
                    setShowQuickAdd(false);
                    loadTasks(false);
                    break;
                case 'tasksUpdated': // Listen for bulk update success
                    setSelectedTaskIds(new Set());
                    setBulkStatus('');
                    loadTasks(false);
                    break;
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [loadTasks]);

    // Polling (optional, maybe reduce frequency or remove for extension)
    useEffect(() => {
        const interval = setInterval(() => loadTasks(true), 30000);
        return () => clearInterval(interval);
    }, [loadTasks]);


    // Filter tasks logic
    const filteredTasks = tasks.filter(task => {
        const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'All' || task.status === statusFilter;
        const matchesImportance = importanceFilter === 'All' || task.importance === importanceFilter;
        return matchesSearch && matchesStatus && matchesImportance;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    const getImportanceColor = (importance: string) => {
        switch (importance) {
            case 'High':
                return 'text-red-600';
            case 'Low':
                return 'text-gray-500';
            default:
                return 'text-blue-600';
        }
    };

    const toggleTaskSelection = (taskId: string) => {
        const newSelected = new Set(selectedTaskIds);
        if (newSelected.has(taskId)) {
            newSelected.delete(taskId);
        } else {
            newSelected.add(taskId);
        }
        setSelectedTaskIds(newSelected);
    };

    const toggleSelectAll = () => {
        if (selectedTaskIds.size === filteredTasks.length) {
            setSelectedTaskIds(new Set());
        } else {
            setSelectedTaskIds(new Set(filteredTasks.map(t => t.id)));
        }
    };

    const handleBulkUpdate = () => {
        if (!bulkStatus || selectedTaskIds.size === 0) return;

        vscode.postMessage({
            command: 'bulkUpdateTasks',
            payload: {
                taskIds: Array.from(selectedTaskIds),
                updates: { status: bulkStatus }
            }
        });
    };

    return (
        <div className="space-y-4 p-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">Tasks</h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowQuickAdd(!showQuickAdd)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Create Task
                    </button>
                    <button
                        onClick={() => loadTasks(false)}
                        disabled={loading || isPolling}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Refresh tasks"
                    >
                        <RefreshCw className={`w-4 h-4 ${isPolling ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Bulk Action Bar */}
            {selectedTaskIds.size > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-blue-900">
                            {selectedTaskIds.size} task{selectedTaskIds.size > 1 ? 's' : ''} selected
                        </span>
                        <button
                            onClick={() => setSelectedTaskIds(new Set())}
                            className="text-xs text-blue-600 hover:text-blue-800 underline"
                        >
                            Clear selection
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            value={bulkStatus}
                            onChange={(e) => setBulkStatus(e.target.value)}
                            className="px-3 py-1 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">Select status...</option>
                            <option value="Active">Active</option>
                            <option value="Completed">Completed</option>
                            <option value="Deferred">Deferred</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                        <button
                            onClick={handleBulkUpdate}
                            disabled={!bulkStatus}
                            className="px-4 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Update Status
                        </button>
                    </div>
                </div>
            )}

            {/* Filters & Search */}
            <div className="flex flex-col gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <input
                    type="text"
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <div className="flex gap-2">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                        <option value="All">All Statuses</option>
                        <option value="Active">Active</option>
                        <option value="Completed">Completed</option>
                        <option value="Deferred">Deferred</option>
                        <option value="Cancelled">Cancelled</option>
                    </select>
                    <select
                        value={importanceFilter}
                        onChange={(e) => setImportanceFilter(e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                        <option value="All">All Importance</option>
                        <option value="High">High</option>
                        <option value="Normal">Normal</option>
                        <option value="Low">Low</option>
                    </select>
                </div>
            </div>

            {/* Create Task Modal Placeholder */}
            {showQuickAdd && (
                <div className="p-4 bg-yellow-100 text-yellow-800 rounded">
                    Create Task Modal not implemented yet.
                    <button onClick={() => setShowQuickAdd(false)} className="ml-2 underline">Close</button>
                </div>
            )}

            {/* Task List */}
            <div className="space-y-2">
                {filteredTasks.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
                        <p className="text-slate-500">
                            {tasks.length === 0 ? 'No tasks in this folder' : 'No tasks match your filters'}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Select All Checkbox */}
                        {filteredTasks.length > 0 && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
                                <input
                                    type="checkbox"
                                    checked={selectedTaskIds.size === filteredTasks.length && filteredTasks.length > 0}
                                    onChange={toggleSelectAll}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium text-slate-700">
                                    Select All ({filteredTasks.length})
                                </span>
                            </div>
                        )}

                        {filteredTasks.map((task) => (
                            <div
                                key={task.id}
                                className={`flex items-start gap-3 bg-white rounded-lg border p-4 transition-all ${selectedTaskIds.has(task.id)
                                    ? 'border-blue-300 bg-blue-50'
                                    : selectedTaskId === task.id
                                        ? 'border-blue-500 shadow-md ring-2 ring-blue-100'
                                        : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                                    }`}
                            >
                                {/* Checkbox */}
                                <input
                                    type="checkbox"
                                    checked={selectedTaskIds.has(task.id)}
                                    onChange={(e) => {
                                        e.stopPropagation();
                                        toggleTaskSelection(task.id);
                                    }}
                                    className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />

                                {/* Task Content */}
                                <button
                                    onClick={() => onTaskSelect(task.id)}
                                    className="flex-1 text-left"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-slate-900 mb-1 truncate">
                                                {task.title}
                                            </h3>
                                            <div className="flex items-center gap-3 text-sm text-slate-600">
                                                <span className={`flex items-center gap-1 ${getImportanceColor(task.importance)}`}>
                                                    <Flag className="w-3 h-3" />
                                                    {task.importance}
                                                </span>
                                                {task.dates?.due && (
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {task.dates.due}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                                {task.status}
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}
