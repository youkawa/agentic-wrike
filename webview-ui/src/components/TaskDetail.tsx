import { useEffect, useState, useRef } from 'react';
import { X, Loader2, Calendar, Flag, FileText, User, Edit2, Check } from 'lucide-react';
import type { WrikeTask, WrikeCustomFieldDef, WrikeWorkflow, WrikeUser, WrikeAttachment } from '../types/wrike';
import { vscode } from '../utils/vscode';

interface TaskDetailProps {
    taskId: string;
    onClose: () => void;
    customFields: WrikeCustomFieldDef[];
    workflows: WrikeWorkflow[];
}

export function TaskDetail({ taskId, onClose, customFields, workflows }: TaskDetailProps) {
    const [task, setTask] = useState<WrikeTask | null>(null);
    const [loading, setLoading] = useState(true);
    const [contacts, setContacts] = useState<WrikeUser[]>([]);
    const [attachments, setAttachments] = useState<WrikeAttachment[]>([]);
    const [isUpdating, setIsUpdating] = useState(false);

    // Editing states
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editedTitle, setEditedTitle] = useState('');
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [editedDescription, setEditedDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [dueDate, setDueDate] = useState('');
    const titleInputRef = useRef<HTMLInputElement>(null);

    const loadData = () => {
        setLoading(true);
        vscode.postMessage({ command: 'getTask', payload: { taskId } });
        vscode.postMessage({ command: 'getContacts' });
        vscode.postMessage({ command: 'getAttachments', payload: { taskId } });
    };

    useEffect(() => {
        loadData();

        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            switch (message.command) {
                case 'getTaskResponse':
                    if (message.payload.id === taskId) {
                        setTask(message.payload);
                        setLoading(false);
                        setIsUpdating(false);
                    }
                    break;
                case 'getContactsResponse':
                    setContacts(message.payload);
                    break;
                case 'getAttachmentsResponse':
                    setAttachments(message.payload);
                    break;
                case 'taskUpdated':
                    if (message.payload.id === taskId) {
                        setTask(message.payload);
                        setIsUpdating(false);
                    }
                    break;
                case 'attachmentUploaded':
                    vscode.postMessage({ command: 'getAttachments', payload: { taskId } });
                    break;
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [taskId]);

    // Initialize dates when task loads
    useEffect(() => {
        if (task) {
            setEditedTitle(task.title);
            setEditedDescription(task.description || '');
            setStartDate(task.dates?.start || '');
            setDueDate(task.dates?.due || '');
        }
    }, [task]);

    // Focus title input when editing starts
    useEffect(() => {
        if (isEditingTitle && titleInputRef.current) {
            titleInputRef.current.focus();
        }
    }, [isEditingTitle]);

    if (loading || !task) {
        return (
            <div className="fixed inset-0 lg:right-0 lg:left-auto lg:w-96 bg-white shadow-2xl lg:border-l border-slate-200 flex items-center justify-center z-50">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    // Find the task's workflow or fallback to standard workflow
    const taskWorkflow = task.customStatusId
        ? workflows.find(w => w.customStatuses?.some(s => s.id === task.customStatusId))
        : undefined;

    // If no workflow found (orphaned task), use the standard workflow as fallback
    const selectedWorkflow = taskWorkflow || workflows.find(w => w.standard) || workflows[0];

    // Get statuses from the selected workflow
    const availableStatuses = selectedWorkflow
        ? selectedWorkflow.customStatuses.map(status => ({
            id: status.id,
            name: status.name,
            color: status.color,
            group: status.group,
        }))
        : [];

    // Create a map of custom field IDs to definitions
    const customFieldMap = Object.fromEntries(
        customFields.map((field) => [field.id, field])
    );

    const updateTask = (updates: any) => {
        setIsUpdating(true);
        vscode.postMessage({
            command: 'updateTask',
            payload: { taskId, updates }
        });
    };

    const handleStatusChange = (customStatusId: string) => {
        const status = availableStatuses.find(s => s.id === customStatusId);

        if (selectedWorkflow?.standard) {
            updateTask({ status: status?.group || 'Active' });
        } else {
            updateTask({
                customStatusId,
                // workflowId might be needed depending on API, but usually customStatusId is enough if unique
            });
        }
    };

    const handleCustomFieldChange = (fieldId: string, value: string) => {
        updateTask({
            customFields: [{ id: fieldId, value }]
        });
    };

    const handleAssigneeChange = (userId: string, isSelected: boolean) => {
        if (isSelected) {
            updateTask({ addResponsibles: [userId] });
        } else {
            updateTask({ removeResponsibles: [userId] });
        }
    };

    const handleTitleSave = () => {
        if (editedTitle.trim() && editedTitle !== task?.title) {
            updateTask({ title: editedTitle.trim() });
        }
        setIsEditingTitle(false);
    };

    const handleDescriptionSave = () => {
        if (editedDescription !== task?.description) {
            updateTask({ description: editedDescription });
        }
        setIsEditingDescription(false);
    };

    const handleDateChange = (type: 'start' | 'due', value: string) => {
        if (type === 'start') {
            setStartDate(value);
            updateTask({ dates: { start: value, due: dueDate || value } }); // Ensure due date is present
        } else {
            setDueDate(value);
            updateTask({ dates: { start: startDate || value, due: value } });
        }
    };

    const handleImportanceChange = (importance: 'High' | 'Normal' | 'Low') => {
        updateTask({ importance });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUpdating(true);

        const reader = new FileReader();
        reader.onload = () => {
            const arrayBuffer = reader.result as ArrayBuffer;
            // Convert to base64 for transport
            const base64 = btoa(
                new Uint8Array(arrayBuffer)
                    .reduce((data, byte) => data + String.fromCharCode(byte), '')
            );

            vscode.postMessage({
                command: 'uploadAttachment',
                payload: {
                    taskId,
                    fileName: file.name,
                    fileData: base64
                }
            });
        };
        reader.readAsArrayBuffer(file);
    };

    return (
        <div className="fixed inset-0 lg:right-0 lg:left-auto lg:w-96 bg-white shadow-2xl lg:border-l border-slate-200 flex flex-col animate-slide-in z-50">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">Task Details</h2>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    <X className="w-5 h-5 text-slate-600" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Editable Title */}
                <div>
                    {isEditingTitle ? (
                        <div className="flex items-center gap-2">
                            <input
                                ref={titleInputRef}
                                type="text"
                                value={editedTitle}
                                onChange={(e) => setEditedTitle(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleTitleSave();
                                    if (e.key === 'Escape') setIsEditingTitle(false);
                                }}
                                className="flex-1 text-xl font-bold text-slate-900 border-b-2 border-blue-500 focus:outline-none"
                            />
                            <button
                                onClick={handleTitleSave}
                                className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                            >
                                <Check className="w-5 h-5" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-start gap-2 group">
                            <h3 className="flex-1 text-xl font-bold text-slate-900">{task.title}</h3>
                            <button
                                onClick={() => setIsEditingTitle(true)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-all"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                    {task.permalink && (
                        <a
                            href={task.permalink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-700 underline"
                        >
                            Open in Wrike
                        </a>
                    )}
                </div>

                {/* Editable Importance */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        <Flag className="w-4 h-4 inline mr-1" />
                        Importance
                    </label>
                    <select
                        value={task.importance}
                        onChange={(e) => handleImportanceChange(e.target.value as 'High' | 'Normal' | 'Low')}
                        disabled={isUpdating}
                        className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 font-medium ${task.importance === 'High'
                            ? 'text-red-800'
                            : task.importance === 'Low'
                                ? 'text-gray-800'
                                : 'text-blue-800'
                            }`}
                    >
                        <option value="High">High</option>
                        <option value="Normal">Normal</option>
                        <option value="Low">Low</option>
                    </select>
                </div>

                {/* Assignees */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        <User className="w-4 h-4 inline mr-1" />
                        Assignees
                    </label>
                    <div className="space-y-2 border border-slate-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                        {contacts.map(user => {
                            const isAssigned = task.responsibleIds?.includes(user.id);
                            return (
                                <label key={user.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 p-1 rounded">
                                    <input
                                        type="checkbox"
                                        checked={isAssigned || false}
                                        onChange={(e) => handleAssigneeChange(user.id, e.target.checked)}
                                        disabled={isUpdating}
                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className={isAssigned ? 'font-medium text-slate-900' : 'text-slate-600'}>
                                        {user.firstName} {user.lastName}
                                    </span>
                                </label>
                            );
                        })}
                        {contacts.length === 0 && <p className="text-sm text-slate-500">No contacts available</p>}
                    </div>
                </div>

                {/* Editable Dates - Native HTML5 Inputs */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        Dates
                    </label>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs text-slate-600 mb-1">Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => handleDateChange('start', e.target.value)}
                                disabled={isUpdating}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:opacity-50 text-slate-900"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-600 mb-1">Due Date</label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => handleDateChange('due', e.target.value)}
                                min={startDate || undefined}
                                disabled={isUpdating}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:opacity-50 text-slate-900"
                            />
                        </div>
                    </div>
                </div>

                {/* Status */}
                <div>
                    <label htmlFor="status" className="block text-sm font-medium text-slate-700 mb-2">
                        Status
                        {selectedWorkflow && (
                            <span className="ml-2 text-xs text-slate-500">
                                ({selectedWorkflow.name})
                            </span>
                        )}
                    </label>
                    <select
                        id="status"
                        value={task.customStatusId || ''}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        disabled={isUpdating}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 text-slate-900"
                    >
                        <option value="">Select status</option>
                        {availableStatuses.map((status) => (
                            <option key={status.id} value={status.id}>
                                {status.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Editable Description */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        <FileText className="w-4 h-4 inline mr-1" />
                        Description
                    </label>
                    {isEditingDescription ? (
                        <div className="space-y-2">
                            <textarea
                                value={editedDescription}
                                onChange={(e) => setEditedDescription(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                                rows={6}
                                placeholder="Add a description..."
                            />
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setIsEditingDescription(false)}
                                    className="px-3 py-1 text-sm text-slate-600 hover:bg-slate-100 rounded transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDescriptionSave}
                                    className="px-3 py-1 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div
                            onClick={() => setIsEditingDescription(true)}
                            className="cursor-pointer text-sm text-slate-600 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors min-h-[60px]"
                        >
                            {task.description || <span className="text-slate-400">Click to add description...</span>}
                        </div>
                    )}
                </div>

                {/* Custom Fields */}
                {task.customFields && task.customFields.length > 0 && (
                    <div>
                        <h4 className="text-sm font-medium text-slate-700 mb-3">Custom Fields</h4>
                        <div className="space-y-3">
                            {task.customFields.map((field) => {
                                const fieldDef = customFieldMap[field.id];
                                if (!fieldDef) return null;

                                return (
                                    <div key={field.id}>
                                        <label htmlFor={`field-${field.id}`} className="block text-sm font-medium text-slate-700 mb-1">
                                            {fieldDef.title}
                                        </label>
                                        {fieldDef.type === 'DropDown' && fieldDef.settings?.options ? (
                                            <select
                                                id={`field-${field.id}`}
                                                value={field.value || ''}
                                                onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                                                disabled={isUpdating}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 text-sm"
                                            >
                                                <option value="">Select option</option>
                                                {fieldDef.settings.options.map((option) => (
                                                    <option key={option.id} value={option.value}>
                                                        {option.value}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : fieldDef.type === 'Numeric' ? (
                                            <input
                                                type="number"
                                                id={`field-${field.id}`}
                                                value={field.value || ''}
                                                onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                                                disabled={isUpdating}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 text-sm"
                                                placeholder={`Enter ${fieldDef.title.toLowerCase()}`}
                                            />
                                        ) : (
                                            <input
                                                type="text"
                                                id={`field-${field.id}`}
                                                value={field.value || ''}
                                                onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                                                disabled={isUpdating}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 text-sm"
                                                placeholder={`Enter ${fieldDef.title.toLowerCase()}`}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Attachments */}
                <div>
                    <h4 className="text-sm font-medium text-slate-700 mb-3">Attachments</h4>

                    {attachments.length > 0 && (
                        <div className="space-y-2 mb-4">
                            {attachments.map((att) => (
                                <div key={att.id} className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200 text-sm">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                        <span className="truncate text-slate-700" title={att.name}>{att.name}</span>
                                    </div>
                                    <span className="text-xs text-slate-500 flex-shrink-0 ml-2">
                                        {(att.size / 1024).toFixed(1)} KB
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <input
                                type="file"
                                onChange={handleFileUpload}
                                disabled={isUpdating}
                                className="block w-full text-sm text-slate-500
                                    file:mr-4 file:py-2 file:px-4
                                    file:rounded-full file:border-0
                                    file:text-sm file:font-semibold
                                    file:bg-blue-50 file:text-blue-700
                                    hover:file:bg-blue-100"
                            />
                        </div>
                    </div>
                </div>

                {isUpdating && (
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Updating...
                    </div>
                )}
            </div>
        </div>
    );
}
