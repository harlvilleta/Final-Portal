import React, { useState, useEffect, useMemo, useCallback } from "react";
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

  const fetchYearlyData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const currentYear = new Date().getFullYear();
      const startOfYear = new Date(currentYear, 0, 1);
      const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

      // Single query to fetch all violations for the current year
      const violationsQuery = query(
        collection(db, "violations"),
        where("createdAt", ">=", startOfYear.toISOString()),
        where("createdAt", "<=", endOfYear.toISOString())
      );
      
      const violationsSnapshot = await getDocs(violationsQuery);
      
      // Process violations by month
      const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      
      const monthlyCounts = Array.from({ length: 12 }, (_, i) => ({
        month: months[i],
        count: 0,
        monthNumber: i + 1
      }));
      
      violationsSnapshot.docs.forEach(doc => {
        const createdAt = new Date(doc.data().createdAt);
        const monthIndex = createdAt.getMonth();
        if (monthIndex >= 0 && monthIndex < 12) {
          monthlyCounts[monthIndex].count++;
        }
      });

      setMonthlyData(monthlyCounts);
    } catch (err) {
      console.error("Error fetching yearly data:", err);
      setError("Failed to load violations data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchYearlyData();
  }, [fetchYearlyData]);

  const handleBack = () => {
    navigate('/overview');
  };

  const stats = useMemo(() => {
    const totalViolations = monthlyData.reduce((sum, month) => sum + month.count, 0);
    const peakMonth = monthlyData.reduce((max, month) => month.count > max.count ? month : max, { count: 0, month: 'None' });
    const averagePerMonth = totalViolations / 12;
    const monthsWithViolations = monthlyData.filter(month => month.count > 0).length;
    
    return { totalViolations, peakMonth, averagePerMonth, monthsWithViolations };
  }, [monthlyData]);
  
  const { totalViolations, peakMonth, averagePerMonth, monthsWithViolations } = stats;
  
  const chartData = useMemo(() => monthlyData, [monthlyData]);


  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={handleBack} sx={{ mr: 2 }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" sx={{ 
            fontWeight: 700, 
            background: 'linear-gradient(45deg, #800000, #A52A2A, #8B0000)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 2, 
            mt: 1 
          }}>
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
    <Box sx={{ p: 3, pt: { xs: 2, sm: 3 }, pl: { xs: 2, sm: 3, md: 4 }, pr: { xs: 2, sm: 3, md: 4 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={handleBack} sx={{ mr: 2 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" sx={{ 
          fontWeight: 700, 
          background: 'linear-gradient(45deg, #800000, #A52A2A, #8B0000)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          mb: 2, 
          mt: 1
        }}>
          Violations Dashboard
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 1 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'transparent', borderLeft: '4px solid #800000' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700} sx={{ 
                background: 'linear-gradient(45deg, #800000, #A52A2A, #8B0000)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                {totalViolations}
              </Typography>
              <Typography variant="body2" sx={{ color: '#000000' }}>
                Total Violations ({new Date().getFullYear()})
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'transparent', borderLeft: '4px solid #800000' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700} sx={{ 
                background: 'linear-gradient(45deg, #800000, #A52A2A, #8B0000)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                {Math.round(averagePerMonth)}
              </Typography>
              <Typography variant="body2" sx={{ color: '#000000' }}>
                Average per Month
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'transparent', borderLeft: '4px solid #800000' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700} sx={{ 
                background: 'linear-gradient(45deg, #800000, #A52A2A, #8B0000)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                {peakMonth.count}
              </Typography>
              <Typography variant="body2" sx={{ color: '#000000' }}>
                Peak Month: {peakMonth.month}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'transparent', borderLeft: '4px solid #800000' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700} sx={{ 
                background: 'linear-gradient(45deg, #800000, #A52A2A, #8B0000)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                {monthsWithViolations}
              </Typography>
              <Typography variant="body2" sx={{ color: '#000000' }}>
                Months with Violations
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Monthly Chart */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, color: isDark ? '#ffffff' : '#000000' }}>
          Violations Reported - {new Date().getFullYear()}
        </Typography>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData}>
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
      <Box sx={{ mb: 1 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ 
          fontWeight: 600, 
          background: 'linear-gradient(45deg, #800000, #A52A2A, #8B0000)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Monthly Breakdown
        </Typography>
        <Grid container spacing={1}>
          {chartData.map((month) => (
            <Grid item xs={6} sm={4} md={2} key={month.month}>
              <Card sx={{ 
                textAlign: 'center', 
                bgcolor: 'transparent',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(0, 0, 0, 0.2)',
                height: 'fit-content'
              }}>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ 
                    background: 'linear-gradient(45deg, #800000, #A52A2A, #8B0000)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    fontSize: '1rem' 
                  }}>
                    {month.count}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.7rem', color: isDark ? '#ffffff' : '#000000' }}>
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
      </Box>
    </Box>
  );
}
