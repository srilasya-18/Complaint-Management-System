import React, { useState, useEffect } from "react";
import {
  Grid, Container, Typography, Box, Chip,
  Card, CardContent, CardActions, Button,
  Divider, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Tab, Tabs
} from "@mui/material";
import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";
import { useQuery, useApolloClient } from "@apollo/client";
import { AuthContext } from "../../App";
import SnackBar from "../../snackbar/SnackBar";
import BottomSnackBar from "../../snackbar/BottomSnackBar";
import {
  LIST_COLLEGES,
  GET_COLLEGE_STATS,
  CREATE_COLLEGE,
  CREATE_COLLEGE_ADMIN,
  TOGGLE_COLLEGE_STATUS
} from "../../gql/queries/COLLEGE";

// ── College card ──────────────────────────────────────────────────────
const CollegeCard = ({ college, stats, onAddAdmin, onToggle }) => (
  <Card sx={{ height: "100%", display: "flex", flexDirection: "column", borderRadius: 2, boxShadow: 3 }}>
    <CardContent sx={{ flexGrow: 1 }}>

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Typography variant="h6" fontWeight={700}>
          {college.code}
        </Typography>
        <Chip
          label={college.isActive ? "Active" : "Inactive"}
          color={college.isActive ? "success" : "error"}
          size="small"
        />
      </Box>

      <Typography variant="body1" gutterBottom>{college.name}</Typography>
      <Typography variant="body2" color="text.secondary">{college.emailDomain}</Typography>
      {college.location && (
        <Typography variant="body2" color="text.secondary">{college.location}</Typography>
      )}

      {/* complaint stats */}
      {stats && (
        <Box sx={{ mt: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Chip label={`Total: ${stats.totalComplaints}`}       size="small" />
          <Chip label={`Pending: ${stats.pendingCount}`}        size="small" color="warning" />
          <Chip label={`In Progress: ${stats.inProgressCount}`} size="small" color="info"    />
          <Chip label={`Resolved: ${stats.resolvedCount}`}      size="small" color="success" />
          <Chip label={`Rejected: ${stats.rejectedCount}`}      size="small" color="error"   />
        </Box>
      )}

    </CardContent>

    <Divider />

    <CardActions sx={{ justifyContent: "space-between", px: 2, py: 1 }}>
      <Button size="small" variant="outlined" onClick={() => onAddAdmin(college)}>
        Add Admin
      </Button>
      <Button
        size="small"
        variant="contained"
        color={college.isActive ? "error" : "success"}
        onClick={() => onToggle(college._id)}
      >
        {college.isActive ? "Deactivate" : "Activate"}
      </Button>
    </CardActions>
  </Card>
);

// ── main dashboard ────────────────────────────────────────────────────
const SuperAdminDashboard = () => {
  const [activeTab, setActiveTab]         = useState(0);
  const [collegesData, setCollegesData]   = useState([]);
  const [statsMap, setStatsMap]           = useState({});   // collegeId → stats
  const [backDrop, setBackDrop]           = useState(false);
  const [hardloading, setHardLoading]     = useState(false);
  const [severity, setSnackSeverity]      = useState("");
  const [snackMessage, setSnackMessage]   = useState("");
  const [bottomSeverity, setBottomSnackSeverity]   = useState("");
  const [bottomSnackMessage, setBottomSnackMessage] = useState("");

  // ── add college dialog state ────────────────────────────────────────
  const [collegeDialog, setCollegeDialog] = useState(false);
  const [collegeInput, setCollegeInput]   = useState({
    name: "", emailDomain: "", code: "", location: ""
  });

  // ── add admin dialog state ──────────────────────────────────────────
  const [adminDialog, setAdminDialog]     = useState(false);
  const [targetCollege, setTargetCollege] = useState(null);
  const [adminInput, setAdminInput]       = useState({
    name: "", identification_num: "", email: "", password: ""
  });

  const authContext = React.useContext(AuthContext);
  const client      = useApolloClient();

  // ── fetch colleges ──────────────────────────────────────────────────
  const { loading, error, data } = useQuery(LIST_COLLEGES, {
    fetchPolicy: "network-only"
  });

  // ── fetch stats ─────────────────────────────────────────────────────
  const { data: statsData } = useQuery(GET_COLLEGE_STATS, {
    fetchPolicy: "network-only"
  });

  // ── snack helpers (same pattern as your other components) ───────────
  const showSnack = (sev, msg) => {
    setSnackSeverity("");
    setSnackMessage(msg);
    setSnackSeverity(sev);
  };

  const showBottomSnack = (sev, msg) => {
    setBottomSnackSeverity("");
    setBottomSnackMessage(msg);
    setBottomSnackSeverity(sev);
  };

  const handleAuthError = (error) => {
    if (error.message === "Unauthorized client in the scope") {
      showSnack("error", "Session Timed Out. Please LogIn again!");
      authContext.logout();
    } else {
      showSnack("error", `Error: ${error?.message}`);
    }
  };

  useEffect(() => {
    if (data?.listColleges) setCollegesData(data.listColleges);
  }, [data]);

  useEffect(() => {
    if (statsData?.getCollegeStats) {
      // build a map: collegeId → stats for easy lookup in cards
      const map = {};
      statsData.getCollegeStats.forEach(s => {
        map[s.college._id] = s;
      });
      setStatsMap(map);
    }
  }, [statsData]);

  useEffect(() => {
    if (error) handleAuthError(error);
  }, [error]);

  useEffect(() => {
    setBackDrop(hardloading || loading);
  }, [hardloading, loading]);

  // ── overall totals across all colleges ──────────────────────────────
  const totals = Object.values(statsMap).reduce((acc, s) => {
    acc.total      += s.totalComplaints;
    acc.pending    += s.pendingCount;
    acc.inProgress += s.inProgressCount;
    acc.resolved   += s.resolvedCount;
    acc.rejected   += s.rejectedCount;
    return acc;
  }, { total: 0, pending: 0, inProgress: 0, resolved: 0, rejected: 0 });

  // ── add college ──────────────────────────────────────────────────────
  const handleCollegeInputChange = (field) => (e) => {
    setCollegeInput(prev => ({ ...prev, [field]: e.target.value }));
  };

  const submitAddCollege = async () => {
    if (!collegeInput.name || !collegeInput.emailDomain || !collegeInput.code) {
      return showBottomSnack("error", "Name, email domain and code are required.");
    }
    setHardLoading(true);
    try {
      await client.mutate({
        mutation: CREATE_COLLEGE,
        variables: { collegeInput },
        refetchQueries: ["LIST_COLLEGES", "GET_COLLEGE_STATS"],
      });
      showBottomSnack("success", `College "${collegeInput.name}" created successfully`);
      setCollegeDialog(false);
      setCollegeInput({ name: "", emailDomain: "", code: "", location: "" });
    } catch (error) {
      handleAuthError(error);
    } finally {
      setHardLoading(false);
    }
  };

  // ── add college admin ────────────────────────────────────────────────
  const openAdminDialog = (college) => {
    setTargetCollege(college);
    setAdminInput({ name: "", identification_num: "", email: "", password: "" });
    setAdminDialog(true);
  };

  const handleAdminInputChange = (field) => (e) => {
    setAdminInput(prev => ({ ...prev, [field]: e.target.value }));
  };

  const submitAddAdmin = async () => {
    if (!adminInput.name || !adminInput.email || !adminInput.password) {
      return showBottomSnack("error", "All fields are required.");
    }
    setHardLoading(true);
    try {
      await client.mutate({
        mutation: CREATE_COLLEGE_ADMIN,
        variables: {
          userInput: adminInput,
          collegeId: targetCollege._id
        },
      });
      showBottomSnack("success", `Admin created for ${targetCollege.name}`);
      setAdminDialog(false);
    } catch (error) {
      handleAuthError(error);
    } finally {
      setHardLoading(false);
    }
  };

  // ── toggle college active/inactive ──────────────────────────────────
  const handleToggleCollege = async (collegeId) => {
    setHardLoading(true);
    try {
      await client.mutate({
        mutation: TOGGLE_COLLEGE_STATUS,
        variables: { collegeId },
        refetchQueries: ["LIST_COLLEGES"],
      });
      showBottomSnack("success", "College status updated");
    } catch (error) {
      handleAuthError(error);
    } finally {
      setHardLoading(false);
    }
  };

  // ── filter colleges by tab ───────────────────────────────────────────
  const filteredColleges = activeTab === 0
    ? collegesData
    : activeTab === 1
      ? collegesData.filter(c => c.isActive)
      : collegesData.filter(c => !c.isActive);

  return (
    <React.Fragment>
      <Backdrop sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }} open={backDrop}>
        <CircularProgress color="inherit" />
      </Backdrop>

      {severity !== "" && <SnackBar message={snackMessage} severity={severity} />}
      {bottomSeverity !== "" && <BottomSnackBar message={bottomSnackMessage} severity={bottomSeverity} />}

      <Container maxWidth="lg" style={{ marginTop: "30px" }}>

        {/* header */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h5" fontWeight={700}>
            Super Admin Dashboard
          </Typography>
          <Button variant="contained" onClick={() => setCollegeDialog(true)}>
            + Add College
          </Button>
        </Box>

        {/* overall stats */}
        <Box sx={{ display: "flex", gap: 1.5, mb: 3, flexWrap: "wrap" }}>
          <Chip label={`Colleges: ${collegesData.length}`}     color="default"  />
          <Chip label={`Total Complaints: ${totals.total}`}    color="default"  />
          <Chip label={`Pending: ${totals.pending}`}           color="warning"  />
          <Chip label={`In Progress: ${totals.inProgress}`}    color="info"     />
          <Chip label={`Resolved: ${totals.resolved}`}         color="success"  />
          <Chip label={`Rejected: ${totals.rejected}`}         color="error"    />
        </Box>

        {/* tabs */}
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}
        >
          <Tab label="All Colleges" />
          <Tab label="Active" />
          <Tab label="Inactive" />
        </Tabs>

        {/* colleges grid */}
        {filteredColleges.length === 0 ? (
          <Container style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
            <Typography variant="h5">No colleges found</Typography>
          </Container>
        ) : (
          <Grid container spacing={3}>
            {filteredColleges.map(college => (
              <Grid item key={college._id} xs={12} sm={6} md={4}>
                <CollegeCard
                  college={college}
                  stats={statsMap[college._id]}
                  onAddAdmin={openAdminDialog}
                  onToggle={handleToggleCollege}
                />
              </Grid>
            ))}
          </Grid>
        )}

      </Container>

      {/* ── Add College Dialog ─────────────────────────────────────── */}
      <Dialog open={collegeDialog} onClose={() => setCollegeDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add New College</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField label="College Name" fullWidth
                value={collegeInput.name} onChange={handleCollegeInputChange("name")} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Email Domain (e.g. vnit.ac.in)" fullWidth
                value={collegeInput.emailDomain} onChange={handleCollegeInputChange("emailDomain")} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Short Code (e.g. VNIT)" fullWidth
                value={collegeInput.code} onChange={handleCollegeInputChange("code")} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Location (optional)" fullWidth
                value={collegeInput.location} onChange={handleCollegeInputChange("location")} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCollegeDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitAddCollege}>Create College</Button>
        </DialogActions>
      </Dialog>

      {/* ── Add Admin Dialog ───────────────────────────────────────── */}
      <Dialog open={adminDialog} onClose={() => setAdminDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add Admin for {targetCollege?.name}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField label="Full Name" fullWidth
                value={adminInput.name} onChange={handleAdminInputChange("name")} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="ID Number" fullWidth
                value={adminInput.identification_num} onChange={handleAdminInputChange("identification_num")} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Email" fullWidth type="email"
                value={adminInput.email} onChange={handleAdminInputChange("email")} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Password" fullWidth type="password"
                value={adminInput.password} onChange={handleAdminInputChange("password")} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdminDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitAddAdmin}>Create Admin</Button>
        </DialogActions>
      </Dialog>

    </React.Fragment>
  );
};

export default SuperAdminDashboard;