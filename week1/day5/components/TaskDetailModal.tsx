'use client';

import React from 'react';

export interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: any;
  projects?: Array<any>;
  users?: Array<any>;
  onSelectProjectDetail?: (project: any) => void;
}

export default function TaskDetailModal({
  isOpen,
  onClose,
  task,
  projects = [],
  users = [],
  onSelectProjectDetail,
}: TaskDetailModalProps) {
  if (!isOpen || !task) return null;

  // Resolve project
  let projectObj: any = null;
  if (typeof task.projectId === 'object' && task.projectId?.name) {
    projectObj = task.projectId;
  } else if (task.projectId) {
    projectObj = projects.find((p) => String(p._id) === String(task.projectId));
  }

  // Resolve assignee
  let assigneeName = 'Unassigned';
  let assigneeEmail = '';
  if (typeof task.assigneeId === 'object' && task.assigneeId?.fullName) {
    assigneeName = task.assigneeId.fullName;
    assigneeEmail = task.assigneeId.email || '';
  } else if (task.assigneeId) {
    const foundUser = users.find((u) => String(u._id) === String(task.assigneeId));
    if (foundUser) {
      assigneeName = foundUser.fullName;
      assigneeEmail = foundUser.email || '';
    }
  }

  // Resolve reporter/creator
  let reporterName = 'System / Unknown';
  let reporterEmail = '';
  if (typeof task.reporterId === 'object' && task.reporterId?.fullName) {
    reporterName = task.reporterId.fullName;
    reporterEmail = task.reporterId.email || '';
  } else if (task.reporterId) {
    const foundUser = users.find((u) => String(u._id) === String(task.reporterId));
    if (foundUser) {
      reporterName = foundUser.fullName;
      reporterEmail = foundUser.email || '';
    }
  }

  // Priorities and statuses styling
  const priorityColor =
    task.priority === 'URGENT'
      ? 'bg-rose-100 text-rose-800 border-rose-200'
      : task.priority === 'HIGH'
      ? 'bg-amber-100 text-amber-800 border-amber-200'
      : task.priority === 'MEDIUM'
      ? 'bg-blue-100 text-blue-800 border-blue-200'
      : 'bg-slate-100 text-slate-700 border-slate-200';

  const statusColor =
    task.status === 'DONE'
      ? 'bg-emerald-100 text-emerald-800'
      : task.status === 'IN_PROGRESS' || task.status === 'IN_REVIEW'
      ? 'bg-blue-100 text-blue-800'
      : 'bg-amber-100 text-amber-800';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold text-lg flex items-center justify-center shadow-md shadow-purple-500/20 shrink-0">
              ✓
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${priorityColor}`}>
                  {task.priority || 'MEDIUM'} Priority
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusColor}`}>
                  {task.status || 'TODO'}
                </span>
              </div>
              <h3 className="font-extrabold text-slate-900 text-lg leading-snug mt-1">{task.title}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          {/* Description */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Task Description</p>
            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
              {task.description || 'No description provided for this task.'}
            </p>
          </div>

          {/* Project Connection */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Associated Project</p>
            {projectObj ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-extrabold text-slate-900">{projectObj.name}</p>
                  {projectObj.orgId && (
                    <p className="text-[11px] text-slate-500">
                      Org: {typeof projectObj.orgId === 'object' ? projectObj.orgId.name : 'Tenant'}
                    </p>
                  )}
                </div>
                {onSelectProjectDetail && (
                  <button
                    onClick={() => onSelectProjectDetail(projectObj)}
                    className="text-xs text-[#FF6B2C] font-bold hover:underline"
                  >
                    View Project →
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No specific project linked.</p>
            )}
          </div>

          {/* People Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Assignee */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Assigned To</p>
              <p className="text-sm font-extrabold text-slate-900">{assigneeName}</p>
              {assigneeEmail && <p className="text-xs text-slate-500 font-mono mt-0.5">{assigneeEmail}</p>}
            </div>

            {/* Reporter */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Reported By</p>
              <p className="text-sm font-extrabold text-slate-900">{reporterName}</p>
              {reporterEmail && <p className="text-xs text-slate-500 font-mono mt-0.5">{reporterEmail}</p>}
            </div>
          </div>

          {/* Timeline Meta */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Due Date</p>
              <p className="text-xs font-mono font-bold text-slate-800 mt-0.5">
                {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date set'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Created</p>
              <p className="text-xs font-mono text-slate-600 mt-0.5">
                {task.createdAt ? new Date(task.createdAt).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
