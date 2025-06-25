import React from "react";
import { Box, Typography, Button } from "@mui/material";

export default function RightSidebar() {
  return (
    <Box
      sx={{
        width: 300,
        bgcolor: "#dfe6e9",
        p: 2,
        borderLeft: "1px solid #b2bec3",
        display: "flex",
        flexDirection: "column",
        gap: 2
      }}
    >
      <Typography variant="h6">Details</Typography>
      {/* Add dynamic details here based on the current page */}
      <Button variant="contained" color="primary" sx={{ mb: 1 }}>
        Add
      </Button>
      <Button variant="outlined" color="error">
        Exit
      </Button>
    </Box>
  );
} 