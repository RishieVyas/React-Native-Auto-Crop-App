import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';

const ButtonsGrid = ({ 
  onCameraPress, 
  onGalleryPress, 
  onHistoryPress, 
  onCropPress,
  isCropping = false,
  isDetectingFace = false,
  hasFaceDetected = false
}) => {
  return (
    <View style={styles.gridContainer}>
      <View style={styles.buttonRow}>
        <TouchableOpacity 
          style={styles.gridButton} 
          onPress={onCameraPress}
        >
          <Text style={styles.buttonText}>Camera</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.gridButton} 
          onPress={onGalleryPress}
        >
          <Text style={styles.buttonText}>Gallery</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.buttonRow}>
        <TouchableOpacity 
          style={styles.gridButton} 
          onPress={onHistoryPress}
        >
          <Text style={styles.buttonText}>Saved Images</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.gridButton, 
            (!hasFaceDetected || isDetectingFace || isCropping) && styles.disabledButton
          ]} 
          onPress={onCropPress}
          disabled={!hasFaceDetected || isDetectingFace || isCropping}
        >
          {isCropping ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Crop</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  gridContainer: {
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
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
});

export default ButtonsGrid; 