import React, { useState, useEffect } from 'react';
import { StyleSheet, View, SafeAreaView } from 'react-native';

import HistoryModal from '../components/HistoryModal';

import { ensureDirectoriesExist } from '../utils/fileUtils';

import MainContentSwitcher from '../components/imageViewer/MainContentSwitcher';

import useFaceProcessing from '../hooks/useFaceProcessing';
import useImageHistory from '../hooks/useImageHistory';
import useImageSaving from '../hooks/useImageSaving';
import useMediaSelection from '../hooks/useMediaSelection';

/**
 * Main screen component for the app
 */
const HomeScreen = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [detectedFaceImage, setDetectedFaceImage] = useState(null);
  const [croppedImage, setCroppedImage] = useState(null);

  const {
    isDetecting,
    isCropping,
    processImage,
    handleCropPress,
    clearDetectedImage,
    clearCroppedImage
  } = useFaceProcessing({
    selectedImage,
    setSelectedImage,
    detectedFaceImage,
    setDetectedFaceImage,
    setCroppedImage
  });

  const {
    imageHistory,
    historyModalVisible,
    loadImageHistory,
    handleHistoryPress,
    handleHistoryItemPress,
    closeHistoryModal
  } = useImageHistory();

  const {
    isSaving,
    handleSaveImage
  } = useImageSaving({
    croppedImage,
    loadImageHistory
  });

  const {
    handleCameraPress,
    handleGalleryPress
  } = useMediaSelection({
    processImage
  });

  useEffect(() => {
    if (!detectedFaceImage && !croppedImage && selectedImage && !isDetecting && !isCropping) {
      setSelectedImage(null);
    }
  }, [detectedFaceImage, croppedImage, selectedImage, isDetecting, isCropping]);

  useEffect(() => {
    ensureDirectoriesExist().then(() => {
      loadImageHistory();
    });
  }, [loadImageHistory]);

  const showImageProcessing = !!selectedImage || !!detectedFaceImage;

  const homeButtonsProps = {
    onCameraPress: handleCameraPress,
    onGalleryPress: handleGalleryPress,
    onHistoryPress: handleHistoryPress
  };

  const buttonsGridProps = {
    onCameraPress: handleCameraPress,
    onGalleryPress: handleGalleryPress,
    onHistoryPress: handleHistoryPress,
    onCropPress: handleCropPress,
    isCropping,
    isDetectingFace: isDetecting,
    hasFaceDetected: !!detectedFaceImage
  };

  const imageViewerProps = {
    isDetecting,
    isCropping,
    detectedFaceImage,
    croppedImage,
    onClearDetectedImage: clearDetectedImage,
    onClearCroppedImage: clearCroppedImage,
    onSaveImage: handleSaveImage,
    isSaving
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <MainContentSwitcher
          showImageProcessing={showImageProcessing}
          homeButtonsProps={homeButtonsProps}
          buttonsGridProps={buttonsGridProps}
          imageViewerProps={imageViewerProps}
        />
      </View>

      <HistoryModal
        visible={historyModalVisible}
        onClose={closeHistoryModal}
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