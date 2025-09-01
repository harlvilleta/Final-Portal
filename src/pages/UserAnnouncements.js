import React, { useState, useEffect } from "react";
import { 
  Box, Grid, Card, CardContent, Typography, Paper, Avatar, Chip, CardHeader, Stack
} from "@mui/material";
import { 
  Announcement, Person, CalendarToday, EventNote
} from "@mui/icons-material";
import { db } from "../firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";

export default function UserAnnouncements() {
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
    <Box>
      <Typography variant="h4" gutterBottom>Announcements</Typography>
      
      {loading ? (
        <Typography>Loading announcements...</Typography>
      ) : announcements.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="textSecondary">No announcements available</Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {announcements.map((a) => (
            <Grid item xs={12} key={a.id}>
              <Card>
                <CardHeader
                  title={
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography fontWeight={700}>{a.title}</Typography>
                      <Chip label={a.category || 'General'} color="default" size="small" />
                    </Stack>
                  }
                  subheader={a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ''}
                />
                <CardContent>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
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