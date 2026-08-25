import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { db } from '../../firebase/config';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { Plus, Edit2, Trash2, X, CheckSquare, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { addDocument, updateDocument, softDeleteDocument } from '../../utils/dbUtils';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import { auth } from '../../firebase/config';

export default function TaskManagement() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Tasks
        const tasksSnap = await getDocs(collection(db, 'tasks'));
        const tasksList = tasksSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(t => !t.isDeleted);
        setTasks(tasksList);

        // Fetch Projects
        const projSnap = await getDocs(collection(db, 'projects'));
        setProjects(projSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(p => !p.isDeleted));

        // Fetch Employees
        const empQ = query(collection(db, 'users'), where('role', '==', 'Employee'));
        const empSnap = await getDocs(empQ);
        setEmployees(empSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(emp => !emp.isDeleted && emp.isActive !== false)
        );
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const onSubmit = async (data) => {
    try {
      // Find the employee name and project name for denormalization
      const assignedEmp = employees.find(e => e.id === data.assignedEmployeeId);
      const proj = projects.find(p => p.id === data.projectId);

      const taskData = {
        title: data.title,
        description: data.description,
        assignedEmployeeId: data.assignedEmployeeId,
        assignedEmployeeName: assignedEmp ? assignedEmp.name : '',
        projectId: data.projectId,
        projectName: proj ? proj.name : '',
        priority: data.priority,
        status: data.status,
        dueDate: data.dueDate,
        progressPercentage: Number(data.progressPercentage || 0),
        assignedByName: auth.currentUser ? auth.currentUser.displayName || 'Admin' : 'Admin',
        updatedAt: new Date().toISOString()
      };

      if (editingTask) {
        await updateDocument('tasks', editingTask.id, taskData);
        toast.success("Task updated successfully");
      } else {
        await addDocument('tasks', taskData);
        toast.success("Task created successfully");
      }
      
      setIsModalOpen(false);
      reset();
      setEditingTask(null);
      window.location.reload();
    } catch (err) {
      console.error("Error saving task:", err);
      toast.error("Failed to save task");
    }
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setValue("title", task.title);
    setValue("description", task.description);
    setValue("assignedEmployeeId", task.assignedEmployeeId);
    setValue("projectId", task.projectId);
    setValue("priority", task.priority);
    setValue("status", task.status);
    setValue("dueDate", task.dueDate);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id) => {
    setTaskToDelete(id);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await softDeleteDocument('tasks', taskToDelete);
      toast.success("Task deleted successfully");
      setTasks(tasks.filter(t => t.id !== taskToDelete));
    } catch (err) {
      toast.error("Failed to delete task");
    } finally {
      setDeleteModalOpen(false);
      setTaskToDelete(null);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Task Management</h1>
          <p className="text-gray-500 mt-1">Create and assign tasks to employees</p>
        </div>
        <button
          onClick={() => {
            setEditingTask(null);
            reset({ status: 'To Do', priority: 'Medium', progressPercentage: 0 });
            setIsModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl shadow-sm flex items-center gap-2 font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Task
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {tasks.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckSquare className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500">No tasks found. Create a task to assign it to an employee.</p>
          </div>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col h-full hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-3">
                <div className="pr-4">
                  <h3 className="text-lg font-bold text-gray-900 line-clamp-1">{task.title}</h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider whitespace-nowrap ${
                  task.priority === 'High' ? 'bg-red-100 text-red-700' :
                  task.priority === 'Medium' ? 'bg-amber-100 text-amber-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {task.priority}
                </span>
              </div>
              
              <div className="flex-1 mt-4 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className={`w-2 h-2 rounded-full ${
                    task.status === 'Done' ? 'bg-green-500' :
                    task.status === 'In Progress' ? 'bg-blue-500' :
                    'bg-gray-400'
                  }`}></span>
                  <span className="font-medium text-gray-700">{task.status}</span>
                </div>

                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Project</p>
                  <p className="font-medium text-gray-900 line-clamp-1">{task.projectName || 'Unassigned'}</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Assignee</p>
                    <p className="font-medium text-gray-900 line-clamp-1">{task.assignedEmployeeName || 'Unassigned'}</p>
                  </div>
                  <div className="flex-1 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Due Date</p>
                    <div className="flex items-center gap-1 font-medium text-gray-900">
                      <Clock className="w-3 h-3 text-gray-400" />
                      {new Date(task.dueDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4 mt-4 border-t border-gray-100">
                <button 
                  onClick={() => openEditModal(task)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl font-medium transition-colors"
                >
                  <Edit2 className="w-4 h-4" /> Edit
                </button>
                <button 
                  onClick={() => handleDeleteClick(task.id)}
                  className="flex items-center justify-center p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center z-10">
              <h2 className="text-xl font-bold text-gray-900">
                {editingTask ? 'Edit Task' : 'Create New Task'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Task Title <span className="text-red-500">*</span></label>
                  <input
                    {...register("title", { required: "Task title is required" })}
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Implement Login Page"
                  />
                  {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                  <textarea
                    {...register("description")}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Task details and instructions..."
                  ></textarea>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Project</label>
                  <select
                    {...register("projectId")}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Select Project...</option>
                    {projects.map(proj => (
                      <option key={proj.id} value={proj.id}>{proj.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Assign Employee <span className="text-red-500">*</span></label>
                  <select
                    {...register("assignedEmployeeId", { required: "Employee is required" })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Select Employee...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.department})</option>
                    ))}
                  </select>
                  {errors.assignedEmployeeId && <p className="text-red-500 text-xs mt-1">{errors.assignedEmployeeId.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Due Date <span className="text-red-500">*</span></label>
                  <input
                    {...register("dueDate", { required: true })}
                    type="date"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
                  <select
                    {...register("priority")}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                  <select
                    {...register("status")}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="To Do">To Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Review">Review</option>
                    <option value="Done">Done</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Progress Percentage</label>
                  <input
                    {...register("progressPercentage", { min: 0, max: 100 })}
                    type="number"
                    min="0"
                    max="100"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                >
                  {editingTask ? 'Update Task' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmModal 
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setTaskToDelete(null);
        }}
        onConfirm={confirmDelete}
        itemName="this task"
      />
    </div>
  );
}
