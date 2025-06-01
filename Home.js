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
    // If both images are null but selectedImage is not null, reset to initial state
    if (!detectedFaceImage && !croppedImage && selectedImage) {
      setSelectedImage(null);
    }
  }, [detectedFaceImage, croppedImage, selectedImage]);

  // Load image history on component mount
  useEffect(() => {
    // Ensure directory exists and then load history
    ensureDirectoryExists().then(() => {
      loadImageHistory();
    });
  }, []);

  // Ensure the ProcessedFaces directory exists
  const ensureDirectoryExists = async () => {
    try {
      const processedFacesDir = `${RNFS.DocumentDirectoryPath}/ProcessedFaces`;
      const dirExists = await RNFS.exists(processedFacesDir);
      
      if (!dirExists) {
        console.log('Creating ProcessedFaces directory');
        await RNFS.mkdir(processedFacesDir);
      }
      return true;
    } catch (error) {
      console.error('Failed to create directory:', error);
      return false;
    }
  };

  const loadImageHistory = async () => {
    try {
      // Path to the ProcessedFaces directory
      const processedFacesDir = `${RNFS.DocumentDirectoryPath}/ProcessedFaces`;
      
      // Check if the directory exists
      const dirExists = await RNFS.exists(processedFacesDir);
      if (!dirExists) {
        console.log('ProcessedFaces directory does not exist yet');
        return;
      }
      
      // Read files from the directory
      const files = await RNFS.readDir(processedFacesDir);
      
      // Map files to history items
      const history = files
        .filter(file => file.name.endsWith('.jpg') || file.name.endsWith('.jpeg') || file.name.endsWith('.png'))
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime()) // Sort by modification time (newest first)
        .map(file => ({
          id: file.name,
          uri: `file://${file.path}`,
          timestamp: file.mtime,
        }));
      
      setImageHistory(history);
    } catch (error) {
      console.error('Failed to load image history:', error);
    }
  };

  const handleImageSelected = async (response) => {
    if (response.didCancel) {
      console.log('User cancelled selection');
      return;
    } 
    
    if (response.errorCode) {
      console.log('Image selection error:', response.errorMessage);
      return;
    }
    
    const imagePath = response.assets[0].uri;
    setSelectedImage(imagePath);
    setCroppedImage(null);
    
    // Automatically detect face after image selection
    try {
      setIsDetecting(true);
      console.log('Detecting face in:', imagePath);
      
      // Call the native module to detect face
      const result = await AutoCropModule.detectFace(imagePath);
      
      if (result.success) {
        console.log('Detection successful:', result);
        setDetectedFaceImage(result.path);
        
        // Show message if no face was detected
        if (result.message && result.message.includes("No face detected")) {
          console.log('No face detected:', result.message);
          if (Platform.OS === 'android') {
            ToastAndroid.show('No face detected. Using original image.', ToastAndroid.SHORT);
          } else {
            Alert.alert('No Face Detected', 'Using original image instead.');
          }
        }
      } else {
        console.log('Detection failed:', result.message);
        setDetectedFaceImage(imagePath); // Use original image if detection failed
        if (Platform.OS === 'android') {
          ToastAndroid.show('Face detection failed. Using original image.', ToastAndroid.SHORT);
        } else {
          Alert.alert('Detection Failed', 'Using original image instead.');
        }
      }
    } catch (error) {
      console.error('Error detecting face:', error);
      setDetectedFaceImage(imagePath); // Use original image on error
      Alert.alert('Detection Error', `Failed to detect face: ${error.message}`);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleCameraPress = async () => {
    // Check camera permission on Android
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'App needs access to your camera to take photos',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission Denied', 'Camera permission is required to take photos');
          return;
        }
      } catch (err) {
        console.error('Error requesting camera permission:', err);
        return;
      }
    }

    const options = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
    };

    launchCamera(options, handleImageSelected);
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

    const options = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
    };

    launchImageLibrary(options, handleImageSelected);
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
        console.log('Face cropped successfully:', result);
        setCroppedImage(result.path);
        
        // Show success message
        if (Platform.OS === 'android') {
          ToastAndroid.show('Image processed successfully!', ToastAndroid.SHORT);
        }
      } else {
        console.log('Failed to crop face:', result?.message || 'Unknown error');
        Alert.alert('Processing Error', result?.message || 'Failed to crop and process the face.');
      }
    } catch (error) {
      console.error('Error cropping face:', error);
      Alert.alert('Cropping Error', `Failed to crop face: ${error.message}`);
    } finally {
      setIsCropping(false);
    }
  };

  const handleHistoryItemPress = (item) => {
    setSelectedImage(item.uri);
    setDetectedFaceImage(item.uri);
    setCroppedImage(null);
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
      
      // Get the pictures directory path
      const externalDir = Platform.OS === 'android' 
        ? RNFS.PicturesDirectoryPath 
        : RNFS.DocumentDirectoryPath;
      
      // Create a destination path
      const fileName = `AutoCrop_${Date.now()}.jpg`;
      const destPath = `${externalDir}/${fileName}`;
      
      console.log('Saving to destination:', destPath);
      
      // Copy the file to external storage
      await RNFS.copyFile(imagePath, destPath);
      console.log('Image saved to:', destPath);
      
      // Make it visible in the gallery (Android only)
      if (Platform.OS === 'android') {
        // Using native module to scan media
        await AutoCropModule.scanFile(destPath);
      }
      
      Alert.alert('Success', 'Image saved to gallery successfully!');
    } catch (error) {
      console.error('Error saving image:', error);
      Alert.alert('Save Error', `Failed to save image: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const clearDetectedImage = () => {
    setDetectedFaceImage(null);
    setCroppedImage(null);
    // When both images are cleared, also clear the selected image to return to initial state
    setSelectedImage(null);
  };

  const clearCroppedImage = () => {
    setCroppedImage(null);
    // If detected face is also null, clear selected image to return to initial state
    if (detectedFaceImage === null) {
      setSelectedImage(null);
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
        {!selectedImage ? (
          // Initial state - 3 buttons centered vertically and horizontally
          <View style={styles.centeredButtonsContainer}>
            <TouchableOpacity style={styles.button} onPress={handleCameraPress}>
              <Text style={styles.buttonText}>Camera</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.button} onPress={handleGalleryPress}>
              <Text style={styles.buttonText}>Gallery</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.button} onPress={handleHistoryPress}>
              <Text style={styles.buttonText}>View History</Text>
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
                  <Text style={styles.buttonText}>View History</Text>
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
                  />
                </View>
              ) : null}
              
              {/* Cropped Image Card */}
              {croppedImage ? (
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
            <Text style={styles.modalTitle}>Image History</Text>
            
            {imageHistory.length === 0 ? (
              <Text style={styles.noHistoryText}>No images in history</Text>
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
    height: 180,
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