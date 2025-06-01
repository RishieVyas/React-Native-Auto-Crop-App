import { Platform, ToastAndroid, Alert } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import AutoCropModule from '../native/AutoCropModule';

/**
 * Opens the camera and captures an image
 * @returns {Promise<{uri: string}|null>} The image URI or null if canceled/error
 */
export const captureImage = async () => {
  const options = {
    mediaType: 'photo',
    includeBase64: false,
    maxHeight: 2000,
    maxWidth: 2000,
    quality: 1,
    saveToPhotos: false,
  };

  // Show user feedback
  if (Platform.OS === 'android') {
    ToastAndroid.show('Opening camera...', ToastAndroid.SHORT);
  }
  
  try {
    // Use a promise wrapper for the callback-based API
    const response = await new Promise((resolve) => {
      launchCamera(options, (result) => resolve(result));
    });
    
    if (response.didCancel) {
      return null;
    }
    
    if (response.errorCode) {
      if (Platform.OS === 'android') {
        ToastAndroid.show(`Camera error: ${response.errorMessage}`, ToastAndroid.SHORT);
      } else {
        Alert.alert('Camera Error', response.errorMessage);
      }
      return null;
    }
    
    if (!response.assets || !response.assets[0] || !response.assets[0].uri) {
      if (Platform.OS === 'android') {
        ToastAndroid.show('Failed to capture image', ToastAndroid.SHORT);
      } else {
        Alert.alert('Error', 'Failed to capture image');
      }
      return null;
    }
    
    // Return the image URI
    return { uri: response.assets[0].uri };
  } catch (error) {
    if (Platform.OS === 'android') {
      ToastAndroid.show('Failed to process image', ToastAndroid.SHORT);
    } else {
      Alert.alert('Error', 'Failed to process image');
    }
    return null;
  }
};

/**
 * Opens the image library and selects an image
 * @returns {Promise<{uri: string}|null>} The image URI or null if canceled/error
 */
export const selectImageFromGallery = async () => {
  const options = {
    mediaType: 'photo',
    includeBase64: false,
    maxHeight: 2000,
    maxWidth: 2000,
    quality: 1,
  };

  // Show user feedback
  if (Platform.OS === 'android') {
    ToastAndroid.show('Opening gallery...', ToastAndroid.SHORT);
  }
  
  try {
    // Use a promise wrapper for the callback-based API
    const response = await new Promise((resolve) => {
      launchImageLibrary(options, (result) => resolve(result));
    });
    
    if (response.didCancel) {
      return null;
    }
    
    if (response.errorCode) {
      if (Platform.OS === 'android') {
        ToastAndroid.show(`Gallery error: ${response.errorMessage}`, ToastAndroid.SHORT);
      } else {
        Alert.alert('Gallery Error', response.errorMessage);
      }
      return null;
    }
    
    if (!response.assets || !response.assets[0] || !response.assets[0].uri) {
      if (Platform.OS === 'android') {
        ToastAndroid.show('Failed to select image', ToastAndroid.SHORT);
      } else {
        Alert.alert('Error', 'Failed to select image');
      }
      return null;
    }
    
    // Return the image URI
    return { uri: response.assets[0].uri };
  } catch (error) {
    if (Platform.OS === 'android') {
      ToastAndroid.show('Failed to process image', ToastAndroid.SHORT);
    } else {
      Alert.alert('Error', 'Failed to process image');
    }
    return null;
  }
};

/**
 * Saves an image to the device gallery
 * @param {string} imagePath - The image path to save
 * @returns {Promise<boolean>} Success status
 */
export const saveToGallery = async (imagePath) => {
  try {
    // Extract the actual path from the URI (remove file:// prefix)
    const path = imagePath.startsWith('file://') 
      ? imagePath.substring(7) 
      : imagePath;
    
    // Get the pictures directory path
    const externalDir = RNFS.PicturesDirectoryPath;
    const timestamp = Date.now();
    const externalDestPath = `${externalDir}/AutoCrop_${timestamp}.jpg`;
    
    // Copy the file to external storage
    await RNFS.copyFile(path, externalDestPath);
    
    // Make it visible in the gallery
    await AutoCropModule.scanFile(externalDestPath);
    
    return true;
  } catch (error) {
    return false;
  }
}; 