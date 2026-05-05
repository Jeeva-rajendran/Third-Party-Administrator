import React, { useState, useMemo, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ThemeProvider, createTheme, Box, AppBar, Toolbar, Typography, Button, Container, IconButton } from '@mui/material';
import { Brightness4, Brightness7, ExitToApp } from '@mui/icons-material';
import Login from './pages/Login';
import CustomerDashboard from './pages/CustomerDashboard';
import ClientDashboard from './pages/ClientDashboard';
import FmgDashboard from './pages/FmgDashboard';
import CarrierDashboard from './pages/CarrierDashboard';
import ClaimDetails from './pages/ClaimDetails';

export const AuthContext = createContext();
export const ThemeContext = createContext();

function ProtectedRoute({ children, role }) {
  const { auth } = useContext(AuthContext);
  if (!auth.token) return <Navigate to="/login" />;
  if (role && auth.role !== role) return <Navigate to="/" />;
  return children;
}

function RoleBasedDashboard() {
  const { auth } = useContext(AuthContext);
  if (!auth.token) return <Navigate to="/login" />;
  
  switch (auth.role) {
    case 'ROLE_CUSTOMER': return <CustomerDashboard />;
    case 'ROLE_CLIENT': return <ClientDashboard />;
    case 'ROLE_FMG': return <FmgDashboard />;
    case 'ROLE_CARRIER': return <CarrierDashboard />;
    default: return <Navigate to="/login" />;
  }
}

function Layout({ children }) {
  const { auth, logout } = useContext(AuthContext);
  const { toggleTheme, mode } = useContext(ThemeContext);
  const navigate = useNavigate();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default', color: 'text.primary' }}>
      <AppBar position="static" sx={{ background: 'linear-gradient(90deg, #0d47a1, #1976d2, #42a5f5)', boxShadow: 3 }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, cursor: 'pointer', fontWeight: 700 }} onClick={() => navigate('/')}>
            TPA Claim System
          </Typography>
          <IconButton sx={{ ml: 1 }} onClick={toggleTheme} color="inherit">
            {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
          {auth.token && (
            <Box sx={{ display: 'flex', alignItems: 'center', ml: 2, gap: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {auth.name} ({auth.role.replace('ROLE_', '')})
              </Typography>
              <Button color="inherit" onClick={logout} startIcon={<ExitToApp />} size="small" variant="outlined" sx={{ borderColor: 'rgba(255,255,255,0.5)' }}>
                Logout
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 4 } }}>
        <Container maxWidth="xl">
          {children}
        </Container>
      </Box>
    </Box>
  );
}

function App() {
  const [auth, setAuth] = useState(() => JSON.parse(localStorage.getItem('auth')) || {});
  const [mode, setMode] = useState('light');

  const authValue = useMemo(() => ({
    auth,
    login: (data) => {
      setAuth(data);
      localStorage.setItem('auth', JSON.stringify(data));
    },
    logout: () => {
      setAuth({});
      localStorage.removeItem('auth');
    }
  }), [auth]);

  const themeValue = useMemo(() => ({
    toggleTheme: () => setMode((prev) => (prev === 'light' ? 'dark' : 'light')),
    mode,
  }), [mode]);

  const theme = useMemo(() => createTheme({
    palette: { mode },
    typography: { fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif' },
  }), [mode]);

  return (
    <AuthContext.Provider value={authValue}>
      <ThemeContext.Provider value={themeValue}>
        <ThemeProvider theme={theme}>
          <BrowserRouter>
            <Layout>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<RoleBasedDashboard />} />
                <Route path="/claims/:id" element={<ProtectedRoute><ClaimDetails /></ProtectedRoute>} />
              </Routes>
            </Layout>
          </BrowserRouter>
        </ThemeProvider>
      </ThemeContext.Provider>
    </AuthContext.Provider>
  );
}

export default App;
