import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase/config';

/**
 * Strips any keys with undefined values to prevent Firestore invalid data errors
 */
const sanitizePayload = (obj) => {
  const cleaned = {};
  Object.keys(obj || {}).forEach(key => {
    if (obj[key] !== undefined) {
      cleaned[key] = obj[key];
    }
  });
  return cleaned;
};

/**
 * Adds a document with audit fields (createdAt, createdBy, isDeleted)
 */
export const addDocument = async (collectionName, data) => {
  const user = auth.currentUser;
  const cleanData = sanitizePayload(data);

  const auditData = {
    ...cleanData,
    isDeleted: false,
    createdAt: serverTimestamp(),
    createdBy: user ? user.uid : 'system',
    version: 1
  };
  
  return await addDoc(collection(db, collectionName), auditData);
};

/**
 * Updates a document with audit fields (updatedAt, updatedBy, increment version)
 */
export const updateDocument = async (collectionName, docId, data) => {
  const user = auth.currentUser;
  const docRef = doc(db, collectionName, docId);
  const cleanData = sanitizePayload(data);
  
  const auditData = {
    ...cleanData,
    updatedAt: serverTimestamp(),
    updatedBy: user ? user.uid : 'system',
  };

  return await updateDoc(docRef, auditData);
};

/**
 * Soft deletes a document (sets isDeleted to true, deletedAt, deletedBy)
 */
export const softDeleteDocument = async (collectionName, docId) => {
  const user = auth.currentUser;
  const docRef = doc(db, collectionName, docId);
  
  const auditData = {
    isDeleted: true,
    deletedAt: serverTimestamp(),
    deletedBy: user ? user.uid : 'system',
  };

  return await updateDoc(docRef, auditData);
};
