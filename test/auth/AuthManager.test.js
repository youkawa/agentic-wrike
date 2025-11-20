"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const AuthManager_1 = require("../../src/auth/AuthManager");
// Mock vscode
vitest_1.vi.mock('vscode', () => {
    const secretStorage = new Map();
    return {
        ExtensionContext: class {
        },
        secrets: {
            store: vitest_1.vi.fn((key, value) => Promise.resolve(secretStorage.set(key, value))),
            get: vitest_1.vi.fn((key) => Promise.resolve(secretStorage.get(key))),
            delete: vitest_1.vi.fn((key) => Promise.resolve(secretStorage.delete(key))),
            onDidChange: vitest_1.vi.fn(),
        },
        window: {
            showInputBox: vitest_1.vi.fn(),
            showInformationMessage: vitest_1.vi.fn(),
        }
    };
});
(0, vitest_1.describe)('AuthManager', () => {
    let authManager;
    let mockContext;
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        mockContext = {
            secrets: {
                store: vitest_1.vi.fn(),
                get: vitest_1.vi.fn(),
                delete: vitest_1.vi.fn(),
                onDidChange: vitest_1.vi.fn(),
            }
        };
        authManager = new AuthManager_1.AuthManager(mockContext);
    });
    (0, vitest_1.it)('should get token if it exists', async () => {
        mockContext.secrets.get.mockResolvedValue('test-token');
        const token = await authManager.getToken();
        (0, vitest_1.expect)(token).toBe('test-token');
        (0, vitest_1.expect)(mockContext.secrets.get).toHaveBeenCalledWith('wrike.pat');
    });
    (0, vitest_1.it)('should return undefined if token does not exist', async () => {
        mockContext.secrets.get.mockResolvedValue(undefined);
        const token = await authManager.getToken();
        (0, vitest_1.expect)(token).toBeUndefined();
    });
    (0, vitest_1.it)('should set token', async () => {
        await authManager.setToken('new-token');
        (0, vitest_1.expect)(mockContext.secrets.store).toHaveBeenCalledWith('wrike.pat', 'new-token');
    });
    (0, vitest_1.it)('should delete token', async () => {
        await authManager.deleteToken();
        (0, vitest_1.expect)(mockContext.secrets.delete).toHaveBeenCalledWith('wrike.pat');
    });
});
//# sourceMappingURL=AuthManager.test.js.map