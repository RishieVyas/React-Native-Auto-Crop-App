# React Native Auto Crop App Documentation

## Overview

The AutoCropApp is a React Native application designed for Android that demonstrates the integration of ML Kit's face detection capabilities with React Native. The app allows users to select images from their camera or gallery, automatically detect faces, and apply special processing that includes face cropping and eye contour drawing using a custom native Android module.

Key features include:
- Image selection from camera or gallery
- Face detection using ML Kit
- Automatic face cropping and eye contour drawing
- Saving processed images to device storage
- Viewing image processing history

## Architecture

### Project Structure

```
AutoCropApp/
├── android/                    # Native Android code
│   └── app/
│       └── src/
│           └── main/
│               ├── java/       # Java bridge code
│               └── jniLibs/    # .aar library file
├── ios/                        # iOS placeholder (not implemented)
├── src/
│   ├── components/             # Reusable UI components
│   ├── hooks/                  # Custom React hooks
│   ├── native/                 # Native module JS interfaces
│   ├── screens/                # App screens
│   └── utils/                  # Utility functions
├── __mocks__/                  # Mock implementations for testing
├── __tests__/                  # Test files
└── App.js                      # Entry point
```

### Responsibility Division

- **Screens**: Container components that manage the overall UI structure and integrate the various hooks and components
- **Components**: Reusable UI elements like buttons, image previews, and modals
- **Hooks**: Encapsulate complex business logic and state management for specific features
- **Native Modules**: JavaScript interfaces that communicate with the native Android code
- **Utils**: Utility functions for common operations like file management and permissions

## Native Android Library Integration

### Building the .aar Library with ML Kit

The native functionality is encapsulated in an Android Archive (.aar) file that leverages Google's ML Kit for face detection. The library was built as a separate Android project with:

1. Dependencies on ML Kit Face Detection
2. Custom Java classes for processing images
3. Implementation of face detection algorithms
4. Methods for drawing eye contours on detected faces
5. Packaging as an Android Archive (.aar) file

### Integration with React Native

The .aar file is integrated into the React Native app through:

1. Placement in the `android/facedetection/build/outputs/aar` directory
2. Configuration of build.gradle to include the library
3. Creation of a Native Module bridge to expose Java methods to JavaScript

### Bridge Setup Process

1. **Native Module Creation**: FaceDetectionModule.java

2. **Module Package Registration**: MainApplication.java

3. **JavaScript Interface**: src/native/AutoCropModule.js

## Workflow

### Image Selection

1. User initiates image selection by pressing either the Camera or Gallery button
2. The app checks for required permissions (camera or storage)
3. If permissions are granted, the app launches either the camera or gallery picker
4. The selected image's URI is returned to the app

### Native Processing

1. The image URI is passed to the native module for face detection
2. ML Kit analyzes the image to locate facial features
3. If a face is detected, the app returns the face location data (x, y, width, height)
4. The face location is used to crop the image around the face
5. Eye contours are drawn on the cropped image
6. The processed image is saved to a temporary location and its path is returned to JS

### UI Rendering and Results

1. The app displays the detected face image
2. User can press "Process" to apply additional eye contour processing
3. The processed image is displayed with eye contours drawn
4. User can save the processed image to the gallery and app's history

## Code Summary

### Key Modules

#### Native Bridge (AutoCropModule)

Provides the interface between JavaScript and the native Android library:
- `detectFace(imagePath)`: Detects faces in an image and returns the face location
- `cropAndDrawEyes(imagePath, faceX, faceY, faceWidth, faceHeight)`: Crops the image to the face area and draws eye contours
- `scanFile(path)`: Notifies the Android media scanner about new images

#### Hooks

**useFaceProcessing**
Manages the state and logic for face detection and processing:
- Tracks the selected image, detected face, and processed image
- Handles the face detection and processing workflow
- Manages loading states during processing

**useMediaSelection**
Handles media selection from camera or gallery:
- Manages permission requests
- Launches the appropriate picker
- Returns the selected image for processing

**useImageSaving**
Manages saving processed images:
- Saves images to both the app's internal storage and the device gallery
- Handles permission requests for storage
- Manages loading states during saving

**useImageHistory**
Manages the history of saved images:
- Loads saved images from app storage
- Handles the history modal visibility
- Provides functions for viewing history items

#### Utilities

**permissionUtils**
Handles permission requests for various Android versions:
- Camera permissions
- Storage read/write permissions with version-specific handling

**mediaUtils**
Manages interactions with the device's media:
- Camera capture
- Gallery selection
- Saving to gallery

**fileUtils**
Handles file operations:
- Creating necessary directories
- Saving processed images
- Loading saved images

#### Screens

**HomeScreen**
The main application screen that:
- Integrates all hooks and components
- Manages the overall UI state
- Handles transitions between different views

#### Components

**ImagePreview**
Displays images with controls for:
- Viewing the selected/processed image
- Closing the preview
- Saving the processed image

**HomeButtons**
Provides the main navigation buttons:
- Camera button
- Gallery button
- History button

**HistoryModal**
Displays the history of saved images:
- List of previously processed images
- Ability to select and view past images

## Instructions to Build and Run

### Development Environment Setup

1. Install Node.js and npm
2. Install React Native CLI:
   ```
   npm install -g react-native-cli
   ```
3. Install Android Studio and set up an emulator or connect a physical device

### Running the Project

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the Metro bundler:
   ```
   npx react-native start
   ```
4. Run the app on an Android device or emulator:
   ```
   npx react-native run-android
   ```

## Assumptions and Security Considerations

### Assumptions

1. **Android-only Support**: The app is designed specifically for Android and does not support iOS
2. **Device Compatibility**: The app targets Android API level 21+ (Android 5.0 Lollipop and above)
3. **ML Kit Availability**: The app assumes Google Play Services are available for ML Kit functionality
4. **Storage Access**: The app assumes it will be granted storage permissions for saving images

### Security Considerations

1. **Permission Handling**:
   - The app requests only necessary permissions (camera, storage)
   - Different permission models are handled for different Android versions
   - Permissions are requested at runtime with clear explanations

2. **File Access**:
   - Images are stored in app-specific directories when possible
   - For Android 10+ (API 29+), the app uses scoped storage
   - For older versions, proper storage permissions are requested

3. **Data Storage**:
   - All data is stored locally on the device
   - No data is transmitted over the network
   - Original and processed images are kept in private app storage

### UI/UX Decisions

1. **Simple Navigation**: Three main buttons provide clear entry points to functionality
2. **Processing Visibility**: Loading indicators show when processing is occurring
3. **Preview Cards**: Image previews are shown in cards with intuitive controls
4. **Step-by-step Flow**: The app guides users through a natural workflow:
   - Select an image
   - View detected face
   - Process face and draw eye contours
   - Save the result
5. **Error Handling**: Clear messages are shown when errors occur or no faces are detected
6. **Adaptive Permissions**: Permission flows adapt to the device's Android version