import React from 'react';
import { View, StyleSheet } from 'react-native';

import ImagePreview from '../ImagePreview';
import Loader from '../Loader';

/**
 * Component that manages the display of detected and cropped images
 */
const ImageViewerSection = ({
  isDetecting,
  isCropping,
  detectedFaceImage,
  croppedImage,
  onClearDetectedImage,
  onClearCroppedImage,
  onSaveImage,
  isSaving
}) => {
  return (
    <View style={styles.imagesContainer}>
      {isDetecting ? (
        <Loader message="Detecting face..." />
      ) : detectedFaceImage ? (
        <ImagePreview
          uri={detectedFaceImage}
          title="Detected Face"
          onClose={onClearDetectedImage}
        />
      ) : null}
      
      {isCropping ? (
        <Loader message="Processing image..." />
      ) : croppedImage ? (
        <ImagePreview
          uri={croppedImage}
          title="Processed Image"
          onClose={onClearCroppedImage}
          showSaveButton={true}
          onSave={onSaveImage}
          isSaving={isSaving}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  imagesContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    gap: 12,
  },
});

export default ImageViewerSection; 