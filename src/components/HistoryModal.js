import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet
} from 'react-native';

const HistoryItem = ({ item, onPress }) => (
  <TouchableOpacity
    style={styles.historyItem}
    onPress={() => onPress(item)}
  >
    <Image source={{ uri: item.uri }} style={styles.historyItemImage} />
    <Text style={styles.historyItemTime}>
      {item.timestamp.toLocaleString()}
    </Text>
  </TouchableOpacity>
);

const HistoryModal = ({
  visible,
  onClose,
  historyItems = [],
  onHistoryItemPress
}) => {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Saved Images</Text>

          {historyItems.length === 0 ? (
            <Text style={styles.noHistoryText}>No saved images found</Text>
          ) : (
            <FlatList
              data={historyItems}
              renderItem={({ item }) => (
                <HistoryItem item={item} onPress={onHistoryItemPress} />
              )}
              keyExtractor={item => item.id}
              style={styles.historyList}
            />
          )}

          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={onClose}
          >
            <Text style={styles.modalCloseButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
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

export default HistoryModal; 