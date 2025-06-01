import { NativeModules } from 'react-native';

const { AutoCropModule } = NativeModules;

const AutoCropFallback = {
  detectFace: async (imagePath) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      success: true,
      path: imagePath,
      message: 'Face detection simulated'
    };
  },

  processFace: async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      success: true,
      path: null,
      message: 'Face processing simulated'
    };
  },

  processImage: async (imagePath) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return imagePath;
  },

  scanFile: async (filePath) => {
    return true;
  }
};

const module = AutoCropModule || AutoCropFallback;

const moduleWithErrorHandling = {
  detectFace: async (imagePath) => {
    try {
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