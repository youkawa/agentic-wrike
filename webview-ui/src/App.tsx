import { useEffect, useState } from 'react';
import { TaskList } from './components/TaskList';
import { TaskDetail } from './components/TaskDetail';
import { vscode } from './utils/vscode';
import type { WrikeWorkflow } from './types/wrike';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState<'list' | 'detail'>('list');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [folderId] = useState<string>('IEAGVSI2I4GKT2BI'); // Default folder ID for now, should be dynamic
  const [workflows, setWorkflows] = useState<WrikeWorkflow[]>([]);
  const [customFields, setCustomFields] = useState<any[]>([]); // Type this properly if possible

  useEffect(() => {
    // Initial data fetch
    vscode.postMessage({ command: 'getWorkflows' });
    vscode.postMessage({ command: 'getCustomFields' });

    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      switch (message.command) {
        case 'getWorkflowsResponse':
          setWorkflows(message.payload);
          break;
        case 'getCustomFieldsResponse':
          setCustomFields(message.payload);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleTaskSelect = (taskId: string) => {
    setSelectedTaskId(taskId);
    setCurrentView('detail');
  };

  const handleCloseDetail = () => {
    setSelectedTaskId(null);
    setCurrentView('list');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {currentView === 'list' && (
        <TaskList
          folderId={folderId}
          onTaskSelect={handleTaskSelect}
          selectedTaskId={selectedTaskId}
        />
      )}
      {currentView === 'detail' && selectedTaskId && (
        <TaskDetail
          taskId={selectedTaskId}
          onClose={handleCloseDetail}
          customFields={customFields}
          workflows={workflows}
        />
      )}
    </div>
  );
}

export default App;
