# Wrike VS Code Extension Design Document

## 1. Overview
This document details the design for converting the `wrike-webapp` into a VS Code Extension. The extension will provide the same project management capabilities (Task List, Board View, Task Details) directly within VS Code, leveraging the Wrike API.

## 2. Architecture

The extension follows the **Webview UI** pattern, separating the frontend (React) from the backend logic (Extension Host).

```mermaid
graph TD
    subgraph "VS Code Extension Host (Node.js)"
        ExtMain[Extension Main (activate)]
        Panel[WrikePanel (WebviewProvider)]
        Auth[AuthManager (SecretStorage)]
        Service[WrikeService (Axios)]
        MsgHandler[MessageHandler]
    end

    subgraph "Webview (React UI)"
        ReactApp[React App]
        Components[Components (TaskList, TaskDetail)]
        MsgProxy[MessageProxy (replaces fetch)]
    end

    subgraph "External"
        WrikeAPI[Wrike API v4]
    end

    ExtMain --> Panel
    Panel --> MsgHandler
    MsgHandler --> Auth
    MsgHandler --> Service
    Service --> WrikeAPI
    
    ReactApp --> Components
    Components --> MsgProxy
    MsgProxy <-->|postMessage| Panel
```

### 2.1. Extension Host (Backend)
*   **Responsibility:**
    *   Manage the Webview Panel lifecycle.
    *   Handle Authentication (store/retrieve Wrike PAT).
    *   Execute Wrike API calls (proxy for Webview).
    *   Handle VS Code specific interactions (Notifications, Commands).
*   **Key Components:**
    *   `WrikePanel`: Manages the Webview instance and HTML content generation.
    *   `WrikeService`: Adapted from the web app's service, running in the Node.js extension host environment.
    *   `AuthManager`: Manages Wrike API tokens using `vscode.secrets`.

### 2.2. Webview (Frontend)
*   **Responsibility:**
    *   Render the UI (Task Lists, Boards, Details).
    *   Manage Client State (React State).
    *   Send user actions to Extension Host.
*   **Adaptations:**
    *   **Routing:** Switch from `BrowserRouter` to `MemoryRouter` (or custom state-based routing) since there is no URL bar or history API in the traditional sense.
    *   **API Calls:** Replace direct `fetch` calls with a `postMessage` bridge.

## 3. Directory Structure

We will adopt a monorepo-like structure within the extension project:

```
wrike-vscode/
├── src/                  # Extension Host Code
│   ├── extension.ts      # Entry point
│   ├── panels/           # Webview Panels
│   │   └── WrikePanel.ts
│   ├── services/         # Backend Services
│   │   └── WrikeService.ts
│   ├── auth/
│   │   └── AuthManager.ts
│   └── utilities/
├── webview-ui/           # React Application (Refactored Web App)
│   ├── src/
│   │   ├── components/   # Migrated Components
│   │   ├── App.tsx       # Root Component
│   │   ├── index.tsx     # Entry point
│   │   └── utils/
│   │       └── vscode.ts # VS Code API wrapper
│   ├── vite.config.ts    # Build config for Webview
│   └── package.json
├── package.json          # Extension Manifest
└── tsconfig.json
```

## 4. Communication Protocol

Communication between the Webview and Extension Host uses a Request/Response pattern over `postMessage`.

### 4.1. Message Format

**Request (Webview -> Extension):**
```typescript
interface WebviewMessage {
    command: string; // e.g., 'getTasks', 'createTask'
    payload?: any;
    requestId: string; // For correlating responses
}
```

**Response (Extension -> Webview):**
```typescript
interface ExtensionMessage {
    command: string; // e.g., 'getTasksResponse'
    payload?: any;
    error?: string;
    requestId: string;
}
```

### 4.2. API Command Specification

The following commands map directly to `WrikeService` methods.

| Command | Payload (Req) | Payload (Res) | Description |
| :--- | :--- | :--- | :--- |
| `getCurrentUser` | - | `WrikeUser` | Fetch current user profile. |
| `getContacts` | - | `WrikeUser[]` | Fetch all contacts. |
| `getSpaces` | - | `WrikeSpace[]` | Fetch all spaces. |
| `getFolders` | `{ spaceId }` | `WrikeFolder[]` | Fetch folders in space. |
| `getFolder` | `{ folderId }` | `WrikeFolder` | Fetch single folder details. |
| `getTasks` | `{ folderId }` | `WrikeTask[]` | Fetch tasks in folder. |
| `getTask` | `{ taskId }` | `WrikeTask` | Fetch single task details. |
| `createTask` | `{ folderId, task }` | `WrikeTask` | Create a new task. |
| `updateTask` | `{ taskId, updates }` | `WrikeTask` | Update a task. |
| `getCustomFields` | - | `WrikeCustomFieldDef[]` | Fetch custom field definitions. |
| `getWorkflows`| - | `WrikeWorkflow[]` | Fetch workflows. |
| `getAttachments` | `{ taskId }` | `WrikeAttachment[]` | Fetch task attachments. |
| `uploadAttachment` | `{ taskId, fileName, fileData }` | - | Upload file (fileData is Base64 or Buffer). |
| `showError` | `{ message }` | - | Show VS Code error notification. |

### 4.3. Attachment Upload Handling

File uploads require special handling since the Webview cannot directly make POST requests with `FormData` to the Wrike API (due to CORS and Auth token isolation).

**Flow:**
1.  **Webview:** User selects file via `<input type="file">`.
2.  **Webview:** React component reads the file using `FileReader` as an `ArrayBuffer` or Base64 string.
3.  **Webview:** Sends `uploadAttachment` message with `taskId`, `fileName`, and the binary data.
4.  **Extension Host:** Receives message, converts data back to Buffer if needed.
5.  **Extension Host:** Calls `WrikeService.uploadAttachment` which streams the buffer to Wrike API.
6.  **Extension Host:** Sends success/failure response to Webview.
7.  **Webview:** Refreshes attachment list.

## 5. Authentication & Security

*   **Storage:** Wrike Personal Access Token (PAT) will be stored securely using `vscode.secrets`.
*   **Setup:**
    1.  User installs extension.
    2.  Extension checks for stored token.
    3.  If missing, Extension shows a "Set Wrike Token" command/button.
    4.  User enters token via `vscode.window.showInputBox`.
    5.  Token is saved to SecretStorage.
*   **Security:** The Webview **never** sees the raw token. It only requests data, and the Extension Host attaches the token to the outgoing API request.

## 6. Migration Plan

### Phase 1: Project Setup
1.  Initialize a new VS Code Extension project (using `yo code` or manual setup).
2.  Set up the `webview-ui` folder with Vite + React.
3.  Configure build scripts to compile React app into `out/webview` folder.

### Phase 2: Backend Migration
1.  Copy `app/types/wrike.ts` to a shared location or duplicate in `src/types`.
2.  Port `app/services/wrike.server.ts` to `src/services/WrikeService.ts`.
    *   Remove Remix-specific code.
    *   Inject Token from `AuthManager`.
3.  Implement `AuthManager` using `context.secrets`.

### Phase 3: Frontend Migration
1.  Copy `app/components` to `webview-ui/src/components`.
2.  Refactor `TaskList`, `TaskDetail`, etc.
    *   Remove `useFetcher` / `LoaderArgs`.
    *   Replace with `useWrikeData` hook that wraps `postMessage`.
3.  Create `webview-ui/src/utils/vscode.ts` to handle message passing.
4.  Implement `App.tsx` with `MemoryRouter` or simple state-based view switching (Home -> Folder -> Task).

### Phase 4: Integration & Polish
1.  Implement `WrikePanel` to load the built React assets.
2.  Wire up the Message Handler in `extension.ts`.
3.  Test the full flow: Auth -> List Spaces -> List Tasks -> Edit Task.
