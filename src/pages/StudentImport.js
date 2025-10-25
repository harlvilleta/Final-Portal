import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Alert,
  CircularProgress,
  Stack,
  IconButton,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import {
  CloudUpload,
  Close,
  Description,
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  History
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { db, logActivity } from '../firebase';
import { collection, getDocs, query, where, setDoc, doc, orderBy } from 'firebase/firestore';

function StudentImport({ open, onClose, onImportSuccess }) {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [importResults, setImportResults] = useState({ 
    success: 0, 
    failed: 0, 
    skipped: 0,
    errors: [] 
  });
  const [previewData, setPreviewData] = useState([]);
  const [importHistoryOpen, setImportHistoryOpen] = useState(false);
  const [importHistory, setImportHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const fileInputRef = useRef(null);

  // Sample Excel data template for reference
  const sampleData = {
    headers: ['Student ID', 'First Name', 'Last Name', 'Email', 'Sex'],
    sampleRows: [
      ['SCC-22-00000001', 'John', 'Doe', 'john.doe@example.com', 'Male'],
      ['SCC-22-00000002', 'Jane', 'Smith', 'jane.smith@example.com', 'Female']
    ]
  };

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      // Accept both Excel and CSV files
      const validExtensions = ['.xlsx', '.xls', '.csv'];
      const fileExtension = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
      
      if (validExtensions.includes(fileExtension)) {
        setFile(selectedFile);
        setStatus({ type: 'info', message: `Selected file: ${selectedFile.name}` });
        parseFile(selectedFile);
      } else {
        setStatus({ type: 'error', message: 'Please select a valid Excel file (.xlsx, .xls, .csv)' });
      }
    }
  };

  const parseFile = async (file) => {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      if (jsonData.length < 2) {
        setStatus({ type: 'error', message: 'File must have at least a header row and one data row' });
        return;
      }

      // Parse the data with flexible column mapping
      const students = parseExcelData(jsonData);
      setPreviewData(students);
      
      setStatus({ 
        type: 'success', 
        message: `File parsed successfully. Found ${students.length} student(s). Ready to import.` 
      });
    } catch (error) {
      console.error('Error parsing file:', error);
      setStatus({ type: 'error', message: 'Error parsing file. Please ensure it is a valid Excel file.' });
    }
  };

  const parseExcelData = (jsonData) => {
    const headers = jsonData[0].map(h => h ? h.toString().trim().toLowerCase() : '');
    const rows = jsonData.slice(1);
    
    // Map column headers to our expected fields
    const columnMap = {};
    headers.forEach((header, index) => {
      const cleanHeader = header.toLowerCase().trim();
      
      // Map Student ID (various possible names)
      if (cleanHeader.includes('student') && cleanHeader.includes('id') || 
          cleanHeader === 'id' || cleanHeader === 'studentid' || cleanHeader === 'student_id') {
        columnMap.studentId = index;
      }
      // Map First Name
      else if (cleanHeader.includes('first') && cleanHeader.includes('name') || 
               cleanHeader === 'firstname' || cleanHeader === 'first_name' || cleanHeader === 'name') {
        columnMap.firstName = index;
      }
      // Map Last Name
      else if (cleanHeader.includes('last') && cleanHeader.includes('name') || 
               cleanHeader === 'lastname' || cleanHeader === 'last_name' || 
               cleanHeader === 'surname' || cleanHeader === 'family name') {
        columnMap.lastName = index;
      }
      // Map Email
      else if (cleanHeader.includes('email') || cleanHeader === 'gmail' || 
               cleanHeader === 'e-mail' || cleanHeader === 'email address') {
        columnMap.email = index;
      }
      // Map Sex/Gender
      else if (cleanHeader.includes('sex') || cleanHeader.includes('gender')) {
        columnMap.sex = index;
      }
    });

    // Parse rows
    const students = [];
    rows.forEach((row, index) => {
      // Only process rows that have at least some data
      if (row.some(cell => cell && cell.toString().trim())) {
        const student = {
          rowNumber: index + 2, // +2 because header is row 1 and arrays are 0-indexed
          studentId: columnMap.studentId !== undefined ? (row[columnMap.studentId] || '').toString().trim() : '',
          firstName: columnMap.firstName !== undefined ? (row[columnMap.firstName] || '').toString().trim() : '',
          lastName: columnMap.lastName !== undefined ? (row[columnMap.lastName] || '').toString().trim() : '',
          email: columnMap.email !== undefined ? (row[columnMap.email] || '').toString().trim() : '',
          sex: columnMap.sex !== undefined ? (row[columnMap.sex] || '').toString().trim() : ''
        };
        students.push(student);
      }
    });

    return students;
  };

  const validateStudent = (student) => {
    // Only Student ID and Names are required
    if (!student.studentId || student.studentId.trim() === '') {
      return { valid: false, error: 'Student ID is required' };
    }
    if (!student.firstName || student.firstName.trim() === '') {
      return { valid: false, error: 'First Name is required' };
    }
    if (!student.lastName || student.lastName.trim() === '') {
      return { valid: false, error: 'Last Name is required' };
    }
    return { valid: true, error: null };
  };

  const checkDuplicate = async (studentId) => {
    try {
      // Check in students collection
      const studentsSnapshot = await getDocs(query(collection(db, 'students'), where('id', '==', studentId)));
      
      // Check in users collection
      const usersSnapshot = await getDocs(query(collection(db, 'users'), where('studentId', '==', studentId)));
      
      return !studentsSnapshot.empty || !usersSnapshot.empty;
    } catch (error) {
      console.error('Error checking duplicate:', error);
      return false;
    }
  };

  const handleImport = async () => {
    if (previewData.length === 0) {
      setStatus({ type: 'error', message: 'No data to import' });
      return;
    }

    setImporting(true);
    setProgress(0);
    setImportResults({ success: 0, failed: 0, skipped: 0, errors: [] });

    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    const errors = [];

    for (let i = 0; i < previewData.length; i++) {
      const student = previewData[i];
      setProgress(((i + 1) / previewData.length) * 100);

      try {
        // Validate student data
        const validation = validateStudent(student);
        if (!validation.valid) {
          failedCount++;
          errors.push({
            row: student.rowNumber,
            student: `${student.firstName} ${student.lastName}`,
            error: validation.error
          });
          continue;
        }

        // Check for duplicates
        const isDuplicate = await checkDuplicate(student.studentId);
        if (isDuplicate) {
          skippedCount++;
          errors.push({
            row: student.rowNumber,
            student: `${student.firstName} ${student.lastName} (${student.studentId})`,
            error: 'Student ID already exists - skipped'
          });
          continue;
        }

        // Prepare student data for Firebase
        const studentData = {
          id: student.studentId,
          studentId: student.studentId,
          firstName: student.firstName,
          lastName: student.lastName,
          fullName: `${student.firstName} ${student.lastName}`,
          email: student.email || '',
          sex: student.sex || '',
          course: '',
          year: '',
          section: '',
          contact: '',
          birthdate: '',
          age: '',
          image: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isRegistered: false,
          source: 'excel_import'
        };

        // Save to Firestore
        await setDoc(doc(db, 'students', studentData.id), studentData);
        
        // Log activity
        await logActivity({ 
          message: `Imported student: ${studentData.firstName} ${studentData.lastName}`, 
          type: 'import_student' 
        });

        successCount++;
      } catch (error) {
        failedCount++;
        errors.push({
          row: student.rowNumber,
          student: `${student.firstName} ${student.lastName}`,
          error: error.message || 'Unknown error'
        });
      }
    }

    setImportResults({
      success: successCount,
      failed: failedCount,
      skipped: skippedCount,
      errors: errors
    });

    if (successCount > 0) {
      setStatus({
        type: 'success',
        message: `Successfully imported ${successCount} student(s)! ${skippedCount > 0 ? `${skippedCount} skipped.` : ''}`
      });
      
      if (onImportSuccess) {
        onImportSuccess();
      }

      // Clear file after successful import
      setFile(null);
      setPreviewData([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } else {
      setStatus({
        type: 'error',
        message: 'Failed to import any students. Please check the errors below.'
      });
    }

    setImporting(false);
    setProgress(100);
  };

  const handleClose = () => {
    if (!importing) {
      setFile(null);
      setStatus({ type: '', message: '' });
      setImportResults({ success: 0, failed: 0, skipped: 0, errors: [] });
      setPreviewData([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onClose();
    }
  };

  const handleImportHistory = async () => {
    setImportHistoryOpen(true);
    setLoadingHistory(true);
    try {
      // Try to get all activity logs and filter for import_student type
      const activityLogsSnapshot = await getDocs(collection(db, 'activity_log'));
      const allLogs = activityLogsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filter for import_student type
      const importLogs = allLogs.filter(log => 
        log.type === 'import_student' || 
        (log.message && log.message.toLowerCase().includes('imported student'))
      );
      
      // Sort by timestamp (newest first)
      importLogs.sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
      });
      
      const history = importLogs.map(log => ({
        id: log.id,
        ...log,
        date: log.timestamp 
          ? new Date(log.timestamp).toLocaleString('en-US', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })
          : 'Unknown date'
      }));
      
      setImportHistory(history);
      
      if (history.length === 0) {
        console.log('No import history found');
      }
    } catch (error) {
      console.error('Error fetching import history:', error);
      setImportHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCloseHistory = () => {
    setImportHistoryOpen(false);
    setImportHistory([]);
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <CloudUpload sx={{ fontSize: 28, color: '#800000' }} />
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#000000' }}>
                Import Students from Excel
              </Typography>
            </Box>
            <IconButton onClick={handleClose} disabled={importing}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {/* Instructions */}
            <Alert severity="info" sx={{ bgcolor: '#e3f2fd' }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                Import Instructions:
              </Typography>
              <Typography variant="body2" component="div">
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  <li><strong>Required columns:</strong> Student ID, First Name, Last Name</li>
                  <li><strong>Optional columns:</strong> Email/Gmail, Sex/Gender</li>
                  <li>Supports flexible column names (e.g., "Student ID", "ID", "StudentID")</li>
                  <li>Duplicate Student IDs will be skipped</li>
                  <li>Other columns will be ignored</li>
                </ul>
              </Typography>
            </Alert>

            {/* File Upload and Import History Buttons */}
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                Select Excel File (.xlsx, .xls, or .csv)
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                  id="excel-upload-input"
                />
                <label htmlFor="excel-upload-input">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<CloudUpload />}
                    disabled={importing}
                    size="small"
                    sx={{
                      py: 1,
                      px: 2,
                      borderColor: '#000000',
                      color: '#000000',
                      fontSize: '0.8rem',
                      '&:hover': {
                        borderColor: '#800000',
                        bgcolor: '#800000',
                        color: '#fff'
                      }
                    }}
                  >
                    Choose Excel File
                  </Button>
                </label>
                <Button
                  variant="outlined"
                  onClick={handleImportHistory}
                  startIcon={<History />}
                  disabled={importing}
                  size="small"
                  sx={{
                    py: 1,
                    px: 2,
                    borderColor: '#000000',
                    color: '#000000',
                    fontSize: '0.8rem',
                    '&:hover': {
                      borderColor: '#800000',
                      bgcolor: '#800000',
                      color: '#fff'
                    }
                  }}
                >
                  Import History
                </Button>
              </Box>
              {file && (
                <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'text.secondary' }}>
                  Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </Typography>
              )}
            </Box>

            {/* Progress Bar */}
            {importing && (
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Importing... {Math.round(progress)}%
                </Typography>
                <LinearProgress variant="determinate" value={progress} />
              </Box>
            )}

            {/* Preview Data */}
            {previewData.length > 0 && !importing && (
              <Box>
                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                  Data Preview ({previewData.length} students)
                </Typography>
                <Box sx={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: 1 }}>
                  <Box sx={{ display: 'table', width: '100%' }}>
                    <Box sx={{ display: 'table-header-group', bgcolor: '#f5f5f5', fontWeight: 'bold' }}>
                      <Box sx={{ display: 'table-row' }}>
                        <Box sx={{ display: 'table-cell', px: 2, py: 1, borderBottom: '1px solid #e0e0e0' }}>ID</Box>
                        <Box sx={{ display: 'table-cell', px: 2, py: 1, borderBottom: '1px solid #e0e0e0' }}>First Name</Box>
                        <Box sx={{ display: 'table-cell', px: 2, py: 1, borderBottom: '1px solid #e0e0e0' }}>Last Name</Box>
                        <Box sx={{ display: 'table-cell', px: 2, py: 1, borderBottom: '1px solid #e0e0e0' }}>Email</Box>
                        <Box sx={{ display: 'table-cell', px: 2, py: 1, borderBottom: '1px solid #e0e0e0' }}>Sex</Box>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'table-row-group' }}>
                      {previewData.slice(0, 5).map((student, index) => (
                        <Box key={index} sx={{ display: 'table-row' }}>
                          <Box sx={{ display: 'table-cell', px: 2, py: 1, fontSize: '0.875rem' }}>{student.studentId || '-'}</Box>
                          <Box sx={{ display: 'table-cell', px: 2, py: 1, fontSize: '0.875rem' }}>{student.firstName || '-'}</Box>
                          <Box sx={{ display: 'table-cell', px: 2, py: 1, fontSize: '0.875rem' }}>{student.lastName || '-'}</Box>
                          <Box sx={{ display: 'table-cell', px: 2, py: 1, fontSize: '0.875rem' }}>{student.email || '-'}</Box>
                          <Box sx={{ display: 'table-cell', px: 2, py: 1, fontSize: '0.875rem' }}>{student.sex || '-'}</Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                  {previewData.length > 5 && (
                    <Typography variant="caption" sx={{ p: 2, display: 'block', color: 'text.secondary' }}>
                      Showing first 5 of {previewData.length} students
                    </Typography>
                  )}
                </Box>
              </Box>
            )}

            {/* Status Messages */}
            {status.message && (
              <Alert severity={status.type} sx={{ bgcolor: status.type === 'success' ? '#e8f5e9' : status.type === 'error' ? '#ffebee' : '#fff3e0' }}>
                {status.message}
              </Alert>
            )}

            {/* Import Results */}
            {importResults.success > 0 || importResults.failed > 0 || importResults.skipped > 0 ? (
              <Alert severity={importResults.failed > 0 ? 'warning' : 'success'}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Import Summary:
                </Typography>
                <Typography variant="body2">
                  ✓ Successfully imported: <strong>{importResults.success}</strong> student(s)
                </Typography>
                {importResults.skipped > 0 && (
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    ⚠ Skipped (duplicates): <strong>{importResults.skipped}</strong> student(s)
                  </Typography>
                )}
                {importResults.failed > 0 && (
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    ✗ Failed: <strong>{importResults.failed}</strong> student(s)
                  </Typography>
                )}
              </Alert>
            ) : null}

            {/* Error Details */}
            {importResults.errors.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', color: 'error.main' }}>
                  Error Details:
                </Typography>
                <Box sx={{ maxHeight: 200, overflowY: 'auto', bgcolor: '#f5f5f5', p: 2, borderRadius: 1 }}>
                  {importResults.errors.map((error, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'start', gap: 1, mb: 1 }}>
                      {error.error.includes('skipped') ? (
                        <Warning sx={{ fontSize: 18, color: 'warning.main' }} />
                      ) : (
                        <ErrorIcon sx={{ fontSize: 18, color: 'error.main' }} />
                      )}
                      <Typography variant="caption">
                        <strong>Row {error.row} ({error.student}):</strong> {error.error}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} disabled={importing} sx={{ color: '#000000' }}>
            Close
          </Button>
          <Button
            onClick={handleImport}
            variant="contained"
            disabled={previewData.length === 0 || importing}
            startIcon={importing ? <CircularProgress size={16} /> : <CloudUpload />}
            sx={{
              bgcolor: '#800000',
              color: '#fff',
              '&:hover': {
                bgcolor: '#6b0000'
              },
              '&:disabled': {
                bgcolor: '#cccccc',
                color: '#fff'
              }
            }}
          >
            {importing ? 'Importing...' : 'Import Students'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import History Dialog */}
      <Dialog
        open={importHistoryOpen}
        onClose={handleCloseHistory}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <History sx={{ fontSize: 28, color: '#800000' }} />
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#000000' }}>
                Import History
              </Typography>
            </Box>
            <IconButton onClick={handleCloseHistory}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          {loadingHistory ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : importHistory.length === 0 ? (
            <Alert severity="info">No import history found.</Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#800000' }}>
                    <TableCell sx={{ color: 'white', fontWeight: 700 }}>Date & Time</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 700 }}>Activity</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 700 }}>Details</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {importHistory.map((record, index) => (
                    <TableRow key={record.id} hover sx={{ bgcolor: index % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                      <TableCell>{record.date}</TableCell>
                      <TableCell>{record.type || 'import_student'}</TableCell>
                      <TableCell>
                        {record.message || 'Import activity'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={handleCloseHistory}
            variant="outlined"
            sx={{
              color: '#000000',
              borderColor: '#000000',
              '&:hover': {
                bgcolor: '#800000',
                color: '#fff',
                borderColor: '#800000'
              }
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default StudentImport;
