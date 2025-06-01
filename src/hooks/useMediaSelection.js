import { useCallback } from 'react';
import { Alert } from 'react-native';
import { requestCameraPermission, requestStorageReadPermission } from '../utils/permissionUtils';
import { captureImage, selectImageFromGallery } from '../utils/mediaUtils';

const useMediaSelection = ({ processImage }) => {

  const handleCameraPress = useCallback(async () => {
    const permissionGranted = await requestCameraPermission();
    if (!permissionGranted) {
      Alert.alert('Permission Denied', 'Camera permission is required');
      return;
    }

    const result = await captureImage();
    if (!result) return;

    await processImage(result.uri);
  }, [processImage]);

  const handleGalleryPress = useCallback(async () => {
    const permissionGranted = await requestStorageReadPermission();
    if (!permissionGranted) {
      Alert.alert('Permission Denied', 'Storage permission is required to select photos');
      return;
    }

    const result = await selectImageFromGallery();
    if (!result) return;

    await processImage(result.uri);
  }, [processImage]);

  return {
    handleCameraPress,
    handleGalleryPress
  };
};

export default useMediaSelection; 