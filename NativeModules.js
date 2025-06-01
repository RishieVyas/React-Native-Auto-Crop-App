import { NativeModules, Platform } from 'react-native';

const { AutoCropModule } = NativeModules;

// For debugging
console.log('All Native Modules:', Object.keys(NativeModules));
console.log('AutoCropModule available:', !!AutoCropModule);
if (AutoCropModule) {
  console.log('AutoCropModule methods:', Object.keys(AutoCropModule));
} else {
  console.warn('AutoCropModule not found - will use fallback implementation');
}

// Create a fallback implementation for when the native module is not available
const AutoCropFallback = {
  // Detect face in an image
  detectFace: async (imagePath) => {
    console.warn('Using fallback face detection - native module not available');
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      success: true,
      path: imagePath,
      message: 'Face detection simulated'
    };
  },
  
  // Process a detected face
  processFace: async () => {
    console.warn('Using fallback face processing - native module not available');
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      success: true,
      path: null,
      message: 'Face processing simulated'
    };
  },
  
  // Original method for backward compatibility
  processImage: async (imagePath) => {
    console.warn('Using fallback crop implementation - native module not available');
    await new Promise(resolve => setTimeout(resolve, 1000));
    return imagePath;
  },
  
  // Scan a file to make it visible in the Android gallery
  scanFile: async (filePath) => {
    console.warn('Using fallback file scanning - native module not available');
    return true;
  },
  
  // Test method
  testModule: async () => {
    console.warn('Using fallback test method - native module not available');
    return 'Fallback module is working';
  },
  
  // Test face detector
  testFaceDetector: async () => {
    console.warn('Using fallback face detector test - native module not available');
    return {
      success: false,
      message: 'Face detector test not available in this environment'
    };
  }
};

// Make sure we're exporting all the expected methods
const module = AutoCropModule || AutoCropFallback;

// Verify module methods
console.log('Module methods available:', Object.keys(module));

// Create a wrapper with better error handling
const moduleWithErrorHandling = {
  detectFace: async (imagePath) => {
    try {
      console.log('Calling detectFace with path:', imagePath);
      const result = await module.detectFace(imagePath);
      console.log('detectFace result:', result);
      return result;
    } catch (error) {
      console.error('Error in detectFace:', error);
      throw error;
    }
  },
  
  processFace: async () => {
    try {
      console.log('Calling processFace');
      const result = await module.processFace();
      console.log('processFace result:', result);
      return result;
    } catch (error) {
      console.error('Error in processFace:', error);
      throw error;
    }
  },
  
  processImage: async (imagePath) => {
    try {
      console.log('Calling processImage with path:', imagePath);
      const result = await module.processImage(imagePath);
      console.log('processImage result:', result);
      return result;
    } catch (error) {
      console.error('Error in processImage:', error);
      throw error;
    }
  },
  
  scanFile: async (filePath) => {
    try {
      console.log('Calling scanFile with path:', filePath);
      const result = await module.scanFile(filePath);
      console.log('scanFile result:', result);
      return result;
    } catch (error) {
      console.error('Error in scanFile:', error);
      throw error;
    }
  },
  
  testModule: async () => {
    try {
      console.log('Calling testModule');
      const result = await module.testModule();
      console.log('testModule result:', result);
      return result;
    } catch (error) {
      console.error('Error in testModule:', error);
      throw error;
    }
  },
  
  testFaceDetector: async () => {
    try {
      console.log('Calling testFaceDetector');
      if (!module.testFaceDetector) {
        console.warn('testFaceDetector not available in native module, using fallback');
        return {
          success: false,
          message: 'Face detector test not available in this environment'
        };
      }
      const result = await module.testFaceDetector();
      console.log('testFaceDetector result:', result);
      return result;
    } catch (error) {
      console.error('Error in testFaceDetector:', error);
      throw error;
    }
  }
};

// Export the module with error handling
export default moduleWithErrorHandling; 