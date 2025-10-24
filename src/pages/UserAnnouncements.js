import React, { useState, useEffect } from "react";
import { 
  Box, Grid, Card, CardContent, Typography, Paper, Avatar, Chip, CardHeader, Stack, useTheme
} from "@mui/material";
import { 
  Announcement, Person, CalendarToday, EventNote
} from "@mui/icons-material";
import { db } from "../firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";

export default function UserAnnouncements() {
  const theme = useTheme();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const announcementsQuery = query(
      collection(db, "announcements"),
      orderBy("createdAt", "desc")
    );
    
    const unsubscribe = onSnapshot(announcementsQuery, (snap) => {
      const announcementsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAnnouncements(announcementsData);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <Box sx={{ pt: { xs: 2, sm: 3 }, pl: { xs: 2, sm: 3, md: 4 }, pr: { xs: 2, sm: 3, md: 4 }, pb: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000', mb: 2, mt: 1 }}>
        Announcements
      </Typography>
      
      {loading ? (
        <Paper sx={{ 
          p: 3, 
          textAlign: 'center',
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.9)',
          border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
          borderRadius: 2,
          boxShadow: theme.palette.mode === 'dark' ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)'
        }}>
          <Typography variant="body1" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#333333' }}>
            Loading announcements...
          </Typography>
        </Paper>
      ) : announcements.length === 0 ? (
        <Paper sx={{ 
          p: { xs: 2, sm: 3, md: 4 },
          textAlign: 'center',
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.9)',
          border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
          borderRadius: 2,
          boxShadow: theme.palette.mode === 'dark' ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)'
        }}>
          <Typography variant="h6" sx={{ 
            color: theme.palette.mode === 'dark' ? '#ffffff' : '#333333',
            fontWeight: 600,
            mb: 1
          }}>
            No announcements available
          </Typography>
          <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666' }}>
            Check back later for updates from your school.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {announcements.map((a) => (
            <Grid item xs={12} key={a.id}>
              <Card sx={{ 
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.9)',
                border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
                borderRadius: 2,
                boxShadow: theme.palette.mode === 'dark' ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
                '&:hover': {
                  boxShadow: theme.palette.mode === 'dark' ? '0 4px 12px rgba(0, 0, 0, 0.4)' : '0 4px 12px rgba(0, 0, 0, 0.15)',
                  transform: 'translateY(-1px)',
                  transition: 'all 0.3s ease'
                }
              }}>
                <CardHeader
                  title={
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
                        {a.title}
                      </Typography>
                      <Chip 
                        label={a.category || 'General'} 
                        color="default" 
                        size="small"
                        sx={{ 
                          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                          color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000'
                        }}
                      />
                    </Stack>
                  }
                  subheader={
                    <Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666' }}>
                      {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ''}
                    </Typography>
                  }
                />
                <CardContent sx={{ pt: 0 }}>
                  <Typography variant="body2" sx={{ 
                    color: theme.palette.mode === 'dark' ? '#e0e0e0' : '#333333',
                    lineHeight: 1.6
                  }}>
                    {(a.message || a.content) || ''}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
} 