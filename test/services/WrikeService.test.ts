import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WrikeService } from '../../src/services/WrikeService';
import axios from 'axios';

// Mock axios instance
const mockAxiosInstance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    defaults: { headers: { common: {} } }
};

// Mock axios module
vi.mock('axios', () => ({
    default: {
        create: vi.fn(() => mockAxiosInstance)
    }
}));

describe('WrikeService', () => {
    let wrikeService: WrikeService;
    const mockToken = 'test-token';

    beforeEach(() => {
        vi.clearAllMocks();
        wrikeService = new WrikeService(mockToken);
    });

    it('should fetch user profile', async () => {
        const mockResponse = {
            data: {
                data: [{ id: 'user1', firstName: 'John', lastName: 'Doe' }]
            }
        };
        mockAxiosInstance.get.mockResolvedValue(mockResponse);

        const user = await wrikeService.getCurrentUser();
        expect(user).toEqual(mockResponse.data.data[0]);
        expect(mockAxiosInstance.get).toHaveBeenCalledWith(
            '/contacts?me=true'
        );
    });

    it('should fetch spaces', async () => {
        const mockResponse = {
            data: {
                data: [{ id: 'space1', title: 'Space 1' }]
            }
        };
        mockAxiosInstance.get.mockResolvedValue(mockResponse);

        const spaces = await wrikeService.getSpaces();
        expect(spaces).toEqual(mockResponse.data.data);
        expect(mockAxiosInstance.get).toHaveBeenCalledWith(
            '/spaces'
        );
    });

    it('should fetch folders', async () => {
        const mockResponse = {
            data: {
                data: [{ id: 'folder1', title: 'Folder 1' }]
            }
        };
        mockAxiosInstance.get.mockResolvedValue(mockResponse);

        const folders = await wrikeService.getFolders('space1');
        expect(folders).toEqual(mockResponse.data.data);
        expect(mockAxiosInstance.get).toHaveBeenCalledWith(
            '/spaces/space1/folders'
        );
    });

    it('should fetch tasks', async () => {
        const mockResponse = {
            data: {
                data: [{ id: 'task1', title: 'Task 1' }]
            }
        };
        mockAxiosInstance.get.mockResolvedValue(mockResponse);

        const tasks = await wrikeService.getTasks('folder1');
        expect(tasks).toEqual(mockResponse.data.data);
        expect(mockAxiosInstance.get).toHaveBeenCalledWith(
            expect.stringContaining('/folders/folder1/tasks?fields=')
        );
    });
});
