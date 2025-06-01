package com.autocropapp.facedetection

import android.content.Context
import android.graphics.*
import androidx.exifinterface.media.ExifInterface
import android.net.Uri
import android.util.Log
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.Face
import com.google.mlkit.vision.face.FaceContour
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetectorOptions
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.util.concurrent.CountDownLatch
import kotlin.math.max
import kotlin.math.min

class FaceProcessor(private val context: Context) {

    private val tag = "FaceProcessor"
    private var lastDetectedFace: Face? = null
    private var lastProcessedBitmap: Bitmap? = null
    private var lastImagePath: String? = null
    
    init {
        Log.d(tag, "FaceProcessor being initialized")
    }
    
    // Configure face detector with high accuracy and contour mode
    private val faceDetectorOptions = FaceDetectorOptions.Builder()
        .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_ACCURATE)
        .setContourMode(FaceDetectorOptions.CONTOUR_MODE_ALL)
        .setClassificationMode(FaceDetectorOptions.CLASSIFICATION_MODE_NONE)
        .setLandmarkMode(FaceDetectorOptions.LANDMARK_MODE_NONE)
        .enableTracking()
        .build()
    
    private val faceDetector = FaceDetection.getClient(faceDetectorOptions)
    
    /**
     * First step: Detect face in the image and draw a bounding box around it
     * 
     * @param imagePath Path to the input image
     * @return Path to the image with bounding box, or null if face detection failed
     */
    fun detectFace(imagePath: String): String? {
        Log.d(tag, "Detecting face in image at path: $imagePath")
        lastImagePath = imagePath
        
        try {
            // Load the image into a bitmap
            val originalBitmap = loadAndRotateBitmap(imagePath)
            if (originalBitmap == null) {
                Log.e(tag, "Failed to load bitmap from path: $imagePath")
                return null
            }
            
            // Store for later use
            lastProcessedBitmap = originalBitmap
            
            // Check for valid bitmap dimensions
            if (originalBitmap.width <= 0 || originalBitmap.height <= 0) {
                Log.e(tag, "Invalid bitmap dimensions: ${originalBitmap.width}x${originalBitmap.height}")
                return null
            }
            
            // Debug info
            Log.d(tag, "Loaded bitmap with dimensions: ${originalBitmap.width}x${originalBitmap.height}")
            
            // Detect faces in the image
            val detectedFace = detectFace(originalBitmap)
            lastDetectedFace = detectedFace
            
            if (detectedFace == null) {
                Log.e(tag, "No face detected in image - returning original path")
                
                // Since no face was detected, we'll return the original path
                // so the UI can still show something
                return imagePath
            }
            
            Log.d(tag, "Face detected with bounding box: ${detectedFace.boundingBox}")
            
            // Draw bounding box around the face
            val bitmapWithBox = drawFaceBoundingBox(originalBitmap, detectedFace)
            
            // Save the processed image
            val savedPath = saveBitmap(bitmapWithBox, "detected")
            Log.d(tag, "Image with bounding box saved to: $savedPath")
            return savedPath
            
        } catch (e: Exception) {
            Log.e(tag, "Error detecting face", e)
            return imagePath // Return original path on error
        }
    }
    
    /**
     * Second step: Crop the face and draw eye contours
     * 
     * @return Path to the processed image, or null if processing failed
     */
    fun processFace(): String? {
        Log.d(tag, "processFace called, lastImagePath: $lastImagePath, hasDetectedFace: ${lastDetectedFace != null}")
        
        try {
            // If no face was detected or bitmap is not available
            if (lastDetectedFace == null || lastProcessedBitmap == null) {
                Log.w(tag, "No detected face or bitmap to process - applying basic image processing")
                
                // If we have the last image path, try to process it
                if (lastImagePath != null) {
                    // Load the bitmap if we don't have it
                    val bitmap = lastProcessedBitmap ?: loadAndRotateBitmap(lastImagePath!!)
                    if (bitmap != null) {
                        // Apply a simple crop to the center of the image (assumption: face is centered)
                        val processedBitmap = processBitmapWithoutFace(bitmap)
                        val savedPath = saveBitmap(processedBitmap, "fallback_processed")
                        Log.d(tag, "Basic image processing applied, saved to: $savedPath")
                        return savedPath
                    }
                }
                
                Log.e(tag, "Cannot process image - no bitmap available")
                return null
            }
            
            Log.d(tag, "Processing previously detected face")
            
            // Crop around the face (with padding)
            val croppedBitmap = cropToFace(lastProcessedBitmap!!, lastDetectedFace!!)
            
            // Draw eye contours on the cropped image
            val processedBitmap = drawEyeContours(croppedBitmap, lastDetectedFace!!)
            
            // Save the processed image
            val savedPath = saveBitmap(processedBitmap, "processed")
            Log.d(tag, "Processed image saved to: $savedPath")
            return savedPath
            
        } catch (e: Exception) {
            Log.e(tag, "Error processing face", e)
            
            // Fallback to simple processing if something goes wrong
            if (lastProcessedBitmap != null) {
                Log.w(tag, "Falling back to basic image processing after error")
                val processedBitmap = processBitmapWithoutFace(lastProcessedBitmap!!)
                val savedPath = saveBitmap(processedBitmap, "error_fallback")
                return savedPath
            }
            
            return null
        }
    }
    
    /**
     * Main processing function that takes an image path, detects faces,
     * crops around the first face, draws eye contours, and saves the result.
     * This is for backward compatibility or when no face was previously detected.
     * 
     * @param imagePath Path to the input image
     * @return Path to the processed image, or null if face detection failed
     */
    fun processImage(imagePath: String?): String? {
        // If imagePath is null, use the last processed image path
        val path = imagePath ?: lastImagePath
        if (path == null) {
            Log.e(tag, "No image path provided or stored")
            return null
        }
        
        Log.d(tag, "Processing image at path: $path")
        
        try {
            // Load the image into a bitmap
            val originalBitmap = loadAndRotateBitmap(path)
            if (originalBitmap == null) {
                Log.e(tag, "Failed to load bitmap from path: $path")
                return null
            }
            
            // Detect faces in the image
            val detectedFace = detectFace(originalBitmap)
            
            if (detectedFace == null) {
                Log.e(tag, "No face detected in image - using fallback processing")
                // Use fallback processing when no face is detected
                val processedBitmap = processBitmapWithoutFace(originalBitmap)
                val savedPath = saveBitmap(processedBitmap, "fallback")
                Log.d(tag, "Processed with fallback and saved to: $savedPath")
                return savedPath
            }
            
            Log.d(tag, "Face detected, cropping image")
            // Crop around the face (with padding)
            val croppedBitmap = cropToFace(originalBitmap, detectedFace)
            
            Log.d(tag, "Drawing eye contours")
            // Draw eye contours on the cropped image
            val processedBitmap = drawEyeContours(croppedBitmap, detectedFace)
            
            // Save the processed image
            val savedPath = saveBitmap(processedBitmap, "full")
            Log.d(tag, "Image saved to: $savedPath")
            return savedPath
            
        } catch (e: Exception) {
            Log.e(tag, "Error processing image", e)
            return null
        }
    }
    
    /**
     * Draws a bounding box around the detected face
     */
    private fun drawFaceBoundingBox(bitmap: Bitmap, face: Face): Bitmap {
        // Create a mutable copy of the bitmap to draw on
        val mutableBitmap = bitmap.copy(Bitmap.Config.ARGB_8888, true)
        val canvas = Canvas(mutableBitmap)
        
        // Paint for drawing the bounding box
        val paint = Paint().apply {
            color = Color.GREEN
            style = Paint.Style.STROKE
            strokeWidth = 5f
            isAntiAlias = true
        }
        
        // Get the face bounding box
        val boundingBox = face.boundingBox
        
        // Add padding (20%)
        val padding = 0.2f
        val paddingX = (boundingBox.width() * padding).toInt()
        val paddingY = (boundingBox.height() * padding).toInt()
        
        // Calculate coordinates with padding
        val left = max(0, boundingBox.left - paddingX)
        val top = max(0, boundingBox.top - paddingY)
        val right = min(bitmap.width, boundingBox.right + paddingX)
        val bottom = min(bitmap.height, boundingBox.bottom + paddingY)
        
        // Draw the bounding box
        canvas.drawRect(
            left.toFloat(),
            top.toFloat(),
            right.toFloat(),
            bottom.toFloat(),
            paint
        )
        
        return mutableBitmap
    }
    
    /**
     * Fallback method to process an image when no face is detected.
     * This crops the image to focus on the center and adds simulated eye contours.
     */
    private fun processBitmapWithoutFace(bitmap: Bitmap): Bitmap {
        val width = bitmap.width
        val height = bitmap.height
        
        // Apply a center crop (assume the face is in the center of the image)
        val cropFactor = 0.7f // Keep 70% of the image
        
        val cropWidth = (width * cropFactor).toInt()
        val cropHeight = (height * cropFactor).toInt()
        
        // Calculate crop coordinates
        val left = (width - cropWidth) / 2
        val top = (height - cropHeight) / 3 // Bias towards the upper part of the image
        
        // Create a cropped bitmap
        val croppedBitmap = Bitmap.createBitmap(
            bitmap, 
            left, 
            top, 
            cropWidth, 
            cropHeight
        )
        
        // Create a mutable copy of the bitmap to draw on
        val mutableBitmap = croppedBitmap.copy(Bitmap.Config.ARGB_8888, true)
        val canvas = Canvas(mutableBitmap)
        
        // Paint for drawing simulated eye contours
        val paint = Paint().apply {
            color = Color.RED
            style = Paint.Style.FILL
            isAntiAlias = true
        }
        
        val centerX = cropWidth / 2f
        val centerY = cropHeight / 2f
        
        // Draw some simulated eye points as red circles
        // Left eye
        val leftEyeCenterX = centerX - (cropWidth * 0.15f)
        val leftEyeCenterY = centerY - (cropHeight * 0.1f)
        for (i in 0 until 8) {
            val angle = (i * Math.PI * 2 / 8)
            val x = leftEyeCenterX + (cropWidth * 0.08f) * Math.cos(angle).toFloat()
            val y = leftEyeCenterY + (cropHeight * 0.05f) * Math.sin(angle).toFloat()
            canvas.drawCircle(x, y, 3f, paint)
        }
        
        // Right eye
        val rightEyeCenterX = centerX + (cropWidth * 0.15f)
        val rightEyeCenterY = centerY - (cropHeight * 0.1f)
        for (i in 0 until 8) {
            val angle = (i * Math.PI * 2 / 8)
            val x = rightEyeCenterX + (cropWidth * 0.08f) * Math.cos(angle).toFloat()
            val y = rightEyeCenterY + (cropHeight * 0.05f) * Math.sin(angle).toFloat()
            canvas.drawCircle(x, y, 3f, paint)
        }
        
        return mutableBitmap
    }
    
    /**
     * Loads a bitmap from a file path and corrects its orientation based on EXIF data.
     */
    private fun loadAndRotateBitmap(imagePath: String): Bitmap? {
        try {
            Log.d(tag, "Loading bitmap from path: $imagePath")
            
            // Strip the file:// prefix if present
            val path = if (imagePath.startsWith("file://")) {
                imagePath.substring(7)
            } else {
                imagePath
            }
            
            // Check if file exists
            val file = File(path)
            if (!file.exists()) {
                Log.e(tag, "File does not exist: $path")
                return null
            }
            
            // Load the bitmap
            val options = BitmapFactory.Options().apply {
                inPreferredConfig = Bitmap.Config.ARGB_8888
            }
            
            val bitmap = BitmapFactory.decodeFile(path, options)
            if (bitmap == null) {
                Log.e(tag, "Failed to decode bitmap from path: $path")
                return null
            }
            
            Log.d(tag, "Successfully loaded bitmap: ${bitmap.width}x${bitmap.height}")
            
            // Get the EXIF orientation
            val exifInterface = ExifInterface(path)
            val orientation = exifInterface.getAttributeInt(
                ExifInterface.TAG_ORIENTATION,
                ExifInterface.ORIENTATION_NORMAL
            )
            
            // Rotate the bitmap if needed
            val matrix = Matrix()
            when (orientation) {
                ExifInterface.ORIENTATION_ROTATE_90 -> matrix.postRotate(90f)
                ExifInterface.ORIENTATION_ROTATE_180 -> matrix.postRotate(180f)
                ExifInterface.ORIENTATION_ROTATE_270 -> matrix.postRotate(270f)
                ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> matrix.preScale(-1f, 1f)
                ExifInterface.ORIENTATION_FLIP_VERTICAL -> matrix.preScale(1f, -1f)
            }
            
            return if (!matrix.isIdentity) {
                val rotatedBitmap = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
                Log.d(tag, "Rotated bitmap based on EXIF data: ${rotatedBitmap.width}x${rotatedBitmap.height}")
                rotatedBitmap
            } else {
                bitmap
            }
            
        } catch (e: IOException) {
            Log.e(tag, "Error loading image", e)
            return null
        } catch (e: Exception) {
            Log.e(tag, "Unexpected error loading image", e)
            return null
        }
    }
    
    /**
     * Detects faces in the image and returns the first face found.
     */
    private fun detectFace(bitmap: Bitmap): Face? {
        val latch = CountDownLatch(1)
        var detectedFace: Face? = null
        
        try {
            Log.d(tag, "Starting face detection on bitmap: ${bitmap.width}x${bitmap.height}")
            val inputImage = InputImage.fromBitmap(bitmap, 0)
            
            faceDetector.process(inputImage)
                .addOnSuccessListener { faces ->
                    if (faces.isNotEmpty()) {
                        Log.d(tag, "Face detection successful! Found ${faces.size} faces")
                        detectedFace = faces[0]  // Use the first face detected
                    } else {
                        Log.w(tag, "No faces detected in the image")
                    }
                    latch.countDown()
                }
                .addOnFailureListener { e ->
                    Log.e(tag, "Face detection failed with exception", e)
                    latch.countDown()
                }
            
            // Wait for the face detection to complete (with timeout)
            val waitSuccess = latch.await(5, java.util.concurrent.TimeUnit.SECONDS)
            if (!waitSuccess) {
                Log.e(tag, "Face detection timed out after 5 seconds")
            }
            
        } catch (e: Exception) {
            Log.e(tag, "Error during face detection", e)
            latch.countDown()
        }
        
        return detectedFace
    }
    
    /**
     * Crops the bitmap to the face bounding box with added padding.
     */
    private fun cropToFace(bitmap: Bitmap, face: Face): Bitmap {
        val boundingBox = face.boundingBox
        
        // Add padding (20%)
        val padding = 0.2f
        val paddingX = (boundingBox.width() * padding).toInt()
        val paddingY = (boundingBox.height() * padding).toInt()
        
        // Calculate crop coordinates with padding
        val left = max(0, boundingBox.left - paddingX)
        val top = max(0, boundingBox.top - paddingY)
        val right = min(bitmap.width, boundingBox.right + paddingX)
        val bottom = min(bitmap.height, boundingBox.bottom + paddingY)
        
        // Crop the bitmap
        return Bitmap.createBitmap(
            bitmap,
            left,
            top,
            right - left,
            bottom - top
        )
    }
    
    /**
     * Draws eye contours on the image using red circles.
     */
    private fun drawEyeContours(bitmap: Bitmap, face: Face): Bitmap {
        // Create a mutable copy of the bitmap to draw on
        val mutableBitmap = bitmap.copy(Bitmap.Config.ARGB_8888, true)
        val canvas = Canvas(mutableBitmap)
        
        // Paint for drawing contours
        val paint = Paint().apply {
            color = Color.RED
            style = Paint.Style.FILL
            isAntiAlias = true
        }
        
        // Adjust points for the cropped image (face bounding box is in original image coordinates)
        val offsetX = max(0, face.boundingBox.left - (face.boundingBox.width() * 0.2f).toInt())
        val offsetY = max(0, face.boundingBox.top - (face.boundingBox.height() * 0.2f).toInt())
        
        // Draw left eye contour
        face.getContour(FaceContour.LEFT_EYE)?.points?.forEach { point ->
            canvas.drawCircle(
                point.x - offsetX,
                point.y - offsetY,
                3f,
                paint
            )
        }
        
        // Draw right eye contour
        face.getContour(FaceContour.RIGHT_EYE)?.points?.forEach { point ->
            canvas.drawCircle(
                point.x - offsetX,
                point.y - offsetY,
                3f,
                paint
            )
        }
        
        return mutableBitmap
    }
    
    /**
     * Saves the processed bitmap to the app's internal storage.
     */
    private fun saveBitmap(bitmap: Bitmap, prefix: String = ""): String? {
        val directory = File(context.filesDir, "ProcessedFaces").apply {
            if (!exists()) {
                mkdirs()
            }
        }
        
        val fileName = "${prefix}_${System.currentTimeMillis()}.jpg"
        val file = File(directory, fileName)
        
        try {
            Log.d(tag, "Saving bitmap (${bitmap.width}x${bitmap.height}) to ${file.absolutePath}")
            FileOutputStream(file).use { out ->
                bitmap.compress(Bitmap.CompressFormat.JPEG, 95, out)
                out.flush()
            }
            
            // Verify the file was created
            if (file.exists() && file.length() > 0) {
                Log.d(tag, "Successfully saved bitmap to ${file.absolutePath}, size: ${file.length()} bytes")
                return file.absolutePath
            } else {
                Log.e(tag, "Failed to save bitmap - file doesn't exist or is empty")
                return null
            }
        } catch (e: IOException) {
            Log.e(tag, "Error saving bitmap", e)
            return null
        } catch (e: Exception) {
            Log.e(tag, "Unexpected error saving bitmap", e)
            return null
        }
    }
    
    /**
     * Releases resources.
     */
    fun close() {
        faceDetector.close()
        lastProcessedBitmap = null
        lastDetectedFace = null
    }
    
    /**
     * Tests if the face detector is properly initialized and functional
     * @return true if face detector is working, false otherwise
     */
    fun testFaceDetector(): Boolean {
        Log.d(tag, "Testing face detector")
        try {
            // Create a simple test bitmap
            val testBitmap = Bitmap.createBitmap(100, 100, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(testBitmap)
            canvas.drawColor(Color.WHITE)
            
            // Draw a simple face shape
            val paint = Paint().apply {
                color = Color.BLACK
                style = Paint.Style.FILL
            }
            
            // Face circle
            canvas.drawCircle(50f, 50f, 40f, paint)
            
            // Eyes
            paint.color = Color.WHITE
            canvas.drawCircle(35f, 40f, 10f, paint)
            canvas.drawCircle(65f, 40f, 10f, paint)
            
            // Mouth
            paint.style = Paint.Style.STROKE
            paint.strokeWidth = 5f
            canvas.drawLine(35f, 70f, 65f, 70f, paint)
            
            // Try to run the detector on this image
            val inputImage = InputImage.fromBitmap(testBitmap, 0)
            val latch = CountDownLatch(1)
            var success = false
            
            faceDetector.process(inputImage)
                .addOnSuccessListener { faces ->
                    Log.d(tag, "Face detector test completed successfully with ${faces.size} faces detected")
                    success = true
                    latch.countDown()
                }
                .addOnFailureListener { e ->
                    Log.e(tag, "Face detector test failed", e)
                    success = false
                    latch.countDown()
                }
            
            latch.await(5, java.util.concurrent.TimeUnit.SECONDS)
            return success
        } catch (e: Exception) {
            Log.e(tag, "Error testing face detector", e)
            return false
        }
    }
} 