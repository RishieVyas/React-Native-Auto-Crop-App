package com.autocropapp;

import android.content.Context;
import android.media.MediaScannerConnection;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.autocropapp.facedetection.FaceProcessor;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.module.annotations.ReactModule;

@ReactModule(name = AutoCropModule.NAME)
public class AutoCropModule extends ReactContextBaseJavaModule {
    public static final String NAME = "AutoCropModule";
    private static final String TAG = "AutoCropModule";
    
    private FaceProcessor faceProcessor;
    private ReactApplicationContext mReactContext;

    public AutoCropModule(ReactApplicationContext reactContext) {
        super(reactContext);
        mReactContext = reactContext;
        try {
            Log.d(TAG, "AutoCropModule initializing...");
            faceProcessor = new FaceProcessor(reactContext);
            Log.d(TAG, "FaceProcessor initialized successfully");
        } catch (Exception e) {
            Log.e(TAG, "Error initializing FaceProcessor", e);
            faceProcessor = null;
        }
    }

    @NonNull
    @Override
    public String getName() {
        return NAME;
    }

    @ReactMethod
    public void detectFace(String imageUri, Promise promise) {
        Log.d(TAG, "detectFace called with URI: " + imageUri);
        
        try {
            if (faceProcessor == null) {
                Log.e(TAG, "FaceProcessor is null");
                promise.reject("MODULE_ERROR", "FaceProcessor is not initialized");
                return;
            }
            
            // Fix the file URI format if needed
            String fixedUri = imageUri;
            if (imageUri.startsWith("file://")) {
                fixedUri = imageUri.substring(7); // Remove the "file://" prefix
            }
            Log.d(TAG, "Using fixed URI: " + fixedUri);
            
            // Detect faces in the image and draw bounding box
            String processedImagePath = faceProcessor.detectFace(fixedUri);
            
            if (processedImagePath != null) {
                Log.d(TAG, "Image processed successfully, path: " + processedImagePath);
                
                // Check if the returned path is the same as the input path
                // This indicates no face was detected
                boolean faceDetected = !processedImagePath.equals(fixedUri) && !processedImagePath.equals(imageUri);
                
                // Create a response with additional info
                WritableMap response = Arguments.createMap();
                
                // For file paths, make sure they have the file:// prefix for React Native
                if (!processedImagePath.startsWith("file://")) {
                    processedImagePath = "file://" + processedImagePath;
                }
                
                response.putString("path", processedImagePath);
                response.putBoolean("success", true);
                response.putBoolean("faceDetected", faceDetected);
                
                if (!faceDetected) {
                    response.putString("message", "No face detected in the image");
                    Log.w(TAG, "No face detected, using original image");
                }
                
                promise.resolve(response);
            } else {
                Log.e(TAG, "Face detection returned null path");
                
                // Create an error response
                WritableMap response = Arguments.createMap();
                response.putBoolean("success", false);
                response.putString("message", "Failed to detect face in the image");
                response.putString("path", imageUri); // Return original image path
                
                promise.resolve(response);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error detecting face", e);
            promise.reject("DETECTION_ERROR", "Failed to detect face: " + e.getMessage(), e);
        }
    }
    
    @ReactMethod
    public void processFace(Promise promise) {
        Log.d(TAG, "processFace called");
        
        try {
            if (faceProcessor == null) {
                Log.e(TAG, "FaceProcessor is null");
                promise.reject("MODULE_ERROR", "FaceProcessor is not initialized");
                return;
            }
            
            // Process the previously detected face
            String processedImagePath = faceProcessor.processFace();
            
            if (processedImagePath != null) {
                Log.d(TAG, "Face processed successfully, path: " + processedImagePath);
                
                // Create a response with the path
                WritableMap response = Arguments.createMap();
                
                // For file paths, make sure they have the file:// prefix for React Native
                if (!processedImagePath.startsWith("file://")) {
                    processedImagePath = "file://" + processedImagePath;
                }
                
                response.putString("path", processedImagePath);
                response.putBoolean("success", true);
                
                promise.resolve(response);
            } else {
                Log.e(TAG, "Face processing failed");
                
                // Create an error response
                WritableMap response = Arguments.createMap();
                response.putBoolean("success", false);
                response.putString("message", "Failed to process the face");
                
                promise.resolve(response);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error in processFace", e);
            promise.reject("PROCESSING_ERROR", "Failed to process face: " + e.getMessage(), e);
        }
    }

    @ReactMethod
    public void processImage(String imageUri, Promise promise) {
        Log.d(TAG, "processImage called with URI: " + imageUri);
        
        try {
            if (faceProcessor == null) {
                Log.e(TAG, "FaceProcessor is null");
                promise.reject("MODULE_ERROR", "FaceProcessor is not initialized");
                return;
            }
            
            // Process the image using our FaceProcessor
            String processedImagePath = faceProcessor.processImage(imageUri);
            
            if (processedImagePath != null) {
                Log.d(TAG, "Image processed successfully, path: " + processedImagePath);
                promise.resolve(processedImagePath);
            } else {
                Log.e(TAG, "Image processing returned null path");
                promise.reject("PROCESSING_ERROR", "Failed to process the image");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error processing image", e);
            promise.reject("CROP_ERROR", "Failed to crop image: " + e.getMessage(), e);
        }
    }
    
    /**
     * Scan a file to make it visible in the Android gallery
     */
    @ReactMethod
    public void scanFile(String filePath, Promise promise) {
        Log.d(TAG, "scanFile called with path: " + filePath);
        
        try {
            Context context = mReactContext.getApplicationContext();
            String[] paths = new String[]{filePath};
            
            MediaScannerConnection.scanFile(context, paths, null, (path, uri) -> {
                if (uri != null) {
                    Log.d(TAG, "File scanned successfully, URI: " + uri);
                    promise.resolve(true);
                } else {
                    Log.e(TAG, "File scan failed for path: " + path);
                    promise.resolve(false);
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "Error scanning file", e);
            promise.reject("SCAN_ERROR", "Failed to scan file: " + e.getMessage(), e);
        }
    }
    
    // Simple test method to verify the module is accessible from JS
    @ReactMethod
    public void testModule(Promise promise) {
        Log.d(TAG, "testModule called");
        promise.resolve("AutoCropModule is working!");
    }
    
    // Test method to verify the face detector is properly initialized
    @ReactMethod
    public void testFaceDetector(Promise promise) {
        Log.d(TAG, "testFaceDetector called");
        try {
            if (faceProcessor == null) {
                Log.e(TAG, "FaceProcessor is null");
                promise.reject("MODULE_ERROR", "FaceProcessor is not initialized");
                return;
            }
            
            // Check if face detector is available
            boolean isDetectorAvailable = faceProcessor.testFaceDetector();
            
            if (isDetectorAvailable) {
                Log.d(TAG, "Face detector is available and working");
                WritableMap response = Arguments.createMap();
                response.putBoolean("success", true);
                response.putString("message", "Face detector is working properly");
                promise.resolve(response);
            } else {
                Log.e(TAG, "Face detector test failed");
                WritableMap response = Arguments.createMap();
                response.putBoolean("success", false);
                response.putString("message", "Face detector test failed");
                promise.resolve(response);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error testing face detector", e);
            promise.reject("TEST_ERROR", "Failed to test face detector: " + e.getMessage(), e);
        }
    }
    
    // Clean up resources when the module is destroyed
    @Override
    public void invalidate() {
        Log.d(TAG, "invalidate called");
        if (faceProcessor != null) {
            faceProcessor.close();
            faceProcessor = null;
        }
        super.invalidate();
    }
} 