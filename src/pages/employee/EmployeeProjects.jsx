import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Folder, Users, Plus, Edit2, X, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { addDocument, updateDocument } from '../../utils/dbUtils';

export default function EmployeeProjects() {
  const { currentUser } = useAuth();
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  const { register: reqRegister, handleSubmit: handleReqSubmit, reset: reqReset, formState: { errors: reqErrors } } = useForm();
  const { register: updRegister, handleSubmit: handleUpdSubmit, reset: updReset, setValue: updSetValue } = useForm();

  useEffect(() => {
    const fetchProjects = async () => {
      if (!currentUser) return;
      try {
        const q = query(collection(db, 'projects'), where('assignedEmployees', 'array-contains', currentUser.uid));
        const snapshot = await getDocs(q);
        const projList = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(p => !p.isDeleted);
        setProjects(projList);

        // Fetch all employees for request form
        const empQ = query(collection(db, 'users'), where('role', '==', 'Employee'));
        const empSnap = await getDocs(empQ);
        setEmployees(empSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(emp => !emp.isDeleted && emp.isActive !== false)
        );
      } catch (error) {
        console.error("Error fetching projects:", error);
        toast.error("Failed to load projects");
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, [currentUser]);

  const onRequestSubmit = async (data) => {
    try {
      let assigned = Array.isArray(data.requestedTeam) ? data.requestedTeam : [data.requestedTeam].filter(Boolean);
      
      // Auto-assign the employee who is creating it if they aren't in the list
      if (!assigned.includes(currentUser.uid)) {
        assigned.push(currentUser.uid);
      }

      await addDocument('projects', {
        name: data.name,
        client: data.client || 'Internal',
        description: data.description || '',
        startDate: data.startDate,
        deadline: data.deadline,
        status: 'Planning',
        completionPercentage: 0,
        assignedEmployees: assigned,
        createdBy: currentUser.uid,
        updatedAt: new Date().toISOString()
      });
      
      toast.success("Project created successfully");
      setIsRequestModalOpen(false);
      reqReset();
      window.location.reload(); // Refresh to show new project
    } catch (error) {
      console.error(error);
      toast.error("Failed to create project");
    }
  };

  const onUpdateSubmit = async (data) => {
    try {
      await updateDocument('projects', selectedProject.id, {
        completionPercentage: Number(data.completionPercentage),
        latestUpdate: data.latestUpdate,
        latestUpdateBy: currentUser.uid,
        latestUpdateAt: new Date().toISOString()
      });
      toast.success("Project updated successfully");
      setIsUpdateModalOpen(false);
      updReset();
      setSelectedProject(null);
      // Update local state to reflect change instantly
      setProjects(projects.map(p => 
        p.id === selectedProject.id 
          ? { ...p, completionPercentage: Number(data.completionPercentage), latestUpdate: data.latestUpdate }
          : p
      ));
    } catch (error) {
      toast.error("Failed to update project");
    }
  };

  if (loading) return <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Projects</h1>
          <p className="text-gray-500 mt-1">Projects you are currently assigned to</p>
        </div>
        <button
          onClick={() => setIsRequestModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl shadow-sm flex items-center gap-2 font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Project
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Folder className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500">You are not assigned to any projects at the moment.</p>
          </div>
        ) : (
          projects.map((project) => (
            <div key={project.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col h-full hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 line-clamp-1">{project.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">Client: {project.client}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  project.status === 'Completed' ? 'bg-green-100 text-green-700' :
                  project.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                  project.status === 'On Hold' ? 'bg-amber-100 text-amber-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {project.status}
                </span>
              </div>
              
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-6 line-clamp-2">{project.description}</p>

                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500 font-medium">Overall Progress</span>
                    <span className="font-bold text-blue-600">{project.completionPercentage}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${project.completionPercentage === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                      style={{ width: `${project.completionPercentage}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Start Date</p>
                    <p className="font-medium text-gray-900">{new Date(project.startDate).toLocaleDateString()}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Deadline</p>
                    <p className="font-medium text-gray-900">{new Date(project.deadline).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600 mt-auto bg-blue-50 p-3 rounded-xl border border-blue-100">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-blue-900">
                    {project.assignedEmployees?.length || 0} Team Member{(project.assignedEmployees?.length !== 1) && 's'}
                  </span>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
                  <button 
                    onClick={() => {
                      const statusLink = `${window.location.origin}/status/${project.id}`;
                      navigator.clipboard.writeText(statusLink);
                      toast.success('Client status link copied!');
                    }}
                    className="flex items-center justify-center p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl transition-colors"
                    title="Copy Client Link"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedProject(project);
                      updSetValue('completionPercentage', project.completionPercentage || 0);
                      updSetValue('latestUpdate', project.latestUpdate || '');
                      setIsUpdateModalOpen(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl font-medium transition-colors"
                  >
                    <Edit2 className="w-4 h-4" /> Update Progress
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Request Project Modal */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="border-b border-gray-100 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Create New Project</h2>
              <button onClick={() => setIsRequestModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleReqSubmit(onRequestSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Project Name <span className="text-red-500">*</span></label>
                <input {...reqRegister("name", { required: true })} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Client (Optional)</label>
                <input {...reqRegister("client")} placeholder="e.g. Acme Corp" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea {...reqRegister("description")} rows={2} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date <span className="text-red-500">*</span></label>
                  <input type="date" {...reqRegister("startDate", { required: true })} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Deadline <span className="text-red-500">*</span></label>
                  <input type="date" {...reqRegister("deadline", { required: true })} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Assign Team Members</label>
                <div className="border border-gray-300 rounded-xl max-h-40 overflow-y-auto bg-gray-50 p-2 space-y-1">
                  {employees.map(emp => (
                    <label key={emp.id} className="flex items-center gap-3 p-2 bg-white hover:bg-blue-50 rounded-lg cursor-pointer transition-colors border border-gray-100 shadow-sm">
                      <input 
                        type="checkbox" 
                        value={emp.id}
                        {...reqRegister("requestedTeam")}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="text-sm font-medium text-gray-900 truncate">{emp.name}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">Select the team members for this project. You will be automatically assigned.</p>
              </div>
              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsRequestModalOpen(false)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium">Create Project</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Project Modal */}
      {isUpdateModalOpen && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="border-b border-gray-100 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Update Progress</h2>
              <button onClick={() => setIsUpdateModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdSubmit(onUpdateSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Completion %</label>
                <input {...updRegister("completionPercentage", { min: 0, max: 100 })} type="number" min="0" max="100" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500" />
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
    </div>
  );
}
