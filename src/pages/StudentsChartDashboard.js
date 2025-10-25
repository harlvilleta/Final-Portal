import React, { useState, useEffect } from "react";
import { 
  Box, Typography, Paper, IconButton, Grid, Card, CardContent, Chip,
  CircularProgress, Alert
} from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { useTheme } from "../contexts/ThemeContext";

export default function StudentsChartDashboard() {
  const { isDark } = useTheme();
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchYearlyData();
  }, []);

  const fetchYearlyData = async () => {
    try {
      setLoading(true);
      setError(null);

      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];

      // Initialize monthly counts array
      const monthlyCounts = months.map((month, index) => ({
        month: month,
        count: 0,
        monthNumber: index + 1,
        year: currentYear
      }));

      // Fetch ALL students from both collections
      const [studentsSnapshot, usersSnapshot] = await Promise.allSettled([
        getDocs(collection(db, "students")),
        getDocs(query(collection(db, "users"), where("role", "==", "Student")))
      ]);

      // Process students from "students" collection
      if (studentsSnapshot.status === 'fulfilled') {
        studentsSnapshot.value.docs.forEach(doc => {
          const data = doc.data();
          const createdAt = data.createdAt;
          if (createdAt) {
            const createdDate = new Date(createdAt);
            const createdMonth = createdDate.getMonth();
            const createdYear = createdDate.getFullYear();
            
            // Only count if it's from the current year
            if (createdYear === currentYear) {
              const monthIndex = monthlyCounts.findIndex(m => m.monthNumber === createdMonth + 1);
              if (monthIndex !== -1) {
                monthlyCounts[monthIndex].count++;
              }
            }
          }
        });
      }

      // Process students from "users" collection
      if (usersSnapshot.status === 'fulfilled') {
        usersSnapshot.value.docs.forEach(doc => {
          const data = doc.data();
          const createdAt = data.createdAt;
          if (createdAt) {
            const createdDate = new Date(createdAt);
            const createdMonth = createdDate.getMonth();
            const createdYear = createdDate.getFullYear();
            
            // Only count if it's from the current year
            if (createdYear === currentYear) {
              const monthIndex = monthlyCounts.findIndex(m => m.monthNumber === createdMonth + 1);
              if (monthIndex !== -1) {
                monthlyCounts[monthIndex].count++;
              }
            }
          }
        });
      }

      // Remove the extra properties we added for processing
      const finalData = monthlyCounts.map(({ month, count }) => ({ month, count }));
      setMonthlyData(finalData);
    } catch (err) {
      console.error("Error fetching yearly data:", err);
      setError("Failed to load student registration data");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/overview');
  };

  const totalStudents = monthlyData.reduce((sum, month) => sum + month.count, 0);
  const peakMonth = monthlyData.reduce((max, month) => month.count > max.count ? month : max, { count: 0, month: 'None' });
  const averagePerMonth = totalStudents / 12;


  if (error) {
    return (
      <Box sx={{ p: 3, pt: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={handleBack} sx={{ mr: 2 }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" sx={{ fontWeight: 700, color: isDark ? '#ffffff' : '#800000', mb: 2, mt: 1 }}>
            Students Registration Dashboard
          </Typography>
        </Box>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, pt: { xs: 2, sm: 3 }, pl: { xs: 2, sm: 3, md: 4 }, pr: { xs: 2, sm: 3, md: 4 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <IconButton onClick={handleBack} sx={{ mr: 2 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" sx={{ fontWeight: 700, color: isDark ? '#ffffff' : '#000000', mb: 2, mt: 1 }}>
          Students Registration Dashboard
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 1 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#80000015', borderLeft: '4px solid #800000' }}>
            <CardContent>
              <Typography variant="h4" fontWeight={700} sx={{ color: '#ffffff' }}>
                {totalStudents}
              </Typography>
              <Typography variant="body2" sx={{ color: '#ffffff' }}>
                Total Students ({new Date().getFullYear()})
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#80000015', borderLeft: '4px solid #800000' }}>
            <CardContent>
              <Typography variant="h4" fontWeight={700} sx={{ color: '#ffffff' }}>
                {Math.round(averagePerMonth)}
              </Typography>
              <Typography variant="body2" sx={{ color: '#ffffff' }}>
                Average per Month
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#80000015', borderLeft: '4px solid #800000' }}>
            <CardContent>
              <Typography variant="h4" fontWeight={700} sx={{ color: '#ffffff' }}>
                {peakMonth.count}
              </Typography>
              <Typography variant="body2" sx={{ color: '#ffffff' }}>
                Peak Month: {peakMonth.month}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#80000015', borderLeft: '4px solid #800000' }}>
            <CardContent>
              <Typography variant="h4" fontWeight={700} sx={{ color: '#ffffff' }}>
                {new Date().getFullYear()}
              </Typography>
              <Typography variant="body2" sx={{ color: '#ffffff' }}>
                Current Year
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Overview Comparison */}
      <Box sx={{ mb: 1 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: '#ffffff' }}>
          Last 6 Months (Overview Data)
        </Typography>
        <Typography variant="caption" sx={{ mb: 1.5, color: '#ffffff' }}>
          This shows the same data as displayed in the Overview dashboard
        </Typography>
        <Grid container spacing={1}>
          {monthlyData.slice(-6).map((month, index) => (
            <Grid item xs={6} sm={4} md={2} key={month.month}>
              <Card sx={{ 
                textAlign: 'center', 
                bgcolor: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                height: 'fit-content'
              }}>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ color: '#ffffff', fontSize: '1rem' }}>
                    {month.count}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.7rem', color: '#ffffff' }}>
                    {month.month}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Monthly Chart */}
      <Paper sx={{ p: 2, mb: 1 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, color: '#ffffff' }}>
          Student Registration Trends - {new Date().getFullYear()}
        </Typography>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 12 }}
              axisLine={{ stroke: isDark ? '#D84040' : '#800000' }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              axisLine={{ stroke: isDark ? '#D84040' : '#800000' }}
              domain={[0, 'dataMax + 1']}
            />
            <RechartsTooltip 
              contentStyle={{ 
                backgroundColor: isDark ? '#1a1a1a' : '#fff', 
                border: isDark ? '1px solid #D84040' : '1px solid #800000',
                borderRadius: '8px',
                color: isDark ? '#ffffff' : '#000000'
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="count" 
              stroke={isDark ? '#D84040' : '#800000'} 
              strokeWidth={3}
              name="Students Registered"
              dot={{ fill: isDark ? '#D84040' : '#800000', strokeWidth: 2, r: 5 }}
              activeDot={{ r: 8, stroke: isDark ? '#D84040' : '#800000', strokeWidth: 2 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Paper>

      {/* Monthly Breakdown */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, color: isDark ? '#ffffff' : '#800000' }}>
          Monthly Breakdown
        </Typography>
        <Grid container spacing={2}>
          {monthlyData.map((month) => (
            <Grid item xs={6} sm={4} md={2} key={month.month}>
              <Card sx={{ 
                textAlign: 'center', 
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : (month.count > averagePerMonth ? '#80000015' : '#f5f5f5'),
                backdropFilter: isDark ? 'blur(10px)' : 'none',
                border: isDark ? (month.count > 0 ? '2px solid #4caf50' : '1px solid #ffffff') : (month.count > averagePerMonth ? '1px solid #800000' : '1px solid #e0e0e0'),
                boxShadow: isDark ? '0 8px 32px rgba(0, 0, 0, 0.3)' : '0 4px 16px rgba(0, 0, 0, 0.1)'
              }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="h6" fontWeight={700} sx={{ color: isDark ? '#ffffff' : (month.count > averagePerMonth ? '#800000' : 'text.primary') }}>
                    {month.count}
                  </Typography>
                  <Typography variant="caption" sx={{ color: isDark ? '#ffffff' : 'text.secondary' }}>
                    {month.month}
                  </Typography>
                  {month.count > averagePerMonth && !isDark && (
                    <Chip 
                      label="Above Average" 
                      size="small" 
                      sx={{ 
                        mt: 1, 
                        bgcolor: '#800000', 
                        color: 'white',
                        fontSize: '0.7rem'
                      }} 
                    />
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Box>
  );
}
