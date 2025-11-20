import * as vscode from 'vscode';
import { WrikePanel } from './panels/WrikePanel';
import { AuthManager } from './auth/AuthManager';

export function activate(context: vscode.ExtensionContext) {
    console.log('Wrike extension is now active!');

    const openBoardCommand = vscode.commands.registerCommand('wrike.openBoard', () => {
        WrikePanel.render(context.extensionUri, context);
    });

    const setTokenCommand = vscode.commands.registerCommand('wrike.setToken', async () => {
        const token = await vscode.window.showInputBox({
            placeHolder: 'Enter your Wrike Personal Access Token',
            password: true,
            ignoreFocusOut: true
        });

        if (token) {
            const authManager = new AuthManager(context);

            // Show progress while validating
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Validating Wrike token...',
                cancellable: false
            }, async () => {
                const validationResult = await authManager.validateToken(token);

                if (validationResult.valid && validationResult.user) {
                    await authManager.setToken(token);
                    vscode.window.showInformationMessage(
                        `Wrike token validated and saved! Welcome, ${validationResult.user.firstName} ${validationResult.user.lastName}`
                    );
                } else {
                    vscode.window.showErrorMessage(
                        `Invalid Wrike token. Please check your token and try again. Error: ${validationResult.error}`
                    );
                }
            });
        }
    });

    context.subscriptions.push(openBoardCommand, setTokenCommand);
}

export function deactivate() { }
