import { NativeModules } from 'react-native';

const { AutoCropModule } = NativeModules;

// Create a fallback implementation for when the native module is not available
const AutoCropFallback = {
  // Detect face in an image
  detectFace: async (imagePath) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      success: true,
      path: imagePath,
      message: 'Face detection simulated'
    };
  },
  
  // Process a detected face
  processFace: async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      success: true,
      path: null,
      message: 'Face processing simulated'
    };
  },
  
  // Original method for backward compatibility
  processImage: async (imagePath) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return imagePath;
  },
  
  // Scan a file to make it visible in the Android gallery
  scanFile: async (filePath) => {
    return true;
  }
};

// Make sure we're exporting all the expected methods
const module = AutoCropModule || AutoCropFallback;

// Create a wrapper with better error handling
const moduleWithErrorHandling = {
  detectFace: async (imagePath) => {
    try {
      // Ensure the path starts with 'file://'
      let fixedPath = imagePath;
      if (!fixedPath.startsWith('file://')) {
        fixedPath = `file://${fixedPath}`;
      }
      
      const result = await module.detectFace(fixedPath);
      return result;
    } catch (error) {
      throw error;
    }
  },
  
  processFace: async () => {
    try {
      const result = await module.processFace();
      return result;
    } catch (error) {
      throw error;
    }
  },
  
  processImage: async (imagePath) => {
    try {
      // Ensure the path starts with 'file://'
      let fixedPath = imagePath;
      if (!fixedPath.startsWith('file://')) {
        fixedPath = `file://${fixedPath}`;
      }
      
      const result = await module.processImage(fixedPath);
      return result;
    } catch (error) {
      throw error;
    }
  },
  
  scanFile: async (filePath) => {
    try {
      // For scanFile, we need to remove the file:// prefix
      let fixedPath = filePath;
      if (fixedPath.startsWith('file://')) {
        fixedPath = fixedPath.substring(7);
      }
      
      const result = await module.scanFile(fixedPath);
      return result;
    } catch (error) {
      throw error;
    }
  }
};

export default moduleWithErrorHandling; 