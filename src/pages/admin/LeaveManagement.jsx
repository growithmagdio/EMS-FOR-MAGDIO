import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { softDeleteDocument } from '../../utils/dbUtils';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import { Trash2 } from 'lucide-react';

export default function LeaveManagement() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      // Fetch Leaves
      const lq = query(collection(db, 'leaveRequests'));
      const lSnap = await getDocs(lq);
      const leaves = lSnap.docs.map(d => ({ id: d.id, ...d.data(), type: 'Leave' }));
      
      // Fetch WFH
      const wq = query(collection(db, 'wfhRequests'));
      const wSnap = await getDocs(wq);
      const wfhs = wSnap.docs.map(d => ({ id: d.id, ...d.data(), type: 'WFH' }));
      
      const allReqs = [...leaves, ...wfhs]
        .filter(r => !r.isDeleted)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      // We will need employee names, so fetch users
      const uSnap = await getDocs(collection(db, 'users'));
      const usersMap = {};
      uSnap.docs.forEach(d => { usersMap[d.id] = d.data() });

      const populatedReqs = allReqs.map(req => ({
        ...req,
        employeeName: usersMap[req.employeeId]?.name || 'Unknown User',
        department: usersMap[req.employeeId]?.department || 'Unknown'
      }));

      // Split for UI if needed, but for now just show them in one list or tab
      setRequests(populatedReqs);
    } catch (error) {
      console.error("Error fetching requests", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleUpdateStatus = async (id, type, newStatus, req) => {
    try {
      const collectionName = type === 'Leave' ? 'leaveRequests' : 'wfhRequests';
      await updateDoc(doc(db, collectionName, id), { status: newStatus });
      
      // Update Leave Balance ONLY if Leave is Approved
      if (type === 'Leave' && newStatus === 'Approved' && req) {
        const userRef = doc(db, 'users', req.employeeId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const currentBalance = userData.leaveBalance !== undefined ? userData.leaveBalance : 20;
          const fromDate = new Date(req.fromDate);
          const toDate = new Date(req.toDate);
          const diffTime = Math.abs(toDate - fromDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          
          await updateDoc(userRef, { leaveBalance: Math.max(0, currentBalance - diffDays) });
        }
      }

      toast.success(`${type} request ${newStatus.toLowerCase()}!`);
      // Update local state instead of full refetch for better UX
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    } catch (error) {
      toast.error("Failed to update status");
      console.error(error);
    }
  };

  const handleDeleteClick = (req) => {
    setItemToDelete(req);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      const collectionName = itemToDelete.type === 'Leave' ? 'leaveRequests' : 'wfhRequests';
      await softDeleteDocument(collectionName, itemToDelete.id);
      toast.success(`${itemToDelete.type} request deleted successfully!`);
      setRequests(prev => prev.filter(r => r.id !== itemToDelete.id));
    } catch (error) {
      toast.error("Failed to delete request");
      console.error(error);
    } finally {
      setDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Leave & WFH Management</h1>

      {requests.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <p className="text-gray-500">No requests found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">Employee</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">Type</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">Date(s)</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">Reason</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{req.employeeName}</p>
                      <p className="text-xs text-gray-500">{req.department}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-bold rounded-md ${req.type === 'Leave' ? 'bg-purple-100 text-purple-700' : 'bg-teal-100 text-teal-700'}`}>
                        {req.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {req.type === 'Leave' ? `${req.fromDate} to ${req.toDate}` : req.date}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {req.reason}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${
                        req.status === 'Approved' ? 'bg-green-100 text-green-700' :
                        req.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end items-center">
                        {req.status === 'Pending' && (
                          <>
                            <button 
                              onClick={() => handleUpdateStatus(req.id, req.type, 'Approved', req)}
                              className="px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-xs font-bold transition-colors"
                            >
                              Approve
                            </button>
                            <button 
                              onClick={() => handleUpdateStatus(req.id, req.type, 'Rejected', req)}
                              className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-bold transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDeleteClick(req)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors ml-2"
                          title="Delete Request"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <DeleteConfirmModal 
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={confirmDelete}
        itemName={`this ${itemToDelete?.type?.toLowerCase() || ''} request`}
      />
    </div>
  );
}
