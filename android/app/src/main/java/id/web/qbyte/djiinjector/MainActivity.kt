package id.web.qbyte.djiinjector

import android.app.AlertDialog
import android.app.ProgressDialog
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.DocumentsContract
import android.provider.Settings
import android.view.View
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.documentfile.provider.DocumentFile
import androidx.recyclerview.widget.LinearLayoutManager
import id.web.qbyte.djiinjector.databinding.ActivityMainBinding
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var missionAdapter: MissionAdapter
    private var token: String? = null
    private var safFolderUri: Uri? = null

    // All known DJI app package names
    private val DJI_PACKAGES = listOf(
        "dji.go.v5",
        "com.dji.industry.pilot",
        "dji.pilot2",
        "com.dji.go.v5"
    )

    private val prefs by lazy {
        getSharedPreferences("dji_injector_prefs", Context.MODE_PRIVATE)
    }

    // SAF folder picker launcher
    private val pickFolderLauncher = registerForActivityResult(
        ActivityResultContracts.OpenDocumentTree()
    ) { uri ->
        if (uri != null) {
            try {
                contentResolver.takePersistableUriPermission(
                    uri,
                    Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                )
                safFolderUri = uri
                prefs.edit().putString("saf_folder_uri", uri.toString()).apply()
                updateFolderStatusUI()
                Toast.makeText(this, "✅ Folder DJI Fly berhasil dihubungkan via SAF!", Toast.LENGTH_SHORT).show()
            } catch (e: Exception) {
                Toast.makeText(this, "Gagal menyimpan izin folder: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }

    // MANAGE_EXTERNAL_STORAGE permission launcher
    private val manageStorageLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) {
        updateFolderStatusUI()
        if (hasManageStoragePermission()) {
            if (canDirectAccessDjiFolder()) {
                Toast.makeText(this, "✅ Akses langsung ke folder DJI Fly berhasil!", Toast.LENGTH_SHORT).show()
            } else {
                Toast.makeText(this, "✅ Izin diberikan, tapi Android 12+ memblokir Android/data. Gunakan SAF atau Simpan KMZ.", Toast.LENGTH_LONG).show()
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

    override fun onResume() {
        super.onResume()
        if (token != null) {
            updateFolderStatusUI()
        }
    }

    // ============================================================
    // ACCESS DETECTION METHODS
    // ============================================================

    /** Check if MANAGE_EXTERNAL_STORAGE permission is granted */
    private fun hasManageStoragePermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Environment.isExternalStorageManager()
        } else {
            true
        }
    }

    /** Check if we can ACTUALLY read inside Android/data/dji.go.v5/files/ */
    private fun canDirectAccessDjiFolder(): Boolean {
        val storage = Environment.getExternalStorageDirectory()
        for (pkg in DJI_PACKAGES) {
            val filesDir = File(storage, "Android/data/$pkg/files")
            if (filesDir.exists() && filesDir.isDirectory) {
                val contents = filesDir.listFiles()
                if (contents != null) return true // Can actually list contents
            }
        }
        return false
    }

    /** Get DJI waypoint folder via direct file access (Android 11 or DJI RC) */
    private fun getDirectWaypointFolder(): File? {
        val storage = Environment.getExternalStorageDirectory()
        for (pkg in DJI_PACKAGES) {
            val waypointDir = File(storage, "Android/data/$pkg/files/waypoint")
            if (waypointDir.exists() && waypointDir.isDirectory) {
                val canList = waypointDir.listFiles() != null
                if (canList) return waypointDir
            }
            // Try to auto-create if files/ is accessible
            val filesDir = File(storage, "Android/data/$pkg/files")
            if (filesDir.exists() && filesDir.listFiles() != null) {
                try {
                    if (waypointDir.mkdirs() || waypointDir.exists()) {
                        return waypointDir
                    }
                } catch (_: Exception) {}
            }
        }
        return null
    }

    /** Check if DJI app folder exists (even if we can't read inside it) */
    private fun djiAppFolderExists(): Boolean {
        val storage = Environment.getExternalStorageDirectory()
        return DJI_PACKAGES.any { pkg ->
            File(storage, "Android/data/$pkg").exists()
        }
    }

    /** Check if SAF folder URI is usable */
    private fun hasSafAccess(): Boolean {
        return safFolderUri != null
    }

    /** Get the best access method available */
    private fun getAccessMethod(): AccessMethod {
        val directFolder = getDirectWaypointFolder()
        if (directFolder != null) return AccessMethod.DIRECT(directFolder)

        if (safFolderUri != null) return AccessMethod.SAF(safFolderUri!!)

        return AccessMethod.NONE
    }

    sealed class AccessMethod {
        data class DIRECT(val folder: File) : AccessMethod()
        data class SAF(val uri: Uri) : AccessMethod()
        object NONE : AccessMethod()
    }

    // ============================================================
    // UI SETUP
    // ============================================================

    private fun setupUI() {
        missionAdapter = MissionAdapter(
            missions = emptyList(),
            onInjectClick = { mission -> confirmAndInjectMission(mission) },
            onSaveKmzClick = { mission -> saveMissionKmzToDownloads(mission) }
        )
        binding.rvMissions.layoutManager = LinearLayoutManager(this)
        binding.rvMissions.adapter = missionAdapter

        binding.swipeRefresh.setOnRefreshListener { loadMissions() }
        binding.btnRefresh.setOnClickListener { loadMissions() }

        // Main folder button — smart action based on current state
        binding.btnPickFolder.setOnClickListener {
            handleFolderButtonClick()
        }

        binding.btnLaunchDJI.setOnClickListener {
            if (!WaypointInjector.launchDJIFly(this)) {
                Toast.makeText(this, "Aplikasi DJI Fly tidak ditemukan.", Toast.LENGTH_SHORT).show()
            }
        }

        binding.btnLogin.setOnClickListener { performLogin() }
        binding.btnLogout.setOnClickListener {
            prefs.edit().remove("auth_token").remove("auth_username").apply()
            token = null
            checkLoginSession()
        }

        // Restore saved SAF URI
        prefs.getString("saf_folder_uri", null)?.let {
            try { safFolderUri = Uri.parse(it) } catch (_: Exception) {}
        }
    }

    private fun handleFolderButtonClick() {
        when (val method = getAccessMethod()) {
            is AccessMethod.DIRECT -> {
                Toast.makeText(this, "✅ Akses langsung aktif:\n${method.folder.absolutePath}", Toast.LENGTH_LONG).show()
            }
            is AccessMethod.SAF -> {
                Toast.makeText(this, "✅ Akses via SAF aktif", Toast.LENGTH_SHORT).show()
            }
            is AccessMethod.NONE -> {
                showAccessSetupDialog()
            }
        }
    }

    private fun showAccessSetupDialog() {
        val djiExists = djiAppFolderExists()
        val hasPermission = hasManageStoragePermission()
        val canDirect = canDirectAccessDjiFolder()
        val androidVersion = Build.VERSION.SDK_INT

        val message = StringBuilder()

        if (!djiExists) {
            message.appendLine("❌ Folder DJI Fly tidak ditemukan di Android/data/")
            message.appendLine("Pastikan DJI Fly sudah diinstal dan pernah dibuka.")
            message.appendLine("")
        } else {
            message.appendLine("✅ DJI Fly terinstal")

            if (!hasPermission) {
                message.appendLine("❌ Izin penyimpanan belum diberikan")
                message.appendLine("")
                message.appendLine("Klik 'Berikan Izin' untuk membuka pengaturan.")
            } else if (!canDirect) {
                message.appendLine("⚠️ Android ${Build.VERSION.RELEASE} memblokir akses ke Android/data")
                message.appendLine("")
                message.appendLine("Pilihan Anda:")
                message.appendLine("1️⃣ Coba SAF — Buka folder via pemilih file sistem")
                message.appendLine("2️⃣ Simpan KMZ — Download ke folder Downloads, lalu salin manual via ZArchiver atau kabel USB")
            } else {
                message.appendLine("✅ Akses langsung tersedia!")
            }
        }

        val builder = AlertDialog.Builder(this)
            .setTitle("Pengaturan Folder DJI Fly")
            .setMessage(message.toString())

        if (djiExists && hasPermission && !canDirect) {
            // Android 12+ — blocked. Offer SAF and Save options
            builder.setPositiveButton("Coba SAF") { _, _ ->
                launchSafPicker()
            }
            builder.setNegativeButton("Tutup", null)
        } else if (!hasPermission) {
            builder.setPositiveButton("Berikan Izin") { _, _ ->
                requestManageStoragePermission()
            }
            builder.setNegativeButton("Tutup", null)
        } else if (!djiExists) {
            builder.setPositiveButton("Buka DJI Fly") { _, _ ->
                WaypointInjector.launchDJIFly(this)
            }
            builder.setNegativeButton("Tutup", null)
        } else {
            builder.setPositiveButton("OK", null)
        }

        builder.show()
    }

    private fun requestManageStoragePermission() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                val intent = Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION).apply {
                    data = Uri.parse("package:$packageName")
                }
                manageStorageLauncher.launch(intent)
            }
        } catch (e: Exception) {
            try {
                manageStorageLauncher.launch(Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION))
            } catch (_: Exception) {
                Toast.makeText(this, "Tidak dapat membuka pengaturan", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun launchSafPicker() {
        val authority = "com.android.externalstorage.documents"
        // Try jumping directly into the DJI waypoint folder
        val candidates = listOf(
            "primary:Android/data/dji.go.v5/files/waypoint",
            "primary:Android/data/dji.go.v5/files",
            "primary:Android/data/dji.go.v5"
        )
        for (path in candidates) {
            try {
                val treeUri = DocumentsContract.buildTreeDocumentUri(authority, path)
                pickFolderLauncher.launch(treeUri)
                return
            } catch (_: Exception) {}
        }
        // Fallback: open picker at root
        pickFolderLauncher.launch(null)
    }

    // ============================================================
    // STATUS UI
    // ============================================================

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
        when (val method = getAccessMethod()) {
            is AccessMethod.DIRECT -> {
                binding.tvFolderStatus.text = "✅ Akses Langsung Aktif"
                binding.tvFolderStatus.setBackgroundColor(0xFFD1FAE5.toInt())
                binding.tvFolderStatus.setTextColor(0xFF065F46.toInt())
                binding.btnPickFolder.text = "📂 ${method.folder.absolutePath}"
            }
            is AccessMethod.SAF -> {
                binding.tvFolderStatus.text = "✅ Terhubung via SAF"
                binding.tvFolderStatus.setBackgroundColor(0xFFD1FAE5.toInt())
                binding.tvFolderStatus.setTextColor(0xFF065F46.toInt())
                binding.btnPickFolder.text = "📂 Folder DJI Fly Terhubung (SAF)"
            }
            is AccessMethod.NONE -> {
                if (djiAppFolderExists() && hasManageStoragePermission()) {
                    binding.tvFolderStatus.text = "⚠️ Android ${Build.VERSION.RELEASE} blokir akses"
                    binding.tvFolderStatus.setBackgroundColor(0xFFFEF3C7.toInt())
                    binding.tvFolderStatus.setTextColor(0xFFB45309.toInt())
                    binding.btnPickFolder.text = "🔧 Coba SAF / Lihat Opsi Lain"
                } else if (!hasManageStoragePermission()) {
                    binding.tvFolderStatus.text = "🔓 Izin Belum Diberikan"
                    binding.tvFolderStatus.setBackgroundColor(0xFFFEE2E2.toInt())
                    binding.tvFolderStatus.setTextColor(0xFFB91C1C.toInt())
                    binding.btnPickFolder.text = "🔓 Berikan Izin Akses Penyimpanan"
                } else {
                    binding.tvFolderStatus.text = "❌ DJI Fly Belum Ditemukan"
                    binding.tvFolderStatus.setBackgroundColor(0xFFFEE2E2.toInt())
                    binding.tvFolderStatus.setTextColor(0xFFB91C1C.toInt())
                    binding.btnPickFolder.text = "🔍 Diagnosis Folder DJI Fly"
                }
            }
        }
    }

    // ============================================================
    // MISSION ACTIONS
    // ============================================================

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
        when (val method = getAccessMethod()) {
            is AccessMethod.DIRECT -> {
                AlertDialog.Builder(this)
                    .setTitle("Timpa Misi DJI Fly")
                    .setMessage("Timpa file waypoint terbaru di DJI Fly dengan misi '${mission.title}'?")
                    .setPositiveButton("Ya, Timpa") { _, _ -> executeInjectDirect(mission, method.folder) }
                    .setNegativeButton("Batal", null)
                    .show()
            }
            is AccessMethod.SAF -> {
                AlertDialog.Builder(this)
                    .setTitle("Timpa Misi DJI Fly")
                    .setMessage("Timpa file waypoint terbaru di DJI Fly dengan misi '${mission.title}'?\n\n(Mode: SAF)")
                    .setPositiveButton("Ya, Timpa") { _, _ -> executeInjectSAF(mission, method.uri) }
                    .setNegativeButton("Batal", null)
                    .show()
            }
            is AccessMethod.NONE -> {
                AlertDialog.Builder(this)
                    .setTitle("Belum Bisa Menimpa Langsung")
                    .setMessage(
                        "Android ${Build.VERSION.RELEASE} memblokir akses langsung ke folder DJI Fly.\n\n" +
                        "Pilihan Anda:\n\n" +
                        "1️⃣ Coba SAF — Buka pemilih folder sistem\n" +
                        "2️⃣ Simpan KMZ — Simpan ke Downloads, lalu salin manual via ZArchiver atau kabel USB ke:\n" +
                        "Android/data/dji.go.v5/files/waypoint/")
                    .setPositiveButton("Coba SAF") { _, _ -> launchSafPicker() }
                    .setNeutralButton("Simpan KMZ") { _, _ -> saveMissionKmzToDownloads(mission) }
                    .setNegativeButton("Batal", null)
                    .show()
            }
        }
    }

    // ============================================================
    // INJECT VIA DIRECT FILE ACCESS
    // ============================================================

    private fun executeInjectDirect(mission: MissionItem, waypointFolder: File) {
        val currentToken = token ?: return
        val progress = ProgressDialog(this).apply {
            setMessage("Mengunduh dan menimpa misi ke DJI Fly...")
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
                        showInjectSuccess(mission, result)
                    } else {
                        showInjectError(result.message)
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    progress.dismiss()
                    showInjectError(e.message ?: "Unknown error")
                }
            }
        }
    }

    // ============================================================
    // INJECT VIA SAF
    // ============================================================

    private fun executeInjectSAF(mission: MissionItem, treeUri: Uri) {
        val currentToken = token ?: return
        val progress = ProgressDialog(this).apply {
            setMessage("Mengunduh dan menimpa misi ke DJI Fly (SAF)...")
            setCancelable(false)
            show()
        }

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val kmzBytes = ApiService.downloadMissionKmz(mission.id, currentToken)
                val result = WaypointInjector.injectMission(this@MainActivity, treeUri, kmzBytes)

                withContext(Dispatchers.Main) {
                    progress.dismiss()
                    if (result.success) {
                        showInjectSuccess(mission, result)
                    } else {
                        showInjectError(result.message)
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    progress.dismiss()
                    showInjectError(e.message ?: "Unknown error")
                }
            }
        }
    }

    // ============================================================
    // SAVE KMZ TO DOWNLOADS
    // ============================================================

    private fun saveMissionKmzToDownloads(mission: MissionItem) {
        val currentToken = token ?: return
        val progress = ProgressDialog(this).apply {
            setMessage("Mengunduh KMZ '${mission.title}'...")
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
                            .setMessage(
                                "File tersimpan di Downloads:\n$fileName\n\n" +
                                "Langkah selanjutnya:\n" +
                                "1. Buka ZArchiver (atau file manager)\n" +
                                "2. Buka folder Downloads, salin file '$fileName'\n" +
                                "3. Navigasi ke:\n   Android/data/dji.go.v5/files/waypoint/\n" +
                                "4. Buka folder misi terakhir, timpa file .kmz di dalamnya\n" +
                                "5. Buka DJI Fly → misi sudah terganti!")
                            .setPositiveButton("Buka DJI Fly") { _, _ ->
                                WaypointInjector.launchDJIFly(this@MainActivity)
                            }
                            .setNegativeButton("OK", null)
                            .show()
                    } else {
                        Toast.makeText(this@MainActivity, "Gagal menyimpan KMZ", Toast.LENGTH_LONG).show()
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    progress.dismiss()
                    Toast.makeText(this@MainActivity, "Gagal: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    // ============================================================
    // RESULT DIALOGS
    // ============================================================

    private fun showInjectSuccess(mission: MissionItem, result: WaypointInjector.InjectResult) {
        AlertDialog.Builder(this)
            .setTitle("Berhasil! 🚀")
            .setMessage("Misi '${mission.title}' berhasil disuntikkan ke '${result.dummyFileName}'.\n\nBuka DJI Fly untuk mulai terbang.")
            .setPositiveButton("Buka DJI Fly") { _, _ -> WaypointInjector.launchDJIFly(this) }
            .setNegativeButton("Tutup", null)
            .show()
    }

    private fun showInjectError(message: String?) {
        AlertDialog.Builder(this)
            .setTitle("Gagal Menimpa")
            .setMessage(message)
            .setPositiveButton("OK", null)
            .show()
    }
}
