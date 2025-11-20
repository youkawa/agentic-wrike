import { useState, useEffect } from 'react';
import { ProjectSelector } from './components/ProjectSelector';
import { ProjectWorkspace } from './components/ProjectWorkspace';
import type { ViewMode, WorkspaceViewType } from './types/views';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('projectSelector');
  const [activeView, setActiveView] = useState<WorkspaceViewType>('table');
  const [selectedFolder, setSelectedFolder] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [error, setError] = useState<{ message: string; isAuthError: boolean } | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.command === 'error') {
        setError(message.payload);
        setTimeout(() => setError(null), 10000);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleProjectSelect = (folderId: string, folderName: string) => {
    setSelectedFolder({ id: folderId, name: folderName });
    setViewMode('workspace');
  };

  const handleBackToSelector = () => {
    setViewMode('projectSelector');
    setSelectedFolder(null);
  };

  return (
    <div className="min-h-screen bg-light relative">
      {/* Error Banner */}
      {error && (
        <div className={`fixed top-0 left-0 right-0 z-50 p-4 text-white ${error.isAuthError ? 'bg-red' : 'bg-blue'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold">{error.isAuthError ? '🔒 Authentication Error' : '⚠️ Error'}</span>
              <span>{error.message}</span>
            </div>
            <button onClick={() => setError(null)} className="text-white hover:opacity-100 opacity-50 transition">
              ✕
            </button>
          </div>
        </div>
      )}

      <div className={error ? 'mt-16' : ''}>
        {viewMode === 'projectSelector' ? (
          <ProjectSelector onProjectSelect={handleProjectSelect} />
        ) : selectedFolder ? (
          <ProjectWorkspace
            folderId={selectedFolder.id}
            folderName={selectedFolder.name}
            activeView={activeView}
            onViewChange={setActiveView}
            onBack={handleBackToSelector}
          />
        ) : null}
      </div>
    </div>
  );
}

export default App;
