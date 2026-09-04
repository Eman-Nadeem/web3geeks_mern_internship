'use client';

import React from 'react';

export interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: string;
  onStatusFilterChange: (s: string) => void;
  priorityFilter: string;
  onPriorityFilterChange: (p: string) => void;
  assigneeFilter: string;
  onAssigneeFilterChange: (a: string) => void;
  isMyTasksOnly: boolean;
  onToggleMyTasks: () => void;
  users: Array<{ _id: string; fullName: string }>;
}

export default function FilterBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  assigneeFilter,
  onAssigneeFilterChange,
  isMyTasksOnly,
  onToggleMyTasks,
  users,
}: FilterBarProps) {
  return (
    <div className="bg-white border-b border-slate-200/80 px-8 py-3 flex flex-wrap items-center justify-between gap-4">
      {/* Live Search Bar */}
      <div className="relative flex-1 min-w-[240px] max-w-md">
        <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search tasks by title or description..."
          className="w-full bg-slate-100 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF6B2C] focus:bg-white transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
          >
            ✕
          </button>
        )}
      </div>

      {/* Filter Controls */}
      <div className="flex items-center flex-wrap gap-2.5">
        {/* Status Dropdown Filter */}
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF6B2C]"
        >
          <option value="">All Statuses</option>
          <option value="TO_DO">To Do</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="UNDER_REVIEW">Review</option>
          <option value="COMPLETED">Complete</option>
        </select>

        {/* Priority Dropdown Filter */}
        <select
          value={priorityFilter}
          onChange={(e) => onPriorityFilterChange(e.target.value)}
          className="bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF6B2C]"
        >
          <option value="">All Priorities</option>
          <option value="URGENT">Urgent</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>

        {/* Assignee Filter */}
        <select
          value={assigneeFilter}
          onChange={(e) => onAssigneeFilterChange(e.target.value)}
          className="bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF6B2C]"
        >
          <option value="">All Assignees</option>
          {users.map((u) => (
            <option key={u._id} value={u._id}>
              {u.fullName}
            </option>
          ))}
        </select>

        {/* "Me" Quick Filter Pill Toggle (design1.webp reference) */}
        <button
          onClick={onToggleMyTasks}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
            isMyTasksOnly
              ? 'bg-[#FF6B2C] text-white border-[#FF6B2C] shadow-xs'
              : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>Assigned to Me</span>
        </button>
      </div>
    </div>
  );
}
