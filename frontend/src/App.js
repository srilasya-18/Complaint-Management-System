import * as React from "react";
import Header from "./components/Header";
import Home from "./components/static/Home";
import { Route, Navigate, Routes, useNavigate } from "react-router-dom";
import AllComplaints from "./components/views/AllComplaints";
import CreateComplaint from "./components/views/CreateComplaint";
import LogInAuthPage from "./components/views/LogInAuthPage";
import SignUpAuthPage from "./components/views/SignUpAuthPage";
import { jwtDecode } from "jwt-decode";
import ViewFeedback from "./components/views/ViewFeedback";
import ResolveComplaint from "./components/views/ResolveComplaint";
import MyComplaints from "./components/views/MyComplaints";
import FeedbackComplaints from "./components/views/FeedbackComplaints";

// ── new imports for new roles ──────────────────────────────────────────
import SuperAdminDashboard from "./components/views/SuperAdminDashboard"; // new
import CollegeAdminDashboard from "./components/views/CollegeAdminDashboard"; // new

/* Default State */
const default_userstore = {
  userId: null,
  role: null,
  token: null,
  college: null,   // ← added: which college this user belongs to
  search: "",
};

export const AuthContext = React.createContext();

/* Get Token */
const getTokenFromCookie = (cookieName) => {
  const name = cookieName + "=";
  const decodedCookie = decodeURIComponent(document.cookie);
  const cookieArray = decodedCookie.split(";");

  for (let i = 0; i < cookieArray.length; i++) {
    let cookie = cookieArray[i].trim();

    if (cookie.indexOf(name) === 0) {
      let final_token = cookie.substring(name.length);
      let parsed_token = jwtDecode(final_token);

      return {
        userId: parsed_token.userId,
        role: parsed_token.role,
        college: parsed_token.college || null,  // ← pulled from JWT
        token: final_token,
        search: "",
      };
    }
  }
};

/* Delete Cookie */
const deleteCookie = (name) => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
};

// ── helper: where to send user after login based on role ──────────────
const getHomeRoute = (role) => {
  if (role === "student")       return "/complaints/me";
  if (role === "college_admin") return "/admin/dashboard";
  if (role === "super_admin")   return "/superadmin/dashboard";
  return "/home";
};

const App = () => {
  const [userStore, setUserstore] = React.useState(() => {
    const retrive_token = getTokenFromCookie("secretToken");
    return retrive_token ? retrive_token : default_userstore;
  });

  const navigate = useNavigate();

  /* Login */
  const logInHandler = (new_userstore) => {
    setUserstore({
      ...new_userstore,
      search: "",
    });
  };

  /* Logout */
  const logOutHandler = () => {
    deleteCookie("secretToken");
    setUserstore(default_userstore);
    setTimeout(() => {
      navigate("/login");
    }, 1000);
  };

  /* Search Handler */
  const setSearch = (text) => {
    setUserstore((prev) => ({
      ...prev,
      search: text,
    }));
  };

  const { token, userId, role, college } = userStore;
  const homeRoute = getHomeRoute(role);

  return (
    <React.Fragment>
      <AuthContext.Provider
        value={{
          token,
          userId,
          role,
          college,           // ← now available anywhere via useContext(AuthContext)
          search: userStore.search,
          login: logInHandler,
          logout: logOutHandler,
          setSearch,
        }}
      >
        <Header />

        <Routes>
          {/* Root — redirect based on role */}
          <Route
            path="/"
            element={
              token && userId
                ? <Navigate to={homeRoute} />
                : <Navigate to="/home" />
            }
          />

          {/* Login */}
          <Route
            path="/login"
            element={
              !token
                ? <LogInAuthPage />
                : <Navigate to={homeRoute} />
            }
          />

          {/* Signup */}
          <Route
            path="/signup"
            element={
              !token
                ? <SignUpAuthPage />
                : <Navigate to={homeRoute} />
            }
          />

          {/* ── Student routes ──────────────────────────────────────── */}
          <Route
            path="/complaints"
            element={
              role === "student"
                ? <AllComplaints />
                : <Navigate to="/login" />
            }
          />

          <Route
            path="/complaints/me"
            element={
              role === "student"
                ? <MyComplaints />
                : <Navigate to="/login" />
            }
          />

          <Route
            path="/create"
            element={
              role === "student"
                ? <CreateComplaint openDialog={true} />
                : <Navigate to="/login" />
            }
          />

          <Route
            path="/givefeedback"
            element={
              role === "student"
                ? <FeedbackComplaints openDialog={true} />
                : <Navigate to="/login" />
            }
          />

          {/* ── College Admin routes (replaces dean) ───────────────── */}
          <Route
            path="/view"
            element={
              role === "college_admin"
                ? <ViewFeedback />
                : <Navigate to="/login" />
            }
          />

          <Route
            path="/resolve"
            element={
              role === "college_admin"
                ? <ResolveComplaint />
                : <Navigate to="/login" />
            }
          />

          <Route
            path="/admin/dashboard"
            element={
              role === "college_admin"
                ? <CollegeAdminDashboard />
                : <Navigate to="/login" />
            }
          />

          {/* ── Super Admin routes ──────────────────────────────────── */}
          <Route
            path="/superadmin/dashboard"
            element={
              role === "super_admin"
                ? <SuperAdminDashboard />
                : <Navigate to="/login" />
            }
          />

          {/* Home */}
          <Route path="/home" element={<Home />} />
        </Routes>
      </AuthContext.Provider>
    </React.Fragment>
  );
};

export default App;