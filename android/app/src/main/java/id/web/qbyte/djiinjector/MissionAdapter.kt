package id.web.qbyte.djiinjector

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.button.MaterialButton

class MissionAdapter(
    private var missions: List<MissionItem>,
    private val onInjectClick: (MissionItem) -> Unit,
    private val onSaveKmzClick: (MissionItem) -> Unit
) : RecyclerView.Adapter<MissionAdapter.ViewHolder>() {

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val tvTitle: TextView = view.findViewById(R.id.tvMissionTitle)
        val tvType: TextView = view.findViewById(R.id.tvMissionTypeBadge)
        val tvDrone: TextView = view.findViewById(R.id.tvDroneModel)
        val tvAltitude: TextView = view.findViewById(R.id.tvAltitude)
        val tvSpeed: TextView = view.findViewById(R.id.tvSpeed)
        val tvWaypoints: TextView = view.findViewById(R.id.tvWaypointCount)
        val btnInject: MaterialButton = view.findViewById(R.id.btnInject)
        val btnSaveDownloads: MaterialButton = view.findViewById(R.id.btnSaveDownloads)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_mission, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val item = missions[position]
        holder.tvTitle.text = item.title
        holder.tvType.text = (item.mission_type ?: "GRID").uppercase()
        holder.tvDrone.text = item.drone_model ?: "DJI Drone"
        holder.tvAltitude.text = "${item.altitude ?: 60} m"
        holder.tvSpeed.text = "${item.speed ?: 5.0} m/s"
        holder.tvWaypoints.text = "${item.waypointsCount} Titik"

        holder.btnInject.setOnClickListener {
            onInjectClick(item)
        }
        holder.btnSaveDownloads.setOnClickListener {
            onSaveKmzClick(item)
        }
    }

    override fun getItemCount(): Int = missions.size

    fun updateData(newMissions: List<MissionItem>) {
        missions = newMissions
        notifyDataSetChanged()
    }
}
