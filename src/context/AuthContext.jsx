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

const MASTER_ADMIN_EMAIL = "growithmagdio@gmail.com";
const MASTER_ADMIN_PASSWORD = "magdio123";

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
      
      const userDoc = {
        uid: user.uid,
        name,
        email,
        role: email.toLowerCase() === MASTER_ADMIN_EMAIL ? 'Admin' : (role || 'Employee'),
        department,
        userType: email.toLowerCase() === MASTER_ADMIN_EMAIL ? 'Admin' : (role || 'Employee'),
        isActive: true,
        createdAt: new Date().toISOString()
      };
      
      try {
        await setDoc(doc(db, 'users', user.uid), userDoc);
      } catch (err) {
        console.warn("Firestore permission warning:", err);
      }

      setUserData(userDoc);
      return user;
    } catch (error) {
      toast.error(error.message);
      throw error;
    }
  };

  // Login
  const login = async (email, password) => {
    const formattedEmail = email.trim().toLowerCase();

    // Instant Master Admin Authentication
    if (formattedEmail === MASTER_ADMIN_EMAIL && password === MASTER_ADMIN_PASSWORD) {
      const masterUser = {
        uid: "magdio-master-admin-uid",
        email: MASTER_ADMIN_EMAIL,
        displayName: "MAGDIO Admin"
      };
      const masterUserData = {
        uid: "magdio-master-admin-uid",
        name: "MAGDIO Admin",
        email: MASTER_ADMIN_EMAIL,
        role: "Admin",
        department: "Management",
        userType: "Admin",
        isActive: true,
        createdAt: new Date().toISOString()
      };

      localStorage.setItem("magdio_master_admin", "true");
      setCurrentUser(masterUser);
      setUserData(masterUserData);

      // Background Firebase Sync if configured
      if (isFirebaseConfigured) {
        signInWithEmailAndPassword(auth, email, password).catch(() => {
          createUserWithEmailAndPassword(auth, email, password).catch(() => {});
        });
      }
      return masterUser;
    }

    // Standard Firebase Login
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
    localStorage.removeItem("magdio_master_admin");
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
      const isAdmin = user.email.toLowerCase() === MASTER_ADMIN_EMAIL;
      const assignedRole = isAdmin ? 'Admin' : role;
      
      const docRef = doc(db, 'users', user.uid);
      let userDoc;
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          userDoc = docSnap.data();
          if (isAdmin) userDoc.role = 'Admin';
        } else {
          userDoc = {
            uid: user.uid,
            name: user.displayName || 'Google User',
            email: user.email,
            role: assignedRole,
            department,
            userType: assignedRole,
            isActive: true,
            createdAt: new Date().toISOString()
          };
          await setDoc(docRef, userDoc);
        }
      } catch (err) {
        userDoc = {
          uid: user.uid,
          name: user.displayName || 'Google User',
          email: user.email,
          role: assignedRole,
          department,
          userType: assignedRole,
          isActive: true
        };
      }
      
      if (isAdmin) {
        localStorage.setItem("magdio_master_admin", "true");
      }

      setUserData(userDoc);
      return user;
    } catch (error) {
      toast.error(error.message);
      throw error;
    }
  };

  useEffect(() => {
    // Check local storage for persistent Master Admin session
    if (localStorage.getItem("magdio_master_admin") === "true") {
      const masterUser = {
        uid: "magdio-master-admin-uid",
        email: MASTER_ADMIN_EMAIL,
        displayName: "MAGDIO Admin"
      };
      const masterUserData = {
        uid: "magdio-master-admin-uid",
        name: "MAGDIO Admin",
        email: MASTER_ADMIN_EMAIL,
        role: "Admin",
        department: "Management",
        userType: "Admin",
        isActive: true
      };
      setCurrentUser(masterUser);
      setUserData(masterUserData);
      setLoading(false);
      return;
    }

    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    try {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        setCurrentUser(user);
        
        if (user) {
          try {
            const docRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              let data = docSnap.data();
              if (user.email.toLowerCase() === MASTER_ADMIN_EMAIL) {
                if (data.role !== "Admin") {
                  data.role = "Admin";
                  await setDoc(docRef, { role: "Admin", userType: "Admin" }, { merge: true });
                }
              }
              setUserData(data);
            } else {
              const isAdmin = user.email.toLowerCase() === MASTER_ADMIN_EMAIL;
              const role = isAdmin ? "Admin" : "Employee";
              const name = isAdmin ? "MAGDIO Admin" : (user.displayName || user.email.split('@')[0]);
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
            console.error("Error fetching user data from Firestore:", error);
            const isAdmin = user.email.toLowerCase() === MASTER_ADMIN_EMAIL;
            setUserData({
              uid: user.uid,
              name: isAdmin ? "MAGDIO Admin" : (user.displayName || user.email.split('@')[0]),
              email: user.email,
              role: isAdmin ? "Admin" : "Employee",
              department: "Management",
              userType: isAdmin ? "Admin" : "Employee",
              isActive: true
            });
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
