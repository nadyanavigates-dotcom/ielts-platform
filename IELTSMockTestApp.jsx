import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Clock, FileUp, Home, LogOut, Share2, TrendingUp } from 'lucide-react';

const IELTSMockTestApp = () => {
  const [screen, setScreen] = useState('landing'); // landing, testSelect, listening, reading, writing, results, admin
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [testType, setTestType] = useState(''); // 'pre' or 'post'
  const [testPhase, setTestPhase] = useState(1); // 1: Listening, 2: Reading, 3: Writing
  const [listeningAnswers, setListeningAnswers] = useState({});
  const [readingAnswers, setReadingAnswers] = useState({});
  const [writingFile, setWritingFile] = useState(null);
  const [testStartTime, setTestStartTime] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [testData, setTestData] = useState(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminMode, setAdminMode] = useState(false);
  const [submissions, setSubmissions] = useState([]);

  // Parse URL params to get test link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const testId = params.get('test');
    const studentId = params.get('student');
    if (testId && studentId) {
      loadTestData(testId, studentId);
    }
  }, []);

  // Timer for exam
  useEffect(() => {
    if (testStartTime && testPhase <= 2) { // Listening + Reading have time limits
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - testStartTime) / 1000);
        const totalSeconds = testPhase === 1 ? 1800 : 3600; // 30 min listening, 60 min reading
        setTimeRemaining(Math.max(0, totalSeconds - elapsed));
        
        if (elapsed >= totalSeconds) {
          moveToNextPhase();
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [testStartTime, testPhase]);

  const loadTestData = async (testId, studentId) => {
    try {
      // Fetch from Google Sheets via Apps Script
      const response = await fetch(`${process.env.REACT_APP_APPS_SCRIPT_URL}?action=getTest&testId=${testId}`);
      const data = await response.json();
      setTestData(data);
      setStudentName(studentId);
      setScreen('testSelect');
    } catch (error) {
      console.error('Error loading test:', error);
      alert('Error loading test. Please check your link.');
    }
  };

  const startTest = (type) => {
    setTestType(type);
    setTestPhase(1);
    setTestStartTime(Date.now());
    setScreen('listening');
  };

  const handleListeningAnswer = (questionId, answer) => {
    setListeningAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleReadingAnswer = (questionId, answer) => {
    setReadingAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const moveToNextPhase = () => {
    if (testPhase === 1) {
      setTestPhase(2);
      setTestStartTime(Date.now());
      setScreen('reading');
    } else if (testPhase === 2) {
      setTestPhase(3);
      setScreen('writing');
    }
  };

  const submitTest = async () => {
    try {
      // Auto-score Listening and Reading
      const listeningScore = scoreAnswers(listeningAnswers, testData.listeningAnswers);
      const readingScore = scoreAnswers(readingAnswers, testData.readingAnswers);
      const listeningBand = calculateBand(listeningScore, 40);
      const readingBand = calculateBand(readingScore, 40);

      // Save to Google Sheets
      const response = await fetch(process.env.REACT_APP_APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'submitTest',
          studentName,
          studentEmail,
          testType,
          listeningAnswers: JSON.stringify(listeningAnswers),
          readingAnswers: JSON.stringify(readingAnswers),
          listeningScore,
          readingScore,
          listeningBand,
          readingBand,
          timestamp: new Date().toISOString()
        })
      });

      // Upload writing file if provided
      if (writingFile) {
        const formData = new FormData();
        formData.append('file', writingFile);
        formData.append('studentName', studentName);
        formData.append('testType', testType);
        formData.append('testId', 'writing');
        
        await fetch(`${process.env.REACT_APP_APPS_SCRIPT_URL}?action=uploadFile`, {
          method: 'POST',
          body: formData
        });
      }

      setScreen('results');
    } catch (error) {
      console.error('Error submitting test:', error);
      alert('Error submitting test. Please try again.');
    }
  };

  const scoreAnswers = (userAnswers, correctAnswers) => {
    let score = 0;
    Object.keys(correctAnswers).forEach(qId => {
      if (userAnswers[qId]?.trim().toLowerCase() === correctAnswers[qId].trim().toLowerCase()) {
        score++;
      }
    });
    return score;
  };

  const calculateBand = (score, total) => {
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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ============ LANDING PAGE ============
  if (screen === 'landing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
          <h1 className="text-4xl font-bold text-blue-600 mb-2">IELTS Mock Test</h1>
          <p className="text-gray-600 mb-6 text-sm">Cambridge Academic Practice Tests</p>
          
          <input
            type="text"
            placeholder="Your Name"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
          />
          
          <input
            type="email"
            placeholder="Your Email"
            value={studentEmail}
            onChange={(e) => setStudentEmail(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-6"
          />
          
          <button
            onClick={() => {
              if (studentName && studentEmail) setScreen('testSelect');
            }}
            disabled={!studentName || !studentEmail}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            Continue
          </button>

          <button
            onClick={() => setAdminMode(true)}
            className="mt-4 w-full text-gray-500 text-sm hover:text-gray-700"
          >
            Admin Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ============ ADMIN MODE ============
  if (adminMode && !testData) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
          
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Verify Admin Access</h2>
            <input
              type="password"
              placeholder="Admin Password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
            />
            <button
              onClick={async () => {
                try {
                  const response = await fetch(`${process.env.REACT_APP_APPS_SCRIPT_URL}?action=verifyAdmin&password=${adminPassword}`);
                  const data = await response.json();
                  if (data.verified) {
                    loadAdminData();
                  } else {
                    alert('Invalid password');
                  }
                } catch (error) {
                  console.error('Error:', error);
                }
              }}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
            >
              Login
            </button>
          </div>

          <button
            onClick={() => setAdminMode(false)}
            className="text-blue-600 hover:text-blue-700"
          >
            ← Back to Student Test
          </button>
        </div>
      </div>
    );
  }

  // ============ TEST SELECT PAGE ============
  if (screen === 'testSelect') {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-bold">Welcome, {studentName}!</h2>
            <p className="text-gray-600">Select which test you'd like to take</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* PRE TEST */}
            <div
              onClick={() => startTest('pre')}
              className="bg-white rounded-lg shadow p-8 cursor-pointer hover:shadow-lg transition transform hover:-translate-y-1"
            >
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-xl font-bold mb-2">Pre Test</h3>
              <p className="text-gray-600 mb-4">Establish your baseline level</p>
              <div className="flex items-center text-sm text-gray-500">
                <Clock size={16} className="mr-2" />
                2 hours 44 minutes
              </div>
            </div>

            {/* POST TEST */}
            <div
              onClick={() => startTest('post')}
              className="bg-white rounded-lg shadow p-8 cursor-pointer hover:shadow-lg transition transform hover:-translate-y-1"
            >
              <div className="text-4xl mb-4">✨</div>
              <h3 className="text-xl font-bold mb-2">Post Test</h3>
              <p className="text-gray-600 mb-4">Measure your improvement</p>
              <div className="flex items-center text-sm text-gray-500">
                <TrendingUp size={16} className="mr-2" />
                Same format as Pre Test
              </div>
            </div>
          </div>

          <button
            onClick={() => setScreen('landing')}
            className="mt-8 text-blue-600 hover:text-blue-700"
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  // ============ LISTENING TEST ============
  if (screen === 'listening') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Listening Test</h1>
          <div className="text-xl font-mono">{formatTime(timeRemaining || 0)}</div>
        </div>

        <div className="max-w-4xl mx-auto p-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-8">Part 1: Conversation</h2>
            
            <div className="mb-8 bg-blue-50 p-4 rounded">
              <p className="text-sm text-gray-600">🔊 Audio will play here in the full app</p>
              <audio controls className="w-full mt-2">
                <source src={process.env.REACT_APP_AUDIO_URL_1} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </div>

            <div className="space-y-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((qNum) => (
                <div key={qNum} className="border border-gray-200 p-4 rounded">
                  <label className="font-semibold mb-3 block">
                    Question {qNum}: Complete the note below
                  </label>
                  <input
                    type="text"
                    placeholder="Your answer"
                    value={listeningAnswers[`L1_${qNum}`] || ''}
                    onChange={(e) => handleListeningAnswer(`L1_${qNum}`, e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={moveToNextPhase}
              className="mt-8 w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
            >
              Continue to Reading Test →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============ READING TEST ============
  if (screen === 'reading') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Reading Test</h1>
          <div className="text-xl font-mono">{formatTime(timeRemaining || 0)}</div>
        </div>

        <div className="max-w-4xl mx-auto p-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-8">Reading Section 1</h2>

            <div className="mb-8 p-4 border-l-4 border-blue-400 bg-gray-50 text-sm leading-relaxed">
              <p className="font-semibold mb-2">Sample Reading Passage</p>
              <p>This is where the reading passage text would appear. In a real test, you would see a 1000+ word academic text from Cambridge IELTS...</p>
            </div>

            <div className="space-y-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((qNum) => (
                <div key={qNum} className="border border-gray-200 p-4 rounded">
                  <label className="font-semibold mb-3 block">
                    Question {qNum}: Multiple Choice
                  </label>
                  <div className="space-y-2">
                    {['A', 'B', 'C', 'D'].map(option => (
                      <label key={option} className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name={`R1_${qNum}`}
                          value={option}
                          checked={readingAnswers[`R1_${qNum}`] === option}
                          onChange={(e) => handleReadingAnswer(`R1_${qNum}`, e.target.value)}
                          className="mr-3"
                        />
                        <span>{option}) Answer option {option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={moveToNextPhase}
              className="mt-8 w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
            >
              Continue to Writing Task →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============ WRITING TEST ============
  if (screen === 'writing') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-blue-600 text-white p-4">
          <h1 className="text-2xl font-bold">Writing Test</h1>
        </div>

        <div className="max-w-4xl mx-auto p-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">Task 1: Describe the diagram</h2>
            <p className="text-gray-600 mb-8">You should spend about 20 minutes on this task. Write at least 150 words.</p>

            <div className="mb-8 p-4 bg-gray-100 rounded text-center text-gray-500">
              📊 Chart/Diagram would be displayed here
            </div>

            <textarea
              placeholder="Write your response here..."
              className="w-full h-48 px-4 py-3 border border-gray-300 rounded-lg mb-8 font-mono text-sm"
              defaultValue=""
            />

            <h2 className="text-2xl font-bold mb-4 mt-12">Task 2: Argumentative Essay</h2>
            <p className="text-gray-600 mb-8">You should spend about 40 minutes on this task. Write at least 250 words.</p>

            <textarea
              placeholder="Write your response here..."
              className="w-full h-48 px-4 py-3 border border-gray-300 rounded-lg mb-8 font-mono text-sm"
              defaultValue=""
            />

            <div className="bg-blue-50 p-4 rounded mb-8">
              <h3 className="font-semibold mb-3">📤 Upload Your Writing</h3>
              <p className="text-sm text-gray-600 mb-3">Upload a document (Word or PDF) with both tasks completed</p>
              <input
                type="file"
                accept=".doc,.docx,.pdf"
                onChange={(e) => setWritingFile(e.target.files[0])}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              {writingFile && <p className="text-sm text-green-600 mt-2">✓ {writingFile.name}</p>}
            </div>

            <button
              onClick={submitTest}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700"
            >
              Submit Test & View Results
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============ RESULTS PAGE ============
  if (screen === 'results') {
    const listeningScore = Object.keys(listeningAnswers).length;
    const readingScore = Object.keys(readingAnswers).length;
    const listeningBand = calculateBand(listeningScore, 40);
    const readingBand = calculateBand(readingScore, 40);
    const overallBand = ((listeningBand + readingBand) / 2).toFixed(1);

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
            <div className="bg-green-500 text-white p-6 text-center">
              <CheckCircle size={48} className="mx-auto mb-2" />
              <h1 className="text-3xl font-bold">Test Submitted Successfully!</h1>
            </div>

            <div className="p-8">
              <h2 className="text-2xl font-bold mb-8">Your Results: {testType.toUpperCase()} Test</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Listening Card */}
                <div className="bg-blue-50 rounded-lg p-6 text-center">
                  <p className="text-gray-600 mb-2">Listening</p>
                  <p className="text-5xl font-bold text-blue-600 mb-2">{listeningBand}</p>
                  <p className="text-sm text-gray-600">{listeningScore}/40 correct</p>
                </div>

                {/* Reading Card */}
                <div className="bg-blue-50 rounded-lg p-6 text-center">
                  <p className="text-gray-600 mb-2">Reading</p>
                  <p className="text-5xl font-bold text-blue-600 mb-2">{readingBand}</p>
                  <p className="text-sm text-gray-600">{readingScore}/40 correct</p>
                </div>

                {/* Overall Card */}
                <div className="bg-green-50 rounded-lg p-6 text-center">
                  <p className="text-gray-600 mb-2">Overall Band (L+R avg)</p>
                  <p className="text-5xl font-bold text-green-600 mb-2">{overallBand}</p>
                  <p className="text-sm text-gray-600">Based on L+R only</p>
                </div>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
                <p className="text-sm text-gray-700">
                  <strong>Note:</strong> Writing and Speaking scores will be added by your tutor after manual review. Your tutor will email you the complete results with all 4 component scores.
                </p>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <p><strong>Submission ID:</strong> {Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
                <p><strong>Submitted:</strong> {new Date().toLocaleString()}</p>
                <p><strong>Student:</strong> {studentName}</p>
              </div>

              <button
                onClick={() => {
                  setScreen('landing');
                  setStudentName('');
                  setStudentEmail('');
                }}
                className="mt-8 w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
              >
                Take Another Test
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default IELTSMockTestApp;
