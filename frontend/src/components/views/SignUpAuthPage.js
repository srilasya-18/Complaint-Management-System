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
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import { useApolloClient } from "@apollo/client";
import { SIGNUP } from "../../gql/queries/AUTHQUERIES";
import SnackBar from "../../snackbar/SnackBar";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

const defaultTheme = createTheme();

export default function SignUpAuthPage() {

  const client = useApolloClient();
  const navigate = useNavigate();

  const [role, setRole] = React.useState("student");
  const [severity, setSnackSeverity] = React.useState("");
  const [snackMessage, setSnackMessage] = React.useState("");
  const [identity_label, setIdentityLabel] = React.useState("Roll Number");
  const [showPassword, setShowPassword] = React.useState(false);

  // Handle role
  const handleRole = (event) => {
    let new_identity_label =
      event.target.value === "dean" ? "Dean Id" : "Roll Number";

    setIdentityLabel(new_identity_label);
    setRole(event.target.value);
  };

  // Toggle password
  const handleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  // Submit
  const handleSubmit = async (event) => {

    event.preventDefault();
    setSnackSeverity("");

    const data = new FormData(event.currentTarget);

    let userInput = {
      name: data.get("name"),
      identification_num: data.get("identification_num"),
      email: data.get("email"),
      password: data.get("password"),
      role: role,
    };

    // ✅ Only CVR Email Validation
    if (!userInput.email.endsWith("@cvr.ac.in")) {
      alert("Please use your college email (@cvr.ac.in)");
      return;
    }

    try {

      await client.mutate({
        mutation: SIGNUP,
        variables: {
          userInput,
        },
      });

      setSnackMessage("Account created successfully. Redirecting...");
      setSnackSeverity("success");

      setTimeout(() => {
        navigate("/login");
      }, 3000);

    } catch (error) {

      setSnackMessage(error.message);
      setSnackSeverity("error");

    }
  };

  return (
    <>
      {severity !== "" && (
        <SnackBar message={snackMessage} severity={severity} />
      )}

      <ThemeProvider theme={defaultTheme}>

        <Container component="main" maxWidth="xs">
          <CssBaseline />

          <Box
            sx={{
              marginTop: 8,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >

            <Avatar sx={{ m: 1, bgcolor: "secondary.main" }}>
              <LockOutlinedIcon />
            </Avatar>

            <Typography component="h1" variant="h5">
              Sign Up
            </Typography>

            <Box
              component="form"
              onSubmit={handleSubmit}
              sx={{ mt: 1 }}
            >

              {/* Full Name */}
              <TextField
                margin="normal"
                required
                fullWidth
                id="name"
                label="Full Name"
                name="name"
                autoComplete="name"
                autoFocus
              />

              {/* Roll Number */}
              <TextField
                margin="normal"
                required
                fullWidth
                id="identification_num"
                label={identity_label}
                name="identification_num"
                inputProps={{
                  maxLength: 10,
                  minLength: 10,
                }}
              />

              {/* Email */}
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                inputProps={{
                  pattern: "^[a-zA-Z0-9._%+-]+@cvr\\.ac\\.in$",
                }}
              />

              {/* Password */}
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type={showPassword ? "text" : "password"}
                id="password"
                inputProps={{
                  maxLength: 20,
                  minLength: 8,
                }}
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

              {/* Role */}
              <FormControl sx={{ marginTop: "10px" }}>

                <FormLabel>Role :</FormLabel>

                <RadioGroup
                  row
                  value={role}
                  onChange={handleRole}
                >
                  <FormControlLabel
                    value="student"
                    control={<Radio />}
                    label="Student"
                  />

                  <FormControlLabel
                    value="dean"
                    control={<Radio />}
                    label="Dean"
                  />
                </RadioGroup>

              </FormControl>

              {/* Button */}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
              >
                Sign Up
              </Button>

              {/* Login Link */}
              <Grid container>
                <Grid item>
                  <Link variant="body2">

                    <RouterLink
                      to="/login"
                      style={{
                        textDecoration: "none",
                        color: "inherit",
                      }}
                    >
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
