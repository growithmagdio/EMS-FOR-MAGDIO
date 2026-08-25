import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { softDeleteDocument } from '../../utils/dbUtils';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import { Trash2 } from 'lucide-react';

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'users'), where('role', '==', 'Employee'));
      const snapshot = await getDocs(q);
      const emps = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(emp => !emp.isDeleted);
      setEmployees(emps);
    } catch (error) {
      console.error("Error fetching employees", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const toggleStatus = async (id, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      await updateDoc(doc(db, 'users', id), { isActive: newStatus });
      toast.success(`Employee ${newStatus ? 'activated' : 'deactivated'} successfully`);
      setEmployees(prev => prev.map(emp => emp.id === id ? { ...emp, isActive: newStatus } : emp));
    } catch (error) {
      toast.error("Failed to update status");
      console.error(error);
    }
  };

  const handleDeleteClick = (id) => {
    setEmployeeToDelete(id);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await softDeleteDocument('users', employeeToDelete);
      
      // Cascade delete: Remove employee from all projects they were assigned to
      const projectsRef = collection(db, 'projects');
      const qProj = query(projectsRef, where('assignedEmployees', 'array-contains', employeeToDelete));
      const projSnap = await getDocs(qProj);
      
      const updatePromises = projSnap.docs.map(docSnap => {
        const projData = docSnap.data();
        const updatedEmployees = (projData.assignedEmployees || []).filter(id => id !== employeeToDelete);
        return updateDoc(doc(db, 'projects', docSnap.id), { assignedEmployees: updatedEmployees });
      });

      // Cascade delete: Unassign employee from all their tasks
      const tasksRef = collection(db, 'tasks');
      const qTasks = query(tasksRef, where('assignedEmployeeId', '==', employeeToDelete));
      const tasksSnap = await getDocs(qTasks);
      
      tasksSnap.docs.forEach(docSnap => {
        updatePromises.push(updateDoc(doc(db, 'tasks', docSnap.id), { 
          assignedEmployeeId: '',
          assignedEmployeeName: 'Unassigned'
        }));
      });

      // Execute all updates
      await Promise.all(updatePromises);

      toast.success("Employee removed completely from all projects and tasks");
      setEmployees(employees.filter(emp => emp.id !== employeeToDelete));
    } catch (error) {
      toast.error("Failed to fully delete employee");
      console.error(error);
    } finally {
      setDeleteModalOpen(false);
      setEmployeeToDelete(null);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Employee Management</h1>
        <button
          onClick={() => {
            const registerLink = `${window.location.origin}/register`;
            navigator.clipboard.writeText(registerLink);
            toast.success('Registration link copied to clipboard!');
          }}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium whitespace-nowrap w-full sm:w-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
          </svg>
          Invite Employee
        </button>
      </div>

      {employees.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <p className="text-gray-500">No employees found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">Employee Details</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">Department</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">Joined Date</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                        {emp.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{emp.name}</p>
                        <p className="text-xs text-gray-500">{emp.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {emp.department}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${
                        emp.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {emp.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {emp.createdAt ? new Date(emp.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end items-center">
                        <button
                          onClick={() => toggleStatus(emp.id, emp.isActive !== false)}
                          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                            emp.isActive !== false 
                              ? 'bg-red-50 text-red-700 hover:bg-red-100' 
                              : 'bg-green-50 text-green-700 hover:bg-green-100'
                          }`}
                        >
                          {emp.isActive !== false ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDeleteClick(emp.id)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors ml-2"
                          title="Delete Employee"
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
          setEmployeeToDelete(null);
        }}
        onConfirm={confirmDelete}
        itemName="this employee"
      />
    </div>
  );
}
