import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import toast from 'react-hot-toast';

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

  const completionPercentage = watch("completionPercentage");
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const checkSubmission = async () => {
      if (!currentUser) return;
      try {
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

        // Fetch Assigned Tasks
        const tasksQ = query(
          collection(db, 'tasks'),
          where('assignedEmployeeId', '==', currentUser.uid),
          where('status', 'in', ['To Do', 'In Progress', 'Review'])
        );
        const tasksSnap = await getDocs(tasksQ);
        setAssignedTasks(tasksSnap.docs.map(t => ({ id: t.id, ...t.data() })));
      } catch (error) {
        console.error("Error checking submission or tasks:", error);
      } finally {
        setChecking(false);
      }
    };
    checkSubmission();
  }, [currentUser, today]);

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      if (existingReport) {
        await updateDoc(doc(db, 'dailyReports', existingReport.id), {
          taskId: data.taskId || null,
          taskName: data.taskName,
          taskDescription: data.taskDescription,
          completionPercentage: Number(data.completionPercentage),
          timeTaken: Number(data.timeTaken),
          status: data.status,
          blockers: data.blockers || '',
          tomorrowPlan: data.tomorrowPlan || '',
          remarks: data.remarks || '',
          updatedAt: new Date().toISOString(),
          version: (existingReport.version || 1) + 1
        });
        toast.success("Report updated successfully!");
        setExistingReport(prev => ({ 
          ...prev, 
          ...data, 
          completionPercentage: Number(data.completionPercentage),
          timeTaken: Number(data.timeTaken),
          version: (prev.version || 1) + 1, 
          updatedAt: new Date().toISOString() 
        }));
        setIsEditing(false);
      } else {
        const newReport = {
          employeeId: currentUser.uid,
          employeeName: userData.name,
          role: userData.role,
          department: userData.department,
          taskId: data.taskId || null,
          taskName: data.taskName,
          taskDescription: data.taskDescription,
          completionPercentage: Number(data.completionPercentage),
          timeTaken: Number(data.timeTaken),
          status: data.status,
          blockers: data.blockers || '',
          tomorrowPlan: data.tomorrowPlan || '',
          remarks: data.remarks || '',
          reportDate: today,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1
        };
        const docRef = await addDoc(collection(db, 'dailyReports'), newReport);
        toast.success("Report submitted successfully!");
        setExistingReport({ id: docRef.id, ...newReport });
        setIsEditing(false);
        reset();
      }
    } catch (error) {
      toast.error("Failed to submit report");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return <div className="animate-pulse flex space-x-4"><div className="flex-1 space-y-6 py-1"><div className="h-2 bg-gray-200 rounded"></div></div></div>;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome, {userData?.name}</h1>
          <p className="text-gray-500 mt-1">Here is your daily dashboard.</p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-medium border border-blue-100">
            Role: {userData?.role}
          </div>
          <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg font-medium border border-indigo-100">
            Department: {userData?.department}
          </div>
          <div className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium border border-gray-200">
            Date: {new Date().toLocaleDateString()}
          </div>
        </div>
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
                      setValue("taskDescription", selectedTask.description);
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
                  placeholder="E.g. Employee Dashboard Development"
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
                  <option value="Not Started">Not Started</option>
                  <option value="In Progress">In Progress</option>
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
