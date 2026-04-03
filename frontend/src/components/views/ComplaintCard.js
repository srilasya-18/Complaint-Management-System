import {
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Avatar,
  Chip,
  Box,
} from "@mui/material";

const BASE_URL = "http://localhost:5001";

const STATUS_COLORS = {
  pending:     "warning",
  in_progress: "info",
  resolved:    "success",
  rejected:    "error",
};

const PRIORITY_COLORS = {
  low:    "default",
  medium: "warning",
  high:   "error",
};

export const ComplaintCard = ({ complaint, viewHandler }) => {
  return (
    <Card sx={{ borderRadius: 2, boxShadow: 3, height: "100%" }}>
      <CardContent>

        {/* ── status + priority chips ───────────────────────────── */}
        <Box sx={{ display: "flex", gap: 1, mb: 1.5, flexWrap: "wrap" }}>
          {complaint.status && (
            <Chip
              label={complaint.status.replace("_", " ")}
              color={STATUS_COLORS[complaint.status] || "default"}
              size="small"
            />
          )}
          {complaint.priority && (
            <Chip
              label={`${complaint.priority} priority`}
              color={PRIORITY_COLORS[complaint.priority] || "default"}
              size="small"
              variant="outlined"
            />
          )}
        </Box>

        {/* ── author ───────────────────────────────────────────── */}
        <Grid container alignItems="center" spacing={2}>
          <Grid item>
            <Avatar>{complaint.complainee.name.charAt(0)}</Avatar>
          </Grid>
          <Grid item>
            <Typography variant="body1" color="text.primary">
              Author: <b>{complaint.complainee.name}</b>
            </Typography>
          </Grid>
        </Grid>

        {/* ── category + section ───────────────────────────────── */}
        <Grid container alignItems="center" style={{ marginTop: "15px" }}>
          <Grid item xs={12}>
            <Typography variant="h6" component="div">
              {complaint.complaint_category}
            </Typography>
            <Typography variant="subtitle1" color="textSecondary" style={{ marginTop: "4px" }}>
              Section — {complaint.section}
            </Typography>
            {complaint.department && (
              <Typography variant="subtitle2" color="textSecondary">
                Department — {complaint.department}
              </Typography>
            )}
            {complaint.createdAt && (
              <Typography variant="caption" color="textSecondary">
                {new Date(complaint.createdAt).toLocaleDateString()}
              </Typography>
            )}
          </Grid>
        </Grid>

        {/* ── photo ────────────────────────────────────────────── */}
        {complaint.photos && complaint.photos.length > 0 && (
          <Grid container style={{ marginTop: "12px" }}>
            <img
              src={
                complaint.photos[0].url.startsWith("http")
                  ? complaint.photos[0].url
                  : BASE_URL + complaint.photos[0].url
              }
              alt="complaint"
              style={{
                width: "100%",
                maxHeight: "200px",
                objectFit: "cover",
                borderRadius: "8px",
                cursor: "pointer"
              }}
              onClick={() => window.open(
                complaint.photos[0].url.startsWith("http")
                  ? complaint.photos[0].url
                  : BASE_URL + complaint.photos[0].url,
                "_blank"
              )}
              onError={(e) => { e.target.style.display = "none"; }}
            />
            {complaint.photos.length > 1 && (
              <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5 }}>
                +{complaint.photos.length - 1} more photo{complaint.photos.length - 1 > 1 ? "s" : ""}
              </Typography>
            )}
          </Grid>
        )}

        {/* ── view button ───────────────────────────────────────── */}
        <Button
          variant="outlined"
          color="primary"
          onClick={() => viewHandler(complaint._id)}
          style={{ marginTop: "12px" }}
          fullWidth
        >
          View More
        </Button>

      </CardContent>
    </Card>
  );
};