import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser, userData, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && userData && !allowedRoles.includes(userData.role)) {
    // Redirect based on role if they try to access an unauthorized route
    if (userData.role === 'Admin') return <Navigate to="/admin/dashboard" />;
    return <Navigate to="/employee/dashboard" />;
  }

  return children;
}
