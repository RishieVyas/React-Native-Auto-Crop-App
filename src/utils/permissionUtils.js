import { Platform, PermissionsAndroid } from 'react-native';

/**
 * Request camera permission on Android
 * @returns {Promise<boolean>} True if permission is granted, false otherwise
 */
export const requestCameraPermission = async () => {
  if (Platform.OS !== 'android') return true;

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: 'Camera Permission',
        message: 'App needs access to your camera to take photos',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      },
    );

    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    return false;
  }
};

/**
 * Request storage read permission on Android
 * @returns {Promise<boolean>} True if permission is granted, false otherwise
 */
export const requestStorageReadPermission = async () => {
  if (Platform.OS !== 'android') return true;

  try {
    const permission = parseInt(Platform.Version, 10) >= 33
      ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
      : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

    const granted = await PermissionsAndroid.request(
      permission,
      {
        title: 'Storage Permission',
        message: 'App needs access to your storage to select photos',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      },
    );

    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    return false;
  }
};

/**
 * Request storage write permission on Android
 * @returns {Promise<boolean>} True if permission is granted, false otherwise
 */
export const requestStorageWritePermission = async () => {
  if (Platform.OS !== 'android') return true;

  try {
    const androidVersion = parseInt(Platform.Version, 10);

    if (androidVersion >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
        {
          title: 'Storage Permission',
          message: 'App needs access to your photos to save images',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    else if (androidVersion >= 29) {
      const readGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        {
          title: 'Storage Read Permission',
          message: 'App needs access to your storage to read photos',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );

      return readGranted === PermissionsAndroid.RESULTS.GRANTED;
    }
    else {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        {
          title: 'Storage Write Permission',
          message: 'App needs access to your storage to save photos',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
  } catch (err) {
    console.error('Error requesting storage permission:', err);
    return false;
  }
}; 