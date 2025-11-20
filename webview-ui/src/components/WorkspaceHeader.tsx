import { Table, LayoutGrid, Calendar } from 'lucide-react';
import type { WorkspaceViewType } from '../types/views';

interface ViewButtonProps {
    icon: React.ReactNode;
    label: string;
    active: boolean;
    onClick: () => void;
}

function ViewButton({ icon, label, active, onClick }: ViewButtonProps) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition ${active
                    ? 'bg-white shadow-sm text-primary font-medium'
                    : 'text-secondary hover:text-primary hover:bg-white/50'
                }`}
        >
            {icon}
            <span>{label}</span>
        </button>
    );
}

interface WorkspaceHeaderProps {
    folderName: string;
    activeView: WorkspaceViewType;
    onViewChange: (view: WorkspaceViewType) => void;
    onBack: () => void;
}

export function WorkspaceHeader({
    folderName,
    activeView,
    onViewChange,
    onBack
}: WorkspaceHeaderProps) {
    return (
        <div className="flex items-center justify-between p-6 border-b bg-white shadow-sm">
            <div className="flex items-center gap-4">
                <button
                    onClick={onBack}
                    className="wrike-btn wrike-btn-secondary"
                    title="Back to project selection"
                >
                    ← Back
                </button>
                <h1 className="text-2xl font-bold text-primary">{folderName}</h1>
            </div>

            <div className="flex items-center gap-2 bg-light rounded-lg p-1">
                <ViewButton
                    icon={<Table className="w-4 h-4" />}
                    label="Table"
                    active={activeView === 'table'}
                    onClick={() => onViewChange('table')}
                />
                <ViewButton
                    icon={<LayoutGrid className="w-4 h-4" />}
                    label="Board"
                    active={activeView === 'board'}
                    onClick={() => onViewChange('board')}
                />
                <ViewButton
                    icon={<Calendar className="w-4 h-4" />}
                    label="Gantt"
                    active={activeView === 'gantt'}
                    onClick={() => onViewChange('gantt')}
                />
            </div>
        </div>
    );
}
