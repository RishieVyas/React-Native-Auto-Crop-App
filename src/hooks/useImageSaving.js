import { useState, useCallback } from 'react';
import { Platform, Alert, ToastAndroid } from 'react-native';
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
        Alert.alert(
          'Permission Denied',
          'Cannot save image without storage permission. Please grant permission in app settings.',
          [
            { text: 'OK', style: 'cancel' }
          ]
        );
        setIsSaving(false);
        return;
      }

      const savedResult = await saveProcessedImage(croppedImage);

      if (Platform.OS === 'android') {
        try {
          const galleryResult = await saveToGallery(croppedImage);
          if (!galleryResult) {
            ToastAndroid.show(
              "Saved to app storage only. Gallery save failed.",
              ToastAndroid.LONG
            );
          } else {
            ToastAndroid.show("Image saved to gallery", ToastAndroid.SHORT);
          }
        } catch (galleryError) {
          console.error("Gallery save error:", galleryError);
          ToastAndroid.show(
            "Saved to app storage only. Gallery save failed.",
            ToastAndroid.LONG
          );
        }
      }

      loadImageHistory();

      Alert.alert('Success', 'Image saved successfully!');
    } catch (error) {
      console.error("Save error:", error);
      Alert.alert('Save Error', `Failed to save image: ${error.message || 'Unknown error'}`);
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