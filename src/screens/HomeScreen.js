import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Alert, Platform, ToastAndroid, SafeAreaView } from 'react-native';

// Components
import HomeButtons from '../components/HomeButtons';
import ButtonsGrid from '../components/ButtonsGrid';
import ImagePreview from '../components/ImagePreview';
import HistoryModal from '../components/HistoryModal';
import Loader from '../components/Loader';

// Utilities
import { ensureDirectoriesExist, loadSavedImages, saveProcessedImage } from '../utils/fileUtils';
import { requestCameraPermission, requestStorageReadPermission, requestStorageWritePermission } from '../utils/permissionUtils';
import { captureImage, selectImageFromGallery, saveToGallery } from '../utils/mediaUtils';

// Native module
import AutoCropModule from '../native/AutoCropModule';

const HomeScreen = () => {
  // State variables
  const [selectedImage, setSelectedImage] = useState(null);
  const [detectedFaceImage, setDetectedFaceImage] = useState(null);
  const [croppedImage, setCroppedImage] = useState(null);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [imageHistory, setImageHistory] = useState([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Effect to reset state when images are closed
  useEffect(() => {
    // Only reset to initial state if no images are shown AND we're not in the middle of detection
    if (!detectedFaceImage && !croppedImage && selectedImage && !isDetecting && !isCropping) {
      setSelectedImage(null);
    }
  }, [detectedFaceImage, croppedImage, selectedImage, isDetecting, isCropping]);

  // Load image history on component mount
  useEffect(() => {
    // Ensure directory exists and then load history
    ensureDirectoriesExist().then(() => {
      loadImageHistory();
    });
  }, []);

  // Load saved images from storage
  const loadImageHistory = async () => {
    const history = await loadSavedImages();
    setImageHistory(history);
  };

  // Handle camera button press
  const handleCameraPress = async () => {
    // Check camera permission
    const permissionGranted = await requestCameraPermission();
    if (!permissionGranted) {
      Alert.alert('Permission Denied', 'Camera permission is required');
      return;
    }

    // Capture image
    const result = await captureImage();
    if (!result) return;
    
    // Process the captured image
    await processImage(result.uri);
  };

  // Handle gallery button press
  const handleGalleryPress = async () => {
    // Check storage permission
    const permissionGranted = await requestStorageReadPermission();
    if (!permissionGranted) {
      Alert.alert('Permission Denied', 'Storage permission is required to select photos');
      return;
    }

    // Select image from gallery
    const result = await selectImageFromGallery();
    if (!result) return;
    
    // Process the selected image
    await processImage(result.uri);
  };

  // Process an image with face detection
  const processImage = async (imagePath) => {
    try {
      // IMPORTANT: First set the selected image
      setSelectedImage(imagePath);
      
      // THEN set isDetecting - order matters!
      setIsDetecting(true);
      setCroppedImage(null);
      
      // Wait a second to ensure file is available
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Call the native module to detect faces
      const result = await AutoCropModule.detectFace(imagePath);
      
      if (result && result.success) {
        // Make sure we update the UI with the detected face image
        const detectedPath = result.path;
        
        // Force update with setTimeout to ensure UI updates
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

  // Handle history button press
  const handleHistoryPress = () => {
    loadImageHistory(); // Refresh history when opening modal
    setHistoryModalVisible(true);
  };

  // Handle crop button press
  const handleCropPress = async () => {
    if (!detectedFaceImage) {
      Alert.alert('Error', 'No image to crop');
      return;
    }

    try {
      setIsCropping(true);
      
      // Call the native module to crop face and draw eye contours
      const result = await AutoCropModule.processFace();
      
      if (result && result.success) {
        // Force update with setTimeout to ensure UI updates
        setTimeout(() => {
          setCroppedImage(result.path);
          setIsCropping(false);
          
          // Show success message
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

  // Handle history item press
  const handleHistoryItemPress = (item) => {
    // Only close the modal, no other functionality
    setHistoryModalVisible(false);
  };

  // Handle save image button press
  const handleSaveImage = async () => {
    if (!croppedImage) {
      Alert.alert('Error', 'No processed image to save');
      return;
    }

    try {
      setIsSaving(true);
      
      // Check for storage permission on Android
      const storagePermissionGranted = await requestStorageWritePermission();
      if (!storagePermissionGranted) {
        Alert.alert('Permission Denied', 'Cannot save image without storage permission');
        setIsSaving(false);
        return;
      }
      
      // Save to internal storage (for history)
      await saveProcessedImage(croppedImage);
      
      // Also save to external storage (gallery) if on Android
      if (Platform.OS === 'android') {
        await saveToGallery(croppedImage);
      }
      
      // Refresh the history list
      loadImageHistory();
      
      Alert.alert('Success', 'Image saved successfully!');
    } catch (error) {
      Alert.alert('Save Error', `Failed to save image: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Clear the detected image
  const clearDetectedImage = () => {
    setDetectedFaceImage(null);
    setCroppedImage(null);
    // When both images are cleared, also clear the selected image to return to initial state
    setSelectedImage(null);
  };

  // Clear the cropped image
  const clearCroppedImage = () => {
    setCroppedImage(null);
    // If detected face is also null, clear selected image to return to initial state
    if (detectedFaceImage === null) {
      setSelectedImage(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {!selectedImage && !detectedFaceImage ? (
          // Initial state - 3 buttons centered vertically and horizontally
          <HomeButtons 
            onCameraPress={handleCameraPress}
            onGalleryPress={handleGalleryPress}
            onHistoryPress={handleHistoryPress}
          />
        ) : (
          // When image is selected - show grid buttons and images
          <View style={styles.selectedImageContent}>
            {/* 2x2 Grid of buttons */}
            <ButtonsGrid 
              onCameraPress={handleCameraPress}
              onGalleryPress={handleGalleryPress}
              onHistoryPress={handleHistoryPress}
              onCropPress={handleCropPress}
              isCropping={isCropping}
              isDetectingFace={isDetecting}
              hasFaceDetected={!!detectedFaceImage}
            />
            
            {/* Image Cards Container */}
            <View style={styles.imagesContainer}>
              {/* Detected Face Image Card */}
              {isDetecting ? (
                <Loader message="Detecting face..." />
              ) : detectedFaceImage ? (
                <ImagePreview 
                  uri={detectedFaceImage}
                  title="Detected Face"
                  onClose={clearDetectedImage}
                />
              ) : null}
              
              {/* Cropped Image Card */}
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
      
      {/* History Modal */}
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
  // Styles for when image is selected
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