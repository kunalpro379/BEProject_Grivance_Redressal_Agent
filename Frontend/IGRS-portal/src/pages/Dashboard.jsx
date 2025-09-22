import React, { useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ChevronRight, BarChart2, Users2, Target, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GrievanceStats from '../components/GrievanceStats';
import DepartmentPerformance from '../components/DepartmentPerformance';
import CriticalAlerts from '../components/CriticalAlerts';
import TaskAssignments from '../components/TaskAssignments';
import dashboardData from '../data/dashboardData';
import PerformanceChart from '../components/PerformanceChart';
import ComparativeMetrics from '../components/ComparativeMetrics';

const Dashboard = ({ userAuth }) => {
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 100], [1, 0.2]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  };

  const handleShowAnalysis = () => navigate('/analysis');
  const handleShowAlerts = () => navigate('/alerts');
  const handleShowTimeline = () => navigate('/timeline');

  const features = [
    {
      title: "Real-time Monitoring",
      description: "Track grievances and their resolution status in real-time",
      icon: <Clock className="w-6 h-6" />,
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
      path: "/grievances"
    },
    {
      title: "Analytics Dashboard",
      description: "Comprehensive analytics to make informed decisions",
      icon: <BarChart2 className="w-6 h-6" />,
      image: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
      path: "/heatmap"
    },
    {
      title: "Department Coordination",
      description: "Seamless coordination between different departments",
      icon: <Users2 className="w-6 h-6" />,
      image: "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
      path: "/chat"
    },
  ];

  const handleFeatureClick = (path) => {
    navigate(path);
  };

  return (
    <div className="min-h-screen duration-300">

      {/* Content Container */}
      <div className="relative z-10">

        {/* Welcome Section with Stats */}
        <div className="container mx-auto px-4 mb-8">
          <div className="relative grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Welcome Message - Now spans 3 columns */}
            <motion.div
              variants={itemVariants}
              style={{ opacity }}
              className="lg:col-span-3 bg-white rounded-lg overflow-hidden shadow-lg border border-gray-200"
            >
              <div className="relative p-6">
                {/* Background Pattern */}
                <div className="absolute top-0 right-0 w-64 h-full opacity-5">
                  <svg className="w-full h-full" viewBox="0 0 100 100" fill="none">
                    <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                      <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5"/>
                    </pattern>
                    <rect width="100" height="100" fill="url(#grid)" />
                  </svg>
                </div>

                {/* Content */}
                <div className="relative z-10 flex items-center justify-between">
                  <div className='flex items-center gap-4 justify-center flex-col md:flex-row'>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Brush Script MT, cursive, serif' }}>
                      Welcome back, {userAuth?.username || 'Admin'}
                    </h1>
                    <p className="text-gray-700" style={{ fontFamily: 'Brush Script MT, cursive, serif' }}>
                      Here's what's happening in your jurisdiction today
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Quick Stats Bar */}
              <div className="bg-gray-50 border-t border-gray-200 p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'New Grievances', value: '12', trend: '+2 today', color: 'text-purple-400' },
                  { label: 'Pending Actions', value: '5', trend: '3 urgent', color: 'text-amber-400' },
                  { label: 'Resolved Today', value: '8', trend: '94% success', color: 'text-emerald-400' }
                ].map((stat, index) => (
                  <div 
                    key={index}
                    className="text-center py-2 px-4 rounded-lg bg-white border border-gray-200"
                  >
                    <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{stat.trend}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Today's Activity Card */}
            <motion.div
              variants={itemVariants}
              className="bg-white rounded-lg shadow-lg border border-gray-200 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-500" />
                Today's Activity
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                  <p className="text-gray-700 text-sm">12 new cases registered</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                  <p className="text-gray-700 text-sm">5 cases need attention</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                  <p className="text-gray-700 text-sm">8 cases resolved</p>
                </div>
                <button className="w-full mt-4 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors">
                  View All Activity
                </button>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Features Section */}
        <div className="container mx-auto px-4 mb-12">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-black text-center mb-8"
          >
            <h2 className="text-black text-2xl font-bold mb-2">Platform Features</h2>
            <p className="text-gray-800 text-gray-400">Explore the tools and features available to you</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.2 }}
                onClick={() => handleFeatureClick(feature.path)}
                className="group bg-white rounded-lg overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-200"
              >
                <div className="h-48 overflow-hidden">
                  <motion.img
                    src={feature.image}
                    alt={feature.title}
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-300"
                    whileHover={{ scale: 1.05 }}
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-gray-100 rounded-lg text-gray-900">
                      {feature.icon}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
                  </div>
                  <p className="text-gray-600 mb-4">{feature.description}</p>
                  <motion.button
                    whileHover={{ x: 5 }}
                    className="flex items-center text-gray-600 hover:text-gray-900 gap-2 text-sm"
                  >
                    Learn more <ChevronRight className="w-4 h-4" />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>


        {/* Main Content */}
        <div className="container mx-auto px-4">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {/* Stats Overview */}
            <motion.div 
              variants={itemVariants} 
              className="col-span-full bg-white rounded-lg shadow-lg border border-gray-200 p-6"
            >
              <GrievanceStats data={dashboardData.overallStats} />
            </motion.div>

            {/* Performance Chart */}
            <motion.div 
              variants={itemVariants} 
              className="lg:col-span-2 bg-white rounded-lg shadow-lg border border-gray-200 p-6"
            >
              <PerformanceChart 
                data={dashboardData.overallStats} 
                onShowMore={handleShowAnalysis}
              />
            </motion.div>
            {/* Comparative Metrics */}
            <motion.div variants={itemVariants} className="lg:col-span-2 bg-white rounded-lg shadow-lg border border-gray-200 p-6">
              <ComparativeMetrics data={dashboardData.comparativeAnalytics} />
            </motion.div>

            {/* Critical Alerts */}
            <motion.div variants={itemVariants} className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
              <CriticalAlerts 
                alerts={dashboardData.criticalAlerts}
                onShowMore={handleShowAlerts}
              />
            </motion.div>

            {/* Task Assignments */}
            <motion.div variants={itemVariants} className="col-span-full bg-white rounded-lg shadow-lg border border-gray-200 p-6">
              <TaskAssignments tasks={dashboardData.tasks} />
            </motion.div>
          </motion.div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;