import React, { useState, useEffect } from "react";
import { 
  Search, 
  Filter, 
  MapPin, 
  Clock, 
  User, 
  AlertCircle, 
  CheckCircle, 
  Eye,
  ArrowUpDown,
  Calendar,
  ChevronDown,
  X
} from "lucide-react";

const Grievances = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All Status");
  const [selectedPriority, setSelectedPriority] = useState("All Priorities");
  const [sortBy, setSortBy] = useState("Date");
  const [filteredGrievances, setFilteredGrievances] = useState([]);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showFilterDropdown && !event.target.closest('.filter-dropdown')) {
        setShowFilterDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilterDropdown]);

  // Mumbai-based grievance data
  const grievancesData = [
    {
      id: "GR2024030001",
      title: "Water Supply Disruption",
      description: "No water supply in our area for the last 3 days. This is causing severe inconvenience to residents.",
      status: "InProgress",
      priority: "High",
      location: "Andheri West",
      date: "2024-03-01",
      complainant: "Amit Singh",
      category: "Water Supply",
      ward: "H-West",
      distance: "2.5 km"
    },
    {
      id: "GR2024030002",
      title: "Street Light Malfunction",
      description: "Multiple street lights not working in our colony, causing safety concerns during night time.",
      status: "Resolved",
      priority: "Medium",
      location: "Bandra East",
      date: "2024-03-01",
      complainant: "Priya Sharma",
      category: "Street Lighting",
      ward: "H-East",
      distance: "1.2 km"
    },
    {
      id: "GR2024030003",
      title: "Garbage Collection Issue",
      description: "Regular garbage collection has stopped in our area for the past week. Waste is accumulating and causing health concerns.",
      status: "UnderReview",
      priority: "High",
      location: "Malad West",
      date: "2024-03-02",
      complainant: "Suresh Yadav",
      category: "Waste Management",
      ward: "P-North",
      distance: "3.8 km"
    },
    {
      id: "GR2024030004",
      title: "Road Potholes",
      description: "Large potholes on the main road near railway station are causing traffic jams and vehicle damage.",
      status: "InProgress",
      priority: "High",
      location: "Borivali West",
      date: "2024-03-02",
      complainant: "Rajesh Kumar",
      category: "Road Infrastructure",
      ward: "R-Central",
      distance: "5.2 km"
    },
    {
      id: "GR2024030005",
      title: "Drainage Blockage",
      description: "Severe drainage blockage causing waterlogging in residential area during rains.",
      status: "Pending",
      priority: "Medium",
      location: "Goregaon East",
      date: "2024-03-03",
      complainant: "Meera Patel",
      category: "Drainage",
      ward: "R-South",
      distance: "4.1 km"
    },
    {
      id: "GR2024030006",
      title: "Electricity Power Cut",
      description: "Frequent power cuts in our building for the last 2 weeks. Affecting daily work and studies.",
      status: "Resolved",
      priority: "High",
      location: "Kandivali East",
      date: "2024-03-03",
      complainant: "Vikram Joshi",
      category: "Electricity",
      ward: "R-North",
      distance: "6.5 km"
    },
    {
      id: "GR2024030007",
      title: "Public Transport Issues",
      description: "Bus stop shelter is broken and buses are not following schedule properly.",
      status: "UnderReview",
      priority: "Medium",
      location: "Santacruz West",
      date: "2024-03-04",
      complainant: "Sunita Gupta",
      category: "Public Transport",
      ward: "H-West",
      distance: "0.8 km"
    },
    {
      id: "GR2024030008",
      title: "Noise Pollution",
      description: "Construction work going on 24/7 causing severe noise pollution and disturbance to residents.",
      status: "InProgress",
      priority: "Medium",
      location: "Powai",
      date: "2024-03-04",
      complainant: "Arjun Mehta",
      category: "Environmental",
      ward: "S",
      distance: "7.2 km"
    },
    {
      id: "GR2024030009",
      title: "Water Pipeline Leakage",
      description: "Major water pipeline leakage near our society causing water wastage and road damage.",
      status: "Pending",
      priority: "High",
      location: "Juhu",
      date: "2024-03-05",
      complainant: "Deepika Reddy",
      category: "Water Supply",
      ward: "H-West",
      distance: "1.5 km"
    },
    {
      id: "GR2024030010",
      title: "Street Vendor Encroachment",
      description: "Street vendors have occupied the entire footpath making it difficult for pedestrians to walk.",
      status: "UnderReview",
      priority: "Low",
      location: "Versova",
      date: "2024-03-05",
      complainant: "Nikhil Agarwal",
      category: "Public Space",
      ward: "H-West",
      distance: "2.1 km"
    },
    {
      id: "GR2024030011",
      title: "Park Maintenance",
      description: "Children's park in our area is not maintained properly. Broken equipment and unkempt grass.",
      status: "InProgress",
      priority: "Medium",
      location: "Oshiwara",
      date: "2024-03-06",
      complainant: "Kavita Singh",
      category: "Parks & Recreation",
      ward: "H-West",
      distance: "1.8 km"
    },
    {
      id: "GR2024030012",
      title: "Traffic Signal Malfunction",
      description: "Traffic signal at busy intersection is not working properly causing traffic chaos.",
      status: "Resolved",
      priority: "High",
      location: "Andheri East",
      date: "2024-03-06",
      complainant: "Rohit Sharma",
      category: "Traffic Management",
      ward: "K-East",
      distance: "3.3 km"
    },
    {
      id: "GR2024030013",
      title: "Sewage Overflow",
      description: "Sewage overflow in our lane due to blocked sewer lines. Creating unhygienic conditions.",
      status: "Pending",
      priority: "High",
      location: "Dahisar West",
      date: "2024-03-07",
      complainant: "Laxmi Devi",
      category: "Sanitation",
      ward: "R-North",
      distance: "8.1 km"
    },
    {
      id: "GR2024030014",
      title: "Street Hawking Issues",
      description: "Illegal street hawkers are creating traffic congestion and hygiene problems near school area.",
      status: "UnderReview",
      priority: "Medium",
      location: "Vile Parle West",
      date: "2024-03-07",
      complainant: "Dr. Anil Kumar",
      category: "Public Space",
      ward: "H-West",
      distance: "2.7 km"
    },
    {
      id: "GR2024030015",
      title: "Building Construction Violation",
      description: "Construction work is going on beyond permitted hours and violating noise pollution norms.",
      status: "InProgress",
      priority: "Medium",
      location: "Bandra Kurla Complex",
      date: "2024-03-08",
      complainant: "Pooja Jain",
      category: "Construction",
      ward: "H-East",
      distance: "3.9 km"
    },
    {
      id: "GR2024030016",
      title: "Public Toilet Maintenance",
      description: "Public toilet near railway station is in very poor condition and not cleaned regularly.",
      status: "Pending",
      priority: "Medium",
      location: "Mira Road",
      date: "2024-03-08",
      complainant: "Suresh Thakur",
      category: "Public Facilities",
      ward: "T",
      distance: "12.5 km"
    },
    {
      id: "GR2024030017",
      title: "Street Cleaning",
      description: "Regular street cleaning has stopped in our locality. Roads are dirty and unhygienic.",
      status: "Resolved",
      priority: "Low",
      location: "Chembur",
      date: "2024-03-09",
      complainant: "Rita Das",
      category: "Street Cleaning",
      ward: "M-East",
      distance: "9.8 km"
    },
    {
      id: "GR2024030018",
      title: "Water Tanker Shortage",
      description: "Water tanker service is not available in our area during water cuts. Need regular supply.",
      status: "UnderReview",
      priority: "High",
      location: "Kurla West",
      date: "2024-03-09",
      complainant: "Manoj Tiwari",
      category: "Water Supply",
      ward: "L",
      distance: "8.7 km"
    },
    {
      id: "GR2024030019",
      title: "Street Food Safety",
      description: "Street food vendors are not following hygiene standards and food safety regulations.",
      status: "InProgress",
      priority: "Medium",
      location: "Mulund West",
      date: "2024-03-10",
      complainant: "Dr. Priya Nair",
      category: "Food Safety",
      ward: "T",
      distance: "11.2 km"
    },
    {
      id: "GR2024030020",
      title: "Public Garden Maintenance",
      description: "Public garden in our area needs proper maintenance. Broken benches and overgrown plants.",
      status: "Pending",
      priority: "Low",
      location: "Thane West",
      date: "2024-03-10",
      complainant: "Rajesh Verma",
      category: "Parks & Recreation",
      ward: "T",
      distance: "15.3 km"
    }
  ];

  // Filter and search logic
  useEffect(() => {
    let filtered = grievancesData;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(grievance =>
        grievance.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        grievance.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        grievance.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        grievance.complainant.toLowerCase().includes(searchTerm.toLowerCase()) ||
        grievance.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (selectedStatus !== "All Status") {
      filtered = filtered.filter(grievance => grievance.status === selectedStatus);
    }

    // Priority filter
    if (selectedPriority !== "All Priorities") {
      filtered = filtered.filter(grievance => grievance.priority === selectedPriority);
    }

    // Sort by
    if (sortBy === "Date") {
      filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    } else if (sortBy === "Distance") {
      filtered.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
    } else if (sortBy === "Priority") {
      const priorityOrder = { "High": 3, "Medium": 2, "Low": 1 };
      filtered.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
    }

    setFilteredGrievances(filtered);
  }, [searchTerm, selectedStatus, selectedPriority, sortBy]);

  const getStatusColor = (status) => {
    switch (status) {
      case "Resolved": return "bg-green-100 text-green-800";
      case "InProgress": return "bg-blue-100 text-blue-800";
      case "UnderReview": return "bg-yellow-100 text-yellow-800";
      case "Pending": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "High": return "bg-red-100 text-red-800";
      case "Medium": return "bg-yellow-100 text-yellow-800";
      case "Low": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedStatus("All Status");
    setSelectedPriority("All Priorities");
    setSortBy("Date");
  };

  return (
    <main className="flex-1 p-3 md:p-6 relative z-10 overflow-y-auto">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Grievances</h2>
          <p className="text-sm text-gray-600 mt-1">
            {filteredGrievances.length} grievances found
          </p>
        </div>
      </div>

      {/* Search Bar with Filter Dropdown */}
      <div className="flex items-center gap-4 mb-6">
        {/* Search Bar */}
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search grievances..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl focus:ring-2 focus:ring-blue-200 focus:border-blue-300 shadow-sm transition-all duration-200 hover:shadow-md focus:shadow-md"
          />
        </div>

        {/* Filter Dropdown */}
        <div className="relative filter-dropdown">
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className="flex items-center gap-2 px-4 py-3 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl hover:border-blue-300/70 hover:shadow-md transition-all duration-200 shadow-sm"
          >
            <Filter size={18} className="text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Filters</span>
            <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${showFilterDropdown ? 'rotate-180' : ''}`} />
          </button>

          {/* Filter Dropdown Content */}
          {showFilterDropdown && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white/90 backdrop-blur-sm border border-gray-200/50 rounded-2xl shadow-xl z-50 p-4">
              <div className="space-y-4">
                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
                  >
                    <option value="All Status">All Status</option>
                    <option value="Pending">Pending</option>
                    <option value="InProgress">In Progress</option>
                    <option value="UnderReview">Under Review</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>

                {/* Priority Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
                  >
                    <option value="All Priorities">All Priorities</option>
                    <option value="High">High Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="Low">Low Priority</option>
                  </select>
                </div>

                {/* Sort By */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
                  >
                    <option value="Date">Sort by Date</option>
                    <option value="Distance">Sort by Distance</option>
                    <option value="Priority">Sort by Priority</option>
                  </select>
                </div>

                {/* Clear Filters */}
                {(searchTerm || selectedStatus !== "All Status" || selectedPriority !== "All Priorities") && (
                  <div className="pt-3 border-t border-gray-100">
                    <button
                      onClick={clearFilters}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm transition-colors w-full justify-center"
                    >
                      <X size={16} />
                      Clear All Filters
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

        {/* Grievances List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredGrievances.map((grievance) => (
            <div key={grievance.id} className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200/50 hover:border-blue-300/70 hover:shadow-xl transition-all duration-300">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">{grievance.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(grievance.status)}`}>
                        {grievance.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">ID: {grievance.id}</p>
                  </div>

                  <p className="text-gray-700 mb-4 leading-relaxed">{grievance.description}</p>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-gray-400" />
                      <span className="text-gray-600">{grievance.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-gray-400" />
                      <span className="text-gray-600">{grievance.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-gray-400" />
                      <span className="text-gray-600">{grievance.complainant}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-gray-400" />
                      <span className="text-gray-600">{grievance.distance} away</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(grievance.priority)}`}>
                    {grievance.priority} Priority
                  </span>
                  <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                    <Eye size={16} />
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* No Results */}
        {filteredGrievances.length === 0 && (
          <div className="bg-white rounded-xl p-12 shadow-lg border-2 border-gray-300 text-center">
            <AlertCircle size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No grievances found</h3>
            <p className="text-gray-600 mb-4">Try adjusting your search or filter criteria</p>
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200/50">
          <div className="text-center">
            <p className="text-sm text-gray-500">Thank you for helping us improve!</p>
            <p className="text-sm text-gray-500 mt-1">© 2024 Grievance System - IGRS Portal</p>
          </div>
        </div>
    </main>
  );
};

export default Grievances;
