package id.web.qbyte.djiinjector

import android.app.AlertDialog
import android.app.ProgressDialog
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.LinearLayoutManager
import id.web.qbyte.djiinjector.databinding.ActivityMainBinding
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

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
        // RecyclerView Setup
        missionAdapter = MissionAdapter(emptyList()) { mission ->
            confirmAndInjectMission(mission)
        }
        binding.rvMissions.layoutManager = LinearLayoutManager(this)
        binding.rvMissions.adapter = missionAdapter

        // Swipe Refresh
        binding.swipeRefresh.setOnRefreshListener {
            loadMissions()
        }
        binding.btnRefresh.setOnClickListener {
            loadMissions()
        }

        // Folder Picker
        binding.btnPickFolder.setOnClickListener {
            pickFolderLauncher.launch(null)
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
        if (folderUri != null) {
            binding.tvFolderStatus.text = "Terhubung"
            binding.tvFolderStatus.setBackgroundColor(0xFFD1FAE5.toInt()) // Light Green
            binding.tvFolderStatus.setTextColor(0xFF065F46.toInt()) // Dark Green
            binding.btnPickFolder.text = "Ubah Folder DJI Fly"
        } else {
            binding.tvFolderStatus.text = "Belum Terhubung"
            binding.tvFolderStatus.setBackgroundColor(0xFFFEF3C7.toInt()) // Light Amber
            binding.tvFolderStatus.setTextColor(0xFFB45309.toInt()) // Dark Amber
            binding.btnPickFolder.text = "Pilih / Izinkan Folder DJI Fly (1x Saja)"
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
        val currentUri = folderUri
        if (currentUri == null) {
            AlertDialog.Builder(this)
                .setTitle("Folder Belum Diizinkan")
                .setMessage("Aplikasi membutuhkan izin akses ke folder waypoint DJI Fly (Android/data/dji.go.v5/files/waypoint/). Silakan klik tombol 'Pilih Folder' terlebih dahulu.")
                .setPositiveButton("Pilih Folder Sekarang") { _, _ ->
                    pickFolderLauncher.launch(null)
                }
                .setNegativeButton("Batal", null)
                .show()
            return
        }

        AlertDialog.Builder(this)
            .setTitle("Timpa Misi DJI Fly")
            .setMessage("Apakah Anda ingin menimpa file dummy terbaru di DJI Fly dengan misi '${mission.title}'?")
            .setPositiveButton("Ya, Timpa Sekarang") { _, _ ->
                executeInject(mission, currentUri)
            }
            .setNegativeButton("Batal", null)
            .show()
    }

    private fun executeInject(mission: MissionItem, uri: Uri) {
        val currentToken = token ?: return
        val progress = ProgressDialog(this).apply {
            setMessage("Sedang mengunduh dan menimpa misi ke DJI Fly...")
            setCancelable(false)
            show()
        }

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val kmzBytes = ApiService.downloadMissionKmz(mission.id, currentToken)
                val result = WaypointInjector.injectMission(this@MainActivity, uri, kmzBytes)

                withContext(Dispatchers.Main) {
                    progress.dismiss()

                    if (result.success) {
                        AlertDialog.Builder(this@MainActivity)
                            .setTitle("Berhasil Ditimpa! 🚀")
                            .setMessage("Misi '${mission.title}' berhasil disuntikkan ke file dummy '${result.dummyFileName}'. Buka DJI Fly sekarang untuk terbang.")
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
}
