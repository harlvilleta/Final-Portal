import React, { useEffect, useState } from "react";
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, InputAdornment } from "@mui/material";
import { History as HistoryIcon } from '@mui/icons-material';
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";

function getEntityFromLog(log) {
  // Try to infer entity from type or message
  if (log.type?.includes('student') || /student/i.test(log.message)) return 'students';
  if (log.type?.includes('item') || /item/i.test(log.message)) return 'item';
  if (log.type?.includes('violation') || /violation/i.test(log.message)) return 'violation';
  if (log.type?.includes('activity') || /activity/i.test(log.message)) return 'activity';
  if (log.type?.includes('announcement') || /announcement/i.test(log.message)) return 'announcement';
  if (log.type?.includes('login')) return 'login';
  return log.type || 'other';
}

function getOperationLabel(type) {
  if (!type) return 'Info';
  if (type.startsWith('add') || type.startsWith('insert')) return 'Insert';
  if (type.startsWith('edit') || type.startsWith('update')) return 'Edit';
  if (type.startsWith('delete') || type.startsWith('remove')) return 'Delete';
  if (type.startsWith('login')) return 'Login';
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export default function History() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState([]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const q = query(collection(db, "activity_log"), orderBy("timestamp", "desc"));
        const snap = await getDocs(q);
        setLogs(snap.docs.map(doc => doc.data()));
      } catch (e) {
        setLogs([]);
      }
    };
    fetchLogs();
  }, []);

  useEffect(() => {
    setFiltered(
      logs.filter(l =>
        (getOperationLabel(l.type)?.toLowerCase() || "").includes(search.toLowerCase()) ||
        (getEntityFromLog(l)?.toLowerCase() || "").includes(search.toLowerCase()) ||
        (l.message?.toLowerCase() || "").includes(search.toLowerCase())
      )
    );
  }, [search, logs]);

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} color="primary.main" gutterBottom>
        Activity Log
      </Typography>
      <TextField
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by operation, used for, or message..."
        size="small"
        fullWidth
        sx={{ mb: 3, maxWidth: 400 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <HistoryIcon color="primary" />
            </InputAdornment>
          )
        }}
      />
      <Paper sx={{ p: 2, borderRadius: 3, boxShadow: 2, bgcolor: '#f5f6fa' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#e3f2fd' }}>
              <TableCell sx={{ fontWeight: 700 }}>Operation</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Used For</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Operation Date</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Details</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>No activity logs found.</TableCell>
              </TableRow>
            ) : filtered.map((log, idx) => (
              <TableRow key={idx} hover sx={{ bgcolor: idx % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                <TableCell>{getOperationLabel(log.type)}</TableCell>
                <TableCell>{getEntityFromLog(log)}</TableCell>
                <TableCell>{log.timestamp ? new Date(log.timestamp).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }) : ''}</TableCell>
                <TableCell>{log.message}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
} 