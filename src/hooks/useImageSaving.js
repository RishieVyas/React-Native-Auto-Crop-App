import { useState, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import { saveProcessedImage } from '../utils/fileUtils';
import { saveToGallery } from '../utils/mediaUtils';
import { requestStorageWritePermission } from '../utils/permissionUtils';

const useImageSaving = ({ croppedImage, loadImageHistory }) => {
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveImage = useCallback(async () => {
    if (!croppedImage) {
      Alert.alert('Error', 'No processed image to save');
      return;
    }

    try {
      setIsSaving(true);
      
      const storagePermissionGranted = await requestStorageWritePermission();
      if (!storagePermissionGranted) {
        Alert.alert('Permission Denied', 'Cannot save image without storage permission');
        setIsSaving(false);
        return;
      }
      
      await saveProcessedImage(croppedImage);
      
      if (Platform.OS === 'android') {
        await saveToGallery(croppedImage);
      }
      
      loadImageHistory();
      
      Alert.alert('Success', 'Image saved successfully!');
    } catch (error) {
      Alert.alert('Save Error', `Failed to save image: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  }, [croppedImage, loadImageHistory]);

  return {
    isSaving,
    handleSaveImage
  };
};

export default useImageSaving; 