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
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDescription, setNewTaskDescription] = useState('');

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

    const handleCreateTask = () => {
        if (!newTaskTitle.trim()) return;

        vscode.postMessage({
            command: 'createTask',
            payload: {
                folderId,
                taskData: {
                    title: newTaskTitle,
                    description: newTaskDescription
                }
            }
        });

        setNewTaskTitle('');
        setNewTaskDescription('');
        setShowQuickAdd(false);
    };

    return (
        <div className="space-y-6 p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Tasks</h2>
                    <p className="text-gray-500 mt-1">Manage your project tasks</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowQuickAdd(!showQuickAdd)}
                        className="wrike-btn wrike-btn-primary gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        New Task
                    </button>
                    <button
                        onClick={() => loadTasks(false)}
                        disabled={loading || isPolling}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                        title="Refresh tasks"
                    >
                        <RefreshCw className={`w-4 h-4 ${isPolling ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Bulk Action Bar */}
            {selectedTaskIds.size > 0 && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-between px-4 py-3 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-blue-700">
                            {selectedTaskIds.size} task{selectedTaskIds.size > 1 ? 's' : ''} selected
                        </span>
                        <button
                            onClick={() => setSelectedTaskIds(new Set())}
                            className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium"
                        >
                            Clear selection
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            value={bulkStatus}
                            onChange={(e) => setBulkStatus(e.target.value)}
                            className="px-3 py-1.5 text-sm border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
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
                            className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Update
                        </button>
                    </div>
                </div>
            )}

            {/* Filters & Search */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <input
                        type="text"
                        placeholder="Search tasks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>
                </div>
                <div className="flex gap-3">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white text-gray-700 cursor-pointer hover:border-gray-300 transition-colors"
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
                        className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white text-gray-700 cursor-pointer hover:border-gray-300 transition-colors"
                    >
                        <option value="All">All Importance</option>
                        <option value="High">High</option>
                        <option value="Normal">Normal</option>
                        <option value="Low">Low</option>
                    </select>
                </div>
            </div>

            {/* Create Task Modal */}
            {showQuickAdd && (
                <div className="wrike-card mb-4">
                    <h3 className="text-lg font-bold text-primary mb-4">Create New Task</h3>
                    <div className="space-y-3">
                        <input
                            type="text"
                            placeholder="Task title"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            className="wrike-input"
                            autoFocus
                        />
                        <textarea
                            placeholder="Description (optional)"
                            value={newTaskDescription}
                            onChange={(e) => setNewTaskDescription(e.target.value)}
                            className="wrike-input min-h-20 resize-y"
                        />
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => {
                                    setShowQuickAdd(false);
                                    setNewTaskTitle('');
                                    setNewTaskDescription('');
                                }}
                                className="wrike-btn wrike-btn-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateTask}
                                disabled={!newTaskTitle.trim()}
                                className="wrike-btn wrike-btn-primary"
                            >
                                Create Task
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-3">
                {filteredTasks.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-200">
                        <div className="text-gray-300 mb-3">
                            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
                        </div>
                        <p className="text-gray-500 font-medium text-lg">
                            {tasks.length === 0 ? 'No tasks in this folder' : 'No tasks match your filters'}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Select All Checkbox */}
                        {filteredTasks.length > 0 && (
                            <div className="flex items-center gap-3 px-4 py-2 text-sm text-gray-500 font-medium">
                                <input
                                    type="checkbox"
                                    checked={selectedTaskIds.size === filteredTasks.length && filteredTasks.length > 0}
                                    onChange={toggleSelectAll}
                                    className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                                />
                                <span>Select All ({filteredTasks.length})</span>
                            </div>
                        )}

                        {filteredTasks.map((task) => (
                            <div
                                key={task.id}
                                className={`bg-white rounded-xl shadow-sm border transition-all hover:shadow-md cursor-pointer group relative overflow-hidden ${selectedTaskId === task.id ? 'ring-2 ring-green-500 border-transparent' : 'border-gray-200'
                                    }`}
                                onClick={() => onTaskSelect(task.id)}
                            >
                                {/* Status Stripe */}
                                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${task.status === 'Completed' ? 'bg-green-500' :
                                    task.status === 'Cancelled' ? 'bg-red-400' :
                                        task.status === 'Deferred' ? 'bg-gray-400' :
                                            'bg-blue-500'
                                    }`}></div>

                                <div className="flex-1 p-4 pl-6 flex items-start gap-4">
                                    <input
                                        type="checkbox"
                                        checked={selectedTaskIds.has(task.id)}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            toggleTaskSelection(task.id);
                                        }}
                                        className="mt-1 w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                                    />

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-4">
                                            <h3 className="font-semibold text-gray-900 mb-1 truncate group-hover:text-blue-600 transition-colors text-lg">
                                                {task.title}
                                            </h3>
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${task.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' :
                                                task.status === 'Active' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                    'bg-gray-50 text-gray-700 border-gray-200'
                                                }`}>
                                                {task.status}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                                            <span className={`flex items-center gap-1 font-medium ${getImportanceColor(task.importance)}`}>
                                                <Flag className="w-3.5 h-3.5" />
                                                {task.importance}
                                            </span>
                                            {task.dates?.due && (
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {new Date(task.dates.due).toLocaleDateString()}
                                                </span>
                                            )}
                                            <span className="text-gray-300">|</span>
                                            <span className="font-mono text-gray-400">ID: {task.id.substring(0, 8)}...</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}
