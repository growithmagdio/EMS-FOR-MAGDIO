import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, getDocs } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { updateDocument, softDeleteDocument } from '../../utils/dbUtils';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import { X, Search, Filter, Calendar, FileText } from 'lucide-react';

export default function TodaysReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);

  // Filters
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedEmployee, setSelectedEmployee] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const { register, handleSubmit, reset, setValue } = useForm();

  const fetchReports = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(collection(db, 'dailyReports'));
      const reportsList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(r => !r.isDeleted);
      reportsList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setReports(reportsList);
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleEditClick = (report) => {
    setEditingReport(report);
    setValue("description", report.description || report.workDone || report.taskDescription || '');
    setValue("completionPercentage", report.completionPercentage || 0);
    setValue("hoursWorked", report.hoursWorked || report.timeTaken || 0);
    setValue("status", report.status || 'In Progress');
    setValue("blockers", report.blockers || '');
    setValue("tomorrowPlan", report.tomorrowPlan || '');
    setValue("remarks", report.remarks || '');
    setIsModalOpen(true);
  };

  const onSubmit = async (data) => {
    try {
      const reportData = {
        description: data.description,
        taskDescription: data.description,
        completionPercentage: Number(data.completionPercentage),
        hoursWorked: Number(data.hoursWorked),
        timeTaken: Number(data.hoursWorked),
        status: data.status,
        blockers: data.blockers,
        tomorrowPlan: data.tomorrowPlan,
        remarks: data.remarks,
        version: (editingReport.version || 1) + 1,
        updatedAt: new Date().toISOString()
      };

      await updateDocument('dailyReports', editingReport.id, reportData);
      toast.success("Report updated successfully");
      setReports(reports.map(r => r.id === editingReport.id ? { ...r, ...reportData } : r));
      
      setIsModalOpen(false);
      reset();
      setEditingReport(null);
    } catch (error) {
      toast.error("Failed to update report");
    }
  };

  const handleDeleteClick = (id) => {
    setReportToDelete(id);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await softDeleteDocument('dailyReports', reportToDelete);
      setReports(reports.filter(r => r.id !== reportToDelete));
      toast.success("Report deleted successfully");
    } catch (error) {
      toast.error("Failed to delete report");
    } finally {
      setDeleteModalOpen(false);
      setReportToDelete(null);
    }
  };

  // Extract unique employee names for dropdown
  const uniqueEmployees = ['All', ...new Set(reports.map(r => r.employeeName).filter(Boolean))];

  const filteredReports = reports.filter(r => {
    const matchesDate = !selectedDate || r.reportDate === selectedDate;
    const matchesEmployee = selectedEmployee === 'All' || r.employeeName === selectedEmployee;
    const matchesStatus = selectedStatus === 'All' || r.status === selectedStatus;
    const matchesSearch = 
      !searchTerm ||
      r.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.taskName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.taskDescription || r.description || r.workDone || '')?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesDate && matchesEmployee && matchesStatus && matchesSearch;
  });

  if (loading) return <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Today's & Daily Reports</h1>
          <p className="text-gray-500 text-sm mt-1">Review work reports submitted by employees across the company</p>
        </div>
        <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl font-semibold border border-blue-100 text-sm self-start sm:self-auto">
          Showing: {filteredReports.length} Report{filteredReports.length !== 1 && 's'}
        </div>
      </div>

      {/* Filter Toolbar (Requirement #14) */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
          <input
            type="text"
            placeholder="Search report, task or employee..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap md:flex-nowrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl">
            <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-sm focus:outline-none text-gray-700 cursor-pointer"
            />
            {selectedDate && (
              <button 
                onClick={() => setSelectedDate('')}
                className="text-xs text-gray-400 hover:text-gray-600 font-bold ml-1"
                title="Show all dates"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400 shrink-0" />
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {uniqueEmployees.map(emp => (
                <option key={emp} value={emp}>{emp === 'All' ? 'All Employees' : emp}</option>
              ))}
            </select>
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Statuses</option>
            <option value="In Progress">In Progress</option>
            <option value="Review">Review</option>
            <option value="Completed">Completed</option>
            <option value="Blocked">Blocked</option>
          </select>
        </div>
      </div>

      {filteredReports.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No reports found for the selected filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredReports.map((report) => (
            <div key={report.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 transition-all hover:shadow-md">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6 border-b border-gray-100 pb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-lg">
                    {report.employeeName?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{report.employeeName || 'Employee'}</h3>
                    <p className="text-sm text-gray-500">{report.role || 'Employee'} &bull; {report.department || 'General'}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-medium">
                      Date: {report.reportDate}
                    </span>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      report.status === 'Completed' ? 'bg-green-100 text-green-700' :
                      report.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                      report.status === 'Blocked' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {report.status || 'In Progress'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleEditClick(report)}
                      className="text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-lg transition-colors"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteClick(report.id)}
                      className="text-xs font-medium text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Task</p>
                  <p className="font-medium text-gray-900">{report.taskName || 'Custom Task'}</p>
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
                  <p className="font-medium text-gray-900">{report.timeTaken || report.hoursWorked ? `${report.timeTaken || report.hoursWorked} Hours` : 'N/A'}</p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Description</h4>
                  <p className="text-gray-800 whitespace-pre-wrap">{report.taskDescription || report.description || report.workDone || 'N/A'}</p>
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

              <div className="mt-6 pt-4 border-t border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs font-medium uppercase tracking-wider">
                <div className="text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                  Version: {report.version || 1}
                </div>
                <div className="flex flex-col md:flex-row gap-4 text-gray-400 text-right md:text-left">
                  <p>
                    Submitted: {report.createdAt ? new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                  </p>
                  {report.updatedAt && (
                    <p>
                      Last Updated: {new Date(report.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Admin Edit Report Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center z-10">
              <h2 className="text-xl font-bold text-gray-900">Edit Report (Admin)</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Work Description <span className="text-red-500">*</span></label>
                  <textarea {...register("description", { required: true })} rows={3} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500" />
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
                  <select {...register("status")} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="In Progress">In Progress</option>
                    <option value="Review">Review</option>
                    <option value="Completed">Completed</option>
                    <option value="Blocked">Blocked</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Blockers / Challenges</label>
                  <textarea {...register("blockers")} rows={2} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Tomorrow's Plan</label>
                  <textarea {...register("tomorrowPlan")} rows={2} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Remarks</label>
                  <textarea {...register("remarks")} rows={2} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium">Cancel</button>
                <button type="submit" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium">Update Report</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmModal 
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setReportToDelete(null);
        }}
        onConfirm={confirmDelete}
        itemName="this report"
      />
    </div>
  );
}
