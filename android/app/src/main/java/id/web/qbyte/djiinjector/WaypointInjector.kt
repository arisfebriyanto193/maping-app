package id.web.qbyte.djiinjector

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.documentfile.provider.DocumentFile

object WaypointInjector {

    data class InjectResult(
        val success: Boolean,
        val dummyFileName: String?,
        val message: String
    )

    /**
     * Finds the most recent dummy .kmz file in the user-selected waypoint folder,
     * and overwrites its content with the given kmzBytes.
     */
    fun injectMission(context: Context, treeUri: Uri, kmzBytes: ByteArray): InjectResult {
        try {
            val rootFolder = DocumentFile.fromTreeUri(context, treeUri)
                ?: return InjectResult(false, null, "Tidak dapat mengakses folder DJI Fly. Silakan pilih folder lagi.")

            val kmzFiles = rootFolder.listFiles().filter {
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
