import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const HomeButtons = ({ onCameraPress, onGalleryPress, onHistoryPress }) => {
  return (
    <View style={styles.centeredButtonsContainer}>
      <TouchableOpacity style={styles.button} onPress={onCameraPress}>
        <Text style={styles.buttonText}>Camera</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={onGalleryPress}>
        <Text style={styles.buttonText}>Gallery</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={onHistoryPress}>
        <Text style={styles.buttonText}>Saved Images</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  centeredButtonsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HomeButtons; 