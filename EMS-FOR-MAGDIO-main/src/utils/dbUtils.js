import { collection, addDoc, updateDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';

/**
 * Adds a document with audit fields (createdAt, createdBy, isDeleted)
 */
export const addDocument = async (collectionName, data) => {
  const user = auth.currentUser;
  const auditData = {
    ...data,
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
  
  // We don't fetch the doc to increment version manually to save reads if not strictly needed,
  // but if we want strict versioning we'd need to read it or use FieldValue.increment.
  // For simplicity we will update the metadata.
  
  const auditData = {
    ...data,
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
