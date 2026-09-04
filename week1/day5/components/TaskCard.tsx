'use client';

import React from 'react';

export interface TaskCardProps {
  task: {
    _id: string;
    title: string;
    description?: string;
    status: 'TO_DO' | 'IN_PROGRESS' | 'UNDER_REVIEW' | 'COMPLETED';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    dueDate?: string;
    assigneeId?: { _id: string; fullName: string; email?: string } | string;
    projectId?: { _id: string; name: string } | string;
    createdAt?: string;
  };
  users: Array<{ _id: string; fullName: string }>;
  projects: Array<{ _id: string; name: string }>;
  userRole?: string;
  onStatusChange: (taskId: string, newStatus: string) => void;
  onEditTask: (task: any) => void;
  onDeleteTask: (taskId: string) => void;
}

export default function TaskCard({
  task,
  users,
  projects,
  userRole = 'OrgAdmin',
  onStatusChange,
  onEditTask,
  onDeleteTask,
}: TaskCardProps) {
  const canEditOrDelete = userRole === 'SuperAdmin' || userRole === 'OrgAdmin' || userRole === 'ProjectManager';

  // Helper for Priority Pills styling
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-[#FFEBEB] text-[#E11D48] border-[#FECDD3]';
      case 'HIGH':
        return 'bg-[#FFF3E0] text-[#D97706] border-[#FDE68A]';
      case 'MEDIUM':
        return 'bg-[#E0F2FE] text-[#0284C7] border-[#BAE6FD]';
      case 'LOW':
      default:
        return 'bg-[#F3E8FF] text-[#7E22CE] border-[#E9D5FF]';
    }
  };

  // Resolve Assignee Name
  const getAssigneeName = () => {
    if (!task.assigneeId) return 'Unassigned';
    if (typeof task.assigneeId === 'object' && task.assigneeId.fullName) {
      return task.assigneeId.fullName;
    }
    const found = users.find((u) => u._id === task.assigneeId);
    return found ? found.fullName : 'Assigned User';
  };

  // Resolve Project Name
  const getProjectName = () => {
    if (!task.projectId) return null;
    if (typeof task.projectId === 'object' && task.projectId.name) {
      return task.projectId.name;
    }
    const found = projects.find((p) => p._id === task.projectId);
    return found ? found.name : null;
  };

  const assigneeName = getAssigneeName();
  const projectName = getProjectName();

  const formattedDueDate = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between space-y-3 w-full min-w-0 overflow-hidden">
      <div>
        {/* Badges Bar: Priority & Project Name */}
        <div className="flex items-center justify-between gap-2 mb-2 min-w-0">
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide border shrink-0 ${getPriorityBadge(task.priority)}`}>
            {task.priority}
          </span>
          {projectName && (
            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-[120px] shrink">
              {projectName}
            </span>
          )}
        </div>

        {/* Task Title */}
        <h3 className="font-bold text-slate-900 text-sm leading-snug group-hover:text-[#FF6B2C] transition-colors line-clamp-2 break-words">
          {task.title}
        </h3>

        {/* Description Preview */}
        {task.description && (
          <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed break-words">
            {task.description}
          </p>
        )}
      </div>

      {/* Footer Info: Due Date, Assignee Avatar & Actions */}
      <div className="pt-2.5 border-t border-slate-100 space-y-2 min-w-0">
        <div className="flex items-center justify-between gap-2 min-w-0">
          {/* Due Date Pill */}
          {formattedDueDate ? (
            <div className="flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/60 shrink-0">
              <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{formattedDueDate}</span>
            </div>
          ) : (
            <span className="text-[10px] text-slate-400 font-medium italic shrink-0">No due date</span>
          )}

          {/* Assignee Avatar */}
          <div className="flex items-center gap-1.5 min-w-0 shrink" title={`Assignee: ${assigneeName}`}>
            <div className="w-5 h-5 rounded-full bg-[#1E1F24] text-white text-[9px] font-bold flex items-center justify-center border border-slate-200 shrink-0">
              {assigneeName.charAt(0).toUpperCase()}
            </div>
            <span className="text-[11px] font-medium text-slate-600 truncate">
              {assigneeName}
            </span>
          </div>
        </div>

        {/* Status Select & Quick Actions (RBAC Enforced) */}
        <div className="flex items-center justify-between gap-1 pt-1 min-w-0">
          <select
            value={task.status}
            onChange={(e) => onStatusChange(task._id, e.target.value)}
            className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg px-2 py-1 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#FF6B2C] shrink-0"
          >
            <option value="TO_DO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="UNDER_REVIEW">Review</option>
            <option value="COMPLETED">Complete</option>
          </select>

          {canEditOrDelete && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onEditTask(task)}
                title="Edit Task"
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>

              <button
                onClick={() => onDeleteTask(task._id)}
                title="Delete Task"
                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
