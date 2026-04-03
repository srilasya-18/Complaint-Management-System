import React, { useState, useEffect } from "react";
import {
  Grid, Container, Typography, Tabs, Tab, Box,
  Chip, MenuItem, TextField, Card, CardContent,
  CardActions, Button, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions
} from "@mui/material";
import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";
import { useQuery, useApolloClient } from "@apollo/client";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../App";
import SnackBar from "../../snackbar/SnackBar";
import BottomSnackBar from "../../snackbar/BottomSnackBar";
import MyComplaintDialog from "./MyComplaintDialog";
import CommentDialog from "./CommentDialog";
import { LIST_COLLEGE_COMPLAINTS, UPDATE_COMPLAINT_STATUS } from "../../gql/queries/COMPLAINT";
import { LIST_COMMENTS } from "../../gql/queries/COMMENT";
import { VIEW_COMPLAINT } from "../../gql/queries/COMPLAINT";

const STATUS_TABS = [
  { label: "All",         value: ""            },
  { label: "Pending",     value: "pending"     },
  { label: "In Progress", value: "in_progress" },
  { label: "Resolved",    value: "resolved"    },
  { label: "Rejected",    value: "rejected"    },
];

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

const NEXT_STATUSES = {
  pending:     ["in_progress", "rejected"],
  in_progress: ["resolved", "rejected"],
  resolved:    [],
  rejected:    [],
};

// ── complaint card ────────────────────────────────────────────────────
const AdminComplaintCard = ({ complaint, onView, onStatusChange, onComments }) => (
  <Card sx={{ height: "100%", display: "flex", flexDirection: "column", borderRadius: 2, boxShadow: 3 }}>
    <CardContent sx={{ flexGrow: 1 }}>
      <Box sx={{ display: "flex", gap: 1, mb: 1.5, flexWrap: "wrap" }}>
        <Chip
          label={complaint.status.replace("_", " ")}
          color={STATUS_COLORS[complaint.status] || "default"}
          size="small"
        />
        <Chip
          label={`${complaint.priority} priority`}
          color={PRIORITY_COLORS[complaint.priority] || "default"}
          size="small"
          variant="outlined"
        />
      </Box>

      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        {complaint.complaint_category}
      </Typography>

      <Typography variant="body2" color="text.secondary" gutterBottom>
        {complaint.department} — {complaint.section}
      </Typography>

      <Typography
        variant="body2"
        sx={{
          mt: 1,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden"
        }}
      >
        {complaint.complaint_details}
      </Typography>

      {/* photo thumbnails */}
{complaint.photos?.length > 0 && (
  <>
    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
      📎 {complaint.photos.length} photo{complaint.photos.length > 1 ? "s" : ""} attached
    </Typography>
    <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 0.5 }}>
      {complaint.photos.map((photo, index) => (
        <img
          key={index}
          src={
            photo.url.startsWith("http")
              ? photo.url
              : `http://localhost:5001${photo.url}`
          }
          alt={`photo-${index + 1}`}
          style={{
            width: "60px",
            height: "60px",
            objectFit: "cover",
            borderRadius: "6px",
            border: "1px solid #ddd",
            cursor: "pointer"
          }}
          onClick={() => window.open(
            photo.url.startsWith("http")
              ? photo.url
              : `http://localhost:5001${photo.url}`,
            "_blank"
          )}
          onError={(e) => { e.target.style.display = "none"; }}
        />
      ))}
    </Box>
  </>
)}

      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
        By: {complaint.complainee?.name} • {new Date(complaint.createdAt).toLocaleDateString()}
      </Typography>
    </CardContent>

    <Divider />

    <CardActions sx={{ justifyContent: "space-between", px: 2, py: 1 }}>
      <Button size="small" onClick={() => onView(complaint._id)}>View</Button>
      <Button size="small" onClick={() => onComments(complaint._id)}>Comments</Button>
      {!["resolved", "rejected"].includes(complaint.status) && (
        <Button size="small" variant="contained" color="primary" onClick={() => onStatusChange(complaint)}>
          Update Status
        </Button>
      )}
    </CardActions>
  </Card>
);

