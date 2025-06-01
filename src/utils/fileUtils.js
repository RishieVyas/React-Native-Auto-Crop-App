import RNFS from 'react-native-fs';

export const ensureDirectoriesExist = async () => {
  try {

    const processedFacesDir = `${RNFS.DocumentDirectoryPath}/ProcessedFaces`;
    const processedDirExists = await RNFS.exists(processedFacesDir);

    if (!processedDirExists) {
      await RNFS.mkdir(processedFacesDir);
    }

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

    const savedFacesDir = `${RNFS.DocumentDirectoryPath}/SavedFaces`;


    const dirExists = await RNFS.exists(savedFacesDir);
    if (!dirExists) {
      return [];
    }

    const files = await RNFS.readDir(savedFacesDir);

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

  const path = imagePath.startsWith('file://')
    ? imagePath.substring(7)
    : imagePath;


  const savedFacesDir = `${RNFS.DocumentDirectoryPath}/SavedFaces`;
  const dirExists = await RNFS.exists(savedFacesDir);
  if (!dirExists) {
    await RNFS.mkdir(savedFacesDir);
  }


  const timestamp = Date.now();
  const fileName = `saved_face_${timestamp}.jpg`;
  const internalDestPath = `${savedFacesDir}/${fileName}`;


  await RNFS.copyFile(path, internalDestPath);

  return {
    internalPath: internalDestPath,
    fileName,
    timestamp
  };
}; 