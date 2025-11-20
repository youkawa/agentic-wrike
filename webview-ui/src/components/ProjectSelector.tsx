import { useState, useEffect } from 'react';
import { vscode } from '../utils/vscode';
import { Folder, ChevronRight } from 'lucide-react';
import type { WrikeSpace, WrikeFolder } from '../types/wrike';

interface ProjectSelectorProps {
    onProjectSelect: (folderId: string, folderName: string) => void;
}

export function ProjectSelector({ onProjectSelect }: ProjectSelectorProps) {
    const [spaces, setSpaces] = useState<WrikeSpace[]>([]);
    const [folders, setFolders] = useState<Record<string, WrikeFolder[]>>({});
    const [selectedSpace, setSelectedSpace] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        vscode.postMessage({ command: 'getSpaces' });

        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            switch (message.command) {
                case 'getSpacesResponse':
                    setSpaces(message.payload);
                    setLoading(false);
                    break;
                case 'getFoldersResponse':
                    if (selectedSpace) {
                        setFolders(prev => ({
                            ...prev,
                            [selectedSpace]: message.payload
                        }));
                    }
                    break;
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [selectedSpace]);

    const handleSpaceClick = (spaceId: string) => {
        setSelectedSpace(spaceId);
        if (!folders[spaceId]) {
            vscode.postMessage({ command: 'getFolders', payload: { spaceId } });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-green border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-secondary">Loading projects...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-light p-8">
            <div className="max-w-6xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-primary mb-2">Select a Project</h1>
                    <p className="text-secondary">Choose a workspace or folder to view tasks</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    {spaces.map(space => (
                        <button
                            key={space.id}
                            onClick={() => handleSpaceClick(space.id)}
                            className={`wrike-card p-6 text-left transition ${selectedSpace === space.id ? 'ring-2 ring-green border-transparent' : ''
                                } hover:shadow-md`}
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 bg-blue rounded-lg flex items-center justify-center">
                                    <Folder className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-primary">{space.title}</h3>
                                    <p className="text-xs text-secondary">Workspace</p>
                                </div>
                                <ChevronRight className={`w-5 h-5 text-secondary transition ${selectedSpace === space.id ? 'rotate-90' : ''
                                    }`} />
                            </div>
                        </button>
                    ))}
                </div>

                {selectedSpace && folders[selectedSpace] && (
                    <div className="wrike-card p-6">
                        <h2 className="text-xl font-bold text-primary mb-4">Folders</h2>
                        <div className="space-y-2">
                            {folders[selectedSpace].map(folder => (
                                <button
                                    key={folder.id}
                                    onClick={() => onProjectSelect(folder.id, folder.title)}
                                    className="w-full flex items-center gap-3 p-4 rounded-md hover:bg-light transition text-left"
                                >
                                    <Folder className="w-5 h-5 text-blue" />
                                    <span className="font-medium text-primary">{folder.title}</span>
                                    <ChevronRight className="w-4 h-4 ml-auto text-secondary" />
                                </button>
                            ))}
                            {folders[selectedSpace].length === 0 && (
                                <p className="text-secondary text-center py-8">No folders found in this workspace</p>
                            )}
                        </div>
                    </div>
                )}

                {spaces.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-secondary">No workspaces found. Please check your Wrike account.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
