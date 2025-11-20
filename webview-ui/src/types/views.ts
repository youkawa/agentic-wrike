export type ViewMode = 'projectSelector' | 'workspace';
export type WorkspaceViewType = 'table' | 'board' | 'gantt';

export interface ProjectInfo {
    id: string;
    name: string;
    type: 'space' | 'folder';
}
