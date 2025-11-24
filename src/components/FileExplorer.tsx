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
    setError('Drag and drop from external sources is not yet supported. Use the file browser instead.');
  }, []);

  const [error, setError] = useState<string | null>(null);

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
    <div className="file-explorer">
      {/* Navigation Bar */}
      <div className="explorer-navbar">
        <div className="nav-buttons">
          <button
            onClick={goBack}
            disabled={historyIndex <= 0}
            title="Go Back"
          >
            ←
          </button>
          <button
            onClick={goForward}
            disabled={historyIndex >= pathHistory.length - 1}
            title="Go Forward"
          >
            →
          </button>
        </div>

        <div className="current-path">
          {currentPath}
        </div>
      </div>

      {/* File List Header */}
      <div className="file-list-header">
        <div className="header-cell name">Name</div>
        <div className="header-cell size">Size</div>
        <div className="header-cell type">Type</div>
      </div>

      {/* File List */}
      <div
        className="file-list"
        ref={dropZoneRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isLoading ? (
          <div className="loading">Loading...</div>
        ) : files.length === 0 ? (
          <div className="empty-state">
            This folder is empty
            <br />
            <small>Drag and drop files here</small>
          </div>
        ) : (
          files.map((item) => (
            <div
              key={item.path}
              className={`file-item ${
                selectedFiles.some(f => f.path === item.path) ? 'selected' : ''
              }`}
              onClick={() => handleItemClick(item)}
              onDoubleClick={() => handleItemDoubleClick(item)}
            >
              <div className="file-icon">{getFileIcon(item)}</div>
              <div className="file-name" title={item.name}>
                {item.name}
              </div>
              <div className="file-size">
                {item.isDirectory ? '--' : formatFileSize(item.size)}
              </div>
              <div className="file-type">
                {item.isDirectory ? 'Folder' : 'File'}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Selected Files Summary */}
      {selectedFiles.length > 0 && (
        <div className="selection-summary">
          <strong>Selected ({selectedFiles.length}):</strong>
          <div className="selected-files">
            {selectedFiles.map((file, index) => (
              <span key={file.path} className="selected-file-tag">
                {file.name}
                <button
                  onClick={() => onSelectionChange(selectedFiles.filter((_, i) => i !== index))}
                  title="Remove"
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
