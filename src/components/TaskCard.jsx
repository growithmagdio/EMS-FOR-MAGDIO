import { Calendar, User, Clock, CheckCircle2, AlertCircle, Edit2, Trash2 } from 'lucide-react';

export default function TaskCard({ task, onUpdateProgress, onMarkComplete, onEdit, onDelete, isPersonal }) {
  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 p-5 flex flex-col h-full">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 line-clamp-1">{task.title}</h3>
          <p className="text-sm font-medium text-blue-600 mt-1">{task.projectName || 'General Task'}</p>
        </div>
        <div className="flex items-center gap-2">
          {(isPersonal || onDelete) && (
            <div className="flex gap-1 mr-2">
              {onEdit && isPersonal && (
                <button onClick={() => onEdit(task)} className="p-1 text-gray-400 hover:text-blue-600 transition-colors" title="Edit Personal Task">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
              {onDelete && (
                <button onClick={() => onDelete(task.id)} className="p-1 text-gray-400 hover:text-red-600 transition-colors" title="Delete Task">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(task.priority)}`}>
            {task.priority || 'Normal'}
          </span>
        </div>
      </div>

      <div className="flex-1 space-y-3">
        <p className="text-sm text-gray-600 line-clamp-2">{task.description}</p>
        
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-1.5 text-gray-500">
            <User className="w-4 h-4" />
            <span className="truncate" title={task.assignedByName}>By: {task.assignedByName || 'Admin'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}</span>
          </div>
        </div>

        {task.latestUpdate && (
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <p className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Latest Update
            </p>
            <p className="text-xs text-gray-600 line-clamp-2">{task.latestUpdate}</p>
          </div>
        )}
      </div>

      <div className="mt-5 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm font-bold text-blue-600">{task.progressPercentage || 0}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 mb-4 overflow-hidden">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out" 
            style={{ width: `${task.progressPercentage || 0}%` }}
          ></div>
        </div>
        
        <div className="flex gap-2">
          {onUpdateProgress && (
            <button 
              onClick={() => onUpdateProgress(task)}
              className="flex-1 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              Update
            </button>
          )}
          {onMarkComplete && task.status !== 'Completed' && (
            <button 
              onClick={() => onMarkComplete(task)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              Complete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
