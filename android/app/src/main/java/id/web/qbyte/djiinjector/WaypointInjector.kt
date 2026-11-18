package id.web.qbyte.djiinjector

import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import androidx.documentfile.provider.DocumentFile
import java.io.File
import java.io.FileOutputStream

object WaypointInjector {

    data class InjectResult(
        val success: Boolean,
        val dummyFileName: String?,
        val message: String
    )

    /**
     * Checks if standard direct file access to DJI waypoint folder is available
     * (Common on DJI RC 2, DJI RC Pro, Android 9/10, or permissive ROMs).
     */
    fun getDirectWaypointFolder(): File? {
        val candidates = listOf(
            "/storage/emulated/0/Android/data/dji.go.v5/files/waypoint",
            "/sdcard/Android/data/dji.go.v5/files/waypoint"
        )
        for (path in candidates) {
            val dir = File(path)
            if (dir.exists() && dir.isDirectory && dir.canWrite()) {
                return dir
            }
        }
        return null
    }

    /**
     * Injects KMZ directly via standard java.io.File
     */
    fun injectMissionDirect(targetDir: File, kmzBytes: ByteArray): InjectResult {
        try {
            val kmzFiles = targetDir.listFiles { f ->
                f.isFile && f.name.lowercase().endsWith(".kmz")
            } ?: emptyArray()

            if (kmzFiles.isEmpty()) {
                return InjectResult(
                    false,
                    null,
                    "Tidak ditemukan file .kmz di folder waypoint DJI Fly. Pastikan Anda sudah membuat misi dummy di DJI Fly terlebih dahulu."
                )
            }

            val latestDummy = kmzFiles.maxByOrNull { it.lastModified() }
                ?: return InjectResult(false, null, "Gagal mendeteksi file dummy terbaru.")

            FileOutputStream(latestDummy).use { fos ->
                fos.write(kmzBytes)
                fos.flush()
            }

            return InjectResult(
                true,
                latestDummy.name,
                "Berhasil menimpa misi dummy: ${latestDummy.name}"
            )
        } catch (e: Exception) {
            return InjectResult(false, null, "Gagal menimpa secara langsung: ${e.message}")
        }
    }

    /**
     * Finds the most recent dummy .kmz file via Storage Access Framework (SAF),
     * and overwrites its content with the given kmzBytes.
     */
    fun injectMission(context: Context, treeUri: Uri, kmzBytes: ByteArray): InjectResult {
        try {
            val rootFolder = DocumentFile.fromTreeUri(context, treeUri)
                ?: return InjectResult(false, null, "Tidak dapat mengakses folder DJI Fly. Silakan pilih folder lagi.")

            // If the user selected dji.go.v5 or files, navigate into waypoint if exists
            var targetFolder = rootFolder
            if (rootFolder.name?.lowercase() == "dji.go.v5") {
                val filesFolder = rootFolder.findFile("files")
                val wpFolder = filesFolder?.findFile("waypoint")
                if (wpFolder != null) targetFolder = wpFolder
            } else if (rootFolder.name?.lowercase() == "files") {
                val wpFolder = rootFolder.findFile("waypoint")
                if (wpFolder != null) targetFolder = wpFolder
            }

            val kmzFiles = targetFolder.listFiles().filter {
                it.isFile && (it.name?.lowercase()?.endsWith(".kmz") == true)
            }

            if (kmzFiles.isEmpty()) {
                return InjectResult(
                    false,
                    null,
                    "Tidak ditemukan file .kmz di folder waypoint DJI Fly. Pastikan Anda sudah membuat misi dummy di DJI Fly terlebih dahulu."
                )
            }

            // Find the most recently modified dummy file
            val latestDummy = kmzFiles.maxByOrNull { it.lastModified() }
                ?: return InjectResult(false, null, "Gagal menemukan file dummy terbaru.")

            val dummyName = latestDummy.name ?: "dummy.kmz"

            // Overwrite content of the dummy file
            val outputStream = context.contentResolver.openOutputStream(latestDummy.uri, "wt")
                ?: return InjectResult(false, dummyName, "Gagal membuka akses tulis ke file $dummyName.")

            outputStream.use {
                it.write(kmzBytes)
                it.flush()
            }

            return InjectResult(
                true,
                dummyName,
                "Berhasil menimpa misi dummy: $dummyName"
            )
        } catch (e: Exception) {
            return InjectResult(false, null, "Terjadi kesalahan saat menimpa file: ${e.message}")
        }
    }

    /**
     * Saves KMZ file directly to user's public Downloads directory
     * (Zero-permission storage on Android 10+ using MediaStore)
     */
    fun saveKmzToDownloads(context: Context, filename: String, bytes: ByteArray): Boolean {
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val contentValues = ContentValues().apply {
                    put(MediaStore.MediaColumns.DISPLAY_NAME, filename)
                    put(MediaStore.MediaColumns.MIME_TYPE, "application/vnd.google-earth.kmz")
                    put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                }
                val uri = context.contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues)
                    ?: return false
                context.contentResolver.openOutputStream(uri)?.use { os ->
                    os.write(bytes)
                    os.flush()
                }
                true
            } else {
                val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                if (!downloadsDir.exists()) downloadsDir.mkdirs()
                val targetFile = File(downloadsDir, filename)
                FileOutputStream(targetFile).use { fos ->
                    fos.write(bytes)
                    fos.flush()
                }
                true
            }
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    /**
     * Launches the official DJI Fly app using Android Intent
     */
    fun launchDJIFly(context: Context): Boolean {
        val packageNames = listOf("dji.go.v5", "com.dji.go.v5")
        for (pkg in packageNames) {
            val intent = context.packageManager.getLaunchIntentForPackage(pkg)
            if (intent != null) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(intent)
                return true
            }
        }
        return false
    }
}
