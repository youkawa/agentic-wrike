// TableView is a wrapper around the existing TaskList component
import { TaskList } from '../TaskList';

interface TableViewProps {
    folderId: string;
    onTaskSelect: (taskId: string) => void;
    selectedTaskId: string | null;
}

export function TableView({ folderId, onTaskSelect, selectedTaskId }: TableViewProps) {
    return <TaskList folderId={folderId} onTaskSelect={onTaskSelect} selectedTaskId={selectedTaskId} />;
}
