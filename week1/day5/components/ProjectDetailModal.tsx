'use client';

import React from 'react';

export interface ProjectDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: any;
  tasks?: Array<any>;
  teams?: Array<any>;
  users?: Array<any>;
  onSelectTaskDetail?: (task: any) => void;
  onSelectTeamDetail?: (team: any) => void;
}

export default function ProjectDetailModal({
  isOpen,
  onClose,
  project,
  tasks = [],
  teams = [],
  users = [],
  onSelectTaskDetail,
  onSelectTeamDetail,
}: ProjectDetailModalProps) {
  if (!isOpen || !project) return null;

  // Filter tasks belonging to this project
  const projectTasks = tasks.filter((t) => {
    const tProjId = typeof t.projectId === 'object' ? t.projectId?._id : t.projectId;
    return String(tProjId) === String(project._id);
  });

  // Task status counts
  const todoCount = projectTasks.filter((t) => t.status === 'TODO').length;
  const inProgressCount = projectTasks.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'IN_REVIEW').length;
  const doneCount = projectTasks.filter((t) => t.status === 'DONE').length;

  // Manager name
  let managerName = 'Unassigned';
  if (typeof project.managerId === 'object' && project.managerId?.fullName) {
    managerName = project.managerId.fullName;
  } else if (project.managerId) {
    const foundUser = users.find((u) => String(u._id) === String(project.managerId));
    if (foundUser) managerName = foundUser.fullName;
  }

  // Assigned Team
  let assignedTeamObj: any = null;
  if (typeof project.teamId === 'object' && project.teamId?.name) {
    assignedTeamObj = project.teamId;
  } else if (project.teamId) {
    assignedTeamObj = teams.find((tm) => String(tm._id) === String(project.teamId));
  }

  // Org Name
  const orgName =
    typeof project.orgId === 'object' && project.orgId?.name
      ? project.orgId.name
      : 'Organization';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-lg flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              {project.name?.charAt(0).toUpperCase() || 'P'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-xl leading-snug">{project.name}</h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    project.status === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : project.status === 'COMPLETED'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {project.status || 'ACTIVE'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Org: {orgName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          {/* Description */}
          {project.description && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Description</p>
              <p className="text-xs text-slate-700 leading-relaxed">{project.description}</p>
            </div>
          )}

          {/* Stats & Meta Bar */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Tasks</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{projectTasks.length}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {todoCount} Todo · {inProgressCount} In Progress · {doneCount} Done
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Project Manager</p>
              <p className="text-sm font-extrabold text-slate-900 mt-1">{managerName}</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned Team</p>
              {assignedTeamObj ? (
                <div>
                  <button
                    onClick={() => onSelectTeamDetail && onSelectTeamDetail(assignedTeamObj)}
                    className="text-sm font-extrabold text-[#FF6B2C] hover:underline mt-1 text-left block"
                  >
                    {assignedTeamObj.name}
                  </button>
                </div>
              ) : (
                <p className="text-sm font-extrabold text-slate-400 mt-1">No Team</p>
              )}
            </div>
          </div>

          {/* Dates Bar */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Start Date</p>
              <p className="text-xs font-mono text-slate-700 mt-0.5">
                {project.startDate ? new Date(project.startDate).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Due Date</p>
              <p className="text-xs font-mono text-slate-700 mt-0.5">
                {project.endDate || project.dueDate
                  ? new Date(project.endDate || project.dueDate).toLocaleDateString()
                  : 'N/A'}
              </p>
            </div>
          </div>

          {/* Project Tasks List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Tasks in this Project</h4>
            {projectTasks.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No tasks found for this project.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {projectTasks.map((t) => (
                  <div
                    key={t._id}
                    onClick={() => onSelectTaskDetail && onSelectTaskDetail(t)}
                    className="p-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          t.priority === 'URGENT' || t.priority === 'HIGH'
                            ? 'bg-rose-500'
                            : t.priority === 'MEDIUM'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-900">{t.title}</p>
                        {t.description && <p className="text-[11px] text-slate-500 line-clamp-1">{t.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 uppercase">
                        {t.status}
                      </span>
                      <span className="text-xs text-[#FF6B2C] font-bold">Details →</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
