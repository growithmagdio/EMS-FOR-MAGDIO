import { createContext, useContext, useEffect, useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../firebase/config';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Register user
  const signup = async (email, password, name, role, department) => {
    if (!isFirebaseConfigured) {
      toast.error('Firebase is not configured. Please add your credentials to .env file.');
      throw new Error('Firebase is not configured.');
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Store additional data in Firestore
      const userDoc = {
        uid: user.uid,
        name,
        email,
        role,
        department,
        userType: role, // Keeping same as role for simplicity based on prompt
        isActive: true,
        createdAt: new Date().toISOString()
      };
      
      await setDoc(doc(db, 'users', user.uid), userDoc);
      setUserData(userDoc);
      return user;
    } catch (error) {
      toast.error(error.message);
      throw error;
    }
  };

  // Login
  const login = async (email, password) => {
    if (!isFirebaseConfigured) {
      toast.error('Firebase is not configured. Please add your credentials to .env file.');
      throw new Error('Firebase is not configured.');
    }
    try {
      return await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      toast.error('Invalid email or password');
      throw error;
    }
  };

  // Logout
  const logout = async () => {
    try {
      if (isFirebaseConfigured) {
        await signOut(auth);
      }
      setUserData(null);
      setCurrentUser(null);
    } catch (error) {
      toast.error(error.message);
      throw error;
    }
  };

  // Google Sign-in
  const loginWithGoogle = async (role = 'Employee', department = 'Engineering') => {
    if (!isFirebaseConfigured) {
      toast.error('Firebase is not configured. Please add your credentials to .env file.');
      throw new Error('Firebase is not configured.');
    }
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user exists in Firestore
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        // Create new user document if first time Google sign in
        const userDoc = {
          uid: user.uid,
          name: user.displayName || 'Google User',
          email: user.email,
          role,
          department,
          userType: role,
          isActive: true,
          createdAt: new Date().toISOString()
        };
        await setDoc(docRef, userDoc);
        setUserData(userDoc);
      } else {
        setUserData(docSnap.data());
      }
      return user;
    } catch (error) {
      toast.error(error.message);
      throw error;
    }
  };

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    try {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        setCurrentUser(user);
        
        if (user) {
          // Fetch user document to get role
          try {
            const docRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              let data = docSnap.data();
              // Force Admin role and name for permanent admin
              if (user.email === "zdoda.ai@gmail.com") {
                if (data.role !== "Admin" || data.name !== "Bala Murali") {
                  data.role = "Admin";
                  data.name = "Bala Murali";
                  await setDoc(docRef, { role: "Admin", userType: "Admin", name: "Bala Murali" }, { merge: true });
                }
              }
              setUserData(data);
            } else {
              // User exists in Auth but not in Firestore (e.g., created via Console)
              const isAdmin = user.email === "zdoda.ai@gmail.com";
              const role = isAdmin ? "Admin" : "Employee";
              const name = isAdmin ? "Bala Murali" : (user.displayName || user.email.split('@')[0]);
              const newDoc = {
                uid: user.uid,
                name: name,
                email: user.email,
                role: role,
                department: "General",
                userType: role,
                isActive: true,
                createdAt: new Date().toISOString()
              };
              await setDoc(docRef, newDoc);
              setUserData(newDoc);
            }
          } catch (error) {
            console.error("Error fetching user data:", error);
          }
        } else {
          setUserData(null);
        }
        
        setLoading(false);
      }, (error) => {
        console.error("Firebase auth error:", error);
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error("Failed to initialize auth listener:", error);
      setLoading(false);
    }
  }, []);

  const value = {
    currentUser,
    userData,
    loading,
    isFirebaseConfigured,
    signup,
    login,
    logout,
    loginWithGoogle
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading ? children : (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

