import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { Folder, CheckSquare, CheckCircle, Send } from 'lucide-react';

export default function EmployeeDashboard() {
  const { userData, currentUser } = useAuth();
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    defaultValues: { 
      completionPercentage: 0,
      status: "In Progress"
    }
  });
  const [loading, setLoading] = useState(false);
  const [existingReport, setExistingReport] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [checking, setChecking] = useState(true);
  const [assignedTasks, setAssignedTasks] = useState([]);

  const [stats, setStats] = useState({
    assignedProjects: 0,
    pendingTasks: 0,
    completedTasks: 0,
    pendingRequests: 0
  });

  const completionPercentage = watch("completionPercentage");
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;
      try {
        // 1. Check Today's Report
        const q = query(
          collection(db, 'dailyReports'),
          where('employeeId', '==', currentUser.uid),
          where('reportDate', '==', today)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const docData = snapshot.docs[0];
          setExistingReport({ id: docData.id, ...docData.data() });
        }

        // 2. Fetch Assigned Tasks
        const tasksQ = query(
          collection(db, 'tasks'),
          where('assignedEmployeeId', '==', currentUser.uid)
        );
        const tasksSnap = await getDocs(tasksQ);
        const allTasks = tasksSnap.docs.map(t => ({ id: t.id, ...t.data() })).filter(t => !t.isDeleted);
        
        const activeTasks = allTasks.filter(t => t.status !== 'Done');
        const doneTasks = allTasks.filter(t => t.status === 'Done');
        setAssignedTasks(activeTasks);

        // 3. Fetch Assigned Projects
        const projQ = query(
          collection(db, 'projects'),
          where('assignedEmployees', 'array-contains', currentUser.uid)
        );
        const projSnap = await getDocs(projQ);
        const activeProjects = projSnap.docs.filter(p => !p.data().isDeleted).length;

        // 4. Fetch Pending Requests
        const leaveQ = query(
          collection(db, 'leaveRequests'),
          where('employeeId', '==', currentUser.uid),
          where('status', '==', 'Pending')
        );
        const leaveSnap = await getDocs(leaveQ);

        const wfhQ = query(
          collection(db, 'wfhRequests'),
          where('employeeId', '==', currentUser.uid),
          where('status', '==', 'Pending')
        );
        const wfhSnap = await getDocs(wfhQ);

        const pendingReqsCount = leaveSnap.size + wfhSnap.size;

        setStats({
          assignedProjects: activeProjects,
          pendingTasks: activeTasks.length,
          completedTasks: doneTasks.length,
          pendingRequests: pendingReqsCount
        });

      } catch (error) {
        console.error("Error checking submission or tasks:", error);
      } finally {
        setChecking(false);
      }
    };
    fetchData();
  }, [currentUser, today]);

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      if (!currentUser) {
        toast.error("User session expired. Please log in again.");
        return;
      }

      const completionNum = Number(data.completionPercentage) || 0;
      const timeNum = Number(data.timeTaken) || 0;

      const safeTaskName = data.taskName || 'Daily Work Report';
      const safeTaskDesc = data.taskDescription || data.tomorrowPlan || 'Work update';

      if (existingReport) {
        const updatePayload = {
          taskId: data.taskId || null,
          taskName: safeTaskName,
          taskDescription: safeTaskDesc,
          completionPercentage: completionNum,
          timeTaken: timeNum,
          status: data.status || 'In Progress',
          blockers: data.blockers || '',
          tomorrowPlan: data.tomorrowPlan || '',
          remarks: data.remarks || '',
          updatedAt: new Date().toISOString(),
          version: (existingReport.version || 1) + 1
        };

        await updateDoc(doc(db, 'dailyReports', existingReport.id), updatePayload);

        // Sync linked task status if selected
        if (data.taskId) {
          try {
            await updateDoc(doc(db, 'tasks', data.taskId), {
              progressPercentage: completionNum,
              status: completionNum === 100 ? 'Done' : (data.status === 'Completed' ? 'Done' : data.status),
              latestUpdate: safeTaskDesc,
              updatedAt: new Date().toISOString()
            });
          } catch (taskErr) {
            console.warn("Could not sync task status:", taskErr);
          }
        }

        toast.success("Report updated successfully!");
        setExistingReport(prev => ({ 
          ...prev, 
          ...updatePayload
        }));
        setIsEditing(false);
      } else {
        const newReport = {
          employeeId: currentUser.uid,
          employeeName: userData?.name || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Employee',
          role: userData?.role || 'Employee',
          department: userData?.department || 'General',
          taskId: data.taskId || null,
          taskName: safeTaskName,
          taskDescription: safeTaskDesc,
          completionPercentage: completionNum,
          timeTaken: timeNum,
          status: data.status || 'In Progress',
          blockers: data.blockers || '',
          tomorrowPlan: data.tomorrowPlan || '',
          remarks: data.remarks || '',
          reportDate: today,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1
        };

        const docRef = await addDoc(collection(db, 'dailyReports'), newReport);

        // Sync linked task status if selected
        if (data.taskId) {
          try {
            await updateDoc(doc(db, 'tasks', data.taskId), {
              progressPercentage: completionNum,
              status: completionNum === 100 ? 'Done' : (data.status === 'Completed' ? 'Done' : data.status),
              latestUpdate: safeTaskDesc,
              updatedAt: new Date().toISOString()
            });
          } catch (taskErr) {
            console.warn("Could not sync task status:", taskErr);
          }
        }

        toast.success("Report submitted successfully!");
        setExistingReport({ id: docRef.id, ...newReport });
        setIsEditing(false);
        reset();
      }
    } catch (error) {
      console.error("Error submitting report:", error);
      toast.error(error?.message || "Failed to submit report");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  const statCards = [
    { label: 'Assigned Projects', value: stats.assignedProjects, icon: Folder, color: 'bg-blue-50 text-blue-600 border-blue-200' },
    { label: 'Pending Tasks', value: stats.pendingTasks, icon: CheckSquare, color: 'bg-amber-50 text-amber-600 border-amber-200' },
    { label: 'Completed Tasks', value: stats.completedTasks, icon: CheckCircle, color: 'bg-green-50 text-green-600 border-green-200' },
    { label: 'Pending Requests', value: stats.pendingRequests, icon: Send, color: 'bg-purple-50 text-purple-600 border-purple-200' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome, {userData?.name}</h1>
          <p className="text-gray-500 mt-1">Here is your active work dashboard and daily report center.</p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-medium border border-blue-100">
            Role: {userData?.role || 'Employee'}
          </div>
          <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg font-medium border border-indigo-100">
            Department: {userData?.department || 'General'}
          </div>
          <div className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium border border-gray-200">
            Date: {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Quick Stats Grid (Requirement #18) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className={`bg-white rounded-2xl p-6 shadow-sm border-2 ${card.color} hover:shadow-md transition-shadow`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">{card.label}</p>
                  <h3 className="text-3xl font-bold text-gray-900">{card.value}</h3>
                </div>
                <div className="p-3 rounded-xl bg-white/60 backdrop-blur-sm">
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Report Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6 border-b pb-4">Daily Work Report</h2>
        
        {existingReport && !isEditing ? (
          <div className="bg-green-50 p-8 rounded-xl border border-green-200 text-center flex flex-col items-center justify-center min-h-[200px]">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 text-3xl">
              ✅
            </div>
            <h3 className="text-2xl font-bold text-green-800">Today's Report Submitted</h3>
            
            <div className="mt-6 flex flex-col gap-2 text-sm text-green-700 font-medium">
              <p>Submitted At: {new Date(existingReport.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              <p>Last Updated: {new Date(existingReport.updatedAt || existingReport.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              <p>Version: {existingReport.version || 1}</p>
            </div>

            <div className="mt-8">
              <button 
                onClick={() => {
                  reset({
                    taskId: existingReport.taskId || '',
                    taskName: existingReport.taskName,
                    taskDescription: existingReport.taskDescription,
                    completionPercentage: existingReport.completionPercentage,
                    timeTaken: existingReport.timeTaken,
                    status: existingReport.status,
                    blockers: existingReport.blockers,
                    tomorrowPlan: existingReport.tomorrowPlan,
                    remarks: existingReport.remarks
                  });
                  setIsEditing(true);
                }}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-xl shadow-sm transition-all"
              >
                Edit Today's Report
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Assigned Task <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <select
                  {...register("taskId")}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors bg-white mb-4"
                  onChange={(e) => {
                    const selectedTask = assignedTasks.find(t => t.id === e.target.value);
                    if (selectedTask) {
                      setValue("taskName", selectedTask.title);
                      setValue("taskDescription", selectedTask.description || '');
                    }
                  }}
                >
                  <option value="">-- Custom Task --</option>
                  {assignedTasks.map(task => (
                    <option key={task.id} value={task.id}>
                      {task.title} ({task.projectName || 'No Project'})
                    </option>
                  ))}
                </select>

                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Today's Task Name <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("taskName", { required: "This field is required" })}
                  type="text"
                  placeholder="E.g. Frontend Header Component"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                />
                {errors.taskName && <p className="mt-1 text-sm text-red-600">{errors.taskName.message}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Task Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  {...register("taskDescription", { required: "This field is required" })}
                  rows={4}
                  placeholder="Describe what was completed today..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors resize-none"
                ></textarea>
                {errors.taskDescription && <p className="mt-1 text-sm text-red-600">{errors.taskDescription.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Time Taken (Hours) <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("timeTaken", { 
                    required: "This field is required",
                    min: { value: 0.5, message: "Minimum is 0.5 hours" },
                    max: { value: 24, message: "Maximum is 24 hours" }
                  })}
                  type="number"
                  step="0.5"
                  placeholder="E.g. 6"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                />
                {errors.timeTaken && <p className="mt-1 text-sm text-red-600">{errors.timeTaken.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  {...register("status", { required: "This field is required" })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors bg-white"
                >
                  <option value="In Progress">In Progress</option>
                  <option value="Review">Review</option>
                  <option value="Completed">Completed</option>
                  <option value="Blocked">Blocked</option>
                </select>
                {errors.status && <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>}
              </div>

              <div className="md:col-span-2">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Completion Percentage
                  </label>
                  <span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                    {completionPercentage}%
                  </span>
                </div>
                <input
                  {...register("completionPercentage")}
                  type="range"
                  min="0"
                  max="100"
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tomorrow's Plan <span className="text-red-500">*</span>
                </label>
                <textarea
                  {...register("tomorrowPlan", { required: "This field is required" })}
                  rows={2}
                  placeholder="What will you work on tomorrow?"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors resize-none"
                ></textarea>
                {errors.tomorrowPlan && <p className="mt-1 text-sm text-red-600">{errors.tomorrowPlan.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Challenges / Blockers <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  {...register("blockers")}
                  rows={2}
                  placeholder="Any issues blocking progress?"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors resize-none"
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Additional Remarks <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  {...register("remarks")}
                  rows={2}
                  placeholder="Any other notes..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors resize-none"
                ></textarea>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-4">
              {isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-8 rounded-xl transition-all"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-70 flex items-center gap-2"
              >
                {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                {isEditing ? "Update Report" : "Submit Report"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
