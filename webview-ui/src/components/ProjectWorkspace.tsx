import { useState, useEffect } from 'react';
import { vscode } from '../utils/vscode';
import { WorkspaceHeader } from './WorkspaceHeader';
import { TableView } from './views/TableView';
import { BoardView } from './views/BoardView';
import { GanttView } from './views/GanttView';
import { TaskDetail } from './TaskDetail';
import type { WorkspaceViewType } from '../types/views';
import type { WrikeWorkflow } from '../types/wrike';

interface ProjectWorkspaceProps {
    folderId: string;
    folderName: string;
    activeView: WorkspaceViewType;
    onViewChange: (view: WorkspaceViewType) => void;
    onBack: () => void;
}

export function ProjectWorkspace({
    folderId,
    folderName,
    activeView,
    onViewChange,
    onBack
}: ProjectWorkspaceProps) {
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [workflows, setWorkflows] = useState<WrikeWorkflow[]>([]);
    const [customFields, setCustomFields] = useState<any[]>([]);

    useEffect(() => {
        vscode.postMessage({ command: 'getWorkflows' });
        vscode.postMessage({ command: 'getCustomFields' });

        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            switch (message.command) {
                case 'getWorkflowsResponse':
                    setWorkflows(message.payload);
                    break;
                case 'getCustomFieldsResponse':
                    setCustomFields(message.payload);
                    break;
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const handleTaskSelect = (taskId: string) => {
        setSelectedTaskId(taskId);
    };

    const handleCloseDetail = () => {
        setSelectedTaskId(null);
    };

    return (
        <div className="flex flex-col h-screen">
            <WorkspaceHeader
                folderName={folderName}
                activeView={activeView}
                onViewChange={onViewChange}
                onBack={onBack}
            />

            {selectedTaskId ? (
                <div className="flex-1 overflow-auto">
                    <TaskDetail
                        taskId={selectedTaskId}
                        onClose={handleCloseDetail}
                        customFields={customFields}
                        workflows={workflows}
                    />
                </div>
            ) : (
                <div className="flex-1 overflow-hidden">
                    {activeView === 'table' && (
                        <TableView
                            folderId={folderId}
                            onTaskSelect={handleTaskSelect}
                            selectedTaskId={selectedTaskId}
                        />
                    )}
                    {activeView === 'board' && (
                        <BoardView
                            folderId={folderId}
                            onTaskSelect={handleTaskSelect}
                        />
                    )}
                    {activeView === 'gantt' && (
                        <GanttView
                            folderId={folderId}
                            onTaskSelect={handleTaskSelect}
                        />
                    )}
                </div>
            )}
        </div>
    );
}
