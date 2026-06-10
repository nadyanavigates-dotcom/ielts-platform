// Google Apps Script - Deploy as web app
// 1. Go to apps.google.com/script
// 2. Create new project
// 3. Paste this code
// 4. Deploy > New Deployment > Web app > Execute as: Me, Who has access: Anyone
// 5. Copy the deployment URL

// CONFIG
const SPREADSHEET_ID = "YOUR_SPREADSHEET_ID"; // Replace with your Google Sheet ID
const FOLDER_ID = "YOUR_FOLDER_ID"; // Google Drive folder for submissions
const ADMIN_PASSWORD = "your_secure_password_123"; // Change this!

function doGet(e) {
  const action = e.parameter.action;
  
  if (action === 'getTest') {
    return getTest(e.parameter.testId);
  } else if (action === 'verifyAdmin') {
    return verifyAdmin(e.parameter.password);
  } else if (action === 'getSubmissions') {
    return getSubmissions(e.parameter.password);
  } else if (action === 'uploadFile') {
    return uploadFile(e);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ error: 'Invalid action' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const action = JSON.parse(e.postData.contents).action;
  
  if (action === 'submitTest') {
    return submitTest(e.postData.contents);
  } else if (action === 'updateWritingScore') {
    return updateWritingScore(e.postData.contents);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ error: 'Invalid action' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============ GET TEST DATA ============
function getTest(testId) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Questions');
    const data = sheet.getDataRange().getValues();
    
    // Find test by ID
    const testData = {
      id: testId,
      type: 'academic',
      listeningAnswers: getAnswers(testId, 'Listening'),
      readingAnswers: getAnswers(testId, 'Reading'),
      writingTasks: getWritingTasks(testId)
    };
    
    return ContentService.createTextOutput(JSON.stringify(testData))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getAnswers(testId, section) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Answers');
  const data = sheet.getDataRange().getValues();
  const answers = {};
  
  data.forEach((row, index) => {
    if (row[0] === testId && row[1] === section) {
      answers[row[2]] = row[3]; // questionId -> answer
    }
  });
  
  return answers;
}

function getWritingTasks(testId) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Writing_Tasks');
  const data = sheet.getDataRange().getValues();
  
  let tasks = {};
  data.forEach((row) => {
    if (row[0] === testId) {
      tasks[row[1]] = row[2]; // taskId -> prompt
    }
  });
  
  return tasks;
}

// ============ SUBMIT TEST ============
function submitTest(postData) {
  try {
    const data = JSON.parse(postData);
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Submissions');
    
    // Append submission
    sheet.appendRow([
      data.timestamp,
      data.studentName,
      data.studentEmail,
      data.testType,
      data.listeningScore,
      data.readingScore,
      data.listeningBand,
      data.readingBand,
      '', // writingScore (manual)
      '', // speakingScore (manual)
      'Pending', // status
      data.listeningAnswers,
      data.readingAnswers
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, submissionId: Date.now() }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============ FILE UPLOAD ============
function uploadFile(e) {
  try {
    const blob = e.parameter.file;
    const studentName = e.parameter.studentName;
    const testType = e.parameter.testType;
    
    // Create folder structure: Writing Submissions/[Student Name]/[Test Type]
    const parentFolder = DriveApp.getFolderById(FOLDER_ID);
    
    let studentFolder = null;
    const studentFolders = parentFolder.getFoldersByName(studentName);
    if (studentFolders.hasNext()) {
      studentFolder = studentFolders.next();
    } else {
      studentFolder = parentFolder.createFolder(studentName);
    }
    
    let testFolder = null;
    const testFolders = studentFolder.getFoldersByName(testType);
    if (testFolders.hasNext()) {
      testFolder = testFolders.next();
    } else {
      testFolder = studentFolder.createFolder(testType);
    }
    
    // Upload file
    const file = testFolder.createFile(blob);
    
    // Update submission with file link
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Submissions');
    const data = sheet.getDataRange().getValues();
    
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i][1] === studentName && data[i][3] === testType) {
        sheet.getRange(i + 1, 14).setValue(file.getUrl()); // Column N for file link
        break;
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, fileUrl: file.getUrl() }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============ ADMIN FUNCTIONS ============
function verifyAdmin(password) {
  const verified = password === ADMIN_PASSWORD;
  return ContentService.createTextOutput(JSON.stringify({ verified }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSubmissions(password) {
  if (password !== ADMIN_PASSWORD) {
    return ContentService.createTextOutput(JSON.stringify({ error: 'Unauthorized' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Submissions');
    const data = sheet.getDataRange().getValues();
    
    // Skip header row
    const submissions = data.slice(1).map(row => ({
      timestamp: row[0],
      studentName: row[1],
      studentEmail: row[2],
      testType: row[3],
      listeningScore: row[4],
      readingScore: row[5],
      listeningBand: row[6],
      readingBand: row[7],
      writingScore: row[8],
      speakingScore: row[9],
      status: row[10],
      fileUrl: row[13],
      submissionId: row[0]
    }));
    
    return ContentService.createTextOutput(JSON.stringify({ submissions }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function updateWritingScore(postData) {
  try {
    const data = JSON.parse(postData);
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Submissions');
    const allData = sheet.getDataRange().getValues();
    
    // Find and update the submission
    for (let i = 1; i < allData.length; i++) {
      if (allData[i][0] === data.submissionId) {
        sheet.getRange(i + 1, 9).setValue(data.writingScore); // Column I
        sheet.getRange(i + 1, 11).setValue('Complete'); // Mark as complete
        break;
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============ HELPER: GENERATE SHARE LINK ============
function generateShareLink(studentName, testType) {
  const baseUrl = ScriptApp.getService().getUrl();
  const timestamp = Date.now();
  const studentId = studentName.toLowerCase().replace(/\s/g, '-') + '-' + timestamp;
  
  return {
    url: `${baseUrl}?test=cambridge-20-${testType}&student=${studentId}`,
    studentId: studentId
  };
}

// ============ HELPER: EMAIL LINK TO STUDENT ============
function emailTestLink(studentEmail, studentName, testType) {
  const link = generateShareLink(studentName, testType);
  
  const subject = `IELTS ${testType.toUpperCase()} Test Link`;
  const body = `Dear ${studentName},\n\nYour ${testType} test is ready!\n\nClick here to start: ${link.url}\n\nBest of luck!`;
  
  GmailApp.sendEmail(studentEmail, subject, body);
  
  return link.url;
}
