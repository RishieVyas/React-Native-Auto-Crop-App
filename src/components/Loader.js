import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

const Loader = ({ message = 'Loading...', color = '#007bff', size = 'large' }) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={color} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginTop: 10,
    fontSize: 16,
    color: '#007bff',
  },
});

export default Loader; 