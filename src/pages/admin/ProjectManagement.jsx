import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { db } from '../../firebase/config';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { Plus, Edit2, Trash2, X, Folder, Users, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { addDocument, updateDocument, softDeleteDocument } from '../../utils/dbUtils';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';

export default function ProjectManagement() {
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();

  useEffect(() => {
    const fetchProjectsAndEmployees = async () => {
      try {
        // Fetch Projects
        const projSnap = await getDocs(collection(db, 'projects'));
        const projList = projSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(p => !p.isDeleted);
        setProjects(projList);

        // Fetch Employees
        const empQ = query(collection(db, 'users'), where('role', '==', 'Employee'));
        const empSnap = await getDocs(empQ);
        setEmployees(empSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(emp => !emp.isDeleted && emp.isActive !== false)
        );

        // Fetch Clients
        const clientsSnap = await getDocs(collection(db, 'clients'));
        setClients(clientsSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(c => !c.isDeleted));
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    fetchProjectsAndEmployees();
  }, []);

  const onSubmit = async (data) => {
    try {
      // Convert multi-select assignedEmployees to array if it's not already
      const assigned = Array.isArray(data.assignedEmployees) ? data.assignedEmployees : [data.assignedEmployees].filter(Boolean);
      
      const projectData = {
        name: data.name,
        client: data.client || 'Internal',
        description: data.description,
        startDate: data.startDate,
        deadline: data.deadline,
        status: data.status,
        completionPercentage: Number(data.completionPercentage || 0),
        assignedEmployees: assigned,
        updatedAt: new Date().toISOString()
      };

      if (editingProject) {
        await updateDocument('projects', editingProject.id, projectData);
        toast.success("Project updated successfully");
      } else {
        await addDocument('projects', projectData);
        toast.success("Project created successfully");
      }
      
      setIsModalOpen(false);
      reset();
      setEditingProject(null);
      window.location.reload();
    } catch (error) {
      console.error("Error saving project:", error);
      toast.error("Failed to save project");
    }
  };

  const openEditModal = (project) => {
    setEditingProject(project);
    setValue("name", project.name);
    setValue("client", project.client);
    setValue("description", project.description);
    setValue("startDate", project.startDate);
    setValue("deadline", project.deadline);
    setValue("status", project.status);
    setValue("completionPercentage", project.completionPercentage);
    setValue("assignedEmployees", project.assignedEmployees || []);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id) => {
    setProjectToDelete(id);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await softDeleteDocument('projects', projectToDelete);
      toast.success("Project deleted successfully");
      setProjects(projects.filter(p => p.id !== projectToDelete));
    } catch (error) {
      toast.error("Failed to delete project");
    } finally {
      setDeleteModalOpen(false);
      setProjectToDelete(null);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Project Management</h1>
          <p className="text-gray-500 mt-1">Manage client projects and assignments</p>
        </div>
        <button
          onClick={() => {
            setEditingProject(null);
            reset({ status: 'Planning', completionPercentage: 0 });
            setIsModalOpen(true);
          }}
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
            <p className="text-gray-500">No projects found. Create your first project to get started.</p>
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
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500 font-medium">Progress</span>
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

                <div className="flex items-center gap-2 text-sm text-gray-600 mb-6 bg-blue-50 p-3 rounded-xl border border-blue-100">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-blue-900">
                    {project.assignedEmployees?.length || 0} Team Member{(project.assignedEmployees?.length !== 1) && 's'}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-100">
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
                  onClick={() => openEditModal(project)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl font-medium transition-colors"
                >
                  <Edit2 className="w-4 h-4" /> Edit
                </button>
                <button 
                  onClick={() => handleDeleteClick(project.id)}
                  className="flex items-center justify-center p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors"
                  title="Delete Project"
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
                {editingProject ? 'Edit Project' : 'Create New Project'}
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Project Name <span className="text-red-500">*</span></label>
                  <input
                    {...register("name", { required: "Project name is required" })}
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. MAGDIO EMS"
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Client</label>
                  <select
                    {...register("client")}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Internal Project</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.companyName}>{c.companyName}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                  <textarea
                    {...register("description")}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Project details..."
                  ></textarea>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date <span className="text-red-500">*</span></label>
                  <input
                    {...register("startDate", { required: true })}
                    type="date"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Deadline <span className="text-red-500">*</span></label>
                  <input
                    {...register("deadline", { required: true })}
                    type="date"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                  <select
                    {...register("status")}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="Planning">Planning</option>
                    <option value="In Progress">In Progress</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Completion %</label>
                  <input
                    {...register("completionPercentage", { min: 0, max: 100 })}
                    type="number"
                    min="0"
                    max="100"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Assign Employees</label>
                  <div className="border border-gray-300 rounded-xl max-h-48 overflow-y-auto bg-gray-50 p-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {employees.map(emp => (
                      <label key={emp.id} className="flex items-center gap-3 p-3 bg-white hover:bg-blue-50 rounded-lg cursor-pointer transition-colors border border-gray-100 shadow-sm">
                        <input 
                          type="checkbox" 
                          value={emp.id}
                          {...register("assignedEmployees")}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{emp.name}</p>
                          <p className="text-xs text-gray-500 truncate">{emp.department}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Select the team members for this project.</p>
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
                  {editingProject ? 'Update Project' : 'Create Project'}
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
          setProjectToDelete(null);
        }}
        onConfirm={confirmDelete}
        itemName="this project"
      />
    </div>
  );
}
