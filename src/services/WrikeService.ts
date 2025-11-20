import axios, { AxiosInstance } from 'axios';
import { WrikeResponse, WrikeUser, WrikeSpace, WrikeFolder, WrikeTask, CreateTaskPayload, UpdateTaskPayload, WrikeWorkflow, WrikeCustomFieldDef, WrikeAttachment } from '../types/wrike';

export class WrikeService {
    private client: AxiosInstance;
    private baseUrl = 'https://www.wrike.com/api/v4';

    constructor(token: string) {
        this.client = axios.create({
            baseURL: this.baseUrl,
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
    }

    async getCurrentUser(): Promise<WrikeUser> {
        const response = await this.client.get<WrikeResponse<WrikeUser[]>>('/contacts?me=true');
        return response.data.data[0];
    }

    async getContacts(): Promise<WrikeUser[]> {
        const response = await this.client.get<WrikeResponse<WrikeUser[]>>('/contacts');
        return response.data.data;
    }

    async getSpaces(): Promise<WrikeSpace[]> {
        const response = await this.client.get<WrikeResponse<WrikeSpace[]>>('/spaces');
        return response.data.data;
    }

    async getFolders(spaceId: string): Promise<WrikeFolder[]> {
        const response = await this.client.get<WrikeResponse<WrikeFolder[]>>(`/spaces/${spaceId}/folders`);
        return response.data.data;
    }

    async getFolder(folderId: string): Promise<WrikeFolder> {
        const response = await this.client.get<WrikeResponse<WrikeFolder[]>>(`/folders/${folderId}`);
        return response.data.data[0];
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
            "customStatusId",
            "hasAttachments"
        ]);
        const response = await this.client.get<WrikeResponse<WrikeTask[]>>(`/folders/${folderId}/tasks?fields=${fields}`);
        return response.data.data;
    }

    async getTask(taskId: string): Promise<WrikeTask> {
        const response = await this.client.get<WrikeResponse<WrikeTask[]>>(`/tasks/${taskId}`);
        return response.data.data[0];
    }

    async createTask(folderId: string, payload: CreateTaskPayload): Promise<WrikeTask> {
        const response = await this.client.post<WrikeResponse<WrikeTask[]>>(`/folders/${folderId}/tasks`, payload);
        return response.data.data[0];
    }

    async updateTask(taskId: string, updates: UpdateTaskPayload): Promise<WrikeTask> {
        const response = await this.client.put<WrikeResponse<WrikeTask[]>>(`/tasks/${taskId}`, updates);
        return response.data.data[0];
    }

    async getCustomFields(): Promise<WrikeCustomFieldDef[]> {
        const response = await this.client.get<WrikeResponse<WrikeCustomFieldDef[]>>('/customfields');
        return response.data.data;
    }

    async getWorkflows(): Promise<WrikeWorkflow[]> {
        const response = await this.client.get<WrikeResponse<WrikeWorkflow[]>>('/workflows');
        return response.data.data;
    }

    async getAttachments(taskId: string): Promise<WrikeAttachment[]> {
        // Note: WrikeAttachment type needs to be defined in types/wrike.ts
        // For now assuming it exists or using any
        const response = await this.client.get<WrikeResponse<any[]>>(`/tasks/${taskId}/attachments`);
        return response.data.data;
    }

    async uploadAttachment(taskId: string, fileName: string, fileData: Buffer): Promise<void> {
        const headers = {
            'X-File-Name': fileName,
            'Content-Type': 'application/octet-stream'
        };
        await this.client.post(`/tasks/${taskId}/attachments`, fileData, { headers });
    }
}
