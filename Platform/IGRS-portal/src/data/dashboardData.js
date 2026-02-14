export const dashboardData = {
  overallStats: {
    total: 1248,
    resolved: 856,
    pending: 324,
    critical: 68,
    responseRate: 94.5,
    avgResolutionTime: "4.2 days",
    satisfactionScore: 4.2,
    monthlyTrend: [
      { month: 'Jan', grievances: 120, resolved: 98 },
      { month: 'Feb', grievances: 150, resolved: 130 },
      // ...existing data...
    ]
  },
  departmentPerformance: [
    { 
      name: 'Police Department', 
      efficiency: 87,
      responseTime: "2.1 days",
      satisfaction: 4.5,
      pendingCases: 45,
      criticalCases: 12,
      monthlyProgress: 8.5
    },
    { 
      name: 'Municipal Corporation', 
      efficiency: 76,
      responseTime: "3.2 days",
      satisfaction: 4.1,
      pendingCases: 60,
      criticalCases: 8,
      monthlyProgress: 7.2
    },
    { 
      name: 'Health Department', 
      efficiency: 92,
      responseTime: "1.8 days",
      satisfaction: 4.7,
      pendingCases: 30,
      criticalCases: 5,
      monthlyProgress: 9.1
    },
    { 
      name: 'Education Department', 
      efficiency: 84,
      responseTime: "2.5 days",
      satisfaction: 4.3,
      pendingCases: 40,
      criticalCases: 10,
      monthlyProgress: 8.0
    },
    { 
      name: 'Transport Department', 
      efficiency: 71,
      responseTime: "3.5 days",
      satisfaction: 3.9,
      pendingCases: 55,
      criticalCases: 15,
      monthlyProgress: 6.8
    }
  ],
  criticalAlerts: [
    {
      id: 1,
      title: 'Flood Warning: Gomti River',
      severity: 'High',
      description: 'Water levels rising in Gomti River. Affected areas: Hazratganj, Indira Nagar',
      timeAgo: '2 hours ago',
      impactedAreas: ['Hazratganj', 'Indira Nagar', 'Gomti Nagar'],
      affectedPopulation: '~50,000',
      status: 'Active',
      responseTeam: 'Disaster Management Unit'
    },
    {
      id: 2,
      title: 'Road Safety Hazard',
      description: 'Urgent repairs needed on NH-24 due to multiple accidents',
      timeAgo: '4 hours ago'
    }
  ],
  timelineData: [
    {
      id: 1,
      title: 'Grievance Filed',
      description: 'Water supply disruption in Sector 15',
      date: '2024-02-20',
      status: 'completed',
      department: 'Water Department',
      assignedTo: 'John Doe',
      expectedCompletion: '2024-02-25',
      priority: 'high',
      updates: [
        {
          time: '2024-02-20 09:00',
          message: 'Complaint received and registered',
          by: 'System'
        },
        {
          time: '2024-02-20 10:30',
          message: 'Assigned to field team',
          by: 'John Doe'
        }
      ]
    },
    // Add more timeline entries...
  ],
  recentNotifications: [
    {
      id: 1,
      title: 'High Priority Alert',
      message: 'New critical grievance requires immediate attention',
      timestamp: new Date(),
      read: false
    },
    {
      id: 2,
      title: 'Department Update',
      message: 'Monthly performance report is now available',
      timestamp: new Date(),
      read: true
    }
  ],
  comparativeAnalytics: {
    averageResponseTime: {
      'Police Department': 2.1,
      'Municipal Corporation': 3.2,
      'Health Department': 1.8,
      // ... other departments
    },
    citizenSatisfaction: {
      'Police Department': 4.5,
      'Municipal Corporation': 4.1,
      'Health Department': 4.7,
      // ... other departments
    }
  },
  tasks: [
    {
      id: 1,
      title: "Review Water Supply Complaint",
      description: "Assess and assign field team for Sector 15 water issue",
      priority: "high",
      dueDate: "Today, 5:00 PM",
      assignedTo: "John Doe",
      status: "pending"
    },
    {
      id: 2,
      title: "Field Inspection Report",
      description: "Complete inspection report for road maintenance",
      priority: "medium",
      dueDate: "Tomorrow, 2:00 PM",
      assignedTo: "Sarah Smith",
      status: "in-progress"
    },
    {
      id: 3,
      title: "Update Citizen",
      description: "Send progress update to citizen regarding complaint #1234",
      priority: "low",
      dueDate: "Today, 6:00 PM",
      assignedTo: "Mike Johnson",
      status: "pending"
    }
  ]
};

export default dashboardData;
