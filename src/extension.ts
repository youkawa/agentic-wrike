import * as vscode from 'vscode';
import { WrikePanel } from './panels/WrikePanel';

export function activate(context: vscode.ExtensionContext) {
    console.log('Wrike extension is now active!');

    const openBoardCommand = vscode.commands.registerCommand('wrike.openBoard', () => {
        WrikePanel.render(context.extensionUri, context);
    });

    context.subscriptions.push(openBoardCommand);
}

export function deactivate() { }
