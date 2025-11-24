import { open } from '@tauri-apps/plugin-dialog';


export interface FileInfo {
  path: string;
  name: string;
  size: number;
}

export const pickFile = async (title?: string): Promise<string | null> => {
  try {
    const selected = await open({
      title: title || 'Select a file',
      multiple: false,
      directory: false,
    });

    return Array.isArray(selected) ? selected[0] || null : selected;
  } catch (error) {
    console.error('Failed to pick file:', error);
    return null;
  }
};

export const pickSaveLocation = async (title?: string): Promise<string | null> => {
  try {
    const selected = await open({
      title: title || 'Choose save location',
      directory: true,
      multiple: false,
    });

    return Array.isArray(selected) ? selected[0] || null : selected;
  } catch (error) {
    console.error('Failed to pick save location:', error);
    return null;
  }
};

export const getFileInfo = async (path: string): Promise<FileInfo | null> => {
  try {
    // For simplicity, just return basic path info
    // In a full implementation, we'd use fs.stat
    const name = path.split(/[/\\]/).pop() || '';
    return {
      path,
      name,
      size: 0, // Would need to implement file size reading
    };
  } catch (error) {
    console.error('Failed to get file info:', error);
    return null;
  }
};