// ── standalone status dialog (no dependency on ResolveDialog) ─────────
const StatusUpdateDialog = ({ open, complaint, onClose, onSubmit, note, onNoteChange }) => {
  const [selectedStatus, setSelectedStatus] = useState("");

  useEffect(() => {
    // reset selection every time a new complaint is opened
    setSelectedStatus("");
  }, [complaint]);

  const available = NEXT_STATUSES[complaint?.status] || [];

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Update Complaint Status</DialogTitle>
      <DialogContent>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Current status: <strong>{complaint?.status?.replace("_", " ")}</strong>
        </Typography>

        {available.length > 0 ? (
          <>
            <TextField
              select
              fullWidth
              label="Change status to"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              sx={{ mb: 2, mt: 1 }}
            >
              {available.map(s => (
                <MenuItem key={s} value={s}>
                  {s.replace("_", " ").toUpperCase()}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Note (optional)"
              value={note}
              onChange={onNoteChange}
              placeholder="Add a note about this status change..."
            />
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            This complaint is already <strong>{complaint?.status}</strong> and cannot be updated further.
          </Typography>
        )}

      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        {available.length > 0 && (
          <Button
            variant="contained"
            onClick={() => onSubmit(selectedStatus)}
            disabled={!selectedStatus}
          >
            Update Status
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

// ── main dashboard ────────────────────────────────────────────────────
const CollegeAdminDashboard = () => {
  const [activeTab, setActiveTab]                   = useState(0);
  const [complaintsData, setComplaintsData]         = useState([]);
  const [selectedComplaint, setSelectedComplaint]   = useState(null);
  const [dialogOpen, setDialogOpen]                 = useState(false);
  const [commentdialogOpen, setCommentDialog]       = useState(false);
  const [commentsData, setCommentData]              = useState([]);
  const [statusDialog, setStatusDialog]             = useState(false);
  const [statusTarget, setStatusTarget]             = useState(null);
  const [statusNote, setStatusNote]                 = useState("");
  const [backDrop, setBackDrop]                     = useState(false);
  const [hardloading, setHardLoading]               = useState(false);
  const [severity, setSnackSeverity]                = useState("");
  const [snackMessage, setSnackMessage]             = useState("");
  const [bottomSeverity, setBottomSnackSeverity]    = useState("");
  const [bottomSnackMessage, setBottomSnackMessage] = useState("");

  const authContext = React.useContext(AuthContext);
  const client      = useApolloClient();
  const navigate    = useNavigate();

  const currentStatus = STATUS_TABS[activeTab].value;

  const { loading, error, data } = useQuery(LIST_COLLEGE_COMPLAINTS, {
    variables: { status: currentStatus || null },
    fetchPolicy: "network-only",
  });

  const showSnack = (sev, msg) => {
    setSnackSeverity(""); setSnackMessage(msg); setSnackSeverity(sev);
  };

  const showBottomSnack = (sev, msg) => {
    setBottomSnackSeverity(""); setBottomSnackMessage(msg); setBottomSnackSeverity(sev);
  };

  const handleAuthError = (err) => {
    if (err.message === "Unauthorized client in the scope") {
      showSnack("error", "Session Timed Out. Please LogIn again!");
      authContext.logout();
    } else {
      showSnack("error", `Error: ${err?.message}`);
    }
  };

  useEffect(() => {
    if (data?.listCollegeComplaints) setComplaintsData(data.listCollegeComplaints);
  }, [data]);

  useEffect(() => {
    if (error) handleAuthError(error);
  }, [error]);

  useEffect(() => {
    setBackDrop(hardloading || loading);
  }, [hardloading, loading]);

  const viewHandler = async (id) => {
    setHardLoading(true);
    try {
      const res = await client.query({
        query: VIEW_COMPLAINT,
        variables: { complaintId: id, userId: authContext.userId },
        fetchPolicy: "network-only",
      });
      setHardLoading(false);
      setSelectedComplaint({ data: res?.data?.viewComplaint });
      setDialogOpen(true);
    } catch (err) {
      setHardLoading(false);
      handleAuthError(err);
    }
  };

  const listCommentsHandler = async (id) => {
    setHardLoading(true);
    try {
      const res = await client.query({
        query: LIST_COMMENTS,
        variables: { complaintId: id },
        fetchPolicy: "network-only",
      });
      setHardLoading(false);
      setCommentDialog(true);
      setCommentData(res?.data?.listComments);
    } catch (err) {
      setHardLoading(false);
      handleAuthError(err);
    }
  };

  const openStatusDialog = (complaint) => {
    setStatusTarget(complaint);
    setStatusNote("");
    setStatusDialog(true);
  };

  const closeStatusDialog = () => {
    setStatusTarget(null);
    setStatusDialog(false);
    setStatusNote("");
  };

  const submitStatusChange = async (newStatus) => {
    if (!newStatus) return showBottomSnack("error", "Please select a status.");
    try {
      await client.mutate({
        mutation: UPDATE_COMPLAINT_STATUS,
        variables: {
          statusInput: {
            complaintId: statusTarget._id,
            status: newStatus,
            note: statusNote,
          },
        },
        refetchQueries: ["LIST_COLLEGE_COMPLAINTS"],
      });
      showBottomSnack("success", `Complaint marked as ${newStatus.replace("_", " ")}`);
      setTimeout(() => closeStatusDialog(), 2000);
    } catch (err) {
      handleAuthError(err);
    }
  };

  const counts = complaintsData.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <React.Fragment>
      <Backdrop sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }} open={backDrop}>
        <CircularProgress color="inherit" />
      </Backdrop>

      {severity !== "" && <SnackBar message={snackMessage} severity={severity} />}
      {bottomSeverity !== "" && <BottomSnackBar message={bottomSnackMessage} severity={bottomSeverity} />}

      <Container maxWidth="lg" style={{ marginTop: "30px" }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Admin Dashboard
        </Typography>

        <Box sx={{ display: "flex", gap: 1.5, mb: 3, flexWrap: "wrap" }}>
          <Chip label={`Total: ${complaintsData.length}`}           color="default"  />
          <Chip label={`Pending: ${counts.pending || 0}`}           color="warning"  />
          <Chip label={`In Progress: ${counts.in_progress || 0}`}   color="info"     />
          <Chip label={`Resolved: ${counts.resolved || 0}`}         color="success"  />
          <Chip label={`Rejected: ${counts.rejected || 0}`}         color="error"    />
        </Box>

        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}
          variant="scrollable"
          scrollButtons="auto"
        >
          {STATUS_TABS.map(tab => (
            <Tab key={tab.value} label={tab.label} />
          ))}
        </Tabs>

        {complaintsData.length === 0 ? (
          <Container style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
            <Typography variant="h5">No {STATUS_TABS[activeTab].label} Complaints</Typography>
          </Container>
        ) : (
          <Grid container spacing={3}>
            {complaintsData.map(complaint => (
              <Grid item key={complaint._id} xs={12} sm={6} md={4}>
                <AdminComplaintCard
                  complaint={complaint}
                  onView={viewHandler}
                  onStatusChange={openStatusDialog}
                  onComments={listCommentsHandler}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </Container>

      <StatusUpdateDialog
        open={statusDialog}
        complaint={statusTarget}
        onClose={closeStatusDialog}
        onSubmit={submitStatusChange}
        note={statusNote}
        onNoteChange={(e) => setStatusNote(e.target.value)}
      />

      <MyComplaintDialog
        open={dialogOpen}
        handleClose={() => setDialogOpen(false)}
        complaint={selectedComplaint}
        listCommentHandler={listCommentsHandler}
      />

      <CommentDialog
        open={commentdialogOpen}
        comments={commentsData}
        closeHandler={() => { setCommentDialog(false); setCommentData([]); }}
      />
    </React.Fragment>
  );
};

export default CollegeAdminDashboard;