import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthManager } from '../../src/auth/AuthManager';
import * as vscode from 'vscode';

// Mock vscode
vi.mock('vscode', () => {
    const secretStorage = new Map<string, string>();
    return {
        ExtensionContext: class { },
        secrets: {
            store: vi.fn((key, value) => Promise.resolve(secretStorage.set(key, value))),
            get: vi.fn((key) => Promise.resolve(secretStorage.get(key))),
            delete: vi.fn((key) => Promise.resolve(secretStorage.delete(key))),
            onDidChange: vi.fn(),
        },
        window: {
            showInputBox: vi.fn(),
            showInformationMessage: vi.fn(),
        }
    };
});

describe('AuthManager', () => {
    let authManager: AuthManager;
    let mockContext: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockContext = {
            secrets: {
                store: vi.fn(),
                get: vi.fn(),
                delete: vi.fn(),
                onDidChange: vi.fn(),
            }
        };
        authManager = new AuthManager(mockContext);
    });

    it('should get token if it exists', async () => {
        mockContext.secrets.get.mockResolvedValue('test-token');
        const token = await authManager.getToken();
        expect(token).toBe('test-token');
        expect(mockContext.secrets.get).toHaveBeenCalledWith('wrike.pat');
    });

    it('should return undefined if token does not exist', async () => {
        mockContext.secrets.get.mockResolvedValue(undefined);
        const token = await authManager.getToken();
        expect(token).toBeUndefined();
    });

    it('should set token', async () => {
        await authManager.setToken('new-token');
        expect(mockContext.secrets.store).toHaveBeenCalledWith('wrike.pat', 'new-token');
    });

    it('should delete token', async () => {
        await authManager.deleteToken();
        expect(mockContext.secrets.delete).toHaveBeenCalledWith('wrike.pat');
    });
});
