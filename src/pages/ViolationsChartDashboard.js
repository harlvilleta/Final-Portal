import React, { useState, useEffect } from "react";
import { 
  Box, Typography, Paper, IconButton, Grid, Card, CardContent, Chip,
  CircularProgress, Alert
} from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { useTheme } from "../contexts/ThemeContext";

export default function ViolationsChartDashboard() {
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

      const currentYear = new Date().getFullYear();
      const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];

      const monthlyCounts = [];

      // Fetch data for each month of the current year
      for (let i = 0; i < 12; i++) {
        const startOfMonth = new Date(currentYear, i, 1);
        const endOfMonth = new Date(currentYear, i + 1, 0, 23, 59, 59);

        try {
          const violationsQuery = query(
            collection(db, "violations"),
            where("createdAt", ">=", startOfMonth.toISOString()),
            where("createdAt", "<=", endOfMonth.toISOString())
          );
          const violationsSnapshot = await getDocs(violationsQuery);

          monthlyCounts.push({
            month: months[i],
            count: violationsSnapshot.size,
            monthNumber: i + 1
          });
        } catch (monthError) {
          console.log(`Error fetching data for ${months[i]}:`, monthError);
          monthlyCounts.push({
            month: months[i],
            count: 0,
            monthNumber: i + 1
          });
        }
      }

      setMonthlyData(monthlyCounts);
    } catch (err) {
      console.error("Error fetching yearly data:", err);
      setError("Failed to load violations data");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/overview');
  };

  const totalViolations = monthlyData.reduce((sum, month) => sum + month.count, 0);
  const peakMonth = monthlyData.reduce((max, month) => month.count > max.count ? month : max, { count: 0, month: 'None' });
  const averagePerMonth = totalViolations / 12;
  const monthsWithViolations = monthlyData.filter(month => month.count > 0).length;

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={handleBack} sx={{ mr: 2 }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" sx={{ fontWeight: 700, color: isDark ? '#ffffff' : '#800000' }}>
            Violations Dashboard
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <CircularProgress size={60} />
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={handleBack} sx={{ mr: 2 }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" sx={{ fontWeight: 700, color: isDark ? '#ffffff' : '#800000' }}>
            Violations Dashboard
          </Typography>
        </Box>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={handleBack} sx={{ mr: 2 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#800000' }}>
          Violations Dashboard
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#80000015', borderLeft: '4px solid #800000' }}>
            <CardContent>
              <Typography variant="h4" fontWeight={700} sx={{ color: isDark ? '#ffffff' : '#800000' }}>
                {totalViolations}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                Total Violations ({new Date().getFullYear()})
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#80000015', borderLeft: '4px solid #800000' }}>
            <CardContent>
              <Typography variant="h4" fontWeight={700} sx={{ color: isDark ? '#ffffff' : '#800000' }}>
                {Math.round(averagePerMonth)}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                Average per Month
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#80000015', borderLeft: '4px solid #800000' }}>
            <CardContent>
              <Typography variant="h4" fontWeight={700} sx={{ color: isDark ? '#ffffff' : '#800000' }}>
                {peakMonth.count}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                Peak Month: {peakMonth.month}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#80000015', borderLeft: '4px solid #800000' }}>
            <CardContent>
              <Typography variant="h4" fontWeight={700} sx={{ color: isDark ? '#ffffff' : '#800000' }}>
                {monthsWithViolations}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                Months with Violations
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Monthly Chart */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, color: isDark ? '#ffffff' : '#800000' }}>
          Violations Reported - {new Date().getFullYear()}
        </Typography>
        <ResponsiveContainer width="100%" height={500}>
          <BarChart data={monthlyData}>
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
              formatter={(value, name, props) => {
                if (value === 0) {
                  return ['No Violations this Month', 'Status'];
                }
                return [`${value} Students Violated`, 'Violations'];
              }}
              labelFormatter={(label) => `Month: ${label}`}
            />
            <Legend />
            <Bar 
              dataKey="count" 
              fill={isDark ? '#D84040' : '#800000'} 
              name="Violations Reported"
              radius={[4, 4, 0, 0]}
              style={{
                cursor: 'default'
              }}
              onMouseEnter={(data, index, event) => {
                // Force color to remain the same
                if (event && event.target) {
                  event.target.style.fill = isDark ? '#D84040' : '#800000';
                }
              }}
              onMouseLeave={(data, index, event) => {
                // Ensure color stays the same
                if (event && event.target) {
                  event.target.style.fill = isDark ? '#D84040' : '#800000';
                }
              }}
            />
          </BarChart>
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
                border: month.count > 0 ? '2px solid #d32f2f' : '2px solid #4caf50',
                boxShadow: isDark ? '0 8px 32px rgba(0, 0, 0, 0.3)' : '0 4px 16px rgba(0, 0, 0, 0.1)'
              }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                    <Box sx={{ 
                      width: 12, 
                      height: 12, 
                      borderRadius: '50%', 
                      bgcolor: month.count > 0 ? '#d32f2f' : '#4caf50',
                      mr: 1
                    }} />
                    <Typography variant="h6" fontWeight={700} sx={{ color: isDark ? '#ffffff' : (month.count > averagePerMonth ? '#800000' : 'text.primary') }}>
                      {month.count}
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: isDark ? '#ffffff' : 'text.secondary' }}>
                    {month.month}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        
        {/* Legend */}
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#4caf50' }} />
            <Typography variant="body2" sx={{ color: isDark ? '#ffffff' : '#000000' }}>
              No Violations
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#d32f2f' }} />
            <Typography variant="body2" sx={{ color: isDark ? '#ffffff' : '#000000' }}>
              Has Violations
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
