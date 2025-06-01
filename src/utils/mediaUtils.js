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

  if (Platform.OS === 'android') {
    ToastAndroid.show('Opening camera...', ToastAndroid.SHORT);
  }

  try {
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

  if (Platform.OS === 'android') {
    ToastAndroid.show('Opening gallery...', ToastAndroid.SHORT);
  }

  try {
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
    const path = imagePath.startsWith('file://')
      ? imagePath.substring(7)
      : imagePath;

    const androidVersion = Platform.OS === 'android' ? parseInt(Platform.Version, 10) : 0;

    if (Platform.OS === 'android' && androidVersion >= 29) {
      try {
        const appPicturesDir = `${RNFS.ExternalDirectoryPath}/Pictures`;

        const dirExists = await RNFS.exists(appPicturesDir);
        if (!dirExists) {
          await RNFS.mkdir(appPicturesDir);
        }

        const timestamp = Date.now();
        const appSpecificPath = `${appPicturesDir}/AutoCrop_${timestamp}.jpg`;

        await RNFS.copyFile(path, appSpecificPath);

        const sharedPicturesPath = `${RNFS.PicturesDirectoryPath}/AutoCrop_${timestamp}.jpg`;
        await RNFS.copyFile(appSpecificPath, sharedPicturesPath);

        await AutoCropModule.scanFile(sharedPicturesPath);

        if (Platform.OS === 'android') {
          ToastAndroid.show("Image saved to gallery", ToastAndroid.SHORT);
        }

        return true;
      } catch (innerError) {
        console.error("Error saving to gallery:", innerError);
        if (Platform.OS === 'android') {
          ToastAndroid.show("Failed to save to gallery", ToastAndroid.LONG);
        }
        return false;
      }
    }
    else {
      const timestamp = Date.now();
      const externalDestPath = `${RNFS.PicturesDirectoryPath}/AutoCrop_${timestamp}.jpg`;

      await RNFS.copyFile(path, externalDestPath);

      if (Platform.OS === 'android') {
        await AutoCropModule.scanFile(externalDestPath);
        ToastAndroid.show("Image saved to gallery", ToastAndroid.SHORT);
      }

      return true;
    }
  } catch (error) {
    console.error("Error in saveToGallery:", error);
    return false;
  }
}; 