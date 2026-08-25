import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { CheckSquare, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { addDocument, updateDocument, softDeleteDocument } from '../../utils/dbUtils';
import TaskCard from '../../components/TaskCard';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';

export default function EmployeeTasks() {
  const { currentUser } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isPersonalTaskModalOpen, setIsPersonalTaskModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);

  const { register: ptRegister, handleSubmit: ptSubmit, reset: ptReset, setValue: ptSetValue, formState: { errors: ptErrors } } = useForm();
  const { register: updRegister, handleSubmit: updSubmit, reset: updReset, setValue: updSetValue } = useForm();

  useEffect(() => {
    const fetchTasks = async () => {
      if (!currentUser) return;
      try {
        const q = query(collection(db, 'tasks'), where('assignedEmployeeId', '==', currentUser.uid));
        const snapshot = await getDocs(q);
        const tasksList = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(t => !t.isDeleted);
        setTasks(tasksList);
      } catch (error) {
        console.error("Error fetching tasks:", error);
        toast.error("Failed to load tasks");
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [currentUser]);

  const handlePersonalTaskSubmit = async (data) => {
    try {
      const taskData = {
        title: data.title,
        description: data.description,
        dueDate: data.dueDate,
        priority: data.priority,
        status: data.status || 'To Do',
        progressPercentage: Number(data.progressPercentage || 0),
        isPersonal: true,
        assignedEmployeeId: currentUser.uid,
        assignedEmployeeName: currentUser.displayName || 'Me',
        projectName: 'Personal Task',
        projectId: 'Personal',
        assignedByName: 'Self'
      };

      if (editingTask) {
        await updateDocument('tasks', editingTask.id, taskData);
        toast.success("Personal task updated");
        setTasks(tasks.map(t => t.id === editingTask.id ? { ...t, ...taskData } : t));
      } else {
        const docRef = await addDocument('tasks', taskData);
        toast.success("Personal task created");
        setTasks([...tasks, { id: docRef.id, ...taskData }]);
      }
      setIsPersonalTaskModalOpen(false);
      ptReset();
      setEditingTask(null);
    } catch (err) {
      toast.error("Failed to save personal task");
    }
  };

  const handleUpdateTaskSubmit = async (data) => {
    try {
      const updates = {
        status: data.status,
        progressPercentage: Number(data.progressPercentage),
        latestUpdate: data.latestUpdate,
        notes: data.latestUpdate, // Keep notes synced with latest update
        updatedAt: new Date().toISOString()
      };
      await updateDocument('tasks', selectedTask.id, updates);
      toast.success("Task updated");
      setTasks(tasks.map(t => t.id === selectedTask.id ? { ...t, ...updates } : t));
      setIsUpdateModalOpen(false);
      updReset();
      setSelectedTask(null);
    } catch (err) {
      toast.error("Failed to update task");
    }
  };

  const handleMarkComplete = async (task) => {
    try {
      await updateDocument('tasks', task.id, {
        status: 'Done',
        progressPercentage: 100,
        updatedAt: new Date().toISOString()
      });
      setTasks(tasks.map(t => t.id === task.id ? { ...t, status: 'Done', progressPercentage: 100 } : t));
      toast.success("Task marked as complete");
    } catch (err) {
      toast.error("Failed to complete task");
    }
  };

  const confirmDelete = async () => {
    try {
      await softDeleteDocument('tasks', taskToDelete);
      toast.success("Personal task deleted");
      setTasks(tasks.filter(t => t.id !== taskToDelete));
    } catch (err) {
      toast.error("Failed to delete task");
    } finally {
      setDeleteModalOpen(false);
      setTaskToDelete(null);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;

  const todoTasks = tasks.filter(t => t.status === 'To Do');
  const inProgressTasks = tasks.filter(t => t.status === 'In Progress');
  const reviewTasks = tasks.filter(t => t.status === 'Review');
  const doneTasks = tasks.filter(t => t.status === 'Done');

  const renderTaskCard = (task) => (
    <TaskCard
      key={task.id}
      task={task}
      isPersonal={task.isPersonal}
      onUpdateProgress={(t) => {
        setSelectedTask(t);
        updSetValue('status', t.status || 'To Do');
        updSetValue('progressPercentage', t.progressPercentage || 0);
        updSetValue('latestUpdate', t.latestUpdate || t.notes || '');
        setIsUpdateModalOpen(true);
      }}
      onMarkComplete={handleMarkComplete}
      onEdit={(t) => {
        setEditingTask(t);
        ptSetValue('title', t.title);
        ptSetValue('description', t.description);
        ptSetValue('dueDate', t.dueDate);
        ptSetValue('priority', t.priority);
        ptSetValue('status', t.status);
        ptSetValue('progressPercentage', t.progressPercentage);
        setIsPersonalTaskModalOpen(true);
      }}
      onDelete={(id) => {
        setTaskToDelete(id);
        setDeleteModalOpen(true);
      }}
    />
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
          <p className="text-gray-500 mt-1">Manage your assigned work and personal tasks</p>
        </div>
        <button
          onClick={() => {
            setEditingTask(null);
            ptReset({ priority: 'Medium', status: 'To Do', progressPercentage: 0 });
            setIsPersonalTaskModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl shadow-sm flex items-center gap-2 font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          Personal Task
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckSquare className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500">You have no tasks assigned right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
          {/* To Do Column */}
          <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100 space-y-4">
            <h3 className="font-bold text-gray-700 flex items-center justify-between">
              To Do
              <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-xs">{todoTasks.length}</span>
            </h3>
            <div className="space-y-3">
              {todoTasks.map(renderTaskCard)}
            </div>
          </div>

          {/* In Progress Column */}
          <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100 space-y-4">
            <h3 className="font-bold text-blue-700 flex items-center justify-between">
              In Progress
              <span className="bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full text-xs">{inProgressTasks.length}</span>
            </h3>
            <div className="space-y-3">
              {inProgressTasks.map(renderTaskCard)}
            </div>
          </div>

          {/* Review Column */}
          <div className="bg-amber-50/50 rounded-2xl p-4 border border-amber-100 space-y-4">
            <h3 className="font-bold text-amber-700 flex items-center justify-between">
              Review
              <span className="bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full text-xs">{reviewTasks.length}</span>
            </h3>
            <div className="space-y-3">
              {reviewTasks.map(renderTaskCard)}
            </div>
          </div>

          {/* Done Column */}
          <div className="bg-green-50/50 rounded-2xl p-4 border border-green-100 space-y-4">
            <h3 className="font-bold text-green-700 flex items-center justify-between">
              Done
              <span className="bg-green-200 text-green-800 px-2 py-0.5 rounded-full text-xs">{doneTasks.length}</span>
            </h3>
            <div className="space-y-3">
              {doneTasks.map(renderTaskCard)}
            </div>
          </div>
        </div>
      )}

      {/* Personal Task Modal */}
      {isPersonalTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="border-b border-gray-100 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">{editingTask ? 'Edit Personal Task' : 'Create Personal Task'}</h2>
              <button onClick={() => setIsPersonalTaskModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={ptSubmit(handlePersonalTaskSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Title <span className="text-red-500">*</span></label>
                <input {...ptRegister("title", { required: true })} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea {...ptRegister("description")} rows={2} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Due Date <span className="text-red-500">*</span></label>
                  <input {...ptRegister("dueDate", { required: true })} type="date" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
                  <select {...ptRegister("priority")} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500">
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                  <select {...ptRegister("status")} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500">
                    <option value="To Do">To Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Review">Review</option>
                    <option value="Done">Done</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Progress %</label>
                  <input {...ptRegister("progressPercentage")} type="number" min="0" max="100" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsPersonalTaskModalOpen(false)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium">{editingTask ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Task Modal */}
      {isUpdateModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="border-b border-gray-100 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Update Task</h2>
              <button onClick={() => setIsUpdateModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={updSubmit(handleUpdateTaskSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                <select {...updRegister("status")} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500">
                  <option value="To Do">To Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Review">Review</option>
                  <option value="Done">Done</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Completion %</label>
                <input {...updRegister("progressPercentage", { min: 0, max: 100 })} type="number" min="0" max="100" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Latest Update / Notes</label>
                <textarea {...updRegister("latestUpdate")} rows={3} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500" placeholder="What was accomplished?" />
              </div>
              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsUpdateModalOpen(false)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium">Update</button>
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
