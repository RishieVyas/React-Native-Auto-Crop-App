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
        
        // Also request storage permission
        const storagePermission = parseInt(Platform.Version, 10) >= 33
          ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
          : PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE;
          
        const storageGranted = await PermissionsAndroid.request(storagePermission, {
          title: 'Storage Permission',
          message: 'App needs access to your storage to save photos',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        });
        
        if (cameraGranted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission Denied', 'Camera permission is required');
          return;
        }
        
        if (storageGranted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission Denied', 'Storage permission is required');
          return;
        }
      } catch (err) {
        console.error('Error requesting permissions:', err);
        return;
      }
    }

    // Set loading state immediately
    setIsDetecting(true);
    
    // Prepare a custom file path for the captured image
    const timestamp = Date.now();
    const customCaptureDir = `${RNFS.CachesDirectoryPath}/camera_captures`;
    
    try {
      // Create directory if it doesn't exist
      await RNFS.mkdir(customCaptureDir).catch(() => {});
      
      // Create a custom path for the image
      const customImagePath = `${customCaptureDir}/capture_${timestamp}.jpg`;
      
      console.log('Launching camera with custom save path:', customImagePath);
      
      // Feedback to user
      if (Platform.OS === 'android') {
        ToastAndroid.show('Opening camera...', ToastAndroid.SHORT);
      }
      
      // Custom options with the path
      const options = {
        mediaType: 'photo',
        saveToPhotos: false,
        includeBase64: true,
        maxHeight: 2000,
        maxWidth: 2000,
        quality: 0.8,
        includeExtra: true,
        cameraType: 'back',
      };
      
      // Launch camera with promise-based approach
      new Promise(resolve => {
        launchCamera(options, response => {
          console.log('Camera response received:', JSON.stringify(response));
          resolve(response);
        });
      }).then(async response => {
        // Handle cancellation
        if (response.didCancel) {
          console.log('User cancelled camera');
          setIsDetecting(false);
          return;
        }
        
        // Handle errors
        if (response.errorCode) {
          console.error('Camera error:', response.errorMessage);
          Alert.alert('Camera Error', response.errorMessage);
          setIsDetecting(false);
          return;
        }
        
        // Validate response
        if (!response.assets || !response.assets[0]) {
          console.error('Invalid camera response - no assets');
          Alert.alert('Error', 'Failed to capture image');
          setIsDetecting(false);
          return;
        }
        
        // Try to get image data - either URI or base64
        const asset = response.assets[0];
        
        if (!asset.uri && !asset.base64) {
          console.error('No image data in response');
          Alert.alert('Error', 'No image data received from camera');
          setIsDetecting(false);
          return;
        }
        
        // Create a file path that we control
        let finalImagePath;
        
        // If we have base64 data, save it to our controlled location
        if (asset.base64) {
          console.log('Using base64 data to create image file');
          
          try {
            await RNFS.writeFile(customImagePath, asset.base64, 'base64');
            finalImagePath = `file://${customImagePath}`;
            console.log('Created image file at:', finalImagePath);
          } catch (error) {
            console.error('Error saving base64 image:', error);
            Alert.alert('Error', 'Failed to save captured image');
            setIsDetecting(false);
            return;
          }
        } 
        // If no base64 but we have URI, try to copy the file
        else if (asset.uri) {
          const sourceUri = asset.uri.startsWith('file://') 
            ? asset.uri.substring(7) 
            : asset.uri;
            
          try {
            console.log('Copying image from URI:', sourceUri);
            console.log('To destination:', customImagePath);
            
            // Check if source exists
            const sourceExists = await RNFS.exists(sourceUri);
            if (!sourceExists) {
              console.error('Source image does not exist:', sourceUri);
              Alert.alert('Error', 'Source image file not found');
              setIsDetecting(false);
              return;
            }
            
            // Copy the file
            await RNFS.copyFile(sourceUri, customImagePath);
            finalImagePath = `file://${customImagePath}`;
            console.log('Copied image file to:', finalImagePath);
          } catch (error) {
            console.error('Error copying image file:', error);
            Alert.alert('Error', 'Failed to process captured image');
            setIsDetecting(false);
            return;
          }
        }
        
        // Verify the final image path exists
        const finalPathWithoutPrefix = finalImagePath.startsWith('file://') 
          ? finalImagePath.substring(7) 
          : finalImagePath;
          
        const imageExists = await RNFS.exists(finalPathWithoutPrefix);
        
        if (!imageExists) {
          console.error('Final image file does not exist:', finalImagePath);
          Alert.alert('Error', 'Failed to create image file');
          setIsDetecting(false);
          return;
        }
        
        console.log('Image file confirmed to exist:', finalImagePath);
        
        // Update UI state with the image
        setSelectedImage(finalImagePath);
        setCroppedImage(null);
        
        // Process the image with face detection
        try {
          console.log('Processing image with face detection:', finalImagePath);
          
          // Call the native module
          const result = await AutoCropModule.detectFace(finalImagePath);
          console.log('Face detection result:', result);
          
          if (result.success) {
            setDetectedFaceImage(result.path);
            
            if (result.message && result.message.includes("No face detected")) {
              console.log('No face detected in image');
              if (Platform.OS === 'android') {
                ToastAndroid.show('No face detected. Using original image.', ToastAndroid.SHORT);
              } else {
                Alert.alert('No Face Detected', 'Using original image instead.');
              }
            }
          } else {
            console.error('Face detection failed:', result.message);
            setDetectedFaceImage(finalImagePath);
            
            if (Platform.OS === 'android') {
              ToastAndroid.show('Face detection failed. Using original image.', ToastAndroid.SHORT);
            } else {
              Alert.alert('Detection Failed', 'Using original image instead.');
            }
          }
        } catch (error) {
          console.error('Error in face detection:', error);
          setDetectedFaceImage(finalImagePath);
          Alert.alert('Processing Error', 'Failed to detect face in image');
        } finally {
          setIsDetecting(false);
        }
      }).catch(error => {
        console.error('Error in camera capture process:', error);
        Alert.alert('Error', 'Failed to process camera capture');
        setIsDetecting(false);
      });
    } catch (error) {
      console.error('Error setting up camera capture:', error);
      Alert.alert('Error', 'Failed to set up camera capture');
      setIsDetecting(false);
    }
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

    // Set loading state immediately
    setIsDetecting(true);
    
    // Prepare a custom file path for the selected image
    const timestamp = Date.now();
    const customGalleryDir = `${RNFS.CachesDirectoryPath}/gallery_selections`;
    
    try {
      // Create directory if it doesn't exist
      await RNFS.mkdir(customGalleryDir).catch(() => {});
      
      // Create a custom path for the image
      const customImagePath = `${customGalleryDir}/gallery_${timestamp}.jpg`;
      
      console.log('Launching gallery with custom save path:', customImagePath);
      
      // Feedback to user
      if (Platform.OS === 'android') {
        ToastAndroid.show('Opening gallery...', ToastAndroid.SHORT);
      }
      
      // Launch image library with options
      const options = {
        mediaType: 'photo',
        includeBase64: true,
        maxHeight: 2000,
        maxWidth: 2000,
        quality: 0.8,
        includeExtra: true,
      };
      
      // Launch gallery with promise-based approach
      new Promise(resolve => {
        launchImageLibrary(options, response => {
          console.log('Gallery response received:', JSON.stringify(response));
          resolve(response);
        });
      }).then(async response => {
        // Handle cancellation
        if (response.didCancel) {
          console.log('User cancelled gallery selection');
          setIsDetecting(false);
          return;
        }
        
        // Handle errors
        if (response.errorCode) {
          console.error('Gallery error:', response.errorMessage);
          Alert.alert('Gallery Error', response.errorMessage);
          setIsDetecting(false);
          return;
        }
        
        // Validate response
        if (!response.assets || !response.assets[0]) {
          console.error('Invalid gallery response - no assets');
          Alert.alert('Error', 'Failed to select image');
          setIsDetecting(false);
          return;
        }
        
        // Try to get image data - either URI or base64
        const asset = response.assets[0];
        
        if (!asset.uri && !asset.base64) {
          console.error('No image data in response');
          Alert.alert('Error', 'No image data received from gallery');
          setIsDetecting(false);
          return;
        }
        
        // Create a file path that we control
        let finalImagePath;
        
        // If we have base64 data, save it to our controlled location
        if (asset.base64) {
          console.log('Using base64 data to create image file');
          
          try {
            await RNFS.writeFile(customImagePath, asset.base64, 'base64');
            finalImagePath = `file://${customImagePath}`;
            console.log('Created image file at:', finalImagePath);
          } catch (error) {
            console.error('Error saving base64 image:', error);
            Alert.alert('Error', 'Failed to save selected image');
            setIsDetecting(false);
            return;
          }
        } 
        // If no base64 but we have URI, try to copy the file
        else if (asset.uri) {
          const sourceUri = asset.uri.startsWith('file://') 
            ? asset.uri.substring(7) 
            : asset.uri;
            
          try {
            console.log('Copying image from URI:', sourceUri);
            console.log('To destination:', customImagePath);
            
            // Check if source exists
            const sourceExists = await RNFS.exists(sourceUri);
            if (!sourceExists) {
              console.error('Source image does not exist:', sourceUri);
              Alert.alert('Error', 'Source image file not found');
              setIsDetecting(false);
              return;
            }
            
            // Copy the file
            await RNFS.copyFile(sourceUri, customImagePath);
            finalImagePath = `file://${customImagePath}`;
            console.log('Copied image file to:', finalImagePath);
          } catch (error) {
            console.error('Error copying image file:', error);
            Alert.alert('Error', 'Failed to process selected image');
            setIsDetecting(false);
            return;
          }
        }
        
        // Verify the final image path exists
        const finalPathWithoutPrefix = finalImagePath.startsWith('file://') 
          ? finalImagePath.substring(7) 
          : finalImagePath;
          
        const imageExists = await RNFS.exists(finalPathWithoutPrefix);
        
        if (!imageExists) {
          console.error('Final image file does not exist:', finalImagePath);
          Alert.alert('Error', 'Failed to create image file');
          setIsDetecting(false);
          return;
        }
        
        console.log('Image file confirmed to exist:', finalImagePath);
        
        // Update UI state with the image
        setSelectedImage(finalImagePath);
        setCroppedImage(null);
        
        // Process the image with face detection
        try {
          console.log('Processing image with face detection:', finalImagePath);
          
          // Call the native module
          const result = await AutoCropModule.detectFace(finalImagePath);
          console.log('Face detection result:', result);
          
          if (result.success) {
            setDetectedFaceImage(result.path);
            
            if (result.message && result.message.includes("No face detected")) {
              console.log('No face detected in image');
              if (Platform.OS === 'android') {
                ToastAndroid.show('No face detected. Using original image.', ToastAndroid.SHORT);
              } else {
                Alert.alert('No Face Detected', 'Using original image instead.');
              }
            }
          } else {
            console.error('Face detection failed:', result.message);
            setDetectedFaceImage(finalImagePath);
            
            if (Platform.OS === 'android') {
              ToastAndroid.show('Face detection failed. Using original image.', ToastAndroid.SHORT);
            } else {
              Alert.alert('Detection Failed', 'Using original image instead.');
            }
          }
        } catch (error) {
          console.error('Error in face detection:', error);
          setDetectedFaceImage(finalImagePath);
          Alert.alert('Processing Error', 'Failed to detect face in image');
        } finally {
          setIsDetecting(false);
        }
      }).catch(error => {
        console.error('Error in gallery selection process:', error);
        Alert.alert('Error', 'Failed to process gallery selection');
        setIsDetecting(false);
      });
    } catch (error) {
      console.error('Error setting up gallery selection:', error);
      Alert.alert('Error', 'Failed to set up gallery selection');
      setIsDetecting(false);
    }
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
              <Text style={styles.buttonText}>Saved Images</Text>
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