import React, { useState } from "react";
import { Typography, Box, Grid, TextField, MenuItem, Button, Paper, Avatar, Snackbar, Alert } from "@mui/material";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";

const courses = ["BSIT", "BSBA", "BSED", "BEED", "BSN"];
const years = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const positions = ["Student", "President", "Vice President", "Secretary", "Treasurer"];

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

export default function Profile() {
  const [profile, setProfile] = useState({
    id: "",
    lastName: "",
    firstName: "",
    middleInitial: "",
    sex: "",
    age: "",
    birthdate: "",
    contact: "",
    scholarship: "",
    course: "",
    year: "",
    section: "",
    position: "",
    major: "",
    email: "",
    fatherName: "",
    fatherOccupation: "",
    motherName: "",
    motherOccupation: "",
    guardian: "",
    guardianContact: "",
    homeAddress: "",
    image: null
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleImage = (e) => {
    if (e.target.files && e.target.files[0]) {
      setProfile((prev) => ({ ...prev, image: URL.createObjectURL(e.target.files[0]) }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "profiles"), profile);
      setSnackbar({ open: true, message: "Profile saved to database!", severity: "success" });
    } catch (error) {
      setSnackbar({ open: true, message: "Error saving profile: " + error.message, severity: "error" });
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Profile Information</Typography>
      <Paper sx={{ p: 3, maxWidth: 900, mx: "auto" }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="ID Number" name="id" value={profile.id} onChange={handleChange} required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Scholarship" name="scholarship" value={profile.scholarship} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Last Name" name="lastName" value={profile.lastName} onChange={handleChange} required />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="First Name" name="firstName" value={profile.firstName} onChange={handleChange} required />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Middle Initial" name="middleInitial" value={profile.middleInitial} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField fullWidth label="Sex" name="sex" value={profile.sex} onChange={handleChange} select required>
                <MenuItem value="Male">Male</MenuItem>
                <MenuItem value="Female">Female</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField fullWidth label="Age" name="age" value={profile.age} onChange={handleChange} type="number" />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField fullWidth label="Birthdate" name="birthdate" value={profile.birthdate} onChange={handleChange} type="date" InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField fullWidth label="Contact Number" name="contact" value={profile.contact} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Course" name="course" value={profile.course} onChange={handleChange} select>
                {courses.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Year" name="year" value={profile.year} onChange={handleChange} select>
                {years.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Section" name="section" value={profile.section} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Position" name="position" value={profile.position} onChange={handleChange} select>
                {positions.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Major" name="major" value={profile.major} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Email Address" name="email" value={profile.email} onChange={handleChange} type="email" />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mt: 2 }}>Background Information</Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Father's Name" name="fatherName" value={profile.fatherName} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={2}>
              <TextField fullWidth label="Occupation" name="fatherOccupation" value={profile.fatherOccupation} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Mother's Name" name="motherName" value={profile.motherName} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={2}>
              <TextField fullWidth label="Occupation" name="motherOccupation" value={profile.motherOccupation} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Guardian" name="guardian" value={profile.guardian} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Guardian Contact" name="guardianContact" value={profile.guardianContact} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Home Address" name="homeAddress" value={profile.homeAddress} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button variant="contained" component="label" sx={{ mt: 2 }}>
                Upload Profile Image
                <input type="file" accept="image/*" hidden onChange={handleImage} />
              </Button>
              {profile.image && <Avatar src={profile.image} sx={{ width: 80, height: 80, mt: 2 }} />}
            </Grid>
            <Grid item xs={12}>
              <Button type="submit" variant="contained" color="primary" sx={{ mt: 2 }}>Save Profile</Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 