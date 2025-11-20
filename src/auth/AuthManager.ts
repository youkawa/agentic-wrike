import * as vscode from 'vscode';

export class AuthManager {
    private static readonly KEY = 'wrike.pat';
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    async getToken(): Promise<string | undefined> {
        return await this.context.secrets.get(AuthManager.KEY);
    }

    async setToken(token: string): Promise<void> {
        await this.context.secrets.store(AuthManager.KEY, token);
    }

    async deleteToken(): Promise<void> {
        await this.context.secrets.delete(AuthManager.KEY);
    }
}
