package id.web.qbyte.djiinjector

import android.app.AlertDialog
import android.app.ProgressDialog
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.Settings
import android.view.View
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import id.web.qbyte.djiinjector.databinding.ActivityMainBinding
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var missionAdapter: MissionAdapter
    private var token: String? = null

    private val prefs by lazy {
        getSharedPreferences("dji_injector_prefs", Context.MODE_PRIVATE)
    }

    // Launcher to request MANAGE_EXTERNAL_STORAGE permission
    private val manageStorageLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) {
        // After returning from settings, re-check permission
        updateFolderStatusUI()
        if (hasFullStorageAccess()) {
            Toast.makeText(this, "✅ Izin penyimpanan berhasil diberikan! Folder DJI Fly siap diakses.", Toast.LENGTH_SHORT).show()
        } else {
            Toast.makeText(this, "⚠️ Izin penyimpanan belum diberikan. Tombol 'Simpan KMZ' ke Downloads masih bisa digunakan.", Toast.LENGTH_LONG).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupUI()
        checkLoginSession()
    }

    override fun onResume() {
        super.onResume()
        if (token != null) {
            updateFolderStatusUI()
        }
    }

    /**
     * Check if we have full storage access (MANAGE_EXTERNAL_STORAGE on Android 11+,
     * or standard storage permission on older versions).
     */
    private fun hasFullStorageAccess(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Environment.isExternalStorageManager()
        } else {
            true // Android 10 and below: requestLegacyExternalStorage=true is enough
        }
    }

    /**
     * Check if the DJI Fly waypoint folder exists and is accessible.
     */
    private fun getDjiWaypointFolder(): File? {
        if (!hasFullStorageAccess()) return null

        val candidates = listOf(
            File("/storage/emulated/0/Android/data/dji.go.v5/files/waypoint"),
            File(Environment.getExternalStorageDirectory(), "Android/data/dji.go.v5/files/waypoint")
        )
        for (dir in candidates) {
            if (dir.exists() && dir.isDirectory) {
                return dir
            }
        }
        return null
    }

    private fun setupUI() {
        // RecyclerView Setup with Inject & Save KMZ callbacks
        missionAdapter = MissionAdapter(
            missions = emptyList(),
            onInjectClick = { mission -> confirmAndInjectMission(mission) },
            onSaveKmzClick = { mission -> saveMissionKmzToDownloads(mission) }
        )
        binding.rvMissions.layoutManager = LinearLayoutManager(this)
        binding.rvMissions.adapter = missionAdapter

        // Swipe Refresh
        binding.swipeRefresh.setOnRefreshListener {
            loadMissions()
        }
        binding.btnRefresh.setOnClickListener {
            loadMissions()
        }

        // Folder Permission Button
        binding.btnPickFolder.setOnClickListener {
            if (hasFullStorageAccess()) {
                val folder = getDjiWaypointFolder()
                if (folder != null) {
                    Toast.makeText(this, "✅ Folder DJI Fly sudah terhubung:\n${folder.absolutePath}", Toast.LENGTH_LONG).show()
                } else {
                    Toast.makeText(this, "⚠️ Folder DJI Fly belum ditemukan. Pastikan DJI Fly sudah diinstal dan Anda sudah membuat 1 misi waypoint dummy.", Toast.LENGTH_LONG).show()
                }
            } else {
                requestFullStorageAccess()
            }
        }

        // Launch DJI Fly button in header
        binding.btnLaunchDJI.setOnClickListener {
            if (!WaypointInjector.launchDJIFly(this)) {
                Toast.makeText(this, "Aplikasi DJI Fly tidak ditemukan di perangkat ini.", Toast.LENGTH_SHORT).show()
            }
        }

        // Login Button
        binding.btnLogin.setOnClickListener {
            performLogin()
        }

        // Logout Button
        binding.btnLogout.setOnClickListener {
            prefs.edit().remove("auth_token").remove("auth_username").apply()
            token = null
            checkLoginSession()
        }
    }

    /**
     * Request MANAGE_EXTERNAL_STORAGE permission via system settings.
     * This is the same approach used by ZArchiver, Solid Explorer, etc.
     */
    private fun requestFullStorageAccess() {
        AlertDialog.Builder(this)
            .setTitle("Izin Akses Penyimpanan Penuh")
            .setMessage(
                "Untuk menimpa file waypoint DJI Fly di folder:\n" +
                "Android/data/dji.go.v5/files/waypoint/\n\n" +
                "Aplikasi membutuhkan izin 'Akses Semua File'.\n\n" +
                "Langkah selanjutnya:\n" +
                "1. Layar pengaturan akan terbuka\n" +
                "2. Aktifkan toggle 'Izinkan akses untuk mengelola semua file'\n" +
                "3. Kembali ke aplikasi ini\n\n" +
                "⚡ Setelah diizinkan, semua misi bisa langsung ditimpa otomatis tanpa perlu memilih folder!")
            .setPositiveButton("Buka Pengaturan") { _, _ ->
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                        val intent = Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION).apply {
                            data = Uri.parse("package:$packageName")
                        }
                        manageStorageLauncher.launch(intent)
                    }
                } catch (e: Exception) {
                    try {
                        val intent = Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION)
                        manageStorageLauncher.launch(intent)
                    } catch (_: Exception) {
                        Toast.makeText(this, "Tidak dapat membuka pengaturan: ${e.message}", Toast.LENGTH_LONG).show()
                    }
                }
            }
            .setNegativeButton("Nanti Saja") { _, _ ->
                Toast.makeText(this, "Anda tetap bisa menggunakan tombol 'Simpan KMZ' untuk menyimpan ke Downloads.", Toast.LENGTH_LONG).show()
            }
            .show()
    }

    private fun checkLoginSession() {
        token = prefs.getString("auth_token", null)
        val username = prefs.getString("auth_username", "")

        if (!token.isNullOrEmpty()) {
            binding.loginContainer.visibility = View.GONE
            binding.mainContainer.visibility = View.VISIBLE
            binding.tvUserBadge.text = "Masuk sebagai: @$username"
            updateFolderStatusUI()
            loadMissions()
        } else {
            binding.loginContainer.visibility = View.VISIBLE
            binding.mainContainer.visibility = View.GONE
            binding.etUsername.setText("aris")
        }
    }

    private fun updateFolderStatusUI() {
        if (!hasFullStorageAccess()) {
            binding.tvFolderStatus.text = "Izin Belum Diberikan"
            binding.tvFolderStatus.setBackgroundColor(0xFFFEE2E2.toInt()) // Light Red
            binding.tvFolderStatus.setTextColor(0xFFB91C1C.toInt()) // Dark Red
            binding.btnPickFolder.text = "🔓 Berikan Izin Akses Penyimpanan"
            return
        }

        val folder = getDjiWaypointFolder()
        if (folder != null) {
            binding.tvFolderStatus.text = "✅ Terhubung Langsung"
            binding.tvFolderStatus.setBackgroundColor(0xFFD1FAE5.toInt()) // Light Green
            binding.tvFolderStatus.setTextColor(0xFF065F46.toInt()) // Dark Green
            binding.btnPickFolder.text = "Folder DJI Fly Siap (Akses Langsung)"
        } else {
            binding.tvFolderStatus.text = "Izin OK — DJI Fly Belum Ditemukan"
            binding.tvFolderStatus.setBackgroundColor(0xFFFEF3C7.toInt()) // Light Amber
            binding.tvFolderStatus.setTextColor(0xFFB45309.toInt()) // Dark Amber
            binding.btnPickFolder.text = "Buat Misi Dummy di DJI Fly Dulu"
        }
    }

    private fun performLogin() {
        val user = binding.etUsername.text.toString().trim()
        val pass = binding.etPassword.text.toString().trim()

        if (user.isEmpty() || pass.isEmpty()) {
            Toast.makeText(this, "Username dan password wajib diisi", Toast.LENGTH_SHORT).show()
            return
        }

        binding.btnLogin.isEnabled = false
        binding.loginProgress.visibility = View.VISIBLE

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val resp = ApiService.login(user, pass)
                withContext(Dispatchers.Main) {
                    binding.btnLogin.isEnabled = true
                    binding.loginProgress.visibility = View.GONE

                    if (resp.success && !resp.token.isNullOrEmpty()) {
                        prefs.edit()
                            .putString("auth_token", resp.token)
                            .putString("auth_username", resp.user?.username ?: user)
                            .apply()
                        checkLoginSession()
                    } else {
                        Toast.makeText(this@MainActivity, resp.message ?: "Login gagal", Toast.LENGTH_LONG).show()
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    binding.btnLogin.isEnabled = true
                    binding.loginProgress.visibility = View.GONE
                    Toast.makeText(this@MainActivity, "Koneksi gagal: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private fun loadMissions() {
        val currentToken = token ?: return
        binding.swipeRefresh.isRefreshing = true

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val missions = ApiService.getMissions(currentToken)
                withContext(Dispatchers.Main) {
                    binding.swipeRefresh.isRefreshing = false
                    missionAdapter.updateData(missions)
                    binding.tvEmptyState.visibility = if (missions.isEmpty()) View.VISIBLE else View.GONE
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    binding.swipeRefresh.isRefreshing = false
                    Toast.makeText(this@MainActivity, "Gagal memuat misi: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    private fun confirmAndInjectMission(mission: MissionItem) {
        if (!hasFullStorageAccess()) {
            AlertDialog.Builder(this)
                .setTitle("Izin Penyimpanan Diperlukan")
                .setMessage("Untuk menimpa file DJI Fly, aplikasi membutuhkan izin akses penyimpanan penuh terlebih dahulu.")
                .setPositiveButton("Berikan Izin") { _, _ ->
                    requestFullStorageAccess()
                }
                .setNegativeButton("Batal", null)
                .show()
            return
        }

        val folder = getDjiWaypointFolder()
        if (folder == null) {
            AlertDialog.Builder(this)
                .setTitle("Folder DJI Fly Belum Ada")
                .setMessage(
                    "Folder waypoint DJI Fly belum ditemukan di:\n" +
                    "Android/data/dji.go.v5/files/waypoint/\n\n" +
                    "Pastikan:\n" +
                    "1. Aplikasi DJI Fly sudah diinstal\n" +
                    "2. Buat 1 misi waypoint dummy di DJI Fly terlebih dahulu\n\n" +
                    "Misi dummy akan membuat folder otomatis.")
                .setPositiveButton("Buka DJI Fly") { _, _ ->
                    if (!WaypointInjector.launchDJIFly(this)) {
                        Toast.makeText(this, "DJI Fly tidak ditemukan", Toast.LENGTH_SHORT).show()
                    }
                }
                .setNegativeButton("Tutup", null)
                .show()
            return
        }

        AlertDialog.Builder(this)
            .setTitle("Timpa Misi DJI Fly")
            .setMessage("Apakah Anda ingin menimpa file dummy terbaru di DJI Fly dengan misi '${mission.title}'?")
            .setPositiveButton("Ya, Timpa Sekarang") { _, _ ->
                executeInject(mission, folder)
            }
            .setNegativeButton("Batal", null)
            .show()
    }

    private fun executeInject(mission: MissionItem, waypointFolder: File) {
        val currentToken = token ?: return
        val progress = ProgressDialog(this).apply {
            setMessage("Sedang mengunduh dan menimpa misi ke DJI Fly...")
            setCancelable(false)
            show()
        }

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val kmzBytes = ApiService.downloadMissionKmz(mission.id, currentToken)
                val result = WaypointInjector.injectMissionDirect(waypointFolder, kmzBytes)

                withContext(Dispatchers.Main) {
                    progress.dismiss()

                    if (result.success) {
                        AlertDialog.Builder(this@MainActivity)
                            .setTitle("Berhasil Ditimpa! 🚀")
                            .setMessage("Misi '${mission.title}' berhasil disuntikkan ke file dummy '${result.dummyFileName}'.\n\nBuka DJI Fly sekarang untuk mulai terbang.")
                            .setPositiveButton("Buka DJI Fly") { _, _ ->
                                WaypointInjector.launchDJIFly(this@MainActivity)
                            }
                            .setNegativeButton("Tutup", null)
                            .show()
                    } else {
                        AlertDialog.Builder(this@MainActivity)
                            .setTitle("Gagal Menimpa")
                            .setMessage(result.message)
                            .setPositiveButton("OK", null)
                            .show()
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    progress.dismiss()
                    AlertDialog.Builder(this@MainActivity)
                        .setTitle("Terjadi Kesalahan")
                        .setMessage(e.message)
                        .setPositiveButton("OK", null)
                        .show()
                }
            }
        }
    }

    private fun saveMissionKmzToDownloads(mission: MissionItem) {
        val currentToken = token ?: return
        val progress = ProgressDialog(this).apply {
            setMessage("Mengunduh file KMZ '${mission.title}'...")
            setCancelable(false)
            show()
        }

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val kmzBytes = ApiService.downloadMissionKmz(mission.id, currentToken)
                val safeName = mission.title.replace("[^a-zA-Z0-9_.-]".toRegex(), "_")
                val fileName = "${safeName}_dji_mission.kmz"

                val success = WaypointInjector.saveKmzToDownloads(this@MainActivity, fileName, kmzBytes)

                withContext(Dispatchers.Main) {
                    progress.dismiss()
                    if (success) {
                        AlertDialog.Builder(this@MainActivity)
                            .setTitle("KMZ Berhasil Disimpan! 📥")
                            .setMessage("File tersimpan di folder Downloads:\n\n$fileName\n\nAnda dapat menyalin file ini menggunakan ZArchiver atau File Manager ke:\nAndroid/data/dji.go.v5/files/waypoint/")
                            .setPositiveButton("OK", null)
                            .show()
                    } else {
                        Toast.makeText(this@MainActivity, "Gagal menyimpan file ke folder Downloads", Toast.LENGTH_LONG).show()
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    progress.dismiss()
                    Toast.makeText(this@MainActivity, "Gagal mengunduh KMZ: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        }
    }
}
