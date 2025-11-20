import { useEffect, useState, useRef } from 'react';
import { X, Loader2, FileText, Edit2, Check } from 'lucide-react';
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
        <div className="fixed inset-y-0 right-0 w-full lg:w-[480px] bg-white shadow-2xl border-l border-gray-200 flex flex-col animate-in slide-in-from-right duration-300 z-50">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-bold text-gray-900">Task Details</h2>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-white rounded-full transition-colors text-gray-500 hover:text-gray-900 hover:shadow-sm"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Editable Title */}
                <div className="group">
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
                                className="w-full text-xl font-bold px-2 py-1 border-b-2 border-blue-500 focus:outline-none bg-transparent"
                            />
                            <button
                                onClick={handleTitleSave}
                                className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                                <Check className="w-5 h-5" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-start gap-2">
                            <h3
                                className="flex-1 text-xl font-bold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
                                onClick={() => setIsEditingTitle(true)}
                            >
                                {task.title}
                            </h3>
                            <button
                                onClick={() => setIsEditingTitle(true)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-blue-600 transition-all"
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
                            className="text-sm text-blue-600 hover:underline mt-1 inline-block font-medium"
                        >
                            Open in Wrike
                        </a>
                    )}
                </div>

                {/* Status & Importance Grid */}
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                            Status
                        </label>
                        <select
                            value={task.customStatusId || ''}
                            onChange={(e) => handleStatusChange(e.target.value)}
                            disabled={isUpdating}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
                        >
                            <option value="">Select status</option>
                            {availableStatuses.map((status) => (
                                <option key={status.id} value={status.id}>
                                    {status.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                            Importance
                        </label>
                        <select
                            value={task.importance}
                            onChange={(e) => handleImportanceChange(e.target.value as 'High' | 'Normal' | 'Low')}
                            disabled={isUpdating}
                            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium ${task.importance === 'High'
                                ? 'text-red-600'
                                : task.importance === 'Low'
                                    ? 'text-gray-500'
                                    : 'text-blue-600'
                                }`}
                        >
                            <option value="High">High</option>
                            <option value="Normal">Normal</option>
                            <option value="Low">Low</option>
                        </select>
                    </div>
                </div>

                {/* Assignees */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                        Assignees
                    </label>
                    <div className="bg-white border border-gray-200 rounded-lg p-3 max-h-40 overflow-y-auto space-y-1 shadow-sm">
                        {contacts.map(user => {
                            const isAssigned = task.responsibleIds?.includes(user.id);
                            return (
                                <label key={user.id} className="flex items-center gap-3 text-sm cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={isAssigned || false}
                                        onChange={(e) => handleAssigneeChange(user.id, e.target.checked)}
                                        disabled={isUpdating}
                                        className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                    />
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-700">
                                            {user.firstName[0]}{user.lastName[0]}
                                        </div>
                                        <span className={isAssigned ? 'font-medium text-gray-900' : 'text-gray-600'}>
                                            {user.firstName} {user.lastName}
                                        </span>
                                    </div>
                                </label>
                            );
                        })}
                        {contacts.length === 0 && <p className="text-sm text-gray-500 italic">No contacts available</p>}
                    </div>
                </div>

                {/* Dates */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                        Dates
                    </label>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1.5 font-medium">Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => handleDateChange('start', e.target.value)}
                                disabled={isUpdating}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1.5 font-medium">Due Date</label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => handleDateChange('due', e.target.value)}
                                min={startDate || undefined}
                                disabled={isUpdating}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                        Description
                    </label>
                    {isEditingDescription ? (
                        <div className="space-y-3 animate-in fade-in">
                            <textarea
                                value={editedDescription}
                                onChange={(e) => setEditedDescription(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px] resize-y text-sm"
                                placeholder="Add a description..."
                            />
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setIsEditingDescription(false)}
                                    className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-md transition-colors text-sm font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDescriptionSave}
                                    className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div
                            onClick={() => setIsEditingDescription(true)}
                            className="bg-white border border-gray-200 rounded-lg p-4 min-h-[100px] cursor-pointer hover:border-blue-400 hover:shadow-sm transition-all"
                        >
                            {task.description ? (
                                <div className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">{task.description}</div>
                            ) : (
                                <span className="text-gray-400 text-sm italic">Click to add description...</span>
                            )}
                        </div>
                    )}
                </div>

                {/* Custom Fields */}
                {task.customFields && task.customFields.length > 0 && (
                    <div>
                        <h4 className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Custom Fields</h4>
                        <div className="space-y-4">
                            {task.customFields.map((field) => {
                                const fieldDef = customFieldMap[field.id];
                                if (!fieldDef) return null;

                                return (
                                    <div key={field.id}>
                                        <label htmlFor={`field-${field.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                                            {fieldDef.title}
                                        </label>
                                        {fieldDef.type === 'DropDown' && fieldDef.settings?.options ? (
                                            <select
                                                id={`field-${field.id}`}
                                                value={field.value || ''}
                                                onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                                                disabled={isUpdating}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                            >
                                                <option value="">Select option</option>
                                                {fieldDef.settings.options.map((option) => (
                                                    <option key={option.id} value={option.value}>
                                                        {option.value}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input
                                                type={fieldDef.type === 'Numeric' ? 'number' : 'text'}
                                                id={`field-${field.id}`}
                                                value={field.value || ''}
                                                onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                                                disabled={isUpdating}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
                    <h4 className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Attachments</h4>

                    {attachments.length > 0 && (
                        <div className="space-y-2 mb-4">
                            {attachments.map((att) => (
                                <div key={att.id} className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between text-sm hover:shadow-sm transition-shadow">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="p-2 bg-blue-50 rounded text-blue-600">
                                            <FileText className="w-4 h-4" />
                                        </div>
                                        <span className="truncate font-medium text-gray-700" title={att.name}>{att.name}</span>
                                    </div>
                                    <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                                        {(att.size / 1024).toFixed(1)} KB
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="relative">
                        <input
                            type="file"
                            onChange={handleFileUpload}
                            disabled={isUpdating}
                            className="block w-full text-sm text-gray-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-md file:border-0
                                file:text-sm file:font-semibold
                                file:bg-blue-50 file:text-blue-700
                                hover:file:bg-blue-100 cursor-pointer"
                        />
                    </div>
                </div>

                {isUpdating && (
                    <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm animate-in fade-in slide-in-from-bottom-4 z-50">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving changes...
                    </div>
                )}
            </div>
        </div>
    );
}
