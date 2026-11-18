package id.web.qbyte.djiinjector

data class User(
    val id: Int,
    val username: String,
    val email: String?,
    val role: String?
)

data class LoginResponse(
    val success: Boolean,
    val message: String?,
    val token: String?,
    val user: User?
)

data class MissionItem(
    val id: Int,
    val title: String,
    val description: String?,
    val drone_model: String?,
    val mission_type: String?,
    val altitude: Int?,
    val speed: Double?,
    val overlap_front: Int?,
    val overlap_side: Int?,
    val grid_angle: Int?,
    val waypointsCount: Int = 0,
    val created_at: String?
)
