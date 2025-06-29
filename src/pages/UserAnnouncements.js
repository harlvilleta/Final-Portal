import React, { useState, useEffect } from "react";
import { 
  Box, Grid, Card, CardContent, Typography, Paper, Avatar, Chip
} from "@mui/material";
import { 
  Announcement, Person, CalendarToday
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
          {announcements.map((announcement) => (
            <Grid item xs={12} key={announcement.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" gutterBottom>{announcement.title}</Typography>
                    <Chip 
                      label={announcement.category || 'General'} 
                      color="primary" 
                      size="small"
                    />
                  </Box>
                  
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {announcement.content}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Typography variant="body2" color="textSecondary">
                      <CalendarToday sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
                      {new Date(announcement.createdAt).toLocaleDateString()}
                    </Typography>
                    {announcement.author && (
                      <Typography variant="body2" color="textSecondary">
                        <Person sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
                        {announcement.author}
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
} 