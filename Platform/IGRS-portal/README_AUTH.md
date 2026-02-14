# IGRS Portal - Client Authentication

React client with complete authentication integration.

## Setup

1. Install dependencies (if not already done):
```bash
npm install axios
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Update `.env` with your API URL

## Usage

### 1. Wrap your app with AuthProvider

Update `main.jsx`:

```jsx
import { AuthProvider } from './context/AuthContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
```

### 2. Update App.jsx with routes

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        {/* Citizen Routes */}
        <Route
          path="/citizen/*"
          element={
            <ProtectedRoute roles={['citizen']}>
              <CitizenDashboard />
            </ProtectedRoute>
          }
        />
        
        {/* Official Routes */}
        <Route
          path="/official/*"
          element={
            <ProtectedRoute roles={['department_officer', 'department_head']}>
              <OfficialDashboard />
            </ProtectedRoute>
          }
        />
        
        {/* Admin Routes */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
```

### 3. Use Auth in Components

```jsx
import { useAuth } from '../context/AuthContext';

function MyComponent() {
  const { user, logout, hasRole } = useAuth();

  return (
    <div>
      <p>Welcome, {user.full_name}</p>
      {hasRole('admin') && <AdminPanel />}
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### 4. Use Services

```jsx
import { grievanceService } from '../services/grievance.service';

// Create grievance
const grievance = await grievanceService.createGrievance({
  grievance_text: 'My complaint...',
  category: { type: 'water' }
});

// Get grievances
const { grievances } = await grievanceService.getGrievances({
  status: 'pending',
  page: 1
});
```

## Available Services

- `authService` - Authentication operations
- `adminService` - Admin user management
- `grievanceService` - Grievance operations

## Role-Based Access

- **citizen**: Can register, submit grievances, track status
- **department_officer**: Can view and update assigned grievances
- **department_head**: Can manage all department grievances
- **admin**: Full system access, user management
