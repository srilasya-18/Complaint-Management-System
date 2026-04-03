import * as React from "react";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import CssBaseline from "@mui/material/CssBaseline";
import TextField from "@mui/material/TextField";
import Link from "@mui/material/Link";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { useApolloClient } from "@apollo/client";
import { SIGNUP } from "../../gql/queries/AUTHQUERIES";
import SnackBar from "../../snackbar/SnackBar";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import Alert from "@mui/material/Alert";

const defaultTheme = createTheme();

export default function SignUpAuthPage() {
  const client   = useApolloClient();
  const navigate = useNavigate();

  const [severity, setSnackSeverity]    = React.useState("");
  const [snackMessage, setSnackMessage] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [emailDomain, setEmailDomain]   = React.useState("");

  const handleShowPassword = () => setShowPassword(!showPassword);

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmailDomain(val.includes("@") ? val.split("@")[1] : "");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSnackSeverity("");

    const data   = new FormData(event.currentTarget);
    const email  = data.get("email");
    const domain = email.split("@")[1];

    // block personal emails
    if (!domain || ["gmail.com","yahoo.com","outlook.com","hotmail.com"].includes(domain)) {
      setSnackMessage("Please use your college institutional email address.");
      setSnackSeverity("error");
      return;
    }

    const userInput = {
      name:               data.get("name"),
      identification_num: data.get("identification_num"),
      email,
      password:           data.get("password"),
      role:               "student",   // always student on self-signup
    };

    try {
      await client.mutate({
        mutation: SIGNUP,
        variables: { userInput },
      });
      setSnackMessage("Account created successfully. Redirecting to login...");
      setSnackSeverity("success");
      setTimeout(() => navigate("/login"), 3000);
    } catch (error) {
      setSnackMessage(
        error.message.includes("COLLEGE_NOT_FOUND") || error.message.includes("college")
          ? `Your college (${domain}) is not registered on this platform yet.`
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

            <Typography component="h1" variant="h5">Sign Up</Typography>

            <Alert severity="info" sx={{ mt: 2, width: "100%" }}>
              Use your college email to auto-detect your institution.
            </Alert>

            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>

              <TextField margin="normal" required fullWidth
                id="name" label="Full Name" name="name"
                autoComplete="name" autoFocus
              />

              <TextField margin="normal" required fullWidth
                id="identification_num" label="Roll Number"
                name="identification_num"
                inputProps={{ maxLength: 15, minLength: 5 }}
              />

              <TextField margin="normal" required fullWidth
                id="email" label="College Email Address"
                name="email" autoComplete="email"
                onChange={handleEmailChange}
                helperText={
                  emailDomain
                    ? `✅ College domain detected: ${emailDomain}`
                    : "Use your official college email (e.g. 23b81a0xxx@cvr.ac.in)"
                }
              />

              <TextField margin="normal" required fullWidth
                name="password" label="Password"
                type={showPassword ? "text" : "password"}
                id="password"
                inputProps={{ maxLength: 20, minLength: 8 }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={handleShowPassword} edge="end">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Alert severity="success" sx={{ mt: 1 }}>
                Signing up as <strong>Student</strong>. College admins are assigned by the platform administrator.
              </Alert>

              <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
                Sign Up
              </Button>

              <Grid container>
                <Grid item>
                  <Link variant="body2">
                    <RouterLink to="/login" style={{ textDecoration: "none", color: "inherit" }}>
                      Already have an account? Sign In
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