import { useState } from 'react';
import { Platform, ToastAndroid, Alert } from 'react-native';
import AutoCropModule from '../native/AutoCropModule';

/**
 * Custom hook to manage face detection and processing
 */
const useFaceProcessing = ({
  setSelectedImage,
  selectedImage,
  setDetectedFaceImage,
  detectedFaceImage,
  setCroppedImage
}) => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [isCropping, setIsCropping] = useState(false);

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

  return {
    isDetecting,
    isCropping,
    processImage,
    handleCropPress,
    clearDetectedImage,
    clearCroppedImage
  };
};

export default useFaceProcessing; 