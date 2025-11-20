// Type definitions for Wrike API v4 responses

export interface WrikeResponse<T> {
    kind: string;
    data: T; // Always array, even for single items
}

export interface WrikeFolder {
    id: string;
    title: string;
    childIds: string[];
    scope: 'WsFolder' | 'RbFolder';
    project?: {
        authorId: string;
        ownerIds: string[];
        status: 'Green' | 'Yellow' | 'Red' | 'Completed';
        startDate?: string;
        endDate?: string;
    };
}

export interface WrikeSpace {
    id: string;
    title: string;
    avatarUrl?: string;
    accessType: 'Personal' | 'Public' | 'Private';
}

export interface WrikeTask {
    id: string;
    title: string;
    description?: string;
    status: string;
    customStatusId?: string;
    importance: 'High' | 'Normal' | 'Low';
    dates?: {
        type: 'Planned' | 'Milestone' | 'Backlog';
        start?: string; // YYYY-MM-DD
        due?: string;   // YYYY-MM-DD
        duration?: number;
    };
    customFields?: Array<{ id: string; value: string }>;
    responsibleIds?: string[];
    permalink?: string;
}

export interface WrikeCustomFieldDef {
    id: string;
    title: string;
    type: 'Text' | 'Numeric' | 'Currency' | 'Date' | 'DropDown' | 'Multiple';
    settings?: {
        decimalPlaces?: number;
        currencySymbol?: string;
        options?: Array<{ id: string; value: string; color?: string }>;
    };
}

export interface WrikeWorkflow {
    id: string;
    name: string;
    standard: boolean;
    customStatuses: Array<{
        id: string;
        name: string;
        standardName: boolean;
        color: string;
        group: 'Active' | 'Completed' | 'Deferred' | 'Cancelled';
    }>;
}

export interface WrikeUser {
    id: string;
    firstName: string;
    lastName: string;
    type: 'Person' | 'Group';
    profiles?: Array<{
        accountId: string;
        email?: string;
        role: string;
    }>;
}

export interface CreateTaskPayload {
    title: string;
    description?: string;
    status?: string;
    importance?: 'High' | 'Normal' | 'Low';
    dates?: {
        type: 'Planned' | 'Milestone' | 'Backlog';
        start?: string;
        due?: string;
        duration?: number;
    };
    responsibles?: string[];
}

export interface UpdateTaskPayload {
    title?: string;
    description?: string;
    status?: string;
    customStatusId?: string;
    importance?: 'High' | 'Normal' | 'Low';
    dates?: {
        type: 'Planned' | 'Milestone' | 'Backlog';
        start?: string;
        due?: string;
        duration?: number;
    };
    addResponsibles?: string[];
    removeResponsibles?: string[];
    customFields?: Array<{ id: string; value: string }>;
}

export interface WrikeAttachment {
    id: string;
    authorId: string;
    name: string;
    createdDate: string;
    version: number;
    type: string; // 'File' | 'Google' | 'Box' | 'Dropbox' | 'OneDrive' | 'SharePoint' | 'Wrike' | 'Box' | 'YouTube' | 'External'
    contentType: string;
    size: number;
    taskId?: string;
    folderId?: string;
    commentId?: string;
    url?: string; // For external attachments
}
