import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
  Box, Typography, Paper, IconButton, Grid, Card, CardContent, Chip,
  CircularProgress, Alert, ToggleButton, ToggleButtonGroup
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
  const [weeklyData, setWeeklyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timePeriod, setTimePeriod] = useState('monthly');
  const navigate = useNavigate();

  const fetchWeeklyData = useCallback(async () => {
    try {
      setLoading(true);
      const weeklyData = [];

      // Get the last 12 weeks
      for (let i = 11; i >= 0; i--) {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - (i * 7));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const startOfWeek = new Date(weekStart);
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(weekEnd);
        endOfWeek.setHours(23, 59, 59, 999);

        const violationsQuery = query(
          collection(db, "violations"),
          where("createdAt", ">=", startOfWeek),
          where("createdAt", "<=", endOfWeek)
        );

        const snapshot = await getDocs(violationsQuery);
        const count = snapshot.size;

        weeklyData.push({
          week: `Week ${12 - i}`,
          weekStart: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          weekEnd: weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          count: count,
          fullWeek: `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
        });
      }

      setWeeklyData(weeklyData);
    } catch (error) {
      console.error("Error fetching weekly violations data:", error);
      setError("Failed to load weekly violations data");
    } finally {
      setLoading(false);
    }
  }, []);

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
    fetchWeeklyData();
  }, [fetchYearlyData, fetchWeeklyData]);

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
          <Card sx={{ 
            background: 'transparent',
            borderLeft: '4px solid #800000',
            borderRadius: 2,
            boxShadow: 2
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700} sx={{ color: '#800000' }}>
                {totalViolations}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Violations ({new Date().getFullYear()})
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'transparent',
            borderLeft: '4px solid #800000',
            borderRadius: 2,
            boxShadow: 2
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700} sx={{ color: '#800000' }}>
                {Math.round(averagePerMonth)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Average per Month
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'transparent',
            borderLeft: '4px solid #800000',
            borderRadius: 2,
            boxShadow: 2
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700} sx={{ color: '#800000' }}>
                {peakMonth.count}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Peak Month: {peakMonth.month}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'transparent',
            borderLeft: '4px solid #800000',
            borderRadius: 2,
            boxShadow: 2
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700} sx={{ color: '#800000' }}>
                {monthsWithViolations}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Months with Violations
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Monthly Chart */}
      <Paper sx={{ 
        p: 2, 
        mb: 1,
        background: 'linear-gradient(135deg, rgba(128, 0, 0, 0.05) 0%, rgba(128, 0, 0, 0.02) 100%)',
        border: '1px solid rgba(128, 0, 0, 0.2)',
        borderLeft: '4px solid #800000'
      }}>
        <Typography variant="h6" gutterBottom sx={{ 
          fontWeight: 700, 
          color: isDark ? '#ffffff' : '#800000',
          textShadow: isDark ? '0 1px 2px rgba(0, 0, 0, 0.3)' : 'none'
        }}>
          Violations Reported Trends - {new Date().getFullYear()}
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
      <Paper sx={{ 
        p: 3,
        background: 'linear-gradient(135deg, rgba(128, 0, 0, 0.05) 0%, rgba(128, 0, 0, 0.02) 100%)',
        border: '1px solid rgba(128, 0, 0, 0.2)',
        borderLeft: '4px solid #800000'
      }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, color: isDark ? '#ffffff' : '#800000' }}>
          Monthly Breakdown
        </Typography>
        <Grid container spacing={2}>
          {chartData.map((month) => (
            <Grid item xs={6} sm={4} md={2} key={month.month}>
              <Card sx={{ 
                textAlign: 'center', 
                background: 'linear-gradient(135deg, rgba(128, 0, 0, 0.1) 0%, rgba(128, 0, 0, 0.05) 100%)',
                border: '1px solid rgba(128, 0, 0, 0.2)',
                borderLeft: '4px solid #800000',
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
