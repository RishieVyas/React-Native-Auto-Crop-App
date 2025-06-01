package com.autocropapp;

import android.util.Log;

import androidx.annotation.NonNull;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class AutoCropPackage implements ReactPackage {
    private static final String TAG = "AutoCropPackage";

    @NonNull
    @Override
    public List<NativeModule> createNativeModules(@NonNull ReactApplicationContext reactContext) {
        Log.d(TAG, "Creating native modules, reactContext is " + (reactContext != null ? "valid" : "null"));
        List<NativeModule> modules = new ArrayList<>();
        try {
            AutoCropModule module = new AutoCropModule(reactContext);
            Log.d(TAG, "Created AutoCropModule with name: " + module.getName());
            modules.add(module);
        } catch (Exception e) {
            Log.e(TAG, "Error creating AutoCropModule", e);
        }
        return modules;
    }

    @NonNull
    @Override
    public List<ViewManager> createViewManagers(@NonNull ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }
} 