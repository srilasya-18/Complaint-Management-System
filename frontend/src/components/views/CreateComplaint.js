import React, { useContext } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import KeyboardBackspaceIcon from "@mui/icons-material/KeyboardBackspace";
import Slide from "@mui/material/Slide";
import { useNavigate } from "react-router-dom";
import {
  Grid,
  TextField,
  DialogContent,
  MenuItem,
  Box,
  Chip,
  LinearProgress,
  Avatar
} from "@mui/material";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import CancelIcon from "@mui/icons-material/Cancel";
import imageCompression from "browser-image-compression";
import { useApolloClient } from "@apollo/client";
import { CREATE_COMPLAINT } from "../../gql/queries/COMPLAINT";
import BottomSnackBar from "../../snackbar/BottomSnackBar";
import { AuthContext } from "../../App";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

// ── constants ────────────────────────────────────────────────────────────
const CATEGORIES = ["Infrastructure", "Academic", "Hostel", "Canteen", "Transport", "Other"];
const PRIORITIES = [
  { value: "low",    label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high",   label: "High" },
];
const MAX_PHOTOS = 3;

const CreateComplaint = (props) => {
  const [open, setOpen] = React.useState(props.openDialog);
  const navigate = useNavigate();
  const client = useApolloClient();
  const authContext = useContext(AuthContext);

  const [severity, setSnackSeverity] = React.useState("");
  const [snackMessage, setSnackMessage] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);

  const [complaintInput, setComplaintInput] = React.useState({
    complaint_category: "",
    section: "",
    department: "",
    complaint_details: "",
    priority: "medium",
  });

  // ── photo state ──────────────────────────────────────────────────────
  // each entry: { file: File, preview: string (object URL), sizeKB: number }
  const [photos, setPhotos] = React.useState([]);

  const handleClose = () => {
    // clean up object URLs to avoid memory leaks
    photos.forEach(p => URL.revokeObjectURL(p.preview));
    navigate(-1);
    setOpen(false);
  };

  const handleInputChange = (fieldName) => (event) => {
    setComplaintInput({ ...complaintInput, [fieldName]: event.target.value });
  };

  // ── photo selection + browser-side compression ───────────────────────
  const handlePhotoChange = async (event) => {
    const selected = Array.from(event.target.files);

    // enforce max 3 photos total
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) return;
    const toProcess = selected.slice(0, remaining);

    setUploading(true);
    setUploadProgress(0);

    try {
      const compressed = await Promise.all(
        toProcess.map(async (file, i) => {
          const compressedFile = await imageCompression(file, {
            maxSizeMB: 1,           // compress to under 1MB before sending
            maxWidthOrHeight: 1200,
            useWebWorker: true,
          });

          // progress simulation (browser-image-compression doesn't emit progress)
          setUploadProgress(Math.round(((i + 1) / toProcess.length) * 100));

          return {
            file: compressedFile,
            preview: URL.createObjectURL(compressedFile),
            sizeKB: Math.round(compressedFile.size / 1024),
          };
        })
      );

      setPhotos(prev => [...prev, ...compressed]);
    } catch (err) {
      showSnack("error", "Failed to process images. Please try again.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      // reset input so same file can be re-selected if removed
      event.target.value = "";
    }
  };

  const handleRemovePhoto = (index) => {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  // ── snack helper ─────────────────────────────────────────────────────
  const showSnack = (sev, msg) => {
    setSnackSeverity("");
    setSnackMessage(msg);
    setSnackSeverity(sev);
  };

  // ── submit ───────────────────────────────────────────────────────────
  const handleSave = async () => {
    // basic validation
    if (!complaintInput.complaint_category) return showSnack("error", "Please select a category.");
    if (!complaintInput.complaint_details)  return showSnack("error", "Please enter complaint details.");

    try {
      // step 1: if photos selected, upload them via REST first
      // GraphQL handles text; file upload goes through the /upload endpoint
      let uploadedPhotos = [];
      if (photos.length > 0) {
        const formData = new FormData();
        photos.forEach(p => formData.append("photos", p.file));

        const uploadRes = await fetch(
          `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/upload/complaint`,
          {
            method: "POST",
            credentials: "include",    // sends cookie (secretToken)
            body: formData,
          }
        );

        if (!uploadRes.ok) throw new Error("Photo upload failed");
        const uploadData = await uploadRes.json();
        uploadedPhotos = uploadData.photos;  // [{ url, filename, sizeKB }]
      }

      // step 2: create complaint via GraphQL with photo URLs attached
      const res = await client.mutate({
        mutation: CREATE_COMPLAINT,
        variables: {
          complaintInput: {
            ...complaintInput,
            photos: uploadedPhotos,
          },
        },
        refetchQueries: ["LIST_COMPLAINTS_FEW"],
      });

      showSnack("success", `Complaint saved successfully with id ${res?.data?.createComplaint?._id}`);
      setTimeout(() => handleClose(), 2000);

    } catch (error) {
      if (error.message === "Unauthorized client in the scope") {
        showSnack("error", "Session Timed Out. Please LogIn again!");
        authContext.logout();
      } else {
        showSnack("error", `Couldn't save the complaint: ${error?.message}`);
      }
    }
  };

  return (
    <React.Fragment>
      {severity !== "" && (
        <BottomSnackBar message={snackMessage} severity={severity} />
      )}

      <Dialog fullScreen open={open} onClose={handleClose} TransitionComponent={Transition}>
        <AppBar sx={{ position: "relative", backgroundColor: "#272626", padding: "6px" }}>
          <Toolbar>
            <IconButton edge="start" color="inherit" onClick={handleClose} aria-label="close">
              <KeyboardBackspaceIcon />
            </IconButton>
            <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
              Create Complaint
            </Typography>
            <Button autoFocus color="inherit" variant="outlined" onClick={handleSave}>
              save
            </Button>
          </Toolbar>
        </AppBar>

        <DialogContent>
          <Grid container spacing={2}>

            {/* Category — now a dropdown */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Category"
                fullWidth
                select
                value={complaintInput.complaint_category}
                onChange={handleInputChange("complaint_category")}
              >
                {CATEGORIES.map(cat => (
                  <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Priority */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Priority"
                fullWidth
                select
                value={complaintInput.priority}
                onChange={handleInputChange("priority")}
              >
                {PRIORITIES.map(p => (
                  <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Section — unchanged */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Section"
                fullWidth
                value={complaintInput.section}
                onChange={handleInputChange("section")}
              />
            </Grid>

            {/* Department — unchanged */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Department"
                fullWidth
                value={complaintInput.department}
                onChange={handleInputChange("department")}
              />
            </Grid>

            {/* Complaint Details — unchanged */}
            <Grid item xs={12}>
              <TextField
                label="Complaint Details"
                fullWidth
                multiline
                rows={5}
                value={complaintInput.complaint_details}
                onChange={handleInputChange("complaint_details")}
              />
            </Grid>

            {/* Photo upload */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1, color: "text.secondary" }}>
                Attach Photos (max {MAX_PHOTOS}, compressed automatically)
              </Typography>

              {/* upload button — hidden when 3 photos already selected */}
              {photos.length < MAX_PHOTOS && (
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<PhotoCameraIcon />}
                  disabled={uploading}
                  sx={{ mb: 1 }}
                >
                  {uploading ? "Compressing..." : "Add Photos"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    hidden
                    onChange={handlePhotoChange}
                  />
                </Button>
              )}

              {/* compression progress bar */}
              {uploading && (
                <Box sx={{ mt: 1, mb: 1 }}>
                  <LinearProgress variant="determinate" value={uploadProgress} />
                  <Typography variant="caption" color="text.secondary">
                    Compressing images...
                  </Typography>
                </Box>
              )}

              {/* photo previews */}
              {photos.length > 0 && (
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}>
                  {photos.map((photo, index) => (
                    <Box key={index} sx={{ position: "relative" }}>
                      <Avatar
                        src={photo.preview}
                        variant="rounded"
                        sx={{ width: 90, height: 90 }}
                      />
                      {/* size badge */}
                      <Chip
                        label={`${photo.sizeKB}KB`}
                        size="small"
                        sx={{
                          position: "absolute",
                          bottom: 2,
                          left: 2,
                          fontSize: "10px",
                          height: "18px",
                          backgroundColor: "rgba(0,0,0,0.6)",
                          color: "#fff"
                        }}
                      />
                      {/* remove button */}
                      <IconButton
                        size="small"
                        onClick={() => handleRemovePhoto(index)}
                        sx={{
                          position: "absolute",
                          top: -8,
                          right: -8,
                          backgroundColor: "background.paper",
                          padding: "2px",
                          "&:hover": { backgroundColor: "error.light" }
                        }}
                      >
                        <CancelIcon fontSize="small" color="error" />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              )}
            </Grid>

          </Grid>
        </DialogContent>
      </Dialog>
    </React.Fragment>
  );
};

export default CreateComplaint;