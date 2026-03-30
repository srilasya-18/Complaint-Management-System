import * as React from "react";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import CssBaseline from "@mui/material/CssBaseline";
import TextField from "@mui/material/TextField";
import Checkbox from "@mui/material/Checkbox";
import Link from "@mui/material/Link";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import Alert from "@mui/material/Alert";
import { useApolloClient } from "@apollo/client";
import { LOGIN } from "../../gql/queries/AUTHQUERIES";
import SnackBar from "../../snackbar/SnackBar";
import { AuthContext } from "../../App";
import { jwtDecode } from "jwt-decode";

const defaultTheme = createTheme();

// label shown in the ID field for each role
const IDENTITY_LABELS = {
  student:      "Roll Number",
  collegeAdmin: "Admin ID",
  superadmin:   "Super Admin ID",
};

// where each role lands after login
const ROLE_REDIRECTS = {
  student:      "/complaints/me",
  collegeAdmin: "/college/dashboard",
  superadmin:   "/admin/dashboard",
};

export default function LogInAuthPage() {
  const [role, setRole]               = React.useState("student");
  const [severity, setSnackSeverity]  = React.useState("");
  const [snackMessage, setSnackMessage] = React.useState("");

  const client      = useApolloClient();
  const authContext = React.useContext(AuthContext);
  const navigate    = useNavigate();

  const handleRole = (e) => setRole(e.target.value);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSnackSeverity("");

    const data = new FormData(event.currentTarget);
    const logInput = {
      identification_num: data.get("identification_num"),
      password:           data.get("password"),
      role,
    };

    try {
      const res = await client.query({
        query: LOGIN,
        variables: { logInput },
      });

      const parsed_token  = jwtDecode(res?.data?.login?.token);
      const tokenRole     = parsed_token.role;   // trust the token, not the radio

      const new_userstore = {
        userId: parsed_token.userId,
        role:   tokenRole,
        token:  res?.data?.login?.token,
        ...(parsed_token.collegeId && { collegeId: parsed_token.collegeId }),
      };

      setSnackMessage("Logged in successfully. Redirecting...");
      setSnackSeverity("success");

      setTimeout(() => {
        authContext.login(new_userstore);
        navigate(ROLE_REDIRECTS[tokenRole] ?? "/complaints/me");
      }, 2000);

    } catch (error) {
      setSnackMessage(
        error.message.includes("role")
          ? "Incorrect role selected for this account."
          : error.message
      );
      setSnackSeverity("error");
    }
  };

  return (
    <>
      {severity !== "" && <SnackBar message={snackMessage} severity={severity} />}

      <ThemeProvider theme={defaultTheme}>
        <Container component="main" maxWidth="xs">
          <CssBaseline />

          <Box sx={{ marginTop: 8, display: "flex", flexDirection: "column", alignItems: "center" }}>

            <Avatar sx={{ m: 1, bgcolor: "secondary.main" }}>
              <LockOutlinedIcon />
            </Avatar>

            <Typography component="h1" variant="h5">
              Sign in
            </Typography>

            <Box component="form" onSubmit={handleSubmit} noValidate={false} sx={{ mt: 1 }}>

              {/* Role selector — 3 roles, Dean removed */}
              <FormControl sx={{ mt: 1, mb: 1 }} fullWidth>
                <FormLabel>Role</FormLabel>
                <RadioGroup row value={role} onChange={handleRole}>
                  <FormControlLabel value="student"      control={<Radio />} label="Student" />
                  <FormControlLabel value="collegeAdmin" control={<Radio />} label="College Admin" />
                  <FormControlLabel value="superadmin"   control={<Radio />} label="Super Admin" />
                </RadioGroup>
              </FormControl>

              {/* role-aware hint */}
              {role === "collegeAdmin" && (
                <Alert severity="info" sx={{ mb: 1 }}>
                  College admin accounts are created by the Super Admin.
                </Alert>
              )}
              {role === "superadmin" && (
                <Alert severity="warning" sx={{ mb: 1 }}>
                  Super Admin access — platform-wide permissions.
                </Alert>
              )}

              {/* ID field — label changes with role */}
              <TextField
                margin="normal"
                required
                fullWidth
                id="identification_num"
                label={IDENTITY_LABELS[role]}
                name="identification_num"
                autoComplete="identification_num"
                autoFocus
              />

              {/* Password */}
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="current-password"
              />

              <FormControlLabel
                control={<Checkbox value="remember" color="primary" />}
                label="Remember me"
              />

              <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
                Sign In
              </Button>

              <Grid container>
                <Grid item xs>
                  <Link variant="body2">Forgot password?</Link>
                </Grid>
                <Grid item>
                  <Link variant="body2">
                    <RouterLink to="/signup" style={{ textDecoration: "none", color: "inherit" }}>
                      Don't have an account? Sign Up
                    </RouterLink>
                  </Link>
                </Grid>
              </Grid>

            </Box>
          </Box>
        </Container>
      </ThemeProvider>
    </>
  );
}
