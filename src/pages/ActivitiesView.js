import React, { useEffect, useState } from 'react';
import { Box, Typography, Grid, Card, CardContent, CardHeader, Chip, TextField, Stack } from '@mui/material';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';

export default function ActivitiesView() {
  const [activities, setActivities] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const q = query(collection(db, 'activities'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        setActivities(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = activities.filter(a =>
    (a.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.organizer || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.category || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 0 }}>Activities</Typography>
      </Box>
      <TextField fullWidth placeholder="Search activities..." value={search} onChange={e => setSearch(e.target.value)} sx={{ mb: 2 }} />
      
      {loading ? (
        <Typography>Loading activities...</Typography>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="textSecondary">No activities available</Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((act) => (
            <Grid item xs={12} key={act.id}>
              <Card>
                <CardHeader
                  title={
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography fontWeight={700}>{act.title}</Typography>
                      <Chip label={act.category || 'General'} color="default" size="small" />
                      <Chip label={act.completed ? 'Completed' : 'Scheduled'} color={act.completed ? 'success' : 'warning'} size="small" />
                    </Stack>
                  }
                  subheader={act.date ? new Date(act.date).toLocaleDateString() : ''}
                />
                <CardContent>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {act.description || ''}
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    {act.organizer && <Chip label={`Organizer: ${act.organizer}`} size="small" variant="outlined" />}
                    {act.location && <Chip label={`Location: ${act.location}`} size="small" variant="outlined" />}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

    </Box>
  );
}


