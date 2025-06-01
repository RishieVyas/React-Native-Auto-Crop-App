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
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import RNFS from 'react-native-fs';

const { width, height } = Dimensions.get('window');

const Home = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [imageHistory, setImageHistory] = useState([]);
  
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

  const handleCameraPress = () => {
    const options = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
    };

    launchCamera(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled camera');
      } else if (response.errorCode) {
        console.log('Camera Error: ', response.errorMessage);
      } else {
        setSelectedImage(response.assets[0].uri);
      }
    });
  };

  const handleGalleryPress = () => {
    const options = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled gallery');
      } else if (response.errorCode) {
        console.log('Gallery Error: ', response.errorMessage);
      } else {
        setSelectedImage(response.assets[0].uri);
      }
    });
  };

  const handleHistoryPress = () => {
    loadImageHistory(); // Refresh history when opening modal
    setHistoryModalVisible(true);
  };

  const handleCropPress = () => {
    // This will be implemented later
    console.log('Crop button pressed');
  };

  const handleCloseImage = () => {
    setSelectedImage(null);
  };

  const handleHistoryItemPress = (item) => {
    setSelectedImage(item.uri);
    setHistoryModalVisible(false);
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
      {/* Main content */}
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
          // When image is selected - 2x2 grid buttons at top and image below
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
                  style={styles.gridButton} 
                  onPress={handleCropPress}
                >
                  <Text style={styles.buttonText}>Crop</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Selected Image with close button */}
            <View style={styles.imageContainer}>
              <View style={styles.imageHeaderContainer}>
                <Text style={styles.imageTitle}>Selected Image</Text>
                <TouchableOpacity 
                  style={styles.closeButton} 
                  onPress={handleCloseImage}
                >
                  <Text style={styles.closeButtonX}>✕</Text>
                </TouchableOpacity>
              </View>
              
              <Image 
                source={{ uri: selectedImage }} 
                style={styles.selectedImage}
                resizeMode="contain"
              />
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
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  imageContainer: {
    flex: 1,
    marginTop: 8,
  },
  imageHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  imageTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
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
  selectedImage: {
    flex: 1,
    width: '100%',
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
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