package id.web.qbyte.djiinjector

import android.app.AlertDialog
import android.app.ProgressDialog
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.DocumentsContract
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
    private var folderUri: Uri? = null

    private val prefs by lazy {
        getSharedPreferences("dji_injector_prefs", Context.MODE_PRIVATE)
    }

    private val pickFolderLauncher = registerForActivityResult(
        ActivityResultContracts.OpenDocumentTree()
    ) { uri ->
        if (uri != null) {
            try {
                contentResolver.takePersistableUriPermission(
                    uri,
                    Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                )
                folderUri = uri
                prefs.edit().putString("folder_uri", uri.toString()).apply()
                updateFolderStatusUI()
                Toast.makeText(this, "Folder DJI Fly berhasil dihubungkan!", Toast.LENGTH_SHORT).show()
            } catch (e: Exception) {
                Toast.makeText(this, "Gagal menyimpan izin folder: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupUI()
        checkLoginSession()
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

        // Folder Picker with Auto Deep-Link
        binding.btnPickFolder.setOnClickListener {
            val directFolder = WaypointInjector.getDirectWaypointFolder()
            if (directFolder != null) {
                Toast.makeText(this, "Folder DJI Fly terdeteksi langsung tanpa perlu SAF!", Toast.LENGTH_SHORT).show()
            } else {
                showFolderPickerPrompt()
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

        // Restore saved folder URI
        val savedFolderStr = prefs.getString("folder_uri", null)
        if (savedFolderStr != null) {
            try {
                folderUri = Uri.parse(savedFolderStr)
            } catch (_: Exception) {}
        }
    }

    private fun showFolderPickerPrompt() {
        AlertDialog.Builder(this)
            .setTitle("Buka Folder DJI Fly")
            .setMessage("Aplikasi akan membuka folder waypoint DJI Fly secara langsung.\n\n" +
                    "⚠️ Tips Android 11 - 14:\n" +
                    "Jika sistem HP Anda mengarahkan ke folder luar (karena batasan Google):\n" +
                    "1. Klik 'Gunakan Folder Ini' jika berada di folder dji.go.v5 / waypoint.\n" +
                    "2. Atau gunakan tombol 'Simpan KMZ' untuk mengunduh lalu memindahkannya via ZArchiver / Kabel USB.")
            .setPositiveButton("Buka Folder") { _, _ ->
                launchFolderPickerWithDeepLink()
            }
            .setNegativeButton("Batal", null)
            .show()
    }

    /**
     * Auto Deep-Link using proper Tree Document URIs
     */
    private fun launchFolderPickerWithDeepLink() {
        val authority = "com.android.externalstorage.documents"
        val candidatePaths = listOf(
            "primary:Android/data/dji.go.v5/files/waypoint",
            "primary:Android/data/dji.go.v5",
            "primary:Android/data",
            "primary:Android"
        )

        for (path in candidatePaths) {
            try {
                val treeUri = DocumentsContract.buildTreeDocumentUri(authority, path)
                pickFolderLauncher.launch(treeUri)
                return
            } catch (_: Exception) {}
        }

        try {
            pickFolderLauncher.launch(null)
        } catch (e: Exception) {
            Toast.makeText(this, "Tidak dapat membuka pemilih file sistem: ${e.message}", Toast.LENGTH_SHORT).show()
        }
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
        val directFolder = WaypointInjector.getDirectWaypointFolder()
        if (directFolder != null) {
            binding.tvFolderStatus.text = "Terdeteksi Langsung (DJI RC / Direct)"
            binding.tvFolderStatus.setBackgroundColor(0xFFD1FAE5.toInt()) // Light Green
            binding.tvFolderStatus.setTextColor(0xFF065F46.toInt()) // Dark Green
            binding.btnPickFolder.text = "Folder DJI Fly Otomatis Aktif"
            return
        }

        if (folderUri != null) {
            binding.tvFolderStatus.text = "Terhubung (SAF)"
            binding.tvFolderStatus.setBackgroundColor(0xFFD1FAE5.toInt()) // Light Green
            binding.tvFolderStatus.setTextColor(0xFF065F46.toInt()) // Dark Green
            binding.btnPickFolder.text = "Ubah Izin Folder DJI Fly"
        } else {
            binding.tvFolderStatus.text = "Belum Terhubung"
            binding.tvFolderStatus.setBackgroundColor(0xFFFEF3C7.toInt()) // Light Amber
            binding.tvFolderStatus.setTextColor(0xFFB45309.toInt()) // Dark Amber
            binding.btnPickFolder.text = "Buka Folder DJI Fly (Auto Deep-Link)"
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
        val directFolder = WaypointInjector.getDirectWaypointFolder()
        val currentUri = folderUri

        if (directFolder == null && currentUri == null) {
            AlertDialog.Builder(this)
                .setTitle("Folder DJI Fly Belum Diizinkan")
                .setMessage("Aplikasi akan langsung membuka folder waypoint DJI Fly (Auto Deep-Link).\n\nSaat folder terbuka, cukup klik tombol 'GUNAKAN FOLDER INI' di bagian bawah layar.")
                .setPositiveButton("Buka Folder Sekarang") { _, _ ->
                    launchFolderPickerWithDeepLink()
                }
                .setNegativeButton("Batal", null)
                .show()
            return
        }

        AlertDialog.Builder(this)
            .setTitle("Timpa Misi DJI Fly")
            .setMessage("Apakah Anda ingin menimpa file dummy terbaru di DJI Fly dengan misi '${mission.title}'?")
            .setPositiveButton("Ya, Timpa Sekarang") { _, _ ->
                executeInject(mission, directFolder, currentUri)
            }
            .setNegativeButton("Batal", null)
            .show()
    }

    private fun executeInject(mission: MissionItem, directFolder: File?, uri: Uri?) {
        val currentToken = token ?: return
        val progress = ProgressDialog(this).apply {
            setMessage("Sedang mengunduh dan menimpa misi ke DJI Fly...")
            setCancelable(false)
            show()
        }

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val kmzBytes = ApiService.downloadMissionKmz(mission.id, currentToken)
                val result = if (directFolder != null) {
                    WaypointInjector.injectMissionDirect(directFolder, kmzBytes)
                } else if (uri != null) {
                    WaypointInjector.injectMission(this@MainActivity, uri, kmzBytes)
                } else {
                    WaypointInjector.InjectResult(false, null, "Folder DJI Fly belum diatur.")
                }

                withContext(Dispatchers.Main) {
                    progress.dismiss()

                    if (result.success) {
                        AlertDialog.Builder(this@MainActivity)
                            .setTitle("Berhasil Ditimpa! 🚀")
                            .setMessage("Misi '${mission.title}' berhasil disuntikkan ke file dummy '${result.dummyFileName}'. Buka DJI Fly sekarang untuk mulai terbang.")
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
