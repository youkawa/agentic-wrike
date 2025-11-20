import * as vscode from 'vscode';
import { getUri } from '../utilities/getUri';
import { getNonce } from '../utilities/getNonce';
import { WrikeService } from '../services/WrikeService';
import { AuthManager } from '../auth/AuthManager';

export class WrikePanel {
    public static currentPanel: WrikePanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _disposables: vscode.Disposable[] = [];
    private readonly _wrikeService: WrikeService;

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, wrikeService: WrikeService) {
        this._panel = panel;
        this._wrikeService = wrikeService;

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._panel.webview.html = this._getWebviewContent(this._panel.webview, extensionUri);

        this._setWebviewMessageListener(this._panel.webview);
    }

    public static async render(extensionUri: vscode.Uri, context: vscode.ExtensionContext) {
        if (WrikePanel.currentPanel) {
            WrikePanel.currentPanel._panel.reveal(vscode.ViewColumn.One);
        } else {
            const panel = vscode.window.createWebviewPanel(
                'wrikeBoard',
                'Wrike Board',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    localResourceRoots: [
                        vscode.Uri.joinPath(extensionUri, 'out'),
                        vscode.Uri.joinPath(extensionUri, 'webview-ui/build')
                    ]
                }
            );

            // Initialize services
            const authManager = new AuthManager(context);
            const token = await authManager.getToken();

            if (token) {
                const wrikeService = new WrikeService(token);
                WrikePanel.currentPanel = new WrikePanel(panel, extensionUri, wrikeService);
            } else {
                vscode.window.showErrorMessage('Wrike PAT not found. Please run "Wrike: Set Token" first.');
                panel.dispose();
            }
        }
    }

    public dispose() {
        WrikePanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }

    private _getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri) {
        const stylesUri = getUri(webview, extensionUri, ['out', 'webview', 'assets', 'index.css']);
        const scriptUri = getUri(webview, extensionUri, ['out', 'webview', 'assets', 'index.js']);

        const nonce = getNonce();

        return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${webview.cspSource};">
          <link rel="stylesheet" type="text/css" href="${stylesUri}">
          <title>Wrike Board</title>
        </head>
        <body>
          <div id="root"></div>
          <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
        </body>
      </html>
    `;
    }

    private _setWebviewMessageListener(webview: vscode.Webview) {
        webview.onDidReceiveMessage(
            async (message: any) => {
                const command = message.command;
                const payload = message.payload;

                try {
                    switch (command) {
                        case 'getTasks':
                            const tasks = await this._wrikeService.getTasks(payload.folderId);
                            webview.postMessage({ command: 'getTasksResponse', payload: tasks });
                            break;
                        case 'getFolders':
                            const folders = await this._wrikeService.getFolders(payload.spaceId);
                            webview.postMessage({ command: 'getFoldersResponse', payload: folders });
                            break;
                        case 'getSpaces':
                            const spaces = await this._wrikeService.getSpaces();
                            webview.postMessage({ command: 'getSpacesResponse', payload: spaces });
                            break;
                        case 'getTask':
                            const task = await this._wrikeService.getTask(payload.taskId);
                            webview.postMessage({ command: 'getTaskResponse', payload: task });
                            break;
                        case 'updateTask':
                            const updatedTask = await this._wrikeService.updateTask(payload.taskId, payload.updates);
                            webview.postMessage({ command: 'taskUpdated', payload: updatedTask });
                            break;
                        case 'getContacts':
                            const contacts = await this._wrikeService.getContacts();
                            webview.postMessage({ command: 'getContactsResponse', payload: contacts });
                            break;
                        case 'getWorkflows':
                            const workflows = await this._wrikeService.getWorkflows();
                            webview.postMessage({ command: 'getWorkflowsResponse', payload: workflows });
                            break;
                        case 'getCustomFields':
                            const customFields = await this._wrikeService.getCustomFields();
                            webview.postMessage({ command: 'getCustomFieldsResponse', payload: customFields });
                            break;
                        case 'getAttachments':
                            const attachments = await this._wrikeService.getAttachments(payload.taskId);
                            webview.postMessage({ command: 'getAttachmentsResponse', payload: attachments });
                            break;
                        case 'uploadAttachment':
                            const buffer = Buffer.from(payload.fileData, 'base64');
                            await this._wrikeService.uploadAttachment(payload.taskId, payload.fileName, buffer);
                            webview.postMessage({ command: 'attachmentUploaded', payload: { taskId: payload.taskId } });
                            break;
                        case 'bulkUpdateTasks':
                            // Naive implementation: update one by one
                            // In a real app, we might want a bulk API or parallel requests
                            for (const taskId of payload.taskIds) {
                                await this._wrikeService.updateTask(taskId, payload.updates);
                            }
                            webview.postMessage({ command: 'tasksUpdated' });
                            break;
                        case 'createTask':
                            const newTask = await this._wrikeService.createTask(payload.folderId, payload.taskData);
                            webview.postMessage({ command: 'taskCreated', payload: newTask });
                            break;
                    }
                } catch (error: any) {
                    console.error(`Wrike API Error in ${command}:`, error);

                    // Check if it's an authentication error
                    if (error.message.includes('401') || error.message.includes('Authentication')) {
                        vscode.window.showErrorMessage(
                            'Wrike authentication failed. Your token may have expired. Please run "Wrike: Set Token" to re-authenticate.',
                            'Set Token'
                        ).then(selection => {
                            if (selection === 'Set Token') {
                                vscode.commands.executeCommand('wrike.setToken');
                            }
                        });
                        webview.postMessage({
                            command: 'error',
                            payload: {
                                message: 'Authentication failed. Please re-authenticate.',
                                isAuthError: true
                            }
                        });
                    } else {
                        vscode.window.showErrorMessage(`Wrike Error: ${error.message}`);
                        webview.postMessage({
                            command: 'error',
                            payload: {
                                message: error.message,
                                isAuthError: false
                            }
                        });
                    }
                }
            },
            undefined,
            this._disposables
        );
    }
}
