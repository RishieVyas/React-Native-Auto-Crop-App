import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Modal,
  FlatList,
  Dimensions,
  SafeAreaView,
  ActivityIndicator,
  ToastAndroid,
  Platform,
  Alert,
  PermissionsAndroid,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import AutoCropModule from './NativeModules';

const { width, height } = Dimensions.get('window');

const Home = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [detectedFaceImage, setDetectedFaceImage] = useState(null);
  const [croppedImage, setCroppedImage] = useState(null);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [imageHistory, setImageHistory] = useState([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Effect to handle UI state when images are closed
  useEffect(() => {
    // Only reset to initial state if no images are shown AND we're not in the middle of detection
    if (!detectedFaceImage && !croppedImage && selectedImage && !isDetecting && !isCropping) {
      console.log('Resetting to initial state - clearing selectedImage');
      setSelectedImage(null);
    }
  }, [detectedFaceImage, croppedImage, selectedImage, isDetecting, isCropping]);

  // Add logging when any of the key state variables change
  useEffect(() => {
    console.log('State changed - selectedImage:', selectedImage ? 'set' : 'null');
    console.log('State changed - detectedFaceImage:', detectedFaceImage ? 'set' : 'null');
    console.log('State changed - croppedImage:', croppedImage ? 'set' : 'null');
    console.log('State changed - isDetecting:', isDetecting);
    console.log('State changed - isCropping:', isCropping);
  }, [selectedImage, detectedFaceImage, croppedImage, isDetecting, isCropping]);

  // Load image history on component mount
  useEffect(() => {
    // Ensure directory exists and then load history
    ensureDirectoryExists().then(() => {
      loadImageHistory();
    });
  }, []);

  // Ensure the ProcessedFaces and SavedFaces directories exist
  const ensureDirectoryExists = async () => {
    try {
      // Ensure ProcessedFaces directory exists (for temporary processing)
      const processedFacesDir = `${RNFS.DocumentDirectoryPath}/ProcessedFaces`;
      const processedDirExists = await RNFS.exists(processedFacesDir);
      
      if (!processedDirExists) {
        console.log('Creating ProcessedFaces directory');
        await RNFS.mkdir(processedFacesDir);
      }
      
      // Ensure SavedFaces directory exists (for user-saved images)
      const savedFacesDir = `${RNFS.DocumentDirectoryPath}/SavedFaces`;
      const savedDirExists = await RNFS.exists(savedFacesDir);
      
      if (!savedDirExists) {
        console.log('Creating SavedFaces directory');
        await RNFS.mkdir(savedFacesDir);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to create directories:', error);
      return false;
    }
  };

  const loadImageHistory = async () => {
    try {
      // Path to the SavedFaces directory where user-saved images are stored
      const savedFacesDir = `${RNFS.DocumentDirectoryPath}/SavedFaces`;
      
      // Check if the directory exists
      const dirExists = await RNFS.exists(savedFacesDir);
      if (!dirExists) {
        console.log('SavedFaces directory does not exist yet');
        setImageHistory([]);
        return;
      }
      
      // Read files from the directory
      const files = await RNFS.readDir(savedFacesDir);
      
      // Map files to history items, filtering only for saved images
      const history = files
        .filter(file => 
          (file.name.startsWith('saved_face_') && 
           (file.name.endsWith('.jpg') || file.name.endsWith('.jpeg') || file.name.endsWith('.png')))
        )
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime()) // Sort by modification time (newest first)
        .map(file => ({
          id: file.name,
          uri: `file://${file.path}`,
          timestamp: file.mtime,
        }));
      
      setImageHistory(history);
      console.log(`Loaded ${history.length} saved images`);
    } catch (error) {
      console.error('Failed to load image history:', error);
      setImageHistory([]);
    }
  };

  const handleCameraPress = async () => {
    // Check camera permission on Android
    if (Platform.OS === 'android') {
      try {
        const cameraGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'App needs access to your camera to take photos',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        
        if (cameraGranted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission Denied', 'Camera permission is required');
          return;
        }
      } catch (err) {
        console.error('Error requesting permissions:', err);
        return;
      }
    }

    // Simple camera options
    const options = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
      quality: 1,
      saveToPhotos: false,
    };

    // Show user feedback
    if (Platform.OS === 'android') {
      ToastAndroid.show('Opening camera...', ToastAndroid.SHORT);
    }
    
    // Launch camera with direct callback
    launchCamera(options, async (response) => {
      try {
        console.log('Camera response received');
        
        if (response.didCancel) {
          console.log('User cancelled camera');
          return;
        }
        
        if (response.errorCode) {
          console.error('Camera error:', response.errorMessage);
          Alert.alert('Camera Error', response.errorMessage);
          return;
        }
        
        if (!response.assets || !response.assets[0] || !response.assets[0].uri) {
          console.error('Invalid camera response - no uri');
          Alert.alert('Error', 'Failed to capture image');
          return;
        }
        
        // Get image path
        const imagePath = response.assets[0].uri;
        console.log('Image captured at:', imagePath);
        
        // IMPORTANT: First set the selected image
        setSelectedImage(imagePath);
        
        // THEN set isDetecting - order matters!
        setIsDetecting(true);
        setCroppedImage(null);
        
        // Wait a second to ensure file is available
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
          // Call the native module
          console.log('----------}}}}{{{{}}}} Detecting face in:', imagePath);
          const result = await AutoCropModule.detectFace(imagePath);
          console.log('Face detection result:', result);
          
          if (result && result.success) {
            // Make sure we update the UI with the detected face image
            const detectedPath = result.path;
            console.log('Setting detected face image to:', detectedPath);
            
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
          console.error('Error in face detection:', error);
          setDetectedFaceImage(imagePath);
          setIsDetecting(false);
          
          if (Platform.OS === 'android') {
            ToastAndroid.show('Face detection failed. Using original image.', ToastAndroid.SHORT);
          }
        }
      } catch (error) {
        console.error('Error processing camera response:', error);
        setIsDetecting(false);
        
        if (Platform.OS === 'android') {
          ToastAndroid.show('Failed to process image.', ToastAndroid.SHORT);
        }
      }
    });
  };

  const handleGalleryPress = async () => {
    // Check storage permission on Android
    if (Platform.OS === 'android') {
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
        
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission Denied', 'Storage permission is required to select photos');
          return;
        }
      } catch (err) {
        console.error('Error requesting storage permission:', err);
        return;
      }
    }

    // Simple gallery options
    const options = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
      quality: 1,
    };

    // Show user feedback
    if (Platform.OS === 'android') {
      ToastAndroid.show('Opening gallery...', ToastAndroid.SHORT);
    }
    
    // Launch gallery with direct callback
    launchImageLibrary(options, async (response) => {
      try {
        console.log('Gallery response received');
        
        if (response.didCancel) {
          console.log('User cancelled gallery selection');
          return;
        }
        
        if (response.errorCode) {
          console.error('Gallery error:', response.errorMessage);
          Alert.alert('Gallery Error', response.errorMessage);
          return;
        }
        
        if (!response.assets || !response.assets[0] || !response.assets[0].uri) {
          console.error('Invalid gallery response - no uri');
          Alert.alert('Error', 'Failed to select image');
          return;
        }
        
        // Get image path
        const imagePath = response.assets[0].uri;
        console.log('Image selected at:', imagePath);
        
        // IMPORTANT: First set the selected image
        setSelectedImage(imagePath);
        
        // THEN set isDetecting - order matters!
        setIsDetecting(true);
        setCroppedImage(null);
        
        // Wait a second to ensure file is available
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
          // Call the native module
          console.log('----------}}}}{{{{}}}} Detecting face in:', imagePath);
          const result = await AutoCropModule.detectFace(imagePath);
          console.log('Face detection result:', result);
          
          if (result && result.success) {
            // Make sure we update the UI with the detected face image
            const detectedPath = result.path;
            console.log('Setting detected face image to:', detectedPath);
            
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
          console.error('Error in face detection:', error);
          setDetectedFaceImage(imagePath);
          setIsDetecting(false);
          
          if (Platform.OS === 'android') {
            ToastAndroid.show('Face detection failed. Using original image.', ToastAndroid.SHORT);
          }
        }
      } catch (error) {
        console.error('Error processing gallery response:', error);
        setIsDetecting(false);
        
        if (Platform.OS === 'android') {
          ToastAndroid.show('Failed to process image.', ToastAndroid.SHORT);
        }
      }
    });
  };

  const handleHistoryPress = () => {
    loadImageHistory(); // Refresh history when opening modal
    setHistoryModalVisible(true);
  };

  const handleCropPress = async () => {
    if (!detectedFaceImage) {
      Alert.alert('Error', 'No image to crop');
      return;
    }

    try {
      setIsCropping(true);
      console.log('Cropping face from:', detectedFaceImage);
      
      // Call the native module to crop face and draw eye contours
      const result = await AutoCropModule.processFace();
      console.log('Crop result:', result);
      
      if (result && result.success) {
        console.log('Face cropped successfully, path:', result.path);
        
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
        console.log('Failed to crop face:', result?.message || 'Unknown error');
        setIsCropping(false);
        Alert.alert('Processing Error', result?.message || 'Failed to crop and process the face.');
      }
    } catch (error) {
      console.error('Error cropping face:', error);
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
      
      // Check for storage permission on Android
      if (Platform.OS === 'android') {
        // For Android 13+ use WRITE_EXTERNAL_STORAGE, for older versions use WRITE_EXTERNAL_STORAGE
        let storagePermissionGranted = false;
        
        try {
          if (parseInt(Platform.Version, 10) >= 33) {
            // For Android 13+
            const granted = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
              {
                title: 'Storage Permission',
                message: 'App needs access to your storage to save photos',
                buttonNeutral: 'Ask Me Later',
                buttonNegative: 'Cancel',
                buttonPositive: 'OK',
              },
            );
            storagePermissionGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
          } else {
            // For Android 12 and below
            const granted = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
              {
                title: 'Storage Permission',
                message: 'App needs access to your storage to save photos',
                buttonNeutral: 'Ask Me Later',
                buttonNegative: 'Cancel',
                buttonPositive: 'OK',
              },
            );
            storagePermissionGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
          }
          
          if (!storagePermissionGranted) {
            Alert.alert('Permission Denied', 'Cannot save image without storage permission');
            setIsSaving(false);
            return;
          }
        } catch (err) {
          console.error('Error requesting permission:', err);
          Alert.alert('Permission Error', 'Failed to request storage permission');
          setIsSaving(false);
          return;
        }
      }
      
      // Extract the actual path from the URI (remove file:// prefix)
      const imagePath = croppedImage.startsWith('file://') 
        ? croppedImage.substring(7) 
        : croppedImage;
      
      console.log('Saving image from path:', imagePath);
      
      // Create a dedicated directory for saved images in the app's internal storage
      const savedFacesDir = `${RNFS.DocumentDirectoryPath}/SavedFaces`;
      const dirExists = await RNFS.exists(savedFacesDir);
      if (!dirExists) {
        await RNFS.mkdir(savedFacesDir);
      }
      
      // Create a destination path with a specific prefix for saved images
      const timestamp = Date.now();
      const fileName = `saved_face_${timestamp}.jpg`;
      const internalDestPath = `${savedFacesDir}/${fileName}`;
      
      // First save to internal storage (for history)
      await RNFS.copyFile(imagePath, internalDestPath);
      console.log('Image saved to internal storage:', internalDestPath);
      
      // Also save to external storage (gallery) if on Android
      if (Platform.OS === 'android') {
        // Get the pictures directory path
        const externalDir = RNFS.PicturesDirectoryPath;
        const externalDestPath = `${externalDir}/AutoCrop_${timestamp}.jpg`;
        
        console.log('Saving to external destination:', externalDestPath);
        
        // Copy the file to external storage
        await RNFS.copyFile(imagePath, externalDestPath);
        console.log('Image saved to gallery:', externalDestPath);
        
        // Make it visible in the gallery
        await AutoCropModule.scanFile(externalDestPath);
      }
      
      // Refresh the history list
      loadImageHistory();
      
      Alert.alert('Success', 'Image saved successfully!');
    } catch (error) {
      console.error('Error saving image:', error);
      Alert.alert('Save Error', `Failed to save image: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const clearDetectedImage = () => {
    console.log('clearDetectedImage called');
    setDetectedFaceImage(null);
    setCroppedImage(null);
    // When both images are cleared, also clear the selected image to return to initial state
    setSelectedImage(null);
  };

  const clearCroppedImage = () => {
    console.log('clearCroppedImage called');
    setCroppedImage(null);
    // If detected face is also null, clear selected image to return to initial state
    if (detectedFaceImage === null) {
      console.log('detectedFaceImage is null, clearing selectedImage too');
      setSelectedImage(null);
    }
  };

  // Test function to diagnose native module issues
  const testNativeModule = async () => {
    try {
      if (Platform.OS === 'android') {
        ToastAndroid.show('Testing native module...', ToastAndroid.SHORT);
      }
      
      console.log('Testing AutoCropModule');
      
      // Test basic module functionality
      const testResult = await AutoCropModule.testModule();
      console.log('Basic test result:', testResult);
      
      // Test face detector
      const detectorTest = await AutoCropModule.testFaceDetector();
      console.log('Face detector test result:', detectorTest);
      
      // Show test results
      Alert.alert(
        'Native Module Test Results',
        `Basic test: ${testResult}\n\nFace detector: ${detectorTest.success ? 'Working' : 'Failed'}\n${detectorTest.message}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error testing native module:', error);
      Alert.alert('Test Error', `Failed to test native module: ${error.message}`);
    }
  };

  const renderHistoryItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.historyItem} 
      onPress={() => handleHistoryItemPress(item)}
    >
      <Image source={{ uri: item.uri }} style={styles.historyItemImage} />
      <Text style={styles.historyItemTime}>
        {item.timestamp.toLocaleString()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {!selectedImage && !detectedFaceImage ? (
          // Initial state - 3 buttons centered vertically and horizontally
          <View style={styles.centeredButtonsContainer}>
            <TouchableOpacity style={styles.button} onPress={handleCameraPress}>
              <Text style={styles.buttonText}>Camera</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.button} onPress={handleGalleryPress}>
              <Text style={styles.buttonText}>Gallery</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.button} onPress={handleHistoryPress}>
              <Text style={styles.buttonText}>Saved Images</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, { backgroundColor: '#9c27b0' }]} 
              onPress={testNativeModule}
            >
              <Text style={styles.buttonText}>Test Module</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // When image is selected - show grid buttons and images
          <View style={styles.selectedImageContent}>
            {/* 2x2 Grid of buttons */}
            <View style={styles.gridContainer}>
              <View style={styles.buttonRow}>
                <TouchableOpacity 
                  style={styles.gridButton} 
                  onPress={handleCameraPress}
                >
                  <Text style={styles.buttonText}>Camera</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.gridButton} 
                  onPress={handleGalleryPress}
                >
                  <Text style={styles.buttonText}>Gallery</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.buttonRow}>
                <TouchableOpacity 
                  style={styles.gridButton} 
                  onPress={handleHistoryPress}
                >
                  <Text style={styles.buttonText}>Saved Images</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.gridButton, 
                    (!detectedFaceImage || isDetecting || isCropping) && styles.disabledButton
                  ]} 
                  onPress={handleCropPress}
                  disabled={!detectedFaceImage || isDetecting || isCropping}
                >
                  {isCropping ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.buttonText}>Crop</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Image Cards Container */}
            <View style={styles.imagesContainer}>
              {/* Detected Face Image Card */}
              {isDetecting ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#007bff" />
                  <Text style={styles.loadingText}>Detecting face...</Text>
                </View>
              ) : detectedFaceImage ? (
                <View style={styles.imageCard}>
                  <View style={styles.imageCardHeader}>
                    <Text style={styles.imageCardTitle}>Detected Face</Text>
                    <TouchableOpacity 
                      style={styles.closeButton} 
                      onPress={clearDetectedImage}
                    >
                      <Text style={styles.closeButtonX}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <Image 
                    source={{ uri: detectedFaceImage }} 
                    style={styles.cardImage}
                    resizeMode="contain"
                    onLoad={() => console.log('Detected face image loaded successfully')}
                    onError={(error) => console.error('Error loading detected face image:', error.nativeEvent.error)}
                  />
                </View>
              ) : null}
              
              {/* Cropped Image Card */}
              {isCropping ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#007bff" />
                  <Text style={styles.loadingText}>Processing image...</Text>
                </View>
              ) : croppedImage ? (
                <View style={styles.imageCard}>
                  <View style={styles.imageCardHeader}>
                    <TouchableOpacity 
                      style={[styles.saveButton, isSaving && styles.disabledButton]} 
                      onPress={handleSaveImage}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.saveButtonText}>Save</Text>
                      )}
                    </TouchableOpacity>
                    <Text style={styles.imageCardTitle}>Processed Image</Text>
                    <TouchableOpacity 
                      style={styles.closeButton} 
                      onPress={clearCroppedImage}
                    >
                      <Text style={styles.closeButtonX}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <Image 
                    source={{ uri: croppedImage }} 
                    style={styles.cardImage}
                    resizeMode="contain"
                    onLoad={() => console.log('Cropped image loaded successfully')}
                    onError={(error) => console.error('Error loading cropped image:', error.nativeEvent.error)}
                  />
                </View>
              ) : null}
            </View>
          </View>
        )}
      </View>
      
      {/* History Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={historyModalVisible}
        onRequestClose={() => setHistoryModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Saved Images</Text>
            
            {imageHistory.length === 0 ? (
              <Text style={styles.noHistoryText}>No saved images found</Text>
            ) : (
              <FlatList
                data={imageHistory}
                renderItem={renderHistoryItem}
                keyExtractor={item => item.id}
                style={styles.historyList}
              />
            )}
            
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setHistoryModalVisible(false)}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  // Styles for initial state (3 buttons centered)
  centeredButtonsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Styles for when image is selected
  selectedImageContent: {
    flex: 1,
  },
  gridContainer: {
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginVertical: 8,
    width: 200,
    alignItems: 'center',
  },
  gridButton: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    width: '48%', // Just under half to ensure spacing
    alignItems: 'center',
    justifyContent: 'center',
    height: 45,
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  imagesContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    gap: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#007bff',
  },
  imageCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 12,
  },
  imageCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  imageCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  cardImage: {
    width: '100%',
    height: 250,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f44336',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonX: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 15,
    backgroundColor: '#4caf50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    height: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  historyList: {
    flex: 1,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  historyItemImage: {
    width: 60,
    height: 60,
    borderRadius: 4,
    marginRight: 12,
  },
  historyItemTime: {
    color: '#666',
  },
  noHistoryText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
  },
  modalCloseButton: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  modalCloseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default Home; 