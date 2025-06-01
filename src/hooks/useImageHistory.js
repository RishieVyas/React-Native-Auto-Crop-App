import { useState, useCallback } from 'react';
import { loadSavedImages } from '../utils/fileUtils';

const useImageHistory = () => {
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [imageHistory, setImageHistory] = useState([]);

  const loadImageHistory = useCallback(async () => {
    const history = await loadSavedImages();
    setImageHistory(history);
  }, []);

  const handleHistoryPress = useCallback(() => {
    loadImageHistory();
    setHistoryModalVisible(true);
  }, [loadImageHistory]);

  const handleHistoryItemPress = useCallback((item) => {
    setHistoryModalVisible(false);
  }, []);

  const closeHistoryModal = useCallback(() => {
    setHistoryModalVisible(false);
  }, []);

  return {
    imageHistory,
    historyModalVisible,
    loadImageHistory,
    handleHistoryPress,
    handleHistoryItemPress,
    closeHistoryModal
  };
};

export default useImageHistory; 