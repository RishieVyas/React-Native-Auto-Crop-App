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
    // For Android 13+ use READ_MEDIA_IMAGES, for older versions use READ_EXTERNAL_STORAGE
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
    // For Android 13+ use READ_MEDIA_IMAGES (since write is included), for older versions use WRITE_EXTERNAL_STORAGE
    const permission = parseInt(Platform.Version, 10) >= 33
      ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
      : PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE;

    const granted = await PermissionsAndroid.request(
      permission,
      {
        title: 'Storage Permission',
        message: 'App needs access to your storage to save photos',
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