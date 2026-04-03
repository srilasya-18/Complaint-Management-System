import * as React from "react";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import CssBaseline from "@mui/material/CssBaseline";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import Alert from "@mui/material/Alert";
import { useApolloClient } from "@apollo/client";
import { CREATE_SUPER_ADMIN } from "../../gql/queries/AUTHQUERIES";
import SnackBar from "../../snackbar/SnackBar";
import { useNavigate } from "react-router-dom";

const defaultTheme = createTheme();

export default function SuperAdminSetup() {
  const client   = useApolloClient();
  const navigate = useNavigate();

  const [severity, setSnackSeverity]    = React.useState("");
  const [snackMessage, setSnackMessage] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [verified, setVerified]         = React.useState(false);
  const [secretCode, setSecretCode]     = React.useState("");

  const handleVerify = (e) => {
    e.preventDefault();
    if (!secretCode) return;
    setVerified(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSnackSeverity("");

    const data = new FormData(event.currentTarget);
    const userInput = {
      name:               data.get("name"),
      identification_num: data.get("identification_num"),
      email:              data.get("email"),
      password:           data.get("password"),
      role:               "super_admin",
    };

    try {
      await client.mutate({
        mutation: CREATE_SUPER_ADMIN,
        variables: { userInput, secretCode },
      });
      setSnackMessage("Super Admin created! Redirecting to login...");
      setSnackSeverity("success");
      setTimeout(() => navigate("/login"), 3000);
    } catch (error) {
      setSnackMessage(
        error.message.includes("UNAUTHORIZED")
          ? "Invalid secret code."
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

            <Avatar sx={{ m: 1, bgcolor: "error.main" }}>
              <AdminPanelSettingsIcon />
            </Avatar>

            <Typography component="h1" variant="h5">
              Super Admin Setup
            </Typography>

            <Alert severity="warning" sx={{ mt: 2, width: "100%" }}>
              This page is restricted. You need the platform secret code to proceed.
            </Alert>

            {/* Step 1 — verify secret code */}
            {!verified && (
              <Box component="form" onSubmit={handleVerify} sx={{ mt: 2, width: "100%" }}>
                <TextField
                  margin="normal" required fullWidth
                  label="Platform Secret Code"
                  type="password"
                  value={secretCode}
                  onChange={(e) => setSecretCode(e.target.value)}
                  autoFocus
                />
                <Button type="submit" fullWidth variant="contained"
                  color="error" sx={{ mt: 2 }}>
                  Verify Code
                </Button>
              </Box>
            )}

            {/* Step 2 — fill details after code verified */}
            {verified && (
              <>
                <Alert severity="success" sx={{ mt: 2, width: "100%" }}>
                  Code verified! Fill in super admin details.
                </Alert>

                <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: "100%" }}>

                  <TextField margin="normal" required fullWidth
                    id="name" label="Full Name" name="name" autoFocus
                  />

                  <TextField margin="normal" required fullWidth
                    id="identification_num" label="Admin ID"
                    name="identification_num"
                    inputProps={{ maxLength: 20, minLength: 4 }}
                  />

                  <TextField margin="normal" required fullWidth
                    id="email" label="Email Address"
                    name="email" type="email"
                  />

                  <TextField margin="normal" required fullWidth
                    name="password" label="Password"
                    type={showPassword ? "text" : "password"}
                    id="password"
                    inputProps={{ maxLength: 20, minLength: 8 }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  <Button type="submit" fullWidth variant="contained"
                    color="error" sx={{ mt: 3, mb: 2 }}>
                    Create Super Admin
                  </Button>

                </Box>
              </>
            )}

          </Box>
        </Container>
      </ThemeProvider>
    </>
  );
}