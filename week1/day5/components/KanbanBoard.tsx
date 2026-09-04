'use client';

import React from 'react';
import TaskCard from './TaskCard';

export interface KanbanBoardProps {
  tasks: Array<any>;
  users: Array<{ _id: string; fullName: string }>;
  projects: Array<{ _id: string; name: string }>;
  userRole?: string;
  onStatusChange: (taskId: string, newStatus: string) => void;
  onEditTask: (task: any) => void;
  onDeleteTask: (taskId: string) => void;
  onOpenNewTaskModal: (status?: string) => void;
}

export default function KanbanBoard({
  tasks,
  users,
  projects,
  userRole,
  onStatusChange,
  onEditTask,
  onDeleteTask,
  onOpenNewTaskModal,
}: KanbanBoardProps) {
  const canCreateTask = userRole === 'SuperAdmin' || userRole === 'OrgAdmin' || userRole === 'ProjectManager';
  const columns = [
    { key: 'TO_DO', title: 'To Do', badgeColor: 'bg-slate-200 text-slate-700' },
    { key: 'IN_PROGRESS', title: 'In Progress', badgeColor: 'bg-amber-100 text-amber-800' },
    { key: 'UNDER_REVIEW', title: 'Review', badgeColor: 'bg-sky-100 text-sky-800' },
    { key: 'COMPLETED', title: 'Complete', badgeColor: 'bg-emerald-100 text-emerald-800' },
  ];

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
                    onStatusChange={onStatusChange}
                    onEditTask={onEditTask}
                    onDeleteTask={onDeleteTask}
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
