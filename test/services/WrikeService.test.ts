import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WrikeService } from '../../src/services/WrikeService';

describe('WrikeService', () => {
    let service: WrikeService;
    const token = 'test-token';

    // Mock global fetch
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    beforeEach(() => {
        vi.clearAllMocks();
        service = new WrikeService(token);
    });

    const mockResponse = (data: any) => {
        fetchMock.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ kind: 'response', data: data })
        });
    };

    it('should get current user', async () => {
        const mockUser = { id: 'user1', firstName: 'John', lastName: 'Doe' };
        mockResponse([mockUser]);

        const user = await service.getCurrentUser();

        expect(fetchMock).toHaveBeenCalledWith(
            'https://www.wrike.com/api/v4/contacts?me=true',
            expect.objectContaining({
                method: 'GET',
                headers: expect.objectContaining({
                    'Authorization': `Bearer ${token}`
                })
            })
        );
        expect(user).toEqual(mockUser);
    });

    it('should get tasks', async () => {
        const mockTasks = [{ id: 'task1', title: 'Task 1' }];
        mockResponse(mockTasks);

        const tasks = await service.getTasks('folder1');

        expect(fetchMock).toHaveBeenCalledWith(
            expect.stringContaining('/folders/folder1/tasks'),
            expect.objectContaining({ method: 'GET' })
        );
        expect(tasks).toEqual(mockTasks);
    });

    it('should create task', async () => {
        const mockTask = { id: 'task1', title: 'New Task' };
        mockResponse([mockTask]);

        const payload = { title: 'New Task', status: 'Active' };
        const task = await service.createTask('folder1', payload);

        expect(fetchMock).toHaveBeenCalledWith(
            'https://www.wrike.com/api/v4/folders/folder1/tasks',
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify(payload)
            })
        );
        expect(task).toEqual(mockTask);
    });

    it('should handle errors', async () => {
        fetchMock.mockResolvedValue({
            ok: false,
            status: 401,
            statusText: 'Unauthorized'
        });

        await expect(service.getTasks('folder1')).rejects.toThrow('Wrike API Error: 401 Unauthorized');
    });
});
