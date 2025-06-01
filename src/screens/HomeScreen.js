import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Alert, Platform, ToastAndroid, SafeAreaView } from 'react-native';

import HomeButtons from '../components/HomeButtons';
import ButtonsGrid from '../components/ButtonsGrid';
import ImagePreview from '../components/ImagePreview';
import HistoryModal from '../components/HistoryModal';
import Loader from '../components/Loader';

import { ensureDirectoriesExist, loadSavedImages, saveProcessedImage } from '../utils/fileUtils';
import { requestCameraPermission, requestStorageReadPermission, requestStorageWritePermission } from '../utils/permissionUtils';
import { captureImage, selectImageFromGallery, saveToGallery } from '../utils/mediaUtils';

import AutoCropModule from '../native/AutoCropModule';

const HomeScreen = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [detectedFaceImage, setDetectedFaceImage] = useState(null);
  const [croppedImage, setCroppedImage] = useState(null);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [imageHistory, setImageHistory] = useState([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!detectedFaceImage && !croppedImage && selectedImage && !isDetecting && !isCropping) {
      setSelectedImage(null);
    }
  }, [detectedFaceImage, croppedImage, selectedImage, isDetecting, isCropping]);

  useEffect(() => {
    ensureDirectoriesExist().then(() => {
      loadImageHistory();
    });
  }, []);

  const loadImageHistory = async () => {
    const history = await loadSavedImages();
    setImageHistory(history);
  };

  const handleCameraPress = async () => {
    const permissionGranted = await requestCameraPermission();
    if (!permissionGranted) {
      Alert.alert('Permission Denied', 'Camera permission is required');
      return;
    }

    const result = await captureImage();
    if (!result) return;


    await processImage(result.uri);
  };


  const handleGalleryPress = async () => {

    const permissionGranted = await requestStorageReadPermission();
    if (!permissionGranted) {
      Alert.alert('Permission Denied', 'Storage permission is required to select photos');
      return;
    }

    const result = await selectImageFromGallery();
    if (!result) return;

    await processImage(result.uri);
  };

  const processImage = async (imagePath) => {
    try {
      setSelectedImage(imagePath);

      setIsDetecting(true);
      setCroppedImage(null);

      await new Promise(resolve => setTimeout(resolve, 1000));

      const result = await AutoCropModule.detectFace(imagePath);

      if (result && result.success) {
        const detectedPath = result.path;

        setTimeout(() => {
          setDetectedFaceImage(detectedPath);
          setIsDetecting(false);

          if (result.message && result.message.includes("No face detected")) {
            if (Platform.OS === 'android') {
              ToastAndroid.show('No face detected. Using original image.', ToastAndroid.SHORT);
            } else {
              Alert.alert('No Face Detected', 'Using original image instead.');
            }
          }
        }, 500);
      } else {
        setDetectedFaceImage(imagePath);
        setIsDetecting(false);

        if (Platform.OS === 'android') {
          ToastAndroid.show('Face detection failed. Using original image.', ToastAndroid.SHORT);
        } else {
          Alert.alert('Detection Failed', 'Using original image instead.');
        }
      }
    } catch (error) {
      setDetectedFaceImage(imagePath);
      setIsDetecting(false);

      if (Platform.OS === 'android') {
        ToastAndroid.show('Face detection failed. Using original image.', ToastAndroid.SHORT);
      }
    }
  };

  const handleHistoryPress = () => {
    loadImageHistory();
    setHistoryModalVisible(true);
  };

  const handleCropPress = async () => {
    if (!detectedFaceImage) {
      Alert.alert('Error', 'No image to crop');
      return;
    }

    try {
      setIsCropping(true);

      const result = await AutoCropModule.processFace();

      if (result && result.success) {
        setTimeout(() => {
          setCroppedImage(result.path);
          setIsCropping(false);

          if (Platform.OS === 'android') {
            ToastAndroid.show('Image processed successfully!', ToastAndroid.SHORT);
          }
        }, 500);
      } else {
        setIsCropping(false);
        Alert.alert('Processing Error', result?.message || 'Failed to crop and process the face.');
      }
    } catch (error) {
      setIsCropping(false);
      Alert.alert('Cropping Error', `Failed to crop face: ${error.message}`);
    }
  };

  const handleHistoryItemPress = (item) => {
    setHistoryModalVisible(false);
  };

  const handleSaveImage = async () => {
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
  };

  const clearDetectedImage = () => {
    setDetectedFaceImage(null);
    setCroppedImage(null);
    setSelectedImage(null);
  };

  const clearCroppedImage = () => {
    setCroppedImage(null);
    if (detectedFaceImage === null) {
      setSelectedImage(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {!selectedImage && !detectedFaceImage ? (
          <HomeButtons
            onCameraPress={handleCameraPress}
            onGalleryPress={handleGalleryPress}
            onHistoryPress={handleHistoryPress}
          />
        ) : (
          <View style={styles.selectedImageContent}>
            <ButtonsGrid
              onCameraPress={handleCameraPress}
              onGalleryPress={handleGalleryPress}
              onHistoryPress={handleHistoryPress}
              onCropPress={handleCropPress}
              isCropping={isCropping}
              isDetectingFace={isDetecting}
              hasFaceDetected={!!detectedFaceImage}
            />

            <View style={styles.imagesContainer}>
              {isDetecting ? (
                <Loader message="Detecting face..." />
              ) : detectedFaceImage ? (
                <ImagePreview
                  uri={detectedFaceImage}
                  title="Detected Face"
                  onClose={clearDetectedImage}
                />
              ) : null}

              {isCropping ? (
                <Loader message="Processing image..." />
              ) : croppedImage ? (
                <ImagePreview
                  uri={croppedImage}
                  title="Processed Image"
                  onClose={clearCroppedImage}
                  showSaveButton={true}
                  onSave={handleSaveImage}
                  isSaving={isSaving}
                />
              ) : null}
            </View>
          </View>
        )}
      </View>

      <HistoryModal
        visible={historyModalVisible}
        onClose={() => setHistoryModalVisible(false)}
        historyItems={imageHistory}
        onHistoryItemPress={handleHistoryItemPress}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  selectedImageContent: {
    flex: 1,
  },
  imagesContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    gap: 12,
  },
});

export default HomeScreen; 