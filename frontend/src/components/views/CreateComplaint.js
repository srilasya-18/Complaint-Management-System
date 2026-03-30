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
  Avatar,
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

const CATEGORIES = [
  "Infrastructure",
  "Academic",
  "Hostel",
  "Canteen",
  "Transport",
  "Other",
];
const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];
const MAX_PHOTOS = 3;

// ── FIX 1: Use port 5000, not 5001 ───────────────────────────────────
const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5001";

const CreateComplaint = (props) => {
  const [open, setOpen] = React.useState(props.openDialog);
  const navigate = useNavigate();
  const client = useApolloClient();
  const authContext = useContext(AuthContext);

  const [severity, setSnackSeverity] = React.useState("");
  const [snackMessage, setSnackMessage] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [saving, setSaving] = React.useState(false);

  const [complaintInput, setComplaintInput] = React.useState({
    complaint_category: "",
    section: "",
    department: "",
    complaint_details: "",
    priority: "medium",
  });

  const [photos, setPhotos] = React.useState([]);

  const handleClose = () => {
    photos.forEach((p) => URL.revokeObjectURL(p.preview));
    navigate(-1);
    setOpen(false);
  };

  const handleInputChange = (fieldName) => (event) => {
    setComplaintInput({ ...complaintInput, [fieldName]: event.target.value });
  };

  const handlePhotoChange = async (event) => {
    const selected = Array.from(event.target.files);
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) return;
    const toProcess = selected.slice(0, remaining);

    setUploading(true);
    setUploadProgress(0);

    try {
      const compressed = await Promise.all(
        toProcess.map(async (file, i) => {
          const compressedFile = await imageCompression(file, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1200,
            useWebWorker: true,
          });
          setUploadProgress(Math.round(((i + 1) / toProcess.length) * 100));
          return {
            file: compressedFile,
            preview: URL.createObjectURL(compressedFile),
            sizeKB: Math.round(compressedFile.size / 1024),
          };
        })
      );
      setPhotos((prev) => [...prev, ...compressed]);
    } catch (err) {
      showSnack("error", "Failed to process images. Please try again.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      event.target.value = "";
    }
  };

  const handleRemovePhoto = (index) => {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const showSnack = (sev, msg) => {
    setSnackSeverity("");
    setSnackMessage(msg);
    setSnackSeverity(sev);
  };

  const handleSave = async () => {
    if (!complaintInput.complaint_category)
      return showSnack("error", "Please select a category.");
    if (!complaintInput.complaint_details)
      return showSnack("error", "Please enter complaint details.");

    setSaving(true);

    try {
      // ── Step 1: Upload photos to REST endpoint ──────────────────────
      let uploadedPhotos = [];
      if (photos.length > 0) {
        const formData = new FormData();
        photos.forEach((p) => formData.append("photos", p.file));

        // ── FIX 1: Corrected port from 5001 → 5000 ─────────────────
        const uploadRes = await fetch(`${API_BASE}/upload/complaint`, {
          method: "POST",
          credentials: "include", // sends auth cookie
          // ⚠️ Do NOT set Content-Type — browser adds boundary automatically
          body: formData,
        });

        // ── FIX 2: Better error message from server ─────────────────
        if (!uploadRes.ok) {
          let errMsg = "Photo upload failed";
          try {
            const errData = await uploadRes.json();
            errMsg = errData.message || errMsg;
          } catch (_) {}
          throw new Error(errMsg);
        }

        const uploadData = await uploadRes.json();
        console.log("UPLOAD RESPONSE:", uploadData);

        // ── FIX 3: Guard against missing photos in response ─────────
        if (!uploadData.photos || uploadData.photos.length === 0) {
          throw new Error("Photo upload failed: no photos returned from server");
        }

        uploadedPhotos = uploadData.photos;
      }

      // ── Step 2: Create complaint via GraphQL with photo URLs ────────
      const res = await client.mutate({
        mutation: CREATE_COMPLAINT,
        variables: {
          complaintInput: {
            ...complaintInput,
            // ── FIX 4: Map to PhotoInput shape expected by GraphQL schema
            photos: uploadedPhotos.map((p) => ({
              url: p.url,
              filename: p.filename || null,
              originalName: p.originalName || null,
              sizeKB: p.sizeKB || null,
            })),
          },
        },
        refetchQueries: ["LIST_COMPLAINTS_FEW"],
      });

      showSnack(
        "success",
        `Complaint saved successfully with id ${res?.data?.createComplaint?._id}`
      );
      setTimeout(() => handleClose(), 2000);
    } catch (error) {
      if (
        error.message === "Unauthorized client in the scope" ||
        error.message?.includes("Unauthorized")
      ) {
        showSnack("error", "Session Timed Out. Please LogIn again!");
        authContext.logout();
      } else {
        showSnack("error", `Couldn't save the complaint: ${error?.message}`);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <React.Fragment>
      {severity !== "" && (
        <BottomSnackBar message={snackMessage} severity={severity} />
      )}

      <Dialog
        fullScreen
        open={open}
        onClose={handleClose}
        TransitionComponent={Transition}
      >
        <AppBar
          sx={{
            position: "relative",
            backgroundColor: "#272626",
            padding: "6px",
          }}
        >
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              onClick={handleClose}
              aria-label="close"
            >
              <KeyboardBackspaceIcon />
            </IconButton>
            <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
              Create Complaint
            </Typography>
            <Button
              autoFocus
              color="inherit"
              variant="outlined"
              onClick={handleSave}
              disabled={saving || uploading}
            >
              {saving ? "SAVING..." : "SAVE"}
            </Button>
          </Toolbar>
        </AppBar>

        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Category"
                fullWidth
                select
                value={complaintInput.complaint_category}
                onChange={handleInputChange("complaint_category")}
              >
                {CATEGORIES.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Priority"
                fullWidth
                select
                value={complaintInput.priority}
                onChange={handleInputChange("priority")}
              >
                {PRIORITIES.map((p) => (
                  <MenuItem key={p.value} value={p.value}>
                    {p.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Section"
                fullWidth
                value={complaintInput.section}
                onChange={handleInputChange("section")}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Department"
                fullWidth
                value={complaintInput.department}
                onChange={handleInputChange("department")}
              />
            </Grid>

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

            <Grid item xs={12}>
              <Typography
                variant="subtitle2"
                sx={{ mb: 1, color: "text.secondary" }}
              >
                Attach Photos (max {MAX_PHOTOS}, compressed automatically)
              </Typography>

              {photos.length < MAX_PHOTOS && (
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<PhotoCameraIcon />}
                  disabled={uploading || saving}
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

              {uploading && (
                <Box sx={{ mt: 1, mb: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={uploadProgress}
                  />
                  <Typography variant="caption" color="text.secondary">
                    Compressing images...
                  </Typography>
                </Box>
              )}

              {photos.length > 0 && (
                <Box
                  sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}
                >
                  {photos.map((photo, index) => (
                    <Box key={index} sx={{ position: "relative" }}>
                      <Avatar
                        src={photo.preview}
                        variant="rounded"
                        sx={{ width: 90, height: 90 }}
                      />
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
                          color: "#fff",
                        }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => handleRemovePhoto(index)}
                        disabled={saving}
                        sx={{
                          position: "absolute",
                          top: -8,
                          right: -8,
                          backgroundColor: "background.paper",
                          padding: "2px",
                          "&:hover": { backgroundColor: "error.light" },
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