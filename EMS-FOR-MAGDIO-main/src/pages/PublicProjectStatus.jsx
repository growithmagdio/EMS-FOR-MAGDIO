import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { Folder, Calendar, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export default function PublicProjectStatus() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const docRef = doc(db, 'projects', projectId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && !docSnap.data().isDeleted) {
          setProject({ id: docSnap.id, ...docSnap.data() });
        } else {
          setError("Project not found or has been deleted.");
        }
      } catch (err) {
        console.error("Error fetching project:", err);
        setError("Failed to load project details. Please check the link.");
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-medium">Loading project details...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Oops!</h2>
          <p className="text-gray-600 mb-6">{error || "Project not found."}</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch(status) {
      case 'Completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'In Progress': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'On Hold': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'Completed': return <CheckCircle2 className="w-5 h-5" />;
      case 'In Progress': return <Clock className="w-5 h-5" />;
      case 'On Hold': return <AlertCircle className="w-5 h-5" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      {/* Brand Header */}
      <div className="mb-12 text-center">
        <div className="mx-auto w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg mb-4">
          <span className="text-white font-bold text-3xl">M</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">MAGDIO</h1>
        <p className="text-sm text-gray-500">Client Portal</p>
      </div>

      {/* Main Dashboard Card */}
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
        
        {/* Header Section */}
        <div className="p-8 sm:p-10 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Folder className="w-6 h-6 text-blue-600" />
                <h2 className="text-3xl font-extrabold text-gray-900 leading-tight">
                  {project.name}
                </h2>
              </div>
              <p className="text-lg text-gray-500 font-medium">{project.client}</p>
            </div>
            <div className={`px-4 py-2 rounded-full border flex items-center gap-2 font-bold uppercase tracking-wider text-sm ${getStatusColor(project.status)}`}>
              {getStatusIcon(project.status)}
              {project.status}
            </div>
          </div>

          {project.description && (
            <p className="text-gray-600 leading-relaxed mt-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
              {project.description}
            </p>
          )}
        </div>

        {/* Details Section */}
        <div className="p-8 sm:p-10 bg-gray-50/50">
          
          {/* Progress Bar */}
          <div className="mb-10 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-end mb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Project Progress</h3>
                <p className="text-sm text-gray-500">Overall completion status</p>
              </div>
              <span className="text-3xl font-extrabold text-blue-600">{project.completionPercentage}%</span>
            </div>
            <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden shadow-inner">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ease-out ${project.completionPercentage === 100 ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]'}`}
                style={{ width: `${project.completionPercentage}%` }}
              ></div>
            </div>
          </div>

          {/* Dates Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Start Date</p>
                <p className="text-lg font-bold text-gray-900">
                  {new Date(project.startDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <Calendar className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Target Deadline</p>
                <p className="text-lg font-bold text-gray-900">
                  {new Date(project.deadline).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
      
      <div className="mt-8 text-center text-sm text-gray-400">
        <p>This is a secure, read-only view of your project status.</p>
        <p>Powered by MAGDIO Reporting System.</p>
      </div>
    </div>
  );
}
