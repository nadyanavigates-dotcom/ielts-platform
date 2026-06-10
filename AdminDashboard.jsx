import React, { useState, useEffect } from 'react';
import { Download, Edit2, CheckCircle, Clock, TrendingUp, AlertCircle } from 'lucide-react';

const AdminDashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [writingScore, setWritingScore] = useState('');
  const [speakingScore, setSpeakingScore] = useState('');
  const [notes, setNotes] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, pending, complete
  const [sortBy, setSortBy] = useState('date'); // date, band, student

  // Load submissions on mount
  useEffect(() => {
    if (isAuthenticated) {
      loadSubmissions();
    }
  }, [isAuthenticated]);

  const loadSubmissions = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_APPS_SCRIPT_URL}?action=getSubmissions&password=${password}`
      );
      const data = await response.json();
      
      if (data.error) {
        alert('Error loading submissions: ' + data.error);
      } else {
        setSubmissions(data.submissions || []);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error loading submissions');
    }
  };

  const handleLogin = () => {
    if (password.length < 6) {
      alert('Invalid password');
      return;
    }
    setIsAuthenticated(true);
  };

  const handleSaveScores = async () => {
    if (!selectedSubmission || !writingScore || !speakingScore) {
      alert('Please fill in all scores');
      return;
    }

    try {
      const response = await fetch(process.env.REACT_APP_APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'updateWritingScore',
          submissionId: selectedSubmission.submission_id,
          writingScore: parseFloat(writingScore),
          speakingScore: parseFloat(speakingScore),
          notes: notes
        })
      });

      const data = await response.json();
      if (data.success) {
        alert('Scores saved successfully!');
        setSelectedSubmission(null);
        setWritingScore('');
        setSpeakingScore('');
        setNotes('');
        loadSubmissions();
      } else {
        alert('Error saving scores');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error saving scores');
    }
  };

  const calculateBand = (score, total = 40) => {
    const percentage = (score / total) * 100;
    if (percentage >= 86) return 9;
    if (percentage >= 80) return 8.5;
    if (percentage >= 73) return 8;
    if (percentage >= 66) return 7.5;
    if (percentage >= 60) return 7;
    if (percentage >= 52) return 6.5;
    if (percentage >= 45) return 6;
    if (percentage >= 36) return 5.5;
    if (percentage >= 30) return 5;
    if (percentage >= 23) return 4.5;
    if (percentage >= 17) return 4;
    if (percentage >= 11) return 3.5;
    if (percentage >= 6) return 3;
    return 2.5;
  };

  const calculateOverallBand = (sub) => {
    const scores = [
      sub.listening_band,
      sub.reading_band,
      sub.writing_score || 0,
      sub.speaking_score || 0
    ].filter(s => s);
    
    return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
  };

  const getFilteredSubmissions = () => {
    let filtered = submissions;

    if (filterType === 'pending') {
      filtered = filtered.filter(s => s.status === 'Pending' || !s.writing_score);
    } else if (filterType === 'complete') {
      filtered = filtered.filter(s => s.status === 'Complete' && s.writing_score);
    }

    // Sort
    if (sortBy === 'band') {
      filtered.sort((a, b) => calculateOverallBand(b) - calculateOverallBand(a));
    } else if (sortBy === 'student') {
      filtered.sort((a, b) => a.student_name.localeCompare(b.student_name));
    }

    return filtered;
  };

  // ============ LOGIN SCREEN ============
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold text-purple-600 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600 mb-6">IELTS Test Scoring & Management</p>
          
          <input
            type="password"
            placeholder="Admin Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-6 focus:outline-none focus:border-purple-500"
          />
          
          <button
            onClick={handleLogin}
            className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700"
          >
            Access Dashboard
          </button>

          <p className="text-xs text-gray-500 mt-4 text-center">
            Contact your system administrator for access
          </p>
        </div>
      </div>
    );
  }

  // ============ DASHBOARD VIEW ============
  const filteredSubs = getFilteredSubmissions();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-8 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-purple-100 mt-1">Manage test submissions & scores</p>
          </div>
          
          <button
            onClick={() => setIsAuthenticated(false)}
            className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg text-sm"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {/* Total Tests */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Tests</p>
                <p className="text-3xl font-bold text-blue-600">{submissions.length}</p>
              </div>
              <Clock className="text-blue-400" size={32} />
            </div>
          </div>

          {/* Pending Scoring */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Pending Scores</p>
                <p className="text-3xl font-bold text-orange-600">
                  {submissions.filter(s => !s.writing_score).length}
                </p>
              </div>
              <AlertCircle className="text-orange-400" size={32} />
            </div>
          </div>

          {/* Avg Listening */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Avg Listening</p>
                <p className="text-3xl font-bold text-green-600">
                  {submissions.length > 0 
                    ? (submissions.reduce((a, b) => a + (b.listening_band || 0), 0) / submissions.length).toFixed(1)
                    : '-'}
                </p>
              </div>
              <TrendingUp className="text-green-400" size={32} />
            </div>
          </div>

          {/* Avg Reading */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Avg Reading</p>
                <p className="text-3xl font-bold text-indigo-600">
                  {submissions.length > 0
                    ? (submissions.reduce((a, b) => a + (b.reading_band || 0), 0) / submissions.length).toFixed(1)
                    : '-'}
                </p>
              </div>
              <CheckCircle className="text-indigo-400" size={32} />
            </div>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Filter */}
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Filter Status</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="all">All Submissions</option>
                <option value="pending">Pending Scoring</option>
                <option value="complete">Complete</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="date">Recent First</option>
                <option value="band">Highest Band First</option>
                <option value="student">Student Name</option>
              </select>
            </div>

            {/* Export */}
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Actions</label>
              <button
                onClick={() => {
                  const csv = convertToCSV(filteredSubs);
                  downloadCSV(csv, 'ielts_results.csv');
                }}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <Download size={16} />
                Export to CSV
              </button>
            </div>
          </div>
        </div>

        {/* Submissions Table */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Table */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Student</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Test Type</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">L</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">R</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">W</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredSubs.map((sub, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-gray-900">{sub.student_name}</p>
                            <p className="text-xs text-gray-500">{new Date(sub.timestamp).toLocaleDateString()}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            sub.test_type === 'pre' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {sub.test_type?.toUpperCase() || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-lg">{sub.listening_band || '-'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-lg">{sub.reading_band || '-'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`font-bold text-lg ${sub.writing_score ? 'text-green-600' : 'text-gray-400'}`}>
                            {sub.writing_score || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => setSelectedSubmission(sub)}
                            className="text-blue-600 hover:text-blue-800 font-semibold text-sm"
                          >
                            Score
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Score Detail Panel */}
          {selectedSubmission && (
            <div className="bg-white rounded-lg shadow p-6 lg:col-span-1">
              <h2 className="text-xl font-bold mb-4">Score {selectedSubmission.student_name}</h2>

              {/* Display Listening & Reading */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-blue-50 p-3 rounded">
                  <p className="text-xs text-gray-600">Listening</p>
                  <p className="text-2xl font-bold text-blue-600">{selectedSubmission.listening_band}</p>
                </div>
                <div className="bg-indigo-50 p-3 rounded">
                  <p className="text-xs text-gray-600">Reading</p>
                  <p className="text-2xl font-bold text-indigo-600">{selectedSubmission.reading_band}</p>
                </div>
              </div>

              {/* Writing Score */}
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Writing Band (0-9)</label>
                <input
                  type="number"
                  min="0"
                  max="9"
                  step="0.5"
                  value={writingScore}
                  onChange={(e) => setWritingScore(e.target.value)}
                  placeholder="Enter score"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              {/* Speaking Score */}
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Speaking Band (0-9)</label>
                <input
                  type="number"
                  min="0"
                  max="9"
                  step="0.5"
                  value={speakingScore}
                  onChange={(e) => setSpeakingScore(e.target.value)}
                  placeholder="Enter score"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              {/* Notes */}
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Feedback for student..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg h-24 text-sm"
                />
              </div>

              {/* View Writing File */}
              {selectedSubmission.file_url && (
                <a
                  href={selectedSubmission.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-sm font-semibold text-gray-700 mb-4"
                >
                  📄 View Writing File
                </a>
              )}

              {/* Save Button */}
              <button
                onClick={handleSaveScores}
                className="w-full bg-purple-600 text-white py-2 rounded-lg font-semibold hover:bg-purple-700"
              >
                Save Scores
              </button>

              <button
                onClick={() => setSelectedSubmission(null)}
                className="w-full mt-2 text-gray-600 hover:text-gray-800 py-2"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============ HELPER FUNCTIONS ============
function convertToCSV(data) {
  const headers = ['Student', 'Email', 'Test Type', 'Listening', 'Reading', 'Writing', 'Speaking', 'Overall', 'Date'];
  
  const rows = data.map(sub => {
    const overall = ((sub.listening_band + sub.reading_band + (sub.writing_score || 0) + (sub.speaking_score || 0)) / 4).toFixed(1);
    return [
      sub.student_name,
      sub.student_email,
      sub.test_type,
      sub.listening_band,
      sub.reading_band,
      sub.writing_score || '',
      sub.speaking_score || '',
      overall,
      new Date(sub.timestamp).toLocaleDateString()
    ];
  });

  let csv = headers.join(',') + '\n';
  rows.forEach(row => {
    csv += row.join(',') + '\n';
  });

  return csv;
}

function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default AdminDashboard;
