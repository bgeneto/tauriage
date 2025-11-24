import React, { useState, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  modified?: string;
}

export interface FileExplorerProps {
  selectionMode: 'single' | 'multiple';
  selectedFiles: FileItem[];
  onSelectionChange: (files: FileItem[]) => void;
  acceptedExtensions?: string[];
}

export function FileExplorer({
  selectionMode,
  selectedFiles,
  onSelectionChange,
  acceptedExtensions
}: FileExplorerProps) {
  const [currentPath, setCurrentPath] = useState('/');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pathHistory, setPathHistory] = useState<string[]>(['/']);
  const [historyIndex, setHistoryIndex] = useState(0);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Load directory contents
  const loadDirectory = useCallback(async (path: string) => {
    setIsLoading(true);
    try {
      const contents: FileItem[] = await invoke('list_directory_contents', { path });

      // Filter files by accepted extensions if specified
      const filteredContents = acceptedExtensions
        ? contents.filter(item =>
            item.isDirectory ||
            acceptedExtensions.some(ext => item.name.toLowerCase().endsWith(ext.toLowerCase()))
          )
        : contents;

      setFiles(filteredContents);
    } catch (error) {
      console.error('Failed to load directory:', error);
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  }, [acceptedExtensions]);

  // Navigate to a path
  const navigateTo = useCallback((path: string) => {
    setCurrentPath(path);

    // Update path history
    const newHistory = pathHistory.slice(0, historyIndex + 1);
    newHistory.push(path);
    setPathHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);

    loadDirectory(path);
  }, [pathHistory, historyIndex, loadDirectory]);

  // Initialize with user home directory or root
  React.useEffect(() => {
    const initializeExplorer = async () => {
      try {
        const homePath: string = await invoke('get_user_home_directory');
        navigateTo(homePath);
      } catch (error) {
        navigateTo('/');
      }
    };

    initializeExplorer();
  }, [navigateTo]);

  // Handle file/directory double-click
  const handleItemDoubleClick = useCallback((item: FileItem) => {
    if (item.isDirectory) {
      navigateTo(item.path);
    } else {
      // For files, select them
      if (selectionMode === 'single') {
        onSelectionChange([item]);
      } else {
        // Toggle selection
        const isSelected = selectedFiles.some(f => f.path === item.path);
        if (isSelected) {
          onSelectionChange(selectedFiles.filter(f => f.path !== item.path));
        } else {
          onSelectionChange([...selectedFiles, item]);
        }
      }
    }
  }, [navigateTo, selectedFiles, onSelectionChange, selectionMode]);

  // Handle file selection
  const handleItemClick = useCallback((item: FileItem) => {
    if (item.isDirectory) return; // Directories are handled by double-click

    if (selectionMode === 'single') {
      onSelectionChange([item]);
    } else {
      const isSelected = selectedFiles.some(f => f.path === item.path);
      if (isSelected) {
        onSelectionChange(selectedFiles.filter(f => f.path !== item.path));
      } else {
        onSelectionChange([...selectedFiles, item]);
      }
    }
  }, [selectedFiles, onSelectionChange, selectionMode]);

  // Go back in history
  const goBack = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const path = pathHistory[newIndex];
      setCurrentPath(path);
      loadDirectory(path);
    }
  }, [historyIndex, pathHistory, loadDirectory]);

  // Go forward in history
  const goForward = useCallback(() => {
    if (historyIndex < pathHistory.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const path = pathHistory[newIndex];
      setCurrentPath(path);
      loadDirectory(path);
    }
  }, [historyIndex, pathHistory, loadDirectory]);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropZoneRef.current) {
      dropZoneRef.current.classList.add('drag-over');
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropZoneRef.current) {
      dropZoneRef.current.classList.remove('drag-over');
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (dropZoneRef.current) {
      dropZoneRef.current.classList.remove('drag-over');
    }

    // For now, drag and drop from external sources is not fully supported
    // In a Tauri context, we would need native file path access
    // TODO: Implement proper external file drag-and-drop for Tauri
  }, []);



  const getFileIcon = (item: FileItem) => {
    if (item.isDirectory) {
      return '📁';
    }

    const ext = item.name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return '📄';
      case 'doc':
      case 'docx': return '📝';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif': return '🖼️';
      case 'mp3':
      case 'wav':
      case 'flac': return '🎵';
      case 'mp4':
      case 'avi':
      case 'mkv': return '🎬';
      case 'zip':
      case 'rar':
      case '7z': return '📦';
      case 'txt': return '📄';
      default: return '📄';
    }
  };

  const formatFileSize = (size?: number) => {
    if (!size) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let unitIndex = 0;
    let formattedSize = size;

    while (formattedSize >= 1024 && unitIndex < units.length - 1) {
      formattedSize /= 1024;
      unitIndex++;
    }

    return `${formattedSize.toFixed(1)} ${units[unitIndex]}`;
  };

  return (
    <div className="flex flex-col h-full border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
      {/* Navigation Bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200">
        <div className="flex gap-1">
          <button
            onClick={goBack}
            disabled={historyIndex <= 0}
            title="Go Back"
            className="p-2 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
          >
            ←
          </button>
          <button
            onClick={goForward}
            disabled={historyIndex >= pathHistory.length - 1}
            title="Go Forward"
            className="p-2 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
          >
            →
          </button>
        </div>

        <div className="flex-1 bg-white px-3 py-1 rounded border border-slate-200 font-mono text-xs text-slate-600 overflow-hidden text-ellipsis whitespace-nowrap">
          {currentPath}
        </div>
      </div>

      {/* File List Header */}
      <div className="flex bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-700 sticky top-0">
        <div className="flex-1 px-3 py-2">Name</div>
        <div className="w-24 px-3 py-2 text-right">Size</div>
        <div className="w-20 px-3 py-2 text-center">Type</div>
      </div>

      {/* File List */}
      <div
        className="flex-1 overflow-y-auto bg-white"
        ref={dropZoneRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {!isLoading && files.length > 0 ? (
          files.map((item) => (
            <div
              key={item.path}
              className={`flex items-center border-b border-slate-100 px-3 py-2 cursor-pointer transition-colors ${
                selectedFiles.some(f => f.path === item.path)
                  ? 'bg-primary-50 border-l-4 border-primary-500'
                  : 'hover:bg-slate-50'
              }`}
              onClick={() => handleItemClick(item)}
              onDoubleClick={() => handleItemDoubleClick(item)}
            >
              <div className="text-lg mr-2 w-6 text-center">{getFileIcon(item)}</div>
              <div className="flex-1 text-sm text-slate-900 truncate" title={item.name}>
                {item.name}
              </div>
              <div className="w-24 text-right text-xs text-slate-500">
                {item.isDirectory ? '–' : formatFileSize(item.size)}
              </div>
              <div className="w-20 text-center text-xs text-slate-500">
                {item.isDirectory ? 'Folder' : 'File'}
              </div>
            </div>
          ))
        ) : isLoading ? (
          <div className="flex items-center justify-center h-48 text-slate-400">
            <div className="text-center">
              <div className="inline-block animate-spin mb-2">⏳</div>
              <div className="text-sm">Loading files...</div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-48 text-slate-400">
            <div className="text-center">
              <div className="text-4xl mb-2">📁</div>
              <div className="text-sm">This folder is empty</div>
            </div>
          </div>
        )}
      </div>

      {/* Selected Files Summary */}
      {selectedFiles.length > 0 && (
        <div className="bg-slate-50 border-t border-slate-200 px-3 py-2 text-xs">
          <strong className="text-slate-700">Selected ({selectedFiles.length})</strong>
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedFiles.map((file, index) => (
              <span key={file.path} className="inline-flex items-center gap-1 px-2 py-1 bg-primary-500 text-white rounded-full text-xs">
                {file.name}
                <button
                  onClick={() => onSelectionChange(selectedFiles.filter((_, i) => i !== index))}
                  title="Remove"
                  className="ml-1 hover:bg-primary-600 rounded-full w-4 h-4 flex items-center justify-center font-bold text-sm"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

