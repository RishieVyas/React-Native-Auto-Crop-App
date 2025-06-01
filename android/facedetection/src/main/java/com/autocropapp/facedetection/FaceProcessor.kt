package com.autocropapp.facedetection

import android.content.Context
import android.graphics.*
import androidx.exifinterface.media.ExifInterface
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

    private val faceDetectorOptions = FaceDetectorOptions.Builder()
        .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_ACCURATE)
        .setContourMode(FaceDetectorOptions.CONTOUR_MODE_ALL)
        .setClassificationMode(FaceDetectorOptions.CLASSIFICATION_MODE_NONE)
        .setLandmarkMode(FaceDetectorOptions.LANDMARK_MODE_NONE)
        .enableTracking()
        .build()
    
    private val faceDetector = FaceDetection.getClient(faceDetectorOptions)

    fun detectFace(imagePath: String): String? {
        lastImagePath = imagePath
        
        try {

            val originalBitmap = loadAndRotateBitmap(imagePath)
            if (originalBitmap == null) {
                return null
            }
            

            lastProcessedBitmap = originalBitmap
            

            if (originalBitmap.width <= 0 || originalBitmap.height <= 0) {
                return null
            }
            

            val detectedFace = detectFace(originalBitmap)
            lastDetectedFace = detectedFace
            
            if (detectedFace == null) {
                return imagePath
            }

            val bitmapWithBox = drawFaceBoundingBox(originalBitmap, detectedFace)

            val savedPath = saveBitmap(bitmapWithBox, "detected")
            return savedPath
            
        } catch (e: Exception) {
            return imagePath // Return original path on error
        }
    }

    fun processFace(): String? {
        try {
            if (lastDetectedFace == null || lastProcessedBitmap == null) {
                if (lastImagePath != null) {
                    val bitmap = lastProcessedBitmap ?: loadAndRotateBitmap(lastImagePath!!)
                    if (bitmap != null) {
                        val processedBitmap = processBitmapWithoutFace(bitmap)
                        val savedPath = saveBitmap(processedBitmap, "fallback_processed")
                        return savedPath
                    }
                }
                
                return null
            }

            val croppedBitmap = cropToFace(lastProcessedBitmap!!, lastDetectedFace!!)

            val processedBitmap = drawEyeContours(croppedBitmap, lastDetectedFace!!)

            val savedPath = saveBitmap(processedBitmap, "processed")
            return savedPath
            
        } catch (e: Exception) {
            if (lastProcessedBitmap != null) {
                val processedBitmap = processBitmapWithoutFace(lastProcessedBitmap!!)
                val savedPath = saveBitmap(processedBitmap, "error_fallback")
                return savedPath
            }
            
            return null
        }
    }

    fun processImage(imagePath: String?): String? {
        val path = imagePath ?: lastImagePath
        if (path == null) {
            return null
        }
        
        try {
            val originalBitmap = loadAndRotateBitmap(path)
            if (originalBitmap == null) {
                return null
            }

            val detectedFace = detectFace(originalBitmap)
            
            if (detectedFace == null) {
                val processedBitmap = processBitmapWithoutFace(originalBitmap)
                val savedPath = saveBitmap(processedBitmap, "fallback")
                return savedPath
            }

            val croppedBitmap = cropToFace(originalBitmap, detectedFace)

            val processedBitmap = drawEyeContours(croppedBitmap, detectedFace)

            val savedPath = saveBitmap(processedBitmap, "full")
            return savedPath
            
        } catch (e: Exception) {
            return null
        }
    }

    private fun drawFaceBoundingBox(bitmap: Bitmap, face: Face): Bitmap {
        val mutableBitmap = bitmap.copy(Bitmap.Config.ARGB_8888, true)
        val canvas = Canvas(mutableBitmap)

        val paint = Paint().apply {
            color = Color.GREEN
            style = Paint.Style.STROKE
            strokeWidth = 5f
            isAntiAlias = true
        }

        val boundingBox = face.boundingBox

        val padding = 0.2f
        val paddingX = (boundingBox.width() * padding).toInt()
        val paddingY = (boundingBox.height() * padding).toInt()

        val left = max(0, boundingBox.left - paddingX)
        val top = max(0, boundingBox.top - paddingY)
        val right = min(bitmap.width, boundingBox.right + paddingX)
        val bottom = min(bitmap.height, boundingBox.bottom + paddingY)

        canvas.drawRect(
            left.toFloat(),
            top.toFloat(),
            right.toFloat(),
            bottom.toFloat(),
            paint
        )
        
        return mutableBitmap
    }

    private fun processBitmapWithoutFace(bitmap: Bitmap): Bitmap {
        val width = bitmap.width
        val height = bitmap.height

        val cropFactor = 0.7f
        
        val cropWidth = (width * cropFactor).toInt()
        val cropHeight = (height * cropFactor).toInt()

        val left = (width - cropWidth) / 2
        val top = (height - cropHeight) / 3

        val croppedBitmap = Bitmap.createBitmap(
            bitmap, 
            left, 
            top, 
            cropWidth, 
            cropHeight
        )

        val mutableBitmap = croppedBitmap.copy(Bitmap.Config.ARGB_8888, true)
        val canvas = Canvas(mutableBitmap)

        val paint = Paint().apply {
            color = Color.RED
            style = Paint.Style.FILL
            isAntiAlias = true
        }
        
        val centerX = cropWidth / 2f
        val centerY = cropHeight / 2f

        val leftEyeCenterX = centerX - (cropWidth * 0.15f)
        val leftEyeCenterY = centerY - (cropHeight * 0.1f)
        for (i in 0 until 8) {
            val angle = (i * Math.PI * 2 / 8)
            val x = leftEyeCenterX + (cropWidth * 0.08f) * Math.cos(angle).toFloat()
            val y = leftEyeCenterY + (cropHeight * 0.05f) * Math.sin(angle).toFloat()
            canvas.drawCircle(x, y, 3f, paint)
        }

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

    private fun loadAndRotateBitmap(imagePath: String): Bitmap? {
        try {
            Log.d(tag, "Loading bitmap from path: $imagePath")

            val path = if (imagePath.startsWith("file://")) {
                imagePath.substring(7)
            } else {
                imagePath
            }

            val file = File(path)
            if (!file.exists()) {
                Log.e(tag, "File does not exist: $path")
                return null
            }

            val options = BitmapFactory.Options().apply {
                inPreferredConfig = Bitmap.Config.ARGB_8888
            }
            
            val bitmap = BitmapFactory.decodeFile(path, options)
            if (bitmap == null) {
                Log.e(tag, "Failed to decode bitmap from path: $path")
                return null
            }
            
            Log.d(tag, "Successfully loaded bitmap: ${bitmap.width}x${bitmap.height}")

            val exifInterface = ExifInterface(path)
            val orientation = exifInterface.getAttributeInt(
                ExifInterface.TAG_ORIENTATION,
                ExifInterface.ORIENTATION_NORMAL
            )

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

    private fun cropToFace(bitmap: Bitmap, face: Face): Bitmap {
        val boundingBox = face.boundingBox

        val padding = 0.2f
        val paddingX = (boundingBox.width() * padding).toInt()
        val paddingY = (boundingBox.height() * padding).toInt()

        val left = max(0, boundingBox.left - paddingX)
        val top = max(0, boundingBox.top - paddingY)
        val right = min(bitmap.width, boundingBox.right + paddingX)
        val bottom = min(bitmap.height, boundingBox.bottom + paddingY)

        return Bitmap.createBitmap(
            bitmap,
            left,
            top,
            right - left,
            bottom - top
        )
    }

    private fun drawEyeContours(bitmap: Bitmap, face: Face): Bitmap {
        val mutableBitmap = bitmap.copy(Bitmap.Config.ARGB_8888, true)
        val canvas = Canvas(mutableBitmap)

        val paint = Paint().apply {
            color = Color.RED
            style = Paint.Style.FILL
            isAntiAlias = true
        }

        val offsetX = max(0, face.boundingBox.left - (face.boundingBox.width() * 0.2f).toInt())
        val offsetY = max(0, face.boundingBox.top - (face.boundingBox.height() * 0.2f).toInt())

        face.getContour(FaceContour.LEFT_EYE)?.points?.forEach { point ->
            canvas.drawCircle(
                point.x - offsetX,
                point.y - offsetY,
                3f,
                paint
            )
        }

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

    fun close() {
        faceDetector.close()
        lastProcessedBitmap = null
        lastDetectedFace = null
    }

    fun testFaceDetector(): Boolean {
        return faceDetector != null
    }
} 