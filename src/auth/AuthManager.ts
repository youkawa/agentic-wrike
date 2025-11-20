import * as vscode from 'vscode';
import { WrikeUser } from '../types/wrike';

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

    async validateToken(token: string): Promise<{ valid: boolean; user?: WrikeUser; error?: string }> {
        try {
            const response = await fetch('https://www.wrike.com/api/v4/contacts?me=true', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                return {
                    valid: false,
                    error: `Authentication failed (${response.status}): ${response.statusText}`
                };
            }

            const data = await response.json();
            if (data.data && data.data.length > 0) {
                return {
                    valid: true,
                    user: data.data[0]
                };
            }

            return {
                valid: false,
                error: 'No user data returned from Wrike API'
            };
        } catch (error) {
            return {
                valid: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }
}
