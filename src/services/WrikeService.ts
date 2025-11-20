import { WrikeResponse, WrikeUser, WrikeSpace, WrikeFolder, WrikeTask, CreateTaskPayload, UpdateTaskPayload, WrikeWorkflow, WrikeCustomFieldDef, WrikeAttachment } from '../types/wrike';

export class WrikeService {
    private baseUrl = 'https://www.wrike.com/api/v4';
    private token: string;

    constructor(token: string) {
        this.token = token;
    }

    private async request<T>(method: string, path: string, body?: any, headers: Record<string, string> = {}): Promise<T> {
        const url = `${this.baseUrl}${path}`;
        const defaultHeaders = {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json',
            ...headers
        };

        const response = await fetch(url, {
            method,
            headers: defaultHeaders,
            body: body ? (headers['Content-Type'] === 'application/octet-stream' ? body : JSON.stringify(body)) : undefined
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Wrike API Error: ${response.status} ${response.statusText}`, errorText);
            throw new Error(`Wrike API Error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json() as WrikeResponse<T[]>;
        return data.data as any as T;
    }

    async getCurrentUser(): Promise<WrikeUser> {
        const data = await this.request<WrikeUser[]>('GET', '/contacts?me=true');
        return data[0];
    }

    async getContacts(): Promise<WrikeUser[]> {
        return await this.request<WrikeUser[]>('GET', '/contacts');
    }

    async getSpaces(): Promise<WrikeSpace[]> {
        return await this.request<WrikeSpace[]>('GET', '/spaces');
    }

    async getFolders(spaceId: string): Promise<WrikeFolder[]> {
        return await this.request<WrikeFolder[]>('GET', `/spaces/${spaceId}/folders`);
    }

    async getFolder(folderId: string): Promise<WrikeFolder> {
        const data = await this.request<WrikeFolder[]>('GET', `/folders/${folderId}`);
        return data[0];
    }

    async getTasks(folderId: string): Promise<WrikeTask[]> {
        const fields = JSON.stringify([
            "description",
            "responsibleIds",
            "customFields",
            "briefDescription",
            "attachmentCount",
            "subTaskIds",
            "superTaskIds",
            "metadata",
            "hasAttachments"
        ]);

        // Add descendants=true to get tasks from subfolders as well
        const params = `fields=${encodeURIComponent(fields)}&descendants=true`;
        return await this.request<WrikeTask[]>('GET', `/folders/${folderId}/tasks?${params}`);
    }

    async getTask(taskId: string): Promise<WrikeTask> {
        const data = await this.request<WrikeTask[]>('GET', `/tasks/${taskId}`);
        return data[0];
    }

    async createTask(folderId: string, payload: CreateTaskPayload): Promise<WrikeTask> {
        const data = await this.request<WrikeTask[]>('POST', `/folders/${folderId}/tasks`, payload);
        return data[0];
    }

    async updateTask(taskId: string, updates: UpdateTaskPayload): Promise<WrikeTask> {
        const data = await this.request<WrikeTask[]>('PUT', `/tasks/${taskId}`, updates);
        return data[0];
    }

    async getCustomFields(): Promise<WrikeCustomFieldDef[]> {
        return await this.request<WrikeCustomFieldDef[]>('GET', '/customfields');
    }

    async getWorkflows(): Promise<WrikeWorkflow[]> {
        return await this.request<WrikeWorkflow[]>('GET', '/workflows');
    }

    async getAttachments(taskId: string): Promise<WrikeAttachment[]> {
        return await this.request<WrikeAttachment[]>('GET', `/tasks/${taskId}/attachments`);
    }

    async uploadAttachment(taskId: string, fileName: string, fileData: Buffer): Promise<void> {
        const headers = {
            'X-File-Name': fileName,
            'Content-Type': 'application/octet-stream'
        };
        // For binary upload, we pass the buffer directly
        await this.request('POST', `/tasks/${taskId}/attachments`, fileData, headers);
    }
}
