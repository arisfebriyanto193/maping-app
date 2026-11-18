package id.web.qbyte.djiinjector

import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

object ApiService {
    private const val BASE_URL = "http://backend-iot.qbyte.web.id/maping/api"

    fun login(username: String, pass: String): LoginResponse {
        val url = URL("$BASE_URL/auth/login")
        val conn = url.openConnection() as HttpURLConnection
        conn.requestMethod = "POST"
        conn.setRequestProperty("Content-Type", "application/json")
        conn.setRequestProperty("Accept", "application/json")
        conn.doOutput = true
        conn.connectTimeout = 10000
        conn.readTimeout = 10000

        val json = JSONObject().apply {
            put("username", username)
            put("password", pass)
        }

        OutputStreamWriter(conn.outputStream).use { it.write(json.toString()) }

        val responseCode = conn.responseCode
        val stream = if (responseCode in 200..299) conn.inputStream else conn.errorStream
        val responseBody = BufferedReader(InputStreamReader(stream)).readText()

        val respJson = JSONObject(responseBody)
        val success = respJson.optBoolean("success", false)
        val message = respJson.optString("message", null)
        val token = respJson.optString("token", null)

        var user: User? = null
        if (respJson.has("user") && !respJson.isNull("user")) {
            val uObj = respJson.getJSONObject("user")
            user = User(
                id = uObj.optInt("id", 0),
                username = uObj.optString("username", ""),
                email = uObj.optString("email", null),
                role = uObj.optString("role", null)
            )
        }

        return LoginResponse(success, message, token, user)
    }

    fun getMissions(token: String): List<MissionItem> {
        val url = URL("$BASE_URL/missions")
        val conn = url.openConnection() as HttpURLConnection
        conn.requestMethod = "GET"
        conn.setRequestProperty("Authorization", "Bearer $token")
        conn.setRequestProperty("Accept", "application/json")
        conn.connectTimeout = 10000
        conn.readTimeout = 10000

        val responseCode = conn.responseCode
        if (responseCode !in 200..299) {
            val err = BufferedReader(InputStreamReader(conn.errorStream ?: conn.inputStream)).readText()
            throw Exception("Gagal mengambil data misi ($responseCode): $err")
        }

        val responseBody = BufferedReader(InputStreamReader(conn.inputStream)).readText()
        val respJson = JSONObject(responseBody)
        val dataArray = respJson.optJSONArray("data") ?: JSONArray()

        val list = mutableListOf<MissionItem>()
        for (i in 0 until dataArray.length()) {
            val obj = dataArray.getJSONObject(i)
            val wpCount = when (val wpRaw = obj.opt("waypoints_json")) {
                is JSONArray -> wpRaw.length()
                is String -> try { JSONArray(wpRaw).length() } catch (_: Exception) { 0 }
                else -> 0
            }

            list.add(
                MissionItem(
                    id = obj.optInt("id"),
                    title = obj.optString("title", "Misi Tanpa Judul"),
                    description = obj.optString("description", null),
                    drone_model = obj.optString("drone_model", "DJI Drone"),
                    mission_type = obj.optString("mission_type", "grid"),
                    altitude = obj.optInt("altitude", 60),
                    speed = obj.optDouble("speed", 5.0),
                    overlap_front = obj.optInt("overlap_front", 75),
                    overlap_side = obj.optInt("overlap_side", 65),
                    grid_angle = obj.optInt("grid_angle", 0),
                    waypointsCount = wpCount,
                    created_at = obj.optString("created_at", "")
                )
            )
        }

        return list
    }

    fun downloadMissionKmz(missionId: Int, token: String): ByteArray {
        val url = URL("$BASE_URL/missions/$missionId/kmz")
        val conn = url.openConnection() as HttpURLConnection
        conn.requestMethod = "GET"
        conn.setRequestProperty("Authorization", "Bearer $token")
        conn.connectTimeout = 15000
        conn.readTimeout = 15000

        val responseCode = conn.responseCode
        if (responseCode !in 200..299) {
            val err = BufferedReader(InputStreamReader(conn.errorStream ?: conn.inputStream)).readText()
            throw Exception("Gagal mengunduh file KMZ ($responseCode): $err")
        }

        return conn.inputStream.use { it.readBytes() }
    }
}
