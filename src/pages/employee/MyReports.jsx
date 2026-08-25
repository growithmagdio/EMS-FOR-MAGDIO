import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { Plus, Edit2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { addDocument, updateDocument } from '../../utils/dbUtils';

export default function MyReports() {
  const { currentUser } = useAuth();
  const [reports, setReports] = useState([]);
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const today = new Date().toISOString().split('T')[0];

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();

  useEffect(() => {
    const fetchReports = async () => {
      if (!currentUser) return;
      try {
        const q = query(
          collection(db, 'dailyReports'),
          where('employeeId', '==', currentUser.uid),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const reportsList = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(r => !r.isDeleted);
        setReports(reportsList);

        const tasksQ = query(collection(db, 'tasks'), where('assignedEmployeeId', '==', currentUser.uid));
        const tasksSnap = await getDocs(tasksQ);
        setAssignedTasks(tasksSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(t => !t.isDeleted && t.status !== 'Done'));
      } catch (error) {
        console.error("Error fetching reports:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, [currentUser]);

  const onSubmit = async (data) => {
    try {
      const task = assignedTasks.find(t => t.id === data.taskId) || { id: 'General', title: 'General Task', projectId: '', projectName: '' };
      
      const reportData = {
        employeeId: currentUser.uid,
        employeeName: currentUser.displayName || 'Employee',
        reportDate: today,
        taskId: task.id,
        taskName: task.title,
        projectId: task.projectId,
        projectName: task.projectName,
        description: data.description,
        completionPercentage: Number(data.completionPercentage),
        hoursWorked: Number(data.hoursWorked),
        status: data.status,
        blockers: data.blockers,
        tomorrowPlan: data.tomorrowPlan,
        remarks: data.remarks
      };

      if (editingReport) {
        await updateDocument('dailyReports', editingReport.id, reportData);
        toast.success("Report updated successfully");
        setReports(reports.map(r => r.id === editingReport.id ? { ...r, ...reportData } : r));
      } else {
        const docRef = await addDocument('dailyReports', reportData);
        toast.success("Report submitted successfully");
        setReports([{ id: docRef.id, ...reportData }, ...reports]);
      }

      if (task.id !== 'General') {
        await updateDocument('tasks', task.id, {
          progressPercentage: reportData.completionPercentage,
          status: reportData.completionPercentage === 100 ? 'Done' : (data.status === 'Completed' ? 'Done' : data.status),
          latestUpdate: reportData.description,
          latestUpdateBy: currentUser.uid,
          latestUpdateAt: new Date().toISOString()
        });
        toast.success("Linked task progress updated automatically");
      }

      setIsModalOpen(false);
      reset();
      setEditingReport(null);
    } catch (error) {
      console.error("Error saving report:", error);
      toast.error("Failed to save report");
    }
  };

  const openEditModal = (report) => {
    setEditingReport(report);
    setValue("taskId", report.taskId);
    setValue("description", report.description);
    setValue("completionPercentage", report.completionPercentage);
    setValue("hoursWorked", report.hoursWorked);
    setValue("status", report.status);
    setValue("blockers", report.blockers);
    setValue("tomorrowPlan", report.tomorrowPlan);
    setValue("remarks", report.remarks);
    setIsModalOpen(true);
  };

  if (loading) {
    return <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Reports History</h1>
          <p className="text-gray-500 mt-1">Submit daily updates linked to your tasks</p>
        </div>
        <button
          onClick={() => {
            setEditingReport(null);
            reset({ status: 'In Progress', completionPercentage: 0 });
            setIsModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl shadow-sm flex items-center gap-2 font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          Submit Report
        </button>
      </div>
      
      {reports.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <p className="text-gray-500">You haven't submitted any reports yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            const isLocked = report.reportDate !== today;
            return (
            <div key={report.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 transition-all hover:shadow-md">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 border-b border-gray-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-gray-50 px-4 py-2 rounded-lg font-medium text-sm border border-gray-200 text-gray-700">
                    {new Date(report.reportDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                  {isLocked ? (
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-gray-100 text-gray-500 flex items-center gap-1">
                      Locked
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-green-100 text-green-700 flex items-center gap-1">
                        Editable
                      </span>
                      <button 
                        onClick={() => openEditModal(report)}
                        className="p-1.5 bg-gray-100 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    report.status === 'Completed' ? 'bg-green-100 text-green-700' :
                    report.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                    report.status === 'Blocked' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {report.status || 'Unknown'}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Task</p>
                  <p className="font-medium text-gray-900">{report.taskName || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Completion</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${report.completionPercentage === 100 ? 'bg-green-500' : 'bg-blue-500'}`} 
                        style={{ width: `${report.completionPercentage || 0}%` }}
                      ></div>
                    </div>
                    <span className="font-bold text-gray-700 text-sm">{report.completionPercentage || 0}%</span>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Time Taken</p>
                  <p className="font-medium text-gray-900">{report.timeTaken ? `${report.timeTaken} Hours` : 'N/A'}</p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Description</h4>
                  <p className="text-gray-800 whitespace-pre-wrap">{report.taskDescription || report.workDone || 'N/A'}</p>
                </div>

                {report.blockers && (
                  <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                    <h4 className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-1">Challenges</h4>
                    <p className="text-red-900 whitespace-pre-wrap">{report.blockers}</p>
                  </div>
                )}

                {report.tomorrowPlan && (
                  <div>
                    <h4 className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-2">Tomorrow's Plan</h4>
                    <p className="text-gray-800 whitespace-pre-wrap">{report.tomorrowPlan}</p>
                  </div>
                )}

                {report.remarks && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Remarks</h4>
                    <p className="text-gray-600 whitespace-pre-wrap italic">{report.remarks}</p>
                  </div>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Report Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center z-10">
              <h2 className="text-xl font-bold text-gray-900">
                {editingReport ? 'Edit Today\'s Report' : 'Submit Daily Report'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Select Task <span className="text-red-500">*</span></label>
                  <select {...register("taskId", { required: true })} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500">
                    <option value="">-- Choose Assigned Task --</option>
                    <option value="General">General / Not Task Related</option>
                    {assignedTasks.map(t => (
                      <option key={t.id} value={t.id}>{t.title} ({t.projectName || 'Personal'})</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Work Description <span className="text-red-500">*</span></label>
                  <textarea {...register("description", { required: true })} rows={3} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500" placeholder="What did you do today?" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Completion % <span className="text-red-500">*</span></label>
                  <input {...register("completionPercentage", { required: true, min: 0, max: 100 })} type="number" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Hours Worked <span className="text-red-500">*</span></label>
                  <input {...register("hoursWorked", { required: true, min: 0.5, max: 24, valueAsNumber: true })} type="number" step="0.5" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Status <span className="text-red-500">*</span></label>
                  <select {...register("status")} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500">
                    <option value="In Progress">In Progress</option>
                    <option value="Review">Review</option>
                    <option value="Completed">Completed</option>
                    <option value="Blocked">Blocked</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Blockers / Challenges</label>
                  <textarea {...register("blockers")} rows={2} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500" placeholder="Any issues preventing progress?" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Tomorrow's Plan <span className="text-red-500">*</span></label>
                  <textarea {...register("tomorrowPlan", { required: true })} rows={2} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500" placeholder="What will you work on tomorrow?" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Remarks</label>
                  <textarea {...register("remarks")} rows={2} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500" placeholder="Any other notes for Admin?" />
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium">Cancel</button>
                <button type="submit" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium">{editingReport ? 'Update Report' : 'Submit Report'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
