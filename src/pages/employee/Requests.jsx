import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { collection, addDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { Trash2 } from 'lucide-react';
import { softDeleteDocument } from '../../utils/dbUtils';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';

export default function Requests() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('leave'); // 'leave' or 'wfh'
  const [requests, setRequests] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState(null);
  
  const { register: registerLeave, handleSubmit: handleLeaveSubmit, reset: resetLeave, formState: { errors: leaveErrors } } = useForm();
  const { register: registerWfh, handleSubmit: handleWfhSubmit, reset: resetWfh, formState: { errors: wfhErrors } } = useForm();
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = async () => {
    if (!currentUser) return;
    try {
      setLoadingHistory(true);
      setLoadingHistory(true);

      // Fetch Leaves
      const lq = query(collection(db, 'leaveRequests'), where('employeeId', '==', currentUser.uid));
      const lSnap = await getDocs(lq);
      const leaves = lSnap.docs.map(d => ({ id: d.id, ...d.data(), type: 'Leave' }));
      
      // Fetch WFH
      const wq = query(collection(db, 'wfhRequests'), where('employeeId', '==', currentUser.uid));
      const wSnap = await getDocs(wq);
      const wfhs = wSnap.docs.map(d => ({ id: d.id, ...d.data(), type: 'WFH' }));
      
      const allReqs = [...leaves, ...wfhs]
        .filter(r => !r.isDeleted)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setRequests(allReqs);
    } catch (error) {
      console.error("Error fetching requests", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [currentUser]);

  const confirmDelete = async () => {
    if (!requestToDelete) return;
    try {
      const collectionName = requestToDelete.type === 'Leave' ? 'leaveRequests' : 'wfhRequests';
      await softDeleteDocument(collectionName, requestToDelete.id);
      toast.success(`${requestToDelete.type} request deleted`);
      setRequests(requests.filter(r => r.id !== requestToDelete.id));
    } catch (err) {
      toast.error("Failed to delete request");
    } finally {
      setDeleteModalOpen(false);
      setRequestToDelete(null);
    }
  };

  const onLeaveSubmit = async (data) => {
    try {
      setSubmitting(true);
      await addDoc(collection(db, 'leaveRequests'), {
        employeeId: currentUser.uid,
        fromDate: data.fromDate,
        toDate: data.toDate,
        reason: data.reason,
        status: 'Pending',
        createdAt: new Date().toISOString()
      });
      toast.success("Leave request submitted!");
      resetLeave();
      fetchRequests();
    } catch (error) {
      toast.error("Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const onWfhSubmit = async (data) => {
    try {
      setSubmitting(true);
      await addDoc(collection(db, 'wfhRequests'), {
        employeeId: currentUser.uid,
        date: data.date,
        reason: data.reason,
        status: 'Pending',
        createdAt: new Date().toISOString()
      });
      toast.success("WFH request submitted!");
      resetWfh();
      fetchRequests();
    } catch (error) {
      toast.error("Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Forms Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-blue-50 p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="font-bold text-gray-900">New Request</h2>
        </div>
        <div className="flex border-b border-gray-200">
          <button 
            onClick={() => setActiveTab('leave')}
            className={`flex-1 py-4 text-center font-medium transition-colors ${activeTab === 'leave' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Apply Leave
          </button>
          <button 
            onClick={() => setActiveTab('wfh')}
            className={`flex-1 py-4 text-center font-medium transition-colors ${activeTab === 'wfh' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Apply WFH
          </button>
        </div>

        <div className="p-8">
          {activeTab === 'leave' ? (
            <form onSubmit={handleLeaveSubmit(onLeaveSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">From Date</label>
                  <input type="date" {...registerLeave("fromDate", { required: true })} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">To Date</label>
                  <input type="date" {...registerLeave("toDate", { required: true })} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Reason</label>
                <textarea {...registerLeave("reason", { required: true })} rows={3} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 resize-none"></textarea>
              </div>
              <button disabled={submitting} className="w-full bg-blue-600 text-white font-medium py-3 rounded-xl hover:bg-blue-700 transition-colors">
                Submit Leave Request
              </button>
            </form>
          ) : (
            <form onSubmit={handleWfhSubmit(onWfhSubmit)} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
                <input type="date" {...registerWfh("date", { required: true })} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Reason</label>
                <textarea {...registerWfh("reason", { required: true })} rows={3} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 resize-none"></textarea>
              </div>
              <button disabled={submitting} className="w-full bg-blue-600 text-white font-medium py-3 rounded-xl hover:bg-blue-700 transition-colors">
                Submit WFH Request
              </button>
            </form>
          )}
        </div>
      </div>

      {/* History Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Request History</h2>
        {loadingHistory ? (
          <div className="animate-pulse space-y-4">
             {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl"></div>)}
          </div>
        ) : (
          <div className="space-y-4">
            {requests.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No requests found.</p>
            ) : (
              requests.map(req => (
                <div key={req.id} className="p-4 border border-gray-100 rounded-xl hover:shadow-sm transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-1 rounded-md ${req.type === 'Leave' ? 'bg-purple-100 text-purple-700' : 'bg-teal-100 text-teal-700'}`}>
                        {req.type}
                      </span>
                      <span className="text-sm font-medium text-gray-800">
                        {req.type === 'Leave' ? `${req.fromDate} to ${req.toDate}` : req.date}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                        req.status === 'Approved' ? 'bg-green-100 text-green-700' :
                        req.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {req.status}
                      </span>
                      <button 
                        onClick={() => { setRequestToDelete(req); setDeleteModalOpen(true); }}
                        className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete Request"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 truncate">{req.reason}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <DeleteConfirmModal 
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setRequestToDelete(null);
        }}
        onConfirm={confirmDelete}
        itemName={`this ${requestToDelete?.type?.toLowerCase() || ''} request`}
      />
    </div>
  );
}
