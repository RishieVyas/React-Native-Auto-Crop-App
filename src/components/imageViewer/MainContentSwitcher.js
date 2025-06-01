import React from 'react';
import { View, StyleSheet } from 'react-native';

import HomeButtons from '../HomeButtons';
import ButtonsGrid from '../ButtonsGrid';
import ImageViewerSection from './ImageViewerSection';

/**
 * Component for switching between initial home view and image processing view
 */
const MainContentSwitcher = ({
  showImageProcessing,
  homeButtonsProps,
  buttonsGridProps,
  imageViewerProps
}) => {
  if (!showImageProcessing) {
    return (
      <HomeButtons
        onCameraPress={homeButtonsProps.onCameraPress}
        onGalleryPress={homeButtonsProps.onGalleryPress}
        onHistoryPress={homeButtonsProps.onHistoryPress}
      />
    );
  }

  return (
    <View style={styles.selectedImageContent}>
      <ButtonsGrid
        onCameraPress={buttonsGridProps.onCameraPress}
        onGalleryPress={buttonsGridProps.onGalleryPress}
        onHistoryPress={buttonsGridProps.onHistoryPress}
        onCropPress={buttonsGridProps.onCropPress}
        isCropping={buttonsGridProps.isCropping}
        isDetectingFace={buttonsGridProps.isDetectingFace}
        hasFaceDetected={buttonsGridProps.hasFaceDetected}
      />

      <ImageViewerSection
        isDetecting={imageViewerProps.isDetecting}
        isCropping={imageViewerProps.isCropping}
        detectedFaceImage={imageViewerProps.detectedFaceImage}
        croppedImage={imageViewerProps.croppedImage}
        onClearDetectedImage={imageViewerProps.onClearDetectedImage}
        onClearCroppedImage={imageViewerProps.onClearCroppedImage}
        onSaveImage={imageViewerProps.onSaveImage}
        isSaving={imageViewerProps.isSaving}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  selectedImageContent: {
    flex: 1,
  },
});

export default MainContentSwitcher; 