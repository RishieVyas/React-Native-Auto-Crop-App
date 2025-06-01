package com.autocropapp;

import android.content.Context;
import android.media.MediaScannerConnection;

import androidx.annotation.NonNull;

import com.autocropapp.facedetection.FaceProcessor;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.module.annotations.ReactModule;

@ReactModule(name = AutoCropModule.NAME)
@SuppressWarnings("unused") // Methods are used through React Native bridge
public class AutoCropModule extends ReactContextBaseJavaModule {
    public static final String NAME = "AutoCropModule";
    
    private FaceProcessor faceProcessor;
    private final ReactApplicationContext mReactContext;

    public AutoCropModule(ReactApplicationContext reactContext) {
        super(reactContext);
        mReactContext = reactContext;
        try {
            faceProcessor = new FaceProcessor(reactContext);
        } catch (Exception e) {
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
        try {
            if (faceProcessor == null) {
                promise.reject("MODULE_ERROR", "FaceProcessor is not initialized");
                return;
            }
            
            String fixedUri = imageUri;
            if (imageUri.startsWith("file://")) {
                fixedUri = imageUri.substring(7);
            }
            
            String processedImagePath = faceProcessor.detectFace(fixedUri);
            
            if (processedImagePath != null) {
                boolean faceDetected = !processedImagePath.equals(fixedUri) && !processedImagePath.equals(imageUri);
                
                WritableMap response = Arguments.createMap();
                
                if (!processedImagePath.startsWith("file://")) {
                    processedImagePath = "file://" + processedImagePath;
                }
                
                response.putString("path", processedImagePath);
                response.putBoolean("success", true);
                response.putBoolean("faceDetected", faceDetected);
                
                if (!faceDetected) {
                    response.putString("message", "No face detected in the image");
                }
                
                promise.resolve(response);
            } else {
                WritableMap response = Arguments.createMap();
                response.putBoolean("success", false);
                response.putString("message", "Failed to detect face in the image");
                response.putString("path", imageUri);
                
                promise.resolve(response);
            }
        } catch (Exception e) {
            promise.reject("DETECTION_ERROR", "Failed to detect face: " + e.getMessage(), e);
        }
    }
    
    @ReactMethod
    public void processFace(Promise promise) {
        try {
            if (faceProcessor == null) {
                promise.reject("MODULE_ERROR", "FaceProcessor is not initialized");
                return;
            }
            
            String processedImagePath = faceProcessor.processFace();
            
            if (processedImagePath != null) {
                WritableMap response = Arguments.createMap();
                
                if (!processedImagePath.startsWith("file://")) {
                    processedImagePath = "file://" + processedImagePath;
                }
                
                response.putString("path", processedImagePath);
                response.putBoolean("success", true);
                
                promise.resolve(response);
            } else {
                WritableMap response = Arguments.createMap();
                response.putBoolean("success", false);
                response.putString("message", "Failed to process the face");
                
                promise.resolve(response);
            }
        } catch (Exception e) {
            promise.reject("PROCESSING_ERROR", "Failed to process face: " + e.getMessage(), e);
        }
    }

    @ReactMethod
    public void processImage(String imageUri, Promise promise) {
        try {
            if (faceProcessor == null) {
                promise.reject("MODULE_ERROR", "FaceProcessor is not initialized");
                return;
            }
            
            String processedImagePath = faceProcessor.processImage(imageUri);
            
            if (processedImagePath != null) {
                promise.resolve(processedImagePath);
            } else {
                promise.reject("PROCESSING_ERROR", "Failed to process the image");
            }
        } catch (Exception e) {
            promise.reject("CROP_ERROR", "Failed to crop image: " + e.getMessage(), e);
        }
    }
    
    @ReactMethod
    public void scanFile(String filePath, Promise promise) {
        try {
            Context context = mReactContext.getApplicationContext();
            String[] paths = new String[]{filePath};
            
            MediaScannerConnection.scanFile(context, paths, null, (path, uri) -> {
                if (uri != null) {
                    promise.resolve(true);
                } else {
                    promise.resolve(false);
                }
            });
        } catch (Exception e) {
            promise.reject("SCAN_ERROR", "Failed to scan file: " + e.getMessage(), e);
        }
    }
    
    // Clean up resources when the module is destroyed
    @Override
    public void invalidate() {
        super.invalidate();
        faceProcessor = null;
    }
} 