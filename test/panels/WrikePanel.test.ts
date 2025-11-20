import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { WrikePanel } from '../../src/panels/WrikePanel';
import { WrikeService } from '../../src/services/WrikeService';
import { AuthManager } from '../../src/auth/AuthManager';

// Mock vscode
vi.mock('vscode', () => {
    const postMessage = vi.fn();
    const onDidReceiveMessage = vi.fn();
    const dispose = vi.fn();

    return {
        Uri: {
            joinPath: vi.fn(),
            file: vi.fn()
        },
        ViewColumn: {
            One: 1
        },
        window: {
            createWebviewPanel: vi.fn(() => ({
                webview: {
                    html: '',
                    onDidReceiveMessage,
                    postMessage,
                    asWebviewUri: vi.fn()
                },
                onDidDispose: vi.fn(),
                reveal: vi.fn(),
                dispose
            })),
            showErrorMessage: vi.fn()
        },
        ExtensionContext: vi.fn()
    };
});

// Mock WrikeService
vi.mock('../../src/services/WrikeService');
// Mock AuthManager
vi.mock('../../src/auth/AuthManager');

describe('WrikePanel', () => {
    let context: any;
    let extensionUri: any;
    let mockWrikeService: any;

    beforeEach(() => {
        vi.clearAllMocks();
        WrikePanel.currentPanel = undefined;
        context = {
            extensionUri: {},
            secrets: {
                get: vi.fn(),
                store: vi.fn(),
                delete: vi.fn()
            },
            subscriptions: []
        };
        extensionUri = {};

        // Setup AuthManager mock
        (AuthManager as any).mockImplementation(() => ({
            getToken: vi.fn().mockResolvedValue('test-token')
        }));

        // Setup WrikeService mock
        mockWrikeService = {
            getTasks: vi.fn().mockResolvedValue([{ id: 'task1', title: 'Task 1' }]),
            getContacts: vi.fn().mockResolvedValue([]),
            getWorkflows: vi.fn().mockResolvedValue([]),
            getCustomFields: vi.fn().mockResolvedValue([]),
            getAttachments: vi.fn().mockResolvedValue([]),
            updateTask: vi.fn(),
            uploadAttachment: vi.fn()
        };
        (WrikeService as any).mockImplementation(() => mockWrikeService);
    });

    it('should create a new panel if one does not exist', async () => {
        await WrikePanel.render(extensionUri, context);
        expect(vscode.window.createWebviewPanel).toHaveBeenCalled();
    });

    it('should handle getTasks message', async () => {
        await WrikePanel.render(extensionUri, context);

        // Get the message handler passed to onDidReceiveMessage
        const panel = (vscode.window.createWebviewPanel as any).mock.results[0].value;
        const messageHandler = panel.webview.onDidReceiveMessage.mock.calls[0][0];

        // Simulate message
        await messageHandler({ command: 'getTasks', payload: { folderId: 'folder1' } });

        expect(mockWrikeService.getTasks).toHaveBeenCalledWith('folder1');
        expect(panel.webview.postMessage).toHaveBeenCalledWith({
            command: 'getTasksResponse',
            payload: [{ id: 'task1', title: 'Task 1' }]
        });
    });
});
