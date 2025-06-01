import RNFS from 'react-native-fs';

/**
 * Ensures that required directories exist for app functionality
 */
export const ensureDirectoriesExist = async () => {
  try {
    // Ensure ProcessedFaces directory exists (for temporary processing)
    const processedFacesDir = `${RNFS.DocumentDirectoryPath}/ProcessedFaces`;
    const processedDirExists = await RNFS.exists(processedFacesDir);
    
    if (!processedDirExists) {
      await RNFS.mkdir(processedFacesDir);
    }
    
    // Ensure SavedFaces directory exists (for user-saved images)
    const savedFacesDir = `${RNFS.DocumentDirectoryPath}/SavedFaces`;
    const savedDirExists = await RNFS.exists(savedFacesDir);
    
    if (!savedDirExists) {
      await RNFS.mkdir(savedFacesDir);
    }
    
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Loads saved images from the app's storage
 */
export const loadSavedImages = async () => {
  try {
    // Path to the SavedFaces directory where user-saved images are stored
    const savedFacesDir = `${RNFS.DocumentDirectoryPath}/SavedFaces`;
    
    // Check if the directory exists
    const dirExists = await RNFS.exists(savedFacesDir);
    if (!dirExists) {
      return [];
    }
    
    // Read files from the directory
    const files = await RNFS.readDir(savedFacesDir);
    
    // Map files to history items, filtering only for saved images
    const history = files
      .filter(file => 
        (file.name.startsWith('saved_face_') && 
         (file.name.endsWith('.jpg') || file.name.endsWith('.jpeg') || file.name.endsWith('.png')))
      )
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime()) // Sort by modification time (newest first)
      .map(file => ({
        id: file.name,
        uri: `file://${file.path}`,
        timestamp: file.mtime,
      }));
    
    return history;
  } catch (error) {
    return [];
  }
};

/**
 * Saves a processed image to both internal storage and gallery
 */
export const saveProcessedImage = async (imagePath) => {
  // Extract the actual path from the URI (remove file:// prefix)
  const path = imagePath.startsWith('file://') 
    ? imagePath.substring(7) 
    : imagePath;
  
  // Create a dedicated directory for saved images in the app's internal storage
  const savedFacesDir = `${RNFS.DocumentDirectoryPath}/SavedFaces`;
  const dirExists = await RNFS.exists(savedFacesDir);
  if (!dirExists) {
    await RNFS.mkdir(savedFacesDir);
  }
  
  // Create a destination path with a specific prefix for saved images
  const timestamp = Date.now();
  const fileName = `saved_face_${timestamp}.jpg`;
  const internalDestPath = `${savedFacesDir}/${fileName}`;
  
  // First save to internal storage (for history)
  await RNFS.copyFile(path, internalDestPath);
  
  return {
    internalPath: internalDestPath,
    fileName,
    timestamp
  };
}; 