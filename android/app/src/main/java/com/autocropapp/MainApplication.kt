package com.autocropapp

import android.app.Application
import android.util.Log
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.soloader.SoLoader

class MainApplication : Application(), ReactApplication {
  
  companion object {
    private const val TAG = "MainApplication"
  }

  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> {
          Log.d(TAG, "Building packages list for React Native")
          val packages = PackageList(this).packages.toMutableList()
          
          // Log all registered packages for debugging
          Log.d(TAG, "Default packages: ${packages.map { it.javaClass.simpleName }}")
          
          // Add our custom package
          try {
            Log.d(TAG, "Adding AutoCropPackage to packages list")
            val autoCropPackage = AutoCropPackage()
            packages.add(autoCropPackage)
            Log.d(TAG, "Successfully added AutoCropPackage")
            
            // Verify package was added
            val packageNames = packages.map { it.javaClass.simpleName }
            if (packageNames.contains("AutoCropPackage")) {
              Log.d(TAG, "AutoCropPackage confirmed in packages list")
            } else {
              Log.e(TAG, "CRITICAL: AutoCropPackage was not found in final packages list!")
            }
            
          } catch (e: Exception) {
            Log.e(TAG, "Error adding AutoCropPackage", e)
          }
          
          Log.d(TAG, "Final packages list: ${packages.map { it.javaClass.simpleName }}")
          return packages
        }

        override fun getJSMainModuleName(): String = "index"

        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
      }

  override val reactHost: ReactHost
    get() = getDefaultReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    Log.d(TAG, "Application onCreate called")
    SoLoader.init(this, false)
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      // If you opted-in for the New Architecture, we load the native entry point for this app.
      load()
    }
    
    // Log app startup
    Log.d(TAG, "Application startup complete")
  }
}
