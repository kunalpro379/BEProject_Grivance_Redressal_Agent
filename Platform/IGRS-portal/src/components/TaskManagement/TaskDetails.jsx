import React from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, MapPin, AlertTriangle, User, Phone, Clock, 
  CheckCircle2, Image as ImageIcon, FileText, Shield, 
  AlertOctagon, CheckCircle, Circle
} from 'lucide-react';
import { Progress } from "../../components/ui/progress"; // Updated import path

const TaskDetails = ({ task }) => {
  // Example task data structure
  const taskData = {
    id: "GR-2024-001",
    submissionDate: "2024-02-20",
    citizenName: "Anonymous",
    location: "Sector 15, Block B",
    summary: "Water supply disruption affecting 50+ households",
    aiSummary: [
      "Multiple complaints from same area",
      "Infrastructure more than 10 years old",
      "Similar issue reported 3 months ago"
    ],
    urgency: "high",
    assignedOfficial: {
      name: "Mr. Rajesh Kumar",
      contact: "+91 98765 43210",
      department: "Water Works"
    },
    progress: {
      completed: 3,
      total: 5,
      steps: [
        { id: 1, title: "Complaint Received", status: "completed", date: "2024-02-20" },
        { id: 2, title: "Site Inspection", status: "completed", date: "2024-02-21" },
        { id: 3, title: "Resource Allocation", status: "completed", date: "2024-02-21" },
        { id: 4, title: "Repair Work", status: "in-progress", date: "2024-02-22" },
        { id: 5, title: "Final Verification", status: "pending", date: null }
      ]
    },
    expectedResolution: "2024-02-23",
    attachments: [
      {
        id: 1,
        type: "image",
        title: "Site Inspection Photo",
        url: "/images/site-inspection.jpg",
        timestamp: "2024-02-21 10:30 AM",
        verified: true
      },
      {
        id: 2,
        type: "document",
        title: "Inspection Report",
        url: "/docs/inspection-report.pdf",
        timestamp: "2024-02-21 11:45 AM",
        verified: true
      }
    ],
    scamAlert: {
      status: "verified",
      message: "All attachments have been verified with metadata"
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg p-6 space-y-8"
    >
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Grievance #{taskData.id}
          </h2>
          <div className="flex items-center gap-2 mt-2 text-gray-600 dark:text-gray-400">
            <Calendar className="w-4 h-4" />
            <span>{taskData.submissionDate}</span>
            <MapPin className="w-4 h-4 ml-2" />
            <span>{taskData.location}</span>
          </div>
        </div>
        <div className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
          taskData.urgency === 'high' 
            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            : taskData.urgency === 'medium'
            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        }`}>
          <AlertTriangle className="w-5 h-5" />
          <span className="font-medium capitalize">{taskData.urgency} Priority</span>
        </div>
      </div>

      {/* Complaint Summary & AI Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Complaint Summary
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {taskData.summary}
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-2">
              AI-Generated Key Points
            </h4>
            <ul className="space-y-2">
              {taskData.aiSummary.map((point, index) => (
                <li key={index} className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-300">
                  <Circle className="w-3 h-3" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Assignment Details */}
        <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-lg p-4 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Assigned Official
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600 dark:text-gray-400">
                {taskData.assignedOfficial.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600 dark:text-gray-400">
                {taskData.assignedOfficial.contact}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600 dark:text-gray-400">
                Expected Resolution: {taskData.expectedResolution}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Timeline */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Progress Timeline
        </h3>
        <Progress value={(taskData.progress.completed / taskData.progress.total) * 100} />
        <div className="space-y-4">
          {taskData.progress.steps.map((step) => (
            <div key={step.id} className="flex items-start gap-4">
              <div className={`mt-1 p-1 rounded-full ${
                step.status === 'completed' 
                  ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                  : step.status === 'in-progress'
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
              }`}>
                {step.status === 'completed' ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : step.status === 'in-progress' ? (
                  <Circle className="w-4 h-4" />
                ) : (
                  <Circle className="w-4 h-4" />
                )}
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {step.title}
                </h4>
                {step.date && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {step.date}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Attachments & Verification */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Attachments & Proofs
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {taskData.attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-lg"
            >
              {attachment.type === 'image' ? (
                <ImageIcon className="w-5 h-5 text-blue-500" />
              ) : (
                <FileText className="w-5 h-5 text-green-500" />
              )}
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {attachment.title}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {attachment.timestamp}
                </p>
              </div>
              {attachment.verified ? (
                <Shield className="w-5 h-5 text-green-500" />
              ) : (
                <AlertOctagon className="w-5 h-5 text-red-500" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Scam Detection Alert */}
      <div className={`p-4 rounded-lg flex items-center gap-3 ${
        taskData.scamAlert.status === 'verified'
          ? 'bg-green-50 dark:bg-green-900/20'
          : 'bg-red-50 dark:bg-red-900/20'
      }`}>
        {taskData.scamAlert.status === 'verified' ? (
          <Shield className="w-6 h-6 text-green-500" />
        ) : (
          <AlertOctagon className="w-6 h-6 text-red-500" />
        )}
        <p className={`font-medium ${
          taskData.scamAlert.status === 'verified'
            ? 'text-green-700 dark:text-green-400'
            : 'text-red-700 dark:text-red-400'
        }`}>
          {taskData.scamAlert.message}
        </p>
      </div>
    </motion.div>
  );
};

export default TaskDetails;
