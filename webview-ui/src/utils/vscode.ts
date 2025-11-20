/**
 * A utility wrapper around the acquireVsCodeApi() function, which enables
 * message passing and state management between the webview and extension scripts.
 *
 * This utility also enables webview code to be run in a web browser-based
 * dev server by using standard browser features by default and substituting
 * calls to acquireVsCodeApi() with a mock interface.
 */

interface WebviewApi<State> {
    postMessage(message: unknown): void;
    getState(): State | undefined;
    setState(newState: State): State;
}

declare function acquireVsCodeApi(): WebviewApi<unknown>;
class VSCodeAPIWrapper {
    private readonly vsCodeApi: WebviewApi<unknown> | undefined;

    constructor() {
        // Check if the acquireVsCodeApi function exists in the current global context
        // and call it to acquire the VS Code API interface.
        if (typeof acquireVsCodeApi === "function") {
            this.vsCodeApi = acquireVsCodeApi();
        }
    }

    /**
     * Post a message (i.e. send a request) from the webview to the extension.
     *
     * @param message The message to post to the extension.
     */
    public postMessage(message: unknown) {
        if (this.vsCodeApi) {
            this.vsCodeApi.postMessage(message);
        } else {
            console.log(message);
        }
    }

    /**
     * Get the persistent state stored for this webview.
     *
     * @returns The current state or `undefined` if no state has been set.
     */
    public getState(): unknown | undefined {
        if (this.vsCodeApi) {
            return this.vsCodeApi.getState();
        } else {
            const state = localStorage.getItem("vscodeState");
            return state ? JSON.parse(state) : undefined;
        }
    }

    /**
     * Set the persistent state stored for this webview.
     *
     * @param newState The new state.
     */
    public setState<T extends unknown>(newState: T): T {
        if (this.vsCodeApi) {
            return this.vsCodeApi.setState(newState) as T;
        } else {
            localStorage.setItem("vscodeState", JSON.stringify(newState));
            return newState;
        }
    }
}

// Exports class singleton to prevent multiple invocations of acquireVsCodeApi.
export const vscode = new VSCodeAPIWrapper();
