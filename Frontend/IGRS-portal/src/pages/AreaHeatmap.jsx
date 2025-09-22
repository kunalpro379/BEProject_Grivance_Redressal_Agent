import React from "react"

function AreaHeatmap() {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-screen">
      <h2 className="text-2xl font-semibold mb-4">Grievance Heatmap</h2>
      <div className="w-full h-[calc(100%-2rem)]">
        <iframe 
          src="/src/assets/grievances_map.html"
          className="w-full h-full border-0"
          title="Grievances Heatmap"
        />
      </div>
    </div>
  )
}

export default AreaHeatmap

