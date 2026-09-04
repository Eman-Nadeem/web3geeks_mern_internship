'use client';

import React from 'react';
import TaskCard from './TaskCard';
import { can } from '@/lib/permissions';

export interface KanbanBoardProps {
  tasks: Array<any>;
  users: Array<{ _id: string; fullName: string }>;
  projects: Array<{ _id: string; name: string }>;
  userRole?: string;
  currentUserId?: string;
  viewMode?: 'board' | 'list';
  onStatusChange: (taskId: string, newStatus: string) => void;
  onEditTask: (task: any) => void;
  onDeleteTask: (taskId: string) => void;
  onOpenNewTaskModal: (status?: string) => void;
  onSelectTaskDetail?: (task: any) => void;
}

export default function KanbanBoard({
  tasks,
  users,
  projects,
  userRole,
  currentUserId,
  viewMode = 'board',
  onStatusChange,
  onEditTask,
  onDeleteTask,
  onOpenNewTaskModal,
  onSelectTaskDetail,
}: KanbanBoardProps) {
  const canCreateTask = can(userRole, 'CREATE_TASK');
  const canEditOrDelete = can(userRole, 'EDIT_TASK_DETAILS');

  const columns = [
    { key: 'TO_DO', title: 'To Do', badgeColor: 'bg-slate-200 text-slate-700' },
    { key: 'IN_PROGRESS', title: 'In Progress', badgeColor: 'bg-amber-100 text-amber-800' },
    { key: 'UNDER_REVIEW', title: 'Review', badgeColor: 'bg-sky-100 text-sky-800' },
    { key: 'COMPLETED', title: 'Complete', badgeColor: 'bg-emerald-100 text-emerald-800' },
  ];

  // Helper for Assignee Name
  const getAssigneeName = (task: any) => {
    if (!task.assigneeId) return 'Unassigned';
    if (typeof task.assigneeId === 'object' && task.assigneeId.fullName) {
      return task.assigneeId.fullName;
    }
    const found = users.find((u) => u._id === task.assigneeId);
    return found ? found.fullName : 'Assigned User';
  };

  // Helper for Project Name
  const getProjectName = (task: any) => {
    if (!task.projectId) return 'N/A';
    if (typeof task.projectId === 'object' && task.projectId.name) {
      return task.projectId.name;
    }
    const found = projects.find((p) => p._id === task.projectId);
    return found ? found.name : 'N/A';
  };

  // Priority Pill Colors
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

  // List View Rendering
  if (viewMode === 'list') {
    return (
      <div className="p-8 max-w-7xl mx-auto w-full min-w-0">
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Tasks List View</h3>
              <p className="text-xs text-slate-500 mt-0.5">{tasks.length} Total Tasks</p>
            </div>
            {canCreateTask && (
              <button
                onClick={() => onOpenNewTaskModal('TO_DO')}
                className="px-3.5 py-1.5 rounded-xl bg-[#FF6B2C] hover:bg-[#E0561B] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
              >
                + Add Task
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-6">Task Name</th>
                  <th className="py-3.5 px-6">Project</th>
                  <th className="py-3.5 px-6">Assignee</th>
                  <th className="py-3.5 px-6">Priority</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Due Date</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No tasks found.
                    </td>
                  </tr>
                ) : (
                  tasks.map((t) => {
                    const assigneeName = getAssigneeName(t);
                    const projectName = getProjectName(t);

                    return (
                      <tr key={t._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-4 px-6 font-bold text-slate-900">
                          <div>
                            <button
                              onClick={() => onSelectTaskDetail && onSelectTaskDetail(t)}
                              className="text-sm font-bold text-slate-900 hover:text-[#FF6B2C] hover:underline text-left"
                            >
                              {t.title}
                            </button>
                            {t.description && (
                              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{t.description}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {projectName}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-600">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[#1E1F24] text-white text-[10px] font-bold flex items-center justify-center">
                              {assigneeName.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold text-slate-800">{assigneeName}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getPriorityBadge(t.priority)}`}>
                            {t.priority}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                            {t.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-500 font-mono">
                          {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {onSelectTaskDetail && (
                              <button
                                onClick={() => onSelectTaskDetail(t)}
                                className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-[11px] transition-colors"
                              >
                                Details →
                              </button>
                            )}
                            {canEditOrDelete && (
                              <>
                                <button
                                  onClick={() => onEditTask(t)}
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
                                  title="Edit Task"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => onDeleteTask(t._id)}
                                  className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                                  title="Delete Task"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Board View Rendering (Default)
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6 items-start w-full min-w-0">
      {columns.map((col) => {
        const columnTasks = tasks.filter((t) => t.status === col.key);

        return (
          <div key={col.key} className="bg-slate-100/70 border border-slate-200/80 rounded-2xl p-4 flex flex-col min-h-[500px] w-full min-w-0 overflow-hidden">
            {/* Column Header */}
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-800 text-sm tracking-tight">{col.title}</h2>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${col.badgeColor}`}>
                  {columnTasks.length}
                </span>
              </div>
              {canCreateTask && (
                <button
                  onClick={() => onOpenNewTaskModal(col.key)}
                  className="p-1 rounded-lg text-slate-400 hover:text-[#FF6B2C] hover:bg-slate-200 transition-colors"
                  title={`Add task to ${col.title}`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              )}
            </div>

            {/* Task Cards Container */}
            <div className="flex-1 space-y-4 overflow-y-auto pr-0.5">
              {columnTasks.length === 0 ? (
                <div className="h-36 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-center p-4">
                  <p className="text-xs font-medium text-slate-400">No tasks in {col.title}</p>
                  {canCreateTask && (
                    <button
                      onClick={() => onOpenNewTaskModal(col.key)}
                      className="mt-2 text-xs text-[#FF6B2C] font-semibold hover:underline"
                    >
                      + Add Task
                    </button>
                  )}
                </div>
              ) : (
                columnTasks.map((task) => (
                  <TaskCard
                    key={task._id}
                    task={task}
                    users={users}
                    projects={projects}
                    userRole={userRole}
                    currentUserId={currentUserId}
                    onStatusChange={onStatusChange}
                    onEditTask={onEditTask}
                    onDeleteTask={onDeleteTask}
                    onSelectTaskDetail={onSelectTaskDetail}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
