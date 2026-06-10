import React, { useState, useEffect } from 'react';
import IELTSMockTestApp from './IELTSMockTestApp';
import AdminDashboard from './AdminDashboard';

function App() {
  const [mode, setMode] = useState('detect');

  useEffect(() => {
    // Auto-detect if admin is trying to access
    const params = new URLSearchParams(window.location.search);
    const adminParam = params.get('admin');
    
    if (adminParam === 'true') {
      setMode('admin');
    } else if (params.get('test') || params.get('student')) {
      setMode('student');
    } else {
      // Show student test by default (they can click admin button from there)
      setMode('student');
    }
  }, []);

  return (
    <div className="App">
      {mode === 'student' && <IELTSMockTestApp />}
      {mode === 'admin' && <AdminDashboard />}
    </div>
  );
}

export default App;
