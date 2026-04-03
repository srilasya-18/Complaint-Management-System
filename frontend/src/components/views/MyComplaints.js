import React, { useState, useEffect } from "react";
import {
  Grid, Container, Box, Button, Select, MenuItem,
  FormControl, InputLabel, Typography, Chip
} from "@mui/material";
import { ComplaintCard } from "./ComplaintCard";
import MyComplaintDialog from "./MyComplaintDialog";
import CommentDialog from "./CommentDialog";
import { LIST_COMPLAINTS_FEW } from "../../gql/queries/COMPLAINT";
import SnackBar from "../../snackbar/SnackBar";
import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";
import { AuthContext } from "../../App";
import { VIEW_COMPLAINT } from "../../gql/queries/COMPLAINT";
import { useApolloClient } from "@apollo/client";
import { LIST_COMMENTS } from "../../gql/queries/COMMENT";

const STATUS_COLORS = {
  pending:     "warning",
  in_progress: "info",
  resolved:    "success",
  rejected:    "error",
};

const MyComplaints = () => {
  const [dialogOpen, setDialogOpen]         = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [complaintsData, setComplaintsData] = useState([]);
  const [severity, setSnackSeverity]        = useState("");
  const [snackMessage, setSnackMessage]     = useState("");
  const [backDrop, setBackDrop]             = useState(false);
  const [loading, setLoading]               = useState(false);
  const [commentdialogOpen, setCommentDialog] = useState(false);
  const [commentsData, setCommentData]      = useState([]);
  const [complaintStatus, setComplaintStatus] = useState("");

  const authContext = React.useContext(AuthContext);
  const client      = useApolloClient();

  const showSnack = (sev, msg) => {
    setSnackSeverity(""); setSnackMessage(msg); setSnackSeverity(sev);
  };

  const handleAuthError = (error) => {
    if (error.message === "Unauthorized client in the scope") {
      showSnack("error", "Session Timed Out. Please LogIn again!");
      authContext.logout();
    } else {
      showSnack("error", `Error: ${error?.message}`);
    }
  };

  // ── fetch on mount ────────────────────────────────────────────────
  useEffect(() => {
    fetchComplaints(null);
  }, []);

  useEffect(() => {
    setBackDrop(loading);
  }, [loading]);

  const fetchComplaints = async (status) => {
    setLoading(true);
    try {
      const res = await client.query({
        query: LIST_COMPLAINTS_FEW,
        variables: {
          userId: authContext.userId,
          status: status || null,
        },
        fetchPolicy: "network-only",
      });
      setComplaintsData(res?.data?.listComplaints || []);
    } catch (error) {
      handleAuthError(error);
    }
    setLoading(false);
  };

  const handleFetchButtonClick = () => fetchComplaints(complaintStatus);

  // ── view complaint ────────────────────────────────────────────────
  const viewHandler = async (id) => {
    setLoading(true);
    try {
      const res = await client.query({
        query: VIEW_COMPLAINT,
        variables: { complaintId: id, userId: authContext.userId },
        fetchPolicy: "network-only",
      });
      setLoading(false);
      setSelectedComplaint({ data: res?.data?.viewComplaint });
      setDialogOpen(true);
    } catch (error) {
      setLoading(false);
      handleAuthError(error);
    }
  };

  // ── comments ──────────────────────────────────────────────────────
  const listCommentsHanlderFunction = async (id) => {
    setLoading(true);
    try {
      const res = await client.query({
        query: LIST_COMMENTS,
        variables: { complaintId: id },
        fetchPolicy: "network-only",
      });
      setLoading(false);
      setCommentDialog(true);
      setCommentData(res?.data?.listComments);
    } catch (error) {
      setLoading(false);
      handleAuthError(error);
    }
  };

  return (
    <React.Fragment>
      <Backdrop sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }} open={backDrop}>
        <CircularProgress color="inherit" />
      </Backdrop>

      {severity !== "" && <SnackBar message={snackMessage} severity={severity} />}

      {/* ── filter bar ──────────────────────────────────────────────── */}
      <Container style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "20vh" }}>
        <Box style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", gap: "10px" }}>
          <FormControl style={{ width: "25%" }}>
            <InputLabel id="complaintStatus-label">Filter by Status</InputLabel>
            <Select
              labelId="complaintStatus-label"
              value={complaintStatus}
              label="Filter by Status"
              onChange={(e) => setComplaintStatus(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="resolved">Resolved</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
            </Select>
          </FormControl>

          <Button variant="contained" onClick={handleFetchButtonClick} style={{ width: "10%" }}>
            Fetch
          </Button>
        </Box>

        {/* ── summary chips ──────────────────────────────────────── */}
        <Box sx={{ display: "flex", gap: 1, mt: 1.5, flexWrap: "wrap", justifyContent: "center" }}>
          {["pending", "in_progress", "resolved", "rejected"].map(s => {
            const count = complaintsData.filter(c => c.status === s).length;
            return count > 0 ? (
              <Chip
                key={s}
                label={`${s.replace("_", " ")}: ${count}`}
                color={STATUS_COLORS[s]}
                size="small"
                onClick={() => { setComplaintStatus(s); fetchComplaints(s); }}
              />
            ) : null;
          })}
        </Box>
      </Container>

      {/* ── complaints grid ──────────────────────────────────────────── */}
      {complaintsData.length === 0 ? (
        <Container style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
          <Typography variant="h4" gutterBottom>No complaints to show</Typography>
        </Container>
      ) : (
        <Container maxWidth="lg" style={{ marginTop: "40px" }}>
          <Grid container spacing={3}>
            {complaintsData.map((complaint) => (
              <Grid item key={complaint._id || complaint.id} xs={12} sm={6} md={4}>
                <ComplaintCard complaint={complaint} viewHandler={viewHandler} />
              </Grid>
            ))}
          </Grid>
        </Container>
      )}

      <MyComplaintDialog
        open={dialogOpen}
        handleClose={() => setDialogOpen(false)}
        complaint={selectedComplaint}
        listCommentHandler={listCommentsHanlderFunction}
      />

      <CommentDialog
        open={commentdialogOpen}
        comments={commentsData}
        closeHandler={() => { setCommentDialog(false); setCommentData([]); }}
      />
    </React.Fragment>
  );
};

export default MyComplaints;