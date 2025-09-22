# # generate_mumbai_wards_complaints_1000.py
# """
# Generates 1000 synthetic complaints inside real Mumbai ward polygons (downloaded from a public KML),
# assigns each point to a ward (for backend aggregation only), creates density clusters (DBSCAN) and
# produces an interactive Folium map that emphasizes clusters (no filled polygons) + a heatmap.

# Features:
# - 1000 synthetic complaints (configurable)
# - Uses real ward polygons to ensure points lie inside Mumbai
# - DBSCAN clusters for density-based clusters (shown as cluster markers)
# - HeatMap layer for density visualization
# - MarkerCluster for individual complaint markers (hidden by default)
# - Clicking on a cluster marker opens a popup with a scrollable list of complaints; clicking individual markers shows full details
# - Ward assignments are used only for aggregation/statistics and saved in GeoJSON outputs

# Usage:
#     pip install pandas geopandas shapely folium scikit-learn tqdm requests
#     python generate_mumbai_wards_complaints_1000.py

# Outputs:
# - mumbai_complaints_points.geojson  (points with ward_assigned and cluster_id)
# - mumbai_complaints_map_1000.html   (interactive map)

# """

# import os
# import json
# import random
# import math
# from datetime import datetime, timedelta
# import requests
# from shapely.geometry import Point
# import geopandas as gpd
# import pandas as pd
# import folium
# from folium.plugins import MarkerCluster, HeatMap
# from sklearn.cluster import DBSCAN
# import numpy as np

# # ---------------------------
# # CONFIG
# # ---------------------------
# CONFIG = {
#     "TOTAL_COMPLAINTS": 1000,
#     "EPS_METERS": 700,             # DBSCAN epsilon (meters) for clustering
#     "MIN_SAMPLES": 8,              # DBSCAN min samples to form a cluster
#     "MARATHI_SHARE": 0.8,
#     "USE_LOCAL_WARD_FILE": False,
#     "LOCAL_WARD_FILE": "mumbai_wards.kml",
#     "WARD_KML_URL": "https://data.opencity.in/dataset/756c147f-160d-4760-8e89-332699b4dee2/resource/e7a671e2-1f71-4219-a83c-556334bc9021/download/mumbai-wards-map.kml",
#     "OUTPUT_DIR": ".",
#     "RANDOM_SEED": 42
# }

# random.seed(CONFIG["RANDOM_SEED"]) 
# np.random.seed(CONFIG["RANDOM_SEED"])

# # ---------------------------
# # names and complaints (short list - expand as needed)
# # ---------------------------
# MARATHI_NAMES = ["Sanjay Patil","Ramesh Pawar","Aarti Deshmukh","Pratiksha Jadhav","Sunil Shinde",
#                  "Kavita Gaikwad","Ganesh Chavan","Nilesh More","Savita Kulkarni","Vikas Salunkhe"]
# OTHER_NAMES = ["Mohammed Khan","Ayesha Shaikh","Rahul Reddy","Priya Iyer","Shabana Ansari",
#                "Imran Pathan","Akhil Nair","Deepa Yadav"]
# CATEGORIES = ["Transportation","Sanitation","Water Supply","Electricity","Health Services"]
# COMPLAINTS_EN = [
#     "Garbage collection irregular.",
#     "Potholes causing danger.",
#     "Water supply contaminated.",
#     "Frequent power outages.",
#     "Public hospital lacks essentials.",
#     "Street lights not working.",
#     "Open drains and smell.",
#     "Illegal dumping near homes.",
#     "Bus overcrowded at peak hours.",
#     "No pedestrian crossing at busy junction."
# ]

# # ---------------------------
# # paths
# # ---------------------------
# OUT_DIR = os.path.abspath(CONFIG["OUTPUT_DIR"])
# os.makedirs(OUT_DIR, exist_ok=True)
# POINTS_OUTPUT = os.path.join(OUT_DIR, "mumbai_complaints_points.geojson")
# MAP_OUTPUT = os.path.join(OUT_DIR, "mumbai_complaints_map_1000.html")

# # ---------------------------
# # Step 1: Load wards KML (download if needed)
# # ---------------------------
# if CONFIG["USE_LOCAL_WARD_FILE"]:
#     ward_file = CONFIG["LOCAL_WARD_FILE"]
#     if not os.path.exists(ward_file):
#         raise FileNotFoundError(f"Local ward file not found: {ward_file}")
# else:
#     ward_file = os.path.join(OUT_DIR, "mumbai_wards.kml")
#     if not os.path.exists(ward_file):
#         print("Downloading ward KML...")
#         r = requests.get(CONFIG["WARD_KML_URL"], timeout=30)
#         r.raise_for_status()
#         with open(ward_file, "wb") as fh:
#             fh.write(r.content)
#         print("Saved wards KML to", ward_file)

# print("Reading ward geometries...")
# try:
#     wards_gdf = gpd.read_file(ward_file, driver="KML")
# except Exception:
#     wards_gdf = gpd.read_file(ward_file)

# # detect name column
# name_col = None
# for candidate in ["Name","NAME","name","Description","description"]:
#     if candidate in wards_gdf.columns:
#         name_col = candidate
#         break
# if name_col is None:
#     wards_gdf["ward_name"] = [f"Ward_{i}" for i in range(len(wards_gdf))]
# else:
#     wards_gdf = wards_gdf.rename(columns={name_col: "ward_name"})
#     wards_gdf["ward_name"] = wards_gdf["ward_name"].astype(str)

# wards_gdf = wards_gdf[["ward_name","geometry"]].copy()
# # fix invalid
# wards_gdf["geometry"] = wards_gdf["geometry"].buffer(0)
# wards_gdf = wards_gdf[~wards_gdf.geometry.is_empty].reset_index(drop=True)
# print(f"Loaded {len(wards_gdf)} ward polygons.")

# # ensure projection in a metric CRS for buffering and distance (use EPSG:3857 WebMercator)
# wards_proj = wards_gdf.to_crs(epsg=3857)
# minx, miny, maxx, maxy = wards_proj.total_bounds

# # ---------------------------
# # Step 2: Sample points inside wards (ensure points are actually within Mumbai)
# # We'll select ward polygons weighted so some wards get more points (simulate density differences)
# # ---------------------------
# TOTAL = CONFIG["TOTAL_COMPLAINTS"]

# # prepare weights (some wards heavier)
# ward_area = wards_proj.geometry.area
# # weight combines area and a bit of randomness to create variation
# weights = ward_area.values * (0.5 + np.random.rand(len(ward_area)))
# weights = weights / weights.sum()

# points = []
# attempts = 0
# max_attempts = TOTAL * 30
# print("Sampling points within ward polygons (ensuring they fall inside Mumbai)...")
# while len(points) < TOTAL and attempts < max_attempts:
#     attempts += 1
#     # pick a ward by weight
#     wi = np.random.choice(len(wards_gdf), p=weights)
#     poly = wards_gdf.loc[wi, 'geometry']
#     # sample a point in polygon by rejection in bbox
#     minx_p, miny_p, maxx_p, maxy_p = poly.bounds
#     for _ in range(20):
#         rx = random.uniform(minx_p, maxx_p)
#         ry = random.uniform(miny_p, maxy_p)
#         p = Point(rx, ry)
#         if poly.contains(p):
#             points.append((p.x, p.y, wards_gdf.loc[wi, 'ward_name']))
#             break

# if len(points) < TOTAL:
#     raise RuntimeError(f"Could only sample {len(points)} points; increase max_attempts or inspect ward polygons")

# print(f"Sampled {len(points)} complaint locations inside wards.")

# # ---------------------------
# # Step 3: Build complaint records
# # ---------------------------
# records = []
# now = datetime.utcnow()
# for i, (lon, lat, ward_name) in enumerate(points, start=1):
#     name = random.choice(MARATHI_NAMES) if random.random() < CONFIG["MARATHI_SHARE"] else random.choice(OTHER_NAMES)
#     category = random.choice(CATEGORIES)
#     message = random.choice(COMPLAINTS_EN)
#     timestamp = (now - timedelta(days=random.randint(0,90), hours=random.randint(0,23))).isoformat()
#     records.append({
#         'id': f'C{i:05d}',
#         'reporter': name,
#         'category': category,
#         'message': message,
#         'timestamp': timestamp,
#         'ward_sampled': ward_name,
#         'lon': lon,
#         'lat': lat
#     })

# points_df = pd.DataFrame(records)
# points_gdf = gpd.GeoDataFrame(points_df, geometry=gpd.points_from_xy(points_df.lon, points_df.lat), crs=wards_gdf.crs)

# # ---------------------------
# # Step 4: Project to metric CRS and run DBSCAN for clustering (distance in meters)
# # ---------------------------
# points_proj = points_gdf.to_crs(epsg=3857)
# coords = np.vstack([points_proj.geometry.x.values, points_proj.geometry.y.values]).T

# # eps in meters from config
# eps = CONFIG['EPS_METERS']
# db = DBSCAN(eps=eps, min_samples=CONFIG['MIN_SAMPLES'], metric='euclidean').fit(coords)
# labels = db.labels_
# points_gdf['cluster_id'] = labels

# # label -1 is noise; give them unique ids as 'noise'
# points_gdf['cluster_id'] = points_gdf['cluster_id'].astype(int)

# # compute cluster centroids (only for labels >=0)
# clusters = {}
# for lbl in sorted(points_gdf['cluster_id'].unique()):
#     members = points_gdf[points_gdf['cluster_id'] == lbl]
#     if lbl == -1:
#         continue
#     centroid_x = members.geometry.x.mean()
#     centroid_y = members.geometry.y.mean()
#     clusters[int(lbl)] = {
#         'size': len(members),
#         'centroid_lon': centroid_x,
#         'centroid_lat': centroid_y,
#         'sample_ids': list(members['id'].head(50))
#     }

# # ---------------------------
# # Step 5: Save GeoJSON points with ward assignment and cluster_id
# # ---------------------------
# points_gdf.to_file(POINTS_OUTPUT, driver='GeoJSON')
# print('Saved points GeoJSON to', POINTS_OUTPUT)

# # Also save a simple JSON
# with open(os.path.join(OUT_DIR, 'mumbai_complaints_points_plain.json'), 'w', encoding='utf-8') as fh:
#     fh.write(points_gdf.to_json())

# # ---------------------------
# # Step 6: Build interactive Folium map (clusters + heatmap + marker cluster)
# # Important: We will NOT draw filled polygons; we will show cluster markers and heatmap.
# # ---------------------------
# # map center
# center_lat = points_gdf['lat'].mean()
# center_lon = points_gdf['lon'].mean()
# map_obj = folium.Map(location=[center_lat, center_lon], zoom_start=11, tiles='CartoDB positron')

# # Heatmap (uses lat/lon pairs) — density layer
# heat_data = [[r['lat'], r['lon'], 1] for _, r in points_gdf.iterrows()]
# HeatMap(heat_data, radius=12, blur=15, max_zoom=13).add_to(map_obj)

# # Add hotspot circles for clusters: green/yellow/orange/red, big and semi-transparent
# for cid, info in clusters.items():
#     # popup: list of first N complaints in cluster
#     member_rows = points_gdf[points_gdf['cluster_id'] == cid].sort_values('timestamp', ascending=False).head(50)
#     list_html = '<ul style="max-height:220px;overflow:auto;padding-left:16px">'
#     for _, r in member_rows.iterrows():
#         list_html += f"<li><b>{r['id']}</b> — {r['category']} — {r['message'][:80]}<br/><small>{r['reporter']} • {r['timestamp']}</small></li>"
#     list_html += '</ul>'
#     popup_html = f"<div style='width:350px'><h4>Cluster {cid} — {info['size']} complaints</h4>{list_html}</div>"

#     # Severity by size → color and radius (meters)
#     size = int(info['size'])
#     if size >= 80:
#         color = '#e53935'  # red
#         radius_m = 1400
#     elif size >= 40:
#         color = '#fb8c00'  # orange
#         radius_m = 1100
#     elif size >= 20:
#         color = '#f1c40f'  # yellow
#         radius_m = 850
#     else:
#         color = '#27ae60'  # green
#         radius_m = 600

#     # Big dim circle showing hotspot area
#     folium.Circle(
#         location=[info['centroid_lat'], info['centroid_lon']],
#         radius=radius_m,
#         color=color,
#         weight=3,
#         fill=True,
#         fill_color=color,
#         fill_opacity=0.22,
#         popup=folium.Popup(popup_html, max_width=420)
#     ).add_to(map_obj)

#     # Center label with count
#     folium.Marker(
#         location=[info['centroid_lat'], info['centroid_lon']],
#         icon=folium.DivIcon(
#             html=f'<div style="font-size:13px;font-weight:700;color:#fff;text-align:center;background:{color};border:2px solid #fff;border-radius:18px;padding:2px 8px;box-shadow:0 1px 4px rgba(0,0,0,0.25)">{size}</div>',
#             icon_size=(36, 24),
#             icon_anchor=(18, 12)
#         )
#     ).add_to(map_obj)

# # Add individual complaint markers - make them larger and more visible
# for _, r in points_gdf.iterrows():
#     popup_html = f"<b>{r['id']} — {r['reporter']}</b><br/>{r['category']}<br/>{r['message']}<br/><small>Ward: {r['ward_sampled']}</small>"
    
#     # Color code by category for better visual distinction
#     color_map = {
#         'Transportation': '#3498db',  # Blue
#         'Sanitation': '#e67e22',      # Orange  
#         'Water Supply': '#2ecc71',    # Green
#         'Electricity': '#f39c12',     # Yellow
#         'Health Services': '#9b59b6'  # Purple
#     }
#     marker_color = color_map.get(r['category'], '#34495e')  # Default gray
    
#     folium.CircleMarker(
#         location=[r['lat'], r['lon']], 
#         radius=8,  # Much larger than before (was 3)
#         popup=folium.Popup(popup_html, max_width=350),
#         color='white',  # White border
#         weight=2,       # Border thickness
#         fill=True, 
#         fill_color=marker_color,
#         fill_opacity=0.8
#     ).add_to(map_obj)

# # Layer control
# folium.LayerControl().add_to(map_obj)
# map_obj.save(MAP_OUTPUT)
# print('Map saved to', MAP_OUTPUT)
# print('Done.')

import React, { useState, useEffect } from "react";
import "../styles/citizen-dashboard.css";
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  Users, 
  MessageSquare, 
  Bell,
  ArrowRight,
  Calendar,
  Vote,
  ExternalLink,
  Heart,
  Star,
  Award,
  Globe,
  Zap,
  Shield,
  Phone,
  Mail
} from "lucide-react";

const CitizenDashboard = ({ userAuth, onLogout }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hoveredCard, setHoveredCard] = useState(null);
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const statsData = [
    {
      id: 1,
      title: "Total Grievances",
      value: "12,345",
      change: "+12%",
      icon: FileText,
      gradient: "from-blue-500 to-cyan-500",
      bgGradient: "from-blue-50/80 to-cyan-50/80",
      accent: "from-blue-400 to-cyan-400"
    },
    {
      id: 2,
      title: "Resolved Cases",
      value: "10,890",
      change: "+8%",
      icon: CheckCircle,
      gradient: "from-emerald-500 to-teal-500",
      bgGradient: "from-emerald-50/80 to-teal-50/80",
      accent: "from-emerald-400 to-teal-400"
    },
    {
      id: 3,
      title: "Average Resolution Time",
      value: "48h",
      change: "-25%",
      icon: Clock,
      gradient: "from-purple-500 to-violet-500",
      bgGradient: "from-purple-50/80 to-violet-50/80",
      accent: "from-purple-400 to-violet-400"
    },
    {
      id: 4,
      title: "Citizens Served",
      value: "1M+",
      change: "+15%",
      icon: Users,
      gradient: "from-rose-500 to-pink-500",
      bgGradient: "from-rose-50/80 to-pink-50/80",
      accent: "from-rose-400 to-pink-400"
    }
  ];

  const announcements = [
    {
      id: 1,
      title: "New Digital Service Launch",
      date: "2024-01-15",
      category: "Digital Services",
      icon: Zap,
      color: "text-blue-600"
    },
    {
      id: 2,
      title: "Public Meeting Schedule",
      date: "2024-01-20",
      category: "Community",
      icon: Users,
      color: "text-green-600"
    }
  ];

  const polls = [
    {
      id: 1,
      title: "City Park Development Plan",
      votes: "1234 votes",
      timeLeft: "Ends in 2 days",
      progress: 75
    },
    {
      id: 2,
      title: "Public Transport Routes",
      votes: "890 votes",
      timeLeft: "Ends in 5 days",
      progress: 45
    }
  ];

  const services = [
    {
      id: 1,
      title: "Smart Grievance Resolution",
      description: "AI-powered system for faster complaint resolution",
      stat: "90% resolution rate",
      icon: Zap,
      gradient: "from-blue-500 to-indigo-600"
    },
    {
      id: 2,
      title: "IGRS Maharashtra Initiative",
      description: "Unified platform for citizen grievances",
      stat: "1M+ citizens served",
      icon: Shield,
      gradient: "from-green-500 to-teal-600"
    },
    {
      id: 3,
      title: "Digital Feedback System",
      description: "Real-time tracking and updates",
      stat: "24/7 monitoring",
      icon: MessageSquare,
      gradient: "from-purple-500 to-pink-600"
    },
    {
      id: 4,
      title: "Digital India Initiative",
      description: "Empowering citizens through technology",
      stat: "Learn more",
      icon: Globe,
      gradient: "from-orange-500 to-red-600"
    },
    {
      id: 5,
      title: "Smart City Project",
      description: "Building sustainable urban infrastructure",
      stat: "Learn more",
      icon: Award,
      gradient: "from-cyan-500 to-blue-600"
    },
    {
      id: 6,
      title: "E-Governance Portal",
      description: "Access government services online",
      stat: "Learn more",
      icon: Star,
      gradient: "from-violet-500 to-purple-600"
    }
  ];

  const faqs = [
    {
      id: 1,
      question: "How do I track my grievance?",
      answer: "You can track your grievance using the tracking ID provided after submission. Our real-time tracking system provides updates at every stage."
    },
    {
      id: 2,
      question: "What happens after I submit a grievance?",
      answer: "Your grievance is analyzed by our AI system, categorized by priority, and assigned to the relevant department. You'll receive regular updates via SMS/email."
    },
    {
      id: 3,
      question: "How long does resolution take?",
      answer: "Resolution time varies by type of grievance. Simple issues are typically resolved within 48 hours, while complex cases may take 7-14 days."
    },
    {
      id: 4,
      question: "Can I submit anonymous complaints?",
      answer: "Yes, you can submit anonymous complaints. However, we recommend providing contact details for better follow-up and updates."
    }
  ];

  return (
    <div 
      className="min-h-screen relative overflow-hidden"
      style={{
        backgroundImage: 'url(/5641003.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      
      {/* Grid Pattern Overlay - 45 degree tilted lines grid */}
      <div 
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage: `
            linear-gradient(45deg, rgba(200,200,200,0.6) 1px, transparent 1px),
            linear-gradient(90deg, rgba(200,200,200,0.6) 1px, transparent 1px)
          `,
          backgroundSize: '30px 30px',
          transform: 'rotate(45deg)'
        }}
      ></div>
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden z-10">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200/20 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-200/20 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-200/20 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-float" style={{animationDelay: '4s'}}></div>
      </div>
       {/* Floating Sidebar */}
       <div className="group/sidebar fixed left-4 top-1/2 -translate-y-1/2 h-[85vh] w-20 hover:w-80 bg-white/90 backdrop-blur-2xl border-2 border-white/80 rounded-3xl transition-all duration-500 ease-in-out shadow-[0_25px_50px_rgba(0,0,0,0.15)] ring-2 ring-white/60 flex flex-col z-50">
        {/* Logo section */}
        <div className="p-4 border-b border-gray-200/50 flex items-center">
          <div className="flex items-center gap-3 w-full">
            <img src="/logo.png" alt="Logo" className="h-10 w-10 rounded-xl shadow-lg" />
            <div className="hidden group-hover/sidebar:block">
              <div className="text-sm font-bold text-gray-800">MH-IGRS</div>
              <div className="text-xs text-gray-600">Citizen Portal</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 pt-4 overflow-y-auto custom-scrollbar">
          {[
            { label: "Dashboard", icon: FileText, active: true },
            { label: "Grievances", icon: FileText },
            { label: "Statistics", icon: TrendingUp },
            { label: "Announcements", icon: Bell },
            { label: "Community", icon: Users }
          ].map((item, index) => (
            <button
              key={index}
              className={`w-full flex items-center py-3 px-4 text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-all duration-300 rounded-xl mx-2 ${
                item.active ? "bg-blue-100 text-blue-700 ring-2 ring-blue-200 shadow-lg" : ""
              }`}
            >
              <item.icon size={22} />
              <span className="ml-3 whitespace-nowrap hidden group-hover/sidebar:inline">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-gray-200/50 p-4">
          <button className="w-full flex items-center gap-2 text-gray-600 hover:bg-blue-50 hover:text-blue-700 p-2 rounded-xl transition-all duration-300">
            <div className="h-8 w-8 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-lg ring-2 ring-emerald-100">
              {userAuth?.name?.charAt(0) || "C"}
            </div>
            <span className="whitespace-nowrap hidden group-hover/sidebar:inline text-sm">{userAuth?.name || "Citizen"}</span>
          </button>
        </div>
      </div>

       {/* Floating Navbar */}
       <nav className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-white/90 backdrop-blur-2xl shadow-[0_25px_50px_rgba(0,0,0,0.15)] border-2 border-white/80 rounded-3xl px-6 py-4 w-[95%] max-w-6xl ring-2 ring-white/60">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Logo" className="h-12 w-12 rounded-xl shadow-lg" />
               <div className="flex flex-col">
                 <h1 className="text-lg font-bold text-gray-800">IGRS</h1>
                 <p className="text-xs text-gray-500 -mt-1">Citizen Portal</p>
               </div>
            </div>
          </div>

           {/* Center Actions */}
           <div className="hidden md:flex items-center space-x-6">
             {/* Notifications */}
             <button className="relative p-2 hover:bg-gray-100 rounded-full transition-all duration-300">
               <Bell className="h-6 w-6 text-gray-600" strokeWidth={1.5} />
               <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full flex items-center justify-center">
                 <span className="text-[8px] text-white font-bold">3</span>
               </div>
             </button>

             {/* Contact */}
             <button className="p-2 hover:bg-gray-100 rounded-full transition-all duration-300">
               <Phone className="h-6 w-6 text-gray-600" strokeWidth={1.5} />
             </button>

            {/* Profile Avatar */}
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg ring-2 ring-white/40">
                <span className="text-white font-bold text-sm">
                  {userAuth?.name?.charAt(0) || "C"}
                </span>
              </div>
              <div className="hidden lg:block">
                <p className="text-sm font-semibold text-gray-800">{userAuth?.name || "Citizen"}</p>
                <p className="text-xs text-gray-500">Online</p>
              </div>
            </div>
          </div>

        </div>
      </nav>

      {/* Main Content */}
      <div className="pl-28 pt-32 pr-8 pb-8 relative z-20">
        {/* Welcome Section */}
        <div className="mb-8">
           <div className="bg-gradient-to-br from-white/90 via-blue-50/90 to-indigo-50/90 backdrop-blur-2xl rounded-3xl p-8 text-gray-800 relative overflow-hidden border-2 border-white/80 shadow-[0_25px_50px_rgba(0,0,0,0.15)] ring-2 ring-white/60">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-100/30 via-cyan-100/30 to-indigo-100/30 backdrop-blur-sm"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-200/40 to-cyan-300/40 rounded-full blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-200/40 to-pink-300/40 rounded-full blur-xl"></div>
            <div className="relative z-10">
          <h1 className="text-4xl font-bold mb-4 animate-slideInFromLeft">
            Welcome to Grievance System
          </h1>
          <p className="text-xl opacity-90 mb-6 animate-slideInFromRight">
            Public Grievance Portal - Your voice matters, we're here to listen
          </p>
          <div className="flex gap-4 animate-bounceIn">
            <button className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-3 rounded-2xl font-semibold hover:from-emerald-400 hover:to-teal-400 transition-all duration-300 flex items-center gap-2 hover-lift shadow-[0_10px_30px_rgba(0,0,0,0.1)] ring-2 ring-emerald-100">
              <FileText size={20} />
              Submit New Grievance
            </button>
            <button className="bg-white/60 backdrop-blur-sm border-2 border-blue-200 text-blue-700 px-6 py-3 rounded-2xl font-semibold hover:bg-blue-50 hover:border-blue-300 transition-all duration-300 flex items-center gap-2 hover-lift shadow-lg">
              <Clock size={20} />
              Track Status
            </button>
          </div>
            </div>
            <div className="absolute top-4 right-4 text-right opacity-75">
              <div className="text-sm">{currentTime.toLocaleDateString()}</div>
              <div className="text-lg font-semibold">{currentTime.toLocaleTimeString()}</div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsData.map((stat, index) => (
            <div
              key={stat.id}
               className={`bg-gradient-to-br ${stat.bgGradient} backdrop-blur-2xl rounded-3xl p-6 shadow-[0_25px_50px_rgba(0,0,0,0.15)] hover:shadow-[0_35px_60px_rgba(0,0,0,0.2)] transition-all duration-500 transform hover:scale-105 cursor-pointer border-2 border-white/80 card-hover animate-bounceIn stagger-animation relative overflow-hidden ring-2 ring-white/60`}
              style={{ '--animation-delay': `${index * 0.1}s` }}
              onMouseEnter={() => setHoveredCard(stat.id)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${stat.accent} rounded-full blur-2xl opacity-30`}></div>
               <div className="flex items-center justify-between mb-4 relative z-10">
                 <div className="p-2">
                   <stat.icon size={24} className="text-gray-600" />
                 </div>
                <div className={`text-sm font-semibold px-3 py-1 rounded-full backdrop-blur-sm ${
                  stat.change.startsWith('+') ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-rose-100 text-rose-700 border border-rose-200'
                }`}>
                  {stat.change}
                </div>
              </div>
              <h3 className="text-gray-700 font-medium mb-2 relative z-10">{stat.title}</h3>
              <p className="text-3xl font-bold text-gray-800 mb-2 relative z-10">{stat.value}</p>
              {hoveredCard === stat.id && (
                <div className="animate-fadeIn relative z-10">
                  <ArrowRight className="text-gray-500" size={20} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Latest Announcements */}
           <div className="lg:col-span-1 bg-white/90 backdrop-blur-2xl rounded-3xl shadow-[0_25px_50px_rgba(0,0,0,0.15)] p-6 border-2 border-white/80 animate-slideInFromLeft hover-lift relative overflow-hidden ring-2 ring-white/60">
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-blue-200/40 to-purple-200/40 rounded-full blur-xl"></div>
            <div className="flex items-center justify-between mb-6 relative z-10">
               <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                 <Bell className="text-gray-600" size={24} />
                 Latest Announcements
               </h3>
              <button className="text-blue-500 hover:text-blue-600 text-sm font-medium hover:underline">View all</button>
            </div>
            <div className="space-y-4">
              {announcements.map((announcement) => (
                 <div key={announcement.id} className="p-4 bg-white/70 backdrop-blur-sm rounded-2xl hover:bg-white/90 transition-all duration-300 cursor-pointer border-2 border-white/80 hover:border-blue-300 relative z-10 ring-1 ring-white/60">
                   <div className="flex items-start gap-3">
                     <div className="p-1">
                       <announcement.icon size={18} className="text-gray-500" />
                     </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800 mb-1">{announcement.title}</h4>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar size={14} />
                        {announcement.date}
                      </div>
                      <span className="inline-block mt-2 text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full border border-blue-200">
                        {announcement.category}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Public Polls */}
           <div className="lg:col-span-2 bg-white/90 backdrop-blur-2xl rounded-3xl shadow-[0_25px_50px_rgba(0,0,0,0.15)] p-6 border-2 border-white/80 animate-slideInFromRight hover-lift relative overflow-hidden ring-2 ring-white/60">
            <div className="absolute top-0 left-0 w-20 h-20 bg-gradient-to-br from-emerald-200/40 to-teal-200/40 rounded-full blur-xl"></div>
            <div className="flex items-center justify-between mb-6 relative z-10">
               <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                 <Vote className="text-gray-600" size={24} />
                 Active Public Polls
               </h3>
              <button className="text-emerald-500 hover:text-emerald-600 text-sm font-medium hover:underline">View all</button>
            </div>
            <div className="space-y-4">
              {polls.map((poll) => (
                 <div key={poll.id} className="p-4 bg-white/70 backdrop-blur-sm rounded-2xl hover:bg-white/90 transition-all duration-300 cursor-pointer border-2 border-white/80 hover:border-emerald-300 relative z-10 ring-1 ring-white/60">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-800">{poll.title}</h4>
                    <button className="text-emerald-500 hover:text-emerald-600 text-sm font-medium flex items-center gap-1 hover:underline">
                      Vote Now <ExternalLink size={14} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                    <span>{poll.votes}</span>
                    <span>{poll.timeLeft}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 progress-bar">
                    <div 
                      className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 h-3 rounded-full transition-all duration-1000 animate-gradientShift shadow-lg"
                      style={{ width: `${poll.progress}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Government Services Grid */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center relative z-10">Government Services & Initiatives</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service, index) => (
               <div key={service.id} className="bg-white/90 backdrop-blur-2xl rounded-3xl shadow-[0_25px_50px_rgba(0,0,0,0.15)] hover:shadow-[0_35px_60px_rgba(0,0,0,0.2)] transition-all duration-500 transform hover:scale-105 overflow-hidden group cursor-pointer card-hover animate-fadeIn stagger-animation border-2 border-white/80 relative ring-2 ring-white/60" style={{ '--animation-delay': `${index * 0.15}s` }}>
                <div className={`h-1 bg-gradient-to-r ${service.gradient} shadow-lg`}></div>
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-cyan-200/30 to-purple-200/30 rounded-full blur-xl"></div>
                <div className="p-6 relative z-10">
                   <div className="flex items-center gap-3 mb-4">
                     <div className="p-1">
                       <service.icon size={24} className="text-gray-600" />
                     </div>
                    <h4 className="font-bold text-gray-800">{service.title}</h4>
                  </div>
                  <p className="text-gray-600 mb-4">{service.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-blue-500">{service.stat}</span>
                    <ArrowRight className="text-gray-400 group-hover:text-blue-500 transition-colors" size={20} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
         <div className="bg-white/90 backdrop-blur-2xl rounded-3xl shadow-[0_25px_50px_rgba(0,0,0,0.15)] p-8 border-2 border-white/80 animate-fadeIn hover-lift relative overflow-hidden ring-2 ring-white/60">
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-32 bg-gradient-to-br from-purple-200/30 to-pink-200/30 rounded-full blur-2xl"></div>
          <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center relative z-10">Frequently Asked Questions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {faqs.map((faq, index) => (
               <div key={faq.id} className="p-6 bg-white/70 backdrop-blur-sm rounded-2xl hover:bg-white/90 transition-all duration-300 hover-lift animate-slideInFromLeft stagger-animation border-2 border-white/80 hover:border-blue-300 relative z-10 ring-1 ring-white/60" style={{ '--animation-delay': `${index * 0.1}s` }}>
                 <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                   <MessageSquare className="text-gray-500" size={18} />
                   {faq.question}
                 </h4>
                <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center relative z-10">
             <div className="flex items-center justify-center gap-2 mb-4">
               <Heart className="text-gray-500" size={20} />
               <span className="text-gray-600">Thank you for helping us improve!</span>
             </div>
          <p className="text-gray-500 text-sm">© 2023 Grievance System</p>
        </div>
      </div>
    </div>
  );
};

export default CitizenDashboard;


import React, { useState, useEffect } from "react";
import "../styles/citizen-dashboard.css";
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  Users, 
  MessageSquare, 
  Bell,
  ArrowRight,
  Calendar,
  Vote,
  ExternalLink,
  Heart,
  Star,
  Award,
  Globe,
  Zap,
  Shield,
  Phone,
  Mail,
  Search,
  HelpCircle,
  Settings,
  BarChart3,
  Home,
  User,
  LogOut,
  ChevronDown,
  Plus
} from "lucide-react";

const CitizenDashboard = ({ userAuth, onLogout }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hoveredCard, setHoveredCard] = useState(null);
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const statsData = [
    {
      id: 1,
      title: "Total Grievances",
      value: "12,345",
      change: "+12%",
      icon: FileText,
      gradient: "from-blue-500 to-cyan-500",
      bgGradient: "from-blue-50/80 to-cyan-50/80",
      accent: "from-blue-400 to-cyan-400"
    },
    {
      id: 2,
      title: "Resolved Cases",
      value: "10,890",
      change: "+8%",
      icon: CheckCircle,
      gradient: "from-emerald-500 to-teal-500",
      bgGradient: "from-emerald-50/80 to-teal-50/80",
      accent: "from-emerald-400 to-teal-400"
    },
    {
      id: 3,
      title: "Average Resolution Time",
      value: "48h",
      change: "-25%",
      icon: Clock,
      gradient: "from-purple-500 to-violet-500",
      bgGradient: "from-purple-50/80 to-violet-50/80",
      accent: "from-purple-400 to-violet-400"
    },
    {
      id: 4,
      title: "Citizens Served",
      value: "1M+",
      change: "+15%",
      icon: Users,
      gradient: "from-rose-500 to-pink-500",
      bgGradient: "from-rose-50/80 to-pink-50/80",
      accent: "from-rose-400 to-pink-400"
    }
  ];

  const announcements = [
    {
      id: 1,
      title: "New Digital Service Launch",
      date: "2024-01-15",
      category: "Digital Services",
      icon: Zap,
      color: "text-blue-600"
    },
    {
      id: 2,
      title: "Public Meeting Schedule",
      date: "2024-01-20",
      category: "Community",
      icon: Users,
      color: "text-green-600"
    }
  ];

  const polls = [
    {
      id: 1,
      title: "City Park Development Plan",
      votes: "1234 votes",
      timeLeft: "Ends in 2 days",
      progress: 75
    },
    {
      id: 2,
      title: "Public Transport Routes",
      votes: "890 votes",
      timeLeft: "Ends in 5 days",
      progress: 45
    }
  ];

  const services = [
    {
      id: 1,
      title: "Smart Grievance Resolution",
      description: "AI-powered system for faster complaint resolution",
      stat: "90% resolution rate",
      icon: Zap,
      gradient: "from-blue-500 to-indigo-600"
    },
    {
      id: 2,
      title: "IGRS Maharashtra Initiative",
      description: "Unified platform for citizen grievances",
      stat: "1M+ citizens served",
      icon: Shield,
      gradient: "from-green-500 to-teal-600"
    },
    {
      id: 3,
      title: "Digital Feedback System",
      description: "Real-time tracking and updates",
      stat: "24/7 monitoring",
      icon: MessageSquare,
      gradient: "from-purple-500 to-pink-600"
    },
    {
      id: 4,
      title: "Digital India Initiative",
      description: "Empowering citizens through technology",
      stat: "Learn more",
      icon: Globe,
      gradient: "from-orange-500 to-red-600"
    },
    {
      id: 5,
      title: "Smart City Project",
      description: "Building sustainable urban infrastructure",
      stat: "Learn more",
      icon: Award,
      gradient: "from-cyan-500 to-blue-600"
    },
    {
      id: 6,
      title: "E-Governance Portal",
      description: "Access government services online",
      stat: "Learn more",
      icon: Star,
      gradient: "from-violet-500 to-purple-600"
    }
  ];

  const faqs = [
    {
      id: 1,
      question: "How do I track my grievance?",
      answer: "You can track your grievance using the tracking ID provided after submission. Our real-time tracking system provides updates at every stage."
    },
    {
      id: 2,
      question: "What happens after I submit a grievance?",
      answer: "Your grievance is analyzed by our AI system, categorized by priority, and assigned to the relevant department. You'll receive regular updates via SMS/email."
    },
    {
      id: 3,
      question: "How long does resolution take?",
      answer: "Resolution time varies by type of grievance. Simple issues are typically resolved within 48 hours, while complex cases may take 7-14 days."
    },
    {
      id: 4,
      question: "Can I submit anonymous complaints?",
      answer: "Yes, you can submit anonymous complaints. However, we recommend providing contact details for better follow-up and updates."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">IG</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">IGRS Portal</h1>
              <p className="text-xs text-gray-500">Citizen Dashboard</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {[
              { label: "Dashboard", icon: Home, active: true },
              { label: "Grievances", icon: FileText },
              { label: "Statistics", icon: BarChart3 },
              { label: "Announcements", icon: Bell },
              { label: "Community", icon: Users },
              { label: "Settings", icon: Settings }
            ].map((item, index) => (
              <button
                key={index}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  item.active 
                    ? "bg-gray-100 text-gray-900" 
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <item.icon size={20} />
                {item.label}
                {item.label === "Grievances" && <ChevronDown size={16} className="ml-auto" />}
                {item.label === "Community" && <ChevronDown size={16} className="ml-auto" />}
              </button>
            ))}
          </div>
        </nav>

        {/* Bottom utilities */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50">
              <Search size={18} />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50">
              <Settings size={18} />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50">
              <Star size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Navbar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
            
            {/* Search Bar */}
            <div className="flex-1 max-w-md mx-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search anything..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-4">
              <button className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors flex items-center gap-2">
                <Plus size={16} />
                Create
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 relative">
                <Bell size={20} />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50">
                <HelpCircle size={20} />
              </button>
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <User size={16} className="text-gray-600" />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-6">
          {/* Overview Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Overview</h2>
              <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option>Last month</option>
                <option>Last week</option>
                <option>Last year</option>
              </select>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {statsData.map((stat, index) => (
                <div key={stat.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <stat.icon size={20} className="text-gray-600" />
                    </div>
                    <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                      stat.change.startsWith('+') 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {stat.change}
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-600 mb-1">{stat.title}</h3>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* New Grievances Banner */}
            <div className="bg-gray-100 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">857 new grievances today!</p>
                  <p className="text-sm text-gray-600">Send a welcome message to all new citizens.</p>
                </div>
                <button className="bg-white px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-200">
                  Send Message
                </button>
              </div>
            </div>

            {/* Recent Citizens */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Citizens</h3>
                <button className="text-blue-600 text-sm font-medium hover:underline">View all</button>
              </div>
              <div className="flex items-center gap-4">
                {['Gladyce', 'Elbert', 'Dash', 'Joyce', 'Marina'].map((name, index) => (
                  <div key={index} className="text-center">
                    <div className="w-12 h-12 bg-gray-300 rounded-full mx-auto mb-2 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">{name[0]}</span>
                    </div>
                    <p className="text-xs text-gray-600">{name}</p>
                  </div>
                ))}
                <button className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors">
                  <ArrowRight size={16} className="text-gray-600" />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Popular Services */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Popular Services</h3>
                <button className="text-blue-600 text-sm font-medium hover:underline">All services</button>
              </div>
              <div className="space-y-4">
                {services.slice(0, 5).map((service) => (
                  <div key={service.id} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <service.icon size={20} className="text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{service.title}</h4>
                      <p className="text-sm text-gray-600">{service.stat}</p>
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                      Active
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Grievance Activity */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Grievance Activity</h3>
                <select className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option>Last 7 days</option>
                  <option>Last month</option>
                  <option>Last year</option>
                </select>
              </div>
              <div className="mb-4">
                <p className="text-3xl font-bold text-gray-900">10.2k</p>
                <p className="text-sm text-gray-600">Total grievances processed</p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">Resolved</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">8.9k</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">In Progress</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">1.1k</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">Pending</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">0.2k</span>
                </div>
              </div>
            </div>
          </div>

          {/* Comments Section */}
          <div className="mt-6 bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Recent Comments</h3>
              <button className="text-blue-600 text-sm font-medium hover:underline">View all</button>
            </div>
            <div className="space-y-4">
              {[
                { name: "Joyce", service: "Bento Pro 2.0", time: "09:00 AM", comment: "Great work! When HTML version will be available?" },
                { name: "Gladyce", service: "Food Delivery App", time: "08:30 AM", comment: "Excellent service, very helpful staff." }
              ].map((comment, index) => (
                <div key={index} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-600">{comment.name[0]}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">{comment.name}</span>
                      <span className="text-xs text-gray-500">on {comment.service}</span>
                      <span className="text-xs text-gray-400">{comment.time}</span>
                    </div>
                    <p className="text-sm text-gray-600">{comment.comment}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>

  );
};

export default CitizenDashboard;

