import React, { useState } from 'react';
import { 
  MessageSquare, 
  TrendingUp, 
  Users, 
  Calendar, 
  MapPin, 
  Clock, 
  CheckCircle, 
  ThumbsUp,
  MessageCircle,
  Hash,
  Star,
  Trophy,
  Activity,
  Vote,
  UserCheck,
  Target,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';

// Import data
import pollsData from '../../../data/polls.json';
import resolutionsData from '../../../data/resolutions.json';
import trendingTagsData from '../../../data/trendingTags.json';
import usersData from '../../../data/users.json';
import discussionsData from '../../../data/discussions.json';
import notificationsData from '../../../data/notifications.json';
import communityStatsData from '../../../data/communityStats.json';

const Community = () => {
  const [activeTab, setActiveTab] = useState('discussions');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAllDiscussions, setShowAllDiscussions] = useState(false);
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const tabs = [
    { id: 'discussions', label: 'Discussions', icon: MessageSquare },
    { id: 'polls', label: 'Polls & Surveys', icon: Vote },
    { id: 'trending', label: 'Trending Topics', icon: TrendingUp },
    { id: 'community', label: 'Community Stats', icon: Users }
  ];

  const categories = [
    { id: 'all', label: 'All Categories', count: discussionsData.discussions.length },
    { id: 'Infrastructure', label: 'Infrastructure', count: discussionsData.discussions.filter(d => d.category === 'Infrastructure').length },
    { id: 'Healthcare', label: 'Healthcare', count: discussionsData.discussions.filter(d => d.category === 'Healthcare').length },
    { id: 'Education', label: 'Education', count: discussionsData.discussions.filter(d => d.category === 'Education').length },
    { id: 'Transport', label: 'Transport', count: discussionsData.discussions.filter(d => d.category === 'Transport').length },
    { id: 'Sanitation', label: 'Sanitation', count: discussionsData.discussions.filter(d => d.category === 'Sanitation').length }
  ];

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-amber-800 bg-amber-50 border-amber-200';
      case 'medium': return 'text-[var(--stats-muted)] bg-[var(--cream-100)] border-[var(--stats-border)]';
      case 'low': return 'text-[var(--stats-text)] bg-[var(--cream-50)] border-[var(--stats-border)]';
      default: return 'text-[var(--stats-muted)] bg-[var(--cream-50)] border-[var(--stats-border)]';
    }
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up': return <ArrowUp className="w-4 h-4 text-amber-600" />;
      case 'down': return <ArrowDown className="w-4 h-4 text-[var(--stats-muted)]" />;
      default: return <Minus className="w-4 h-4 text-[var(--stats-muted)]" />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Filter discussions by category
  const allFilteredDiscussions = selectedCategory === 'all' 
    ? discussionsData.discussions 
    : discussionsData.discussions.filter(d => d.category === selectedCategory);
  
  // For mobile: show only 3 discussions initially, all when expanded
  const filteredDiscussions = showAllDiscussions ? allFilteredDiscussions : allFilteredDiscussions.slice(0, 3);

  // Filter polls by category
  const filteredPolls = selectedCategory === 'all' 
    ? pollsData.activePolls 
    : pollsData.activePolls.filter(p => p.category === selectedCategory);

  const renderDiscussions = () => (
    <div className="space-y-6">
      <div className="bg-[var(--cream-50)] p-3 sm:p-4 rounded-xl border border-[var(--stats-border)]">
        <div className="flex flex-wrap gap-2">
          {categories.slice(0, 3).map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-colors ${
                selectedCategory === category.id ? 'bg-[var(--dark)] text-white' : 'bg-white text-[var(--stats-text)] border border-[var(--stats-border)] hover:bg-amber-50'
              }`}
            >
              <span className="hidden sm:inline">{category.label}</span>
              <span className="sm:hidden">{category.label.split(' ')[0]}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${selectedCategory === category.id ? 'bg-amber-800 text-amber-100' : 'bg-[var(--brown-100)] text-[var(--stats-muted)]'}`}>
                {category.count}
              </span>
            </button>
          ))}
          {categories.length > 3 && (
            <button
              onClick={() => setShowMoreFilters(!showMoreFilters)}
              className="inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-colors bg-white text-[var(--stats-text)] border border-[var(--stats-border)] hover:bg-amber-50"
            >
              {showMoreFilters ? 'Show Less' : 'Show More'}
            </button>
          )}

          {/* Show remaining categories when expanded */}
          {showMoreFilters && categories.slice(3).map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-colors ${selectedCategory === category.id ? 'bg-[var(--dark)] text-white' : 'bg-white text-[var(--stats-text)] border border-[var(--stats-border)] hover:bg-amber-50'}`}
            >
              <span className="hidden sm:inline">{category.label}</span>
              <span className="sm:hidden">{category.label.split(' ')[0]}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${selectedCategory === category.id ? 'bg-amber-800 text-amber-100' : 'bg-[var(--brown-100)] text-[var(--stats-muted)]'}`}>{category.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Theme: black, golden, dark, white, cream only */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[var(--dark)] p-3 sm:p-4 rounded-xl text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-100 text-xs sm:text-sm">Active Discussions</p>
              <p className="text-lg sm:text-2xl font-bold">{communityStatsData.stats.activeDiscussions}</p>
            </div>
            <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 text-amber-200" />
          </div>
        </div>
        <div className="bg-white border border-[var(--stats-border)] p-3 sm:p-4 rounded-xl shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[var(--stats-muted)] text-xs sm:text-sm">Issues Resolved</p>
              <p className="text-lg sm:text-2xl font-bold text-[var(--stats-text)]">{communityStatsData.stats.issuesResolved}</p>
            </div>
            <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500" />
          </div>
        </div>
        <div className="bg-[var(--cream-50)] border border-[var(--stats-border)] p-3 sm:p-4 rounded-xl shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[var(--stats-muted)] text-xs sm:text-sm">Contributors</p>
              <p className="text-lg sm:text-2xl font-bold text-[var(--stats-text)]">{communityStatsData.stats.totalContributors}</p>
            </div>
            <Users className="w-6 h-6 sm:w-8 sm:h-8 text-[var(--stats-muted)]" />
          </div>
        </div>
        <div className="bg-white border border-[var(--stats-border)] p-3 sm:p-4 rounded-xl shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[var(--stats-muted)] text-xs sm:text-sm">Response Rate</p>
              <p className="text-lg sm:text-2xl font-bold text-[var(--stats-text)]">{communityStatsData.stats.responseRate}</p>
            </div>
            <Target className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredDiscussions.map(discussion => (
          <div key={discussion.id} className="bg-white border border-[var(--stats-border)] rounded-xl p-3 sm:p-4 md:p-6 hover:shadow-lg transition-shadow">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3 sm:mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(discussion.priority)}`}>
                    {discussion.priority?.toUpperCase()}
                  </span>
                  <span className="px-2 py-1 text-xs font-medium bg-amber-50 text-amber-700 rounded-full">
                    {discussion.category}
                  </span>
                </div>
                <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 mb-2 line-clamp-2">{discussion.title}</h3>
                <p className="text-xs sm:text-sm md:text-base text-gray-600 mb-3 line-clamp-3">{discussion.content}</p>
                
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 md:gap-4 text-xs sm:text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="truncate">{discussion.author.username}</span>
                    {discussion.author.verified && (
                      <UserCheck className="w-3 h-3 sm:w-4 sm:h-4 text-amber-600 flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="truncate">{discussion.location}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span>{formatDate(discussion.timestamp)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-3 sm:pt-4 border-t border-gray-100 gap-2 sm:gap-3 md:gap-0">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-1 text-gray-600">
                  <ThumbsUp className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="text-xs sm:text-sm">{discussion.upvotes}</span>
                </div>
                <div className="flex items-center gap-1 text-gray-600">
                  <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="text-xs sm:text-sm">{discussion.replies} replies</span>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-1">
                {discussion.tags.slice(0, 3).map(tag => (
                  <span key={tag} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded truncate max-w-20 sm:max-w-none">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
        
        {/* Mobile Dropdown Button for More Discussions */}
        {!showAllDiscussions && allFilteredDiscussions.length > 3 && (
          <div className="text-center pt-4">
            <button
              onClick={() => setShowAllDiscussions(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--dark)] text-white rounded-lg hover:bg-amber-700 transition-colors font-medium text-sm"
            >
              <MessageSquare className="w-4 h-4" />
              Show All {allFilteredDiscussions.length} Discussions
              <ArrowDown className="w-4 h-4" />
            </button>
          </div>
        )}
        
        {/* Show Less Button when All Discussions are Shown */}
        {showAllDiscussions && allFilteredDiscussions.length > 3 && (
          <div className="text-center pt-4">
            <button
              onClick={() => setShowAllDiscussions(false)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
            >
              <ArrowUp className="w-4 h-4" />
              Show Less
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderPolls = () => (
    <div className="space-y-6">
      {/* Active Polls */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Active Polls & Surveys</h3>
        <div className="space-y-4">
          {filteredPolls.map(poll => (
            <div key={poll.id} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">{poll.question}</h4>
                  <p className="text-gray-600 mb-3">{poll.description}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    <span className="px-2 py-1 text-xs font-medium bg-amber-50 text-amber-700 rounded-full">
                      {poll.category}
                    </span>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>Ends: {formatDate(poll.endDate)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Vote className="w-4 h-4" />
                      <span>{poll.totalVotes} votes</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                {poll.options.map((option, index) => (
                  <div key={index} className="relative">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{option.text}</span>
                      <span className="text-sm text-gray-600">{option.percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-[var(--gold)] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${option.percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500">{option.votes} votes</span>
                  </div>
                ))}
              </div>
              
              <div className="flex flex-wrap gap-1 mt-4 pt-4 border-t border-gray-100">
                {poll.tags.map(tag => (
                  <span key={tag} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Closed Polls */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Recent Poll Results</h3>
        <div className="space-y-4">
          {pollsData.closedPolls.map(poll => (
            <div key={poll.id} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">{poll.question}</h4>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 text-xs font-medium bg-amber-50 text-amber-700 rounded-full">
                      COMPLETED
                    </span>
                    <span className="px-2 py-1 text-xs font-medium bg-amber-50 text-amber-700 rounded-full">
                      {poll.category}
                    </span>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-600" />
                      <span className="text-sm font-medium text-amber-800">Winner: {poll.winner}</span>
                    </div>
                    <p className="text-sm text-amber-700 mt-1">{poll.actionTaken}</p>
                  </div>
                  <div className="text-sm text-gray-600">
                    Total Votes: {poll.totalVotes} | Ended: {formatDate(poll.endDate)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderTrending = () => (
    <div className="space-y-6">
      {/* LeetCode-style Trending Tags */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Trending Tags</h3>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex flex-wrap gap-2">
            {trendingTagsData.trendingTags.filter(tag => tag.trending).map(tag => (
              <div key={tag.id} className="inline-flex items-center gap-1 bg-white border border-gray-300 px-3 py-1.5 rounded-full hover:bg-gray-100 transition-colors">
                <Hash className="w-3 h-3 text-amber-600" />
                <span className="text-sm font-medium text-gray-700">{tag.name}</span>
                <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
                  {tag.count}
                </span>
                <TrendingUp className="w-3 h-3 text-amber-600" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Categories */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Top Categories This Week</h3>
        <div className="space-y-3">
          {pollsData.stats.topCategories.map((category, index) => (
            <div key={category.name} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-amber-100 text-amber-700 rounded-full font-semibold">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{category.name}</h4>
                    <p className="text-sm text-gray-600">{category.count} discussions</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getTrendIcon(category.trend)}
                  <span className="text-sm font-medium text-gray-700">{category.trend}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trending Issues */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Trending Issues</h3>
        <div className="space-y-4">
          {pollsData.trendingIssues.map(issue => (
            <div key={issue.id} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">{issue.title}</h4>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-1 text-xs font-medium bg-amber-50 text-amber-700 rounded-full">
                      {issue.category}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      issue.status === 'under_review' ? 'bg-yellow-50 text-yellow-600' :
                      issue.status === 'in_progress' ? 'bg-amber-50 text-amber-700' :
                      'bg-amber-50 text-amber-800'
                    }`}>
                      {issue.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <ThumbsUp className="w-4 h-4" />
                      <span>{issue.upvotes} upvotes</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="w-4 h-4" />
                      <span>{issue.comments} comments</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <UserCheck className="w-4 h-4" />
                      <span>Assigned to: {issue.assignedTo}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderCommunityStats = () => (
    <div className="space-y-6">
      {/* Community Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[var(--dark)] p-6 rounded-lg text-white">
          <Activity className="w-8 h-8 text-amber-200 mb-3" />
          <p className="text-amber-100 text-sm">User Satisfaction</p>
          <p className="text-3xl font-bold">4.2/5</p>
        </div>
        <div className="bg-[var(--dark)] p-6 rounded-lg text-white">
          <Clock className="w-8 h-8 text-amber-200 mb-3" />
          <p className="text-amber-100 text-sm">Avg Resolution Time</p>
          <p className="text-3xl font-bold">{communityStatsData.stats.avgResolutionTime}</p>
        </div>
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-6 rounded-lg text-white">
          <Users className="w-8 h-8 text-amber-200 mb-3" />
          <p className="text-amber-100 text-sm">Active Officials</p>
          <p className="text-3xl font-bold">{communityStatsData.stats.activeOfficials}</p>
        </div>
        <div className="bg-gradient-to-r from-rose-500 to-rose-600 p-6 rounded-lg text-white">
          <Target className="w-8 h-8 text-rose-200 mb-3" />
          <p className="text-rose-100 text-sm">Total Users</p>
          <p className="text-3xl font-bold">{usersData.statistics.totalUsers}</p>
        </div>
      </div>

      {/* Top Contributors Leaderboard */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Community Leaderboard</h3>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
            <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-700">
              <div className="col-span-1">Rank</div>
              <div className="col-span-4">Contributor</div>
              <div className="col-span-2">Contributions</div>
              <div className="col-span-2">Issues Resolved</div>
              <div className="col-span-2">Role</div>
              <div className="col-span-1">Status</div>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {pollsData.userLeaderboard.map(user => (
              <div key={user.rank} className="px-6 py-4 hover:bg-gray-50">
                <div className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-1">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-white ${
                      user.rank === 1 ? 'bg-yellow-500' :
                      user.rank === 2 ? 'bg-gray-400' :
                      user.rank === 3 ? 'bg-amber-600' : 'bg-amber-700'
                    }`}>
                      {user.rank}
                    </div>
                  </div>
                  <div className="col-span-4">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-500">@{user.username}</p>
                      </div>
                      {user.rank <= 3 && <Trophy className="w-4 h-4 text-yellow-500" />}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span className="font-semibold text-amber-700">{user.issuesRaised}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-amber-800 font-medium">{user.issuesResolved}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-900 text-sm">Citizen</span>
                  </div>
                  <div className="col-span-1">
                    <UserCheck className="w-4 h-4 text-amber-600" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Performing Officials */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Top Performing Officials</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {communityStatsData.officials.map(official => (
            <div key={official.username} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{official.name}</h4>
                  <p className="text-sm text-gray-600">{official.designation}</p>
                  <p className="text-xs text-gray-500">{official.department}</p>
                </div>
                {official.verified && (
                  <UserCheck className="w-5 h-5 text-amber-600" />
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Response Rate</p>
                  <p className="font-semibold text-amber-700">{official.responseRate}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Department</p>
                  <p className="font-semibold text-amber-700 text-sm">{official.department.split(' ')[0]}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'discussions': return renderDiscussions();
      case 'polls': return renderPolls();
      case 'trending': return renderTrending();
      case 'community': return renderCommunityStats();
      default: return renderDiscussions();
    }
  };

  return (
    <main className="flex-1 p-3 sm:p-4 md:p-6 relative z-10 overflow-y-auto min-h-full" style={{ background: 'var(--stats-bg)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[var(--stats-text)] mb-2" style={{ fontFamily: 'Georgia, serif' }}>Community Hub</h1>
          <p className="text-sm sm:text-base text-[var(--stats-muted)] leading-relaxed" style={{ fontFamily: 'Georgia, serif' }}>Connect, discuss, and collaborate with citizens and officials</p>
        </div>
        <div className="mb-6 sm:mb-8">
          <div className="flex space-x-1 bg-white rounded-xl p-1 sm:p-2 shadow-sm border border-[var(--stats-border)] w-full">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-center px-2 sm:px-3 md:px-4 py-2 sm:py-3 rounded-lg transition-colors flex-1 ${
                    activeTab === tab.id ? 'bg-[var(--black)] text-white shadow-md' : 'bg-[var(--cream-50)] text-[var(--stats-muted)] hover:text-[var(--stats-text)] hover:bg-white border border-transparent'
                  }`}
                  title={tab.label}
                >
                  <Icon className="w-6 h-6 sm:w-7 sm:h-7 flex-shrink-0" />
                  <span className="hidden md:inline text-xs sm:text-sm font-medium ml-2">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        {renderTabContent()}
      </div>
    </main>
  );
};

export default Community;