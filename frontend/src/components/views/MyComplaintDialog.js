import React from "react";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import CommentIcon from "@mui/icons-material/Comment";
import {
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  Grid,
  Box,
  Chip,
  Divider,
} from "@mui/material";
import TimeComponent from "./TimeComponent";

const STATUS_COLORS = {
  pending:     "warning",
  in_progress: "info",
  resolved:    "success",
  rejected:    "error",
  Active:      "warning",
  Resolved:    "success",
};

const MyComplaintDialog = ({ open, handleClose, complaint, listCommentHandler }) => {
  const c = complaint?.data?.complaint;
  const photos = c?.photos || [];

  return (
    <React.Fragment>
      <Dialog
        open={open}
        onClose={handleClose}
        PaperProps={{ style: { minWidth: "400px", maxWidth: "600px" } }}
      >
        <DialogTitle
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginRight: "20px",
          }}
        >
          {c?.complaint_category}
          <IconButton
            edge="start"
            color="inherit"
            onClick={handleClose}
            aria-label="close"
            style={{ position: "absolute", right: 0, top: 0 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>

          {/* status chip */}
          {c?.status && (
            <Box sx={{ mb: 1.5 }}>
              <Chip
                label={c.status.replace("_", " ")}
                color={STATUS_COLORS[c.status] || "default"}
                size="small"
              />
            </Box>
          )}

          {/* details */}
          <Typography variant="subtitle1" color="textSecondary">
            Created At — <TimeComponent timeString={c?.createdAt} />
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            Section — {c?.section}
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            Department — {c?.department}
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            Views — {c?.views}
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            Upvotes — {c?.upvotes}
          </Typography>

          <Typography variant="body1" style={{ marginTop: "12px" }}>
            {c?.complaint_details}
          </Typography>

          {/* ── photos ─────────────────────────────────────────────── */}
          {photos.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>
                📎 Attached Photos ({photos.length})
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {photos.map((photo, index) => (
                  <Box
                    key={index}
                    sx={{ position: "relative", cursor: "pointer" }}
                    onClick={() => window.open(
                      photo.url.startsWith("http")
                        ? photo.url
                        : `http://localhost:5001${photo.url}`,
                      "_blank"
                    )}
                  >
                    <img
                      src={
                        photo.url.startsWith("http")
                          ? photo.url
                          : `http://localhost:5001${photo.url}`
                      }
                      alt={photo.originalName || `photo-${index + 1}`}
                      style={{
                        width: "120px",
                        height: "120px",
                        objectFit: "cover",
                        borderRadius: "8px",
                        border: "1px solid #ddd",
                      }}
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                    {/* size badge */}
                    {photo.sizeKB && (
                      <Box
                        sx={{
                          position: "absolute",
                          bottom: 4,
                          left: 4,
                          backgroundColor: "rgba(0,0,0,0.6)",
                          color: "#fff",
                          fontSize: "10px",
                          padding: "1px 4px",
                          borderRadius: "4px",
                        }}
                      >
                        {photo.sizeKB}KB
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>
            </>
          )}

          <Divider sx={{ my: 2 }} />

          {/* comments button */}
          <Grid container spacing={1} justifyContent="center" alignItems="center">
            <Grid item>
              <IconButton
                color="primary"
                onClick={() => listCommentHandler(c?._id)}
              >
                <CommentIcon />
              </IconButton>
            </Grid>
          </Grid>

        </DialogContent>
      </Dialog>
    </React.Fragment>
  );
};

export default MyComplaintDialog;