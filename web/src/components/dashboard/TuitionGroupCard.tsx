import React from 'react';
import { User, Edit2, Trash2, Info, Settings } from 'lucide-react';

interface TuitionGroupCardProps {
  group: any;
  idx: number;
  requestDoc?: any;
  setEditingStudentId: (id: string) => void;
  setStudentToRemove: (student: any) => void;
  setViewingGroupDetails: (group: any) => void;
  setSelectedGroupForSettings: (group: any) => void;
  setGroupSettingsModalOpen: (open: boolean) => void;
}

export function TuitionGroupCard({
  group,
  idx,
  requestDoc,
  setEditingStudentId,
  setStudentToRemove,
  setViewingGroupDetails,
  setSelectedGroupForSettings,
  setGroupSettingsModalOpen
}: TuitionGroupCardProps) {
  return (
    <div key={group.id} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg hover:shadow-teal-900/5 transition-all duration-300 flex flex-col h-full">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#00a992] to-teal-600 p-5 flex justify-between items-center relative overflow-hidden group/header">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3 group-hover/header:scale-110 transition-transform duration-700" />
        <div className="relative z-10">
          <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 line-clamp-1">
            Group {idx + 1}
          </h3>
          <p className="text-xs font-bold text-teal-100 uppercase tracking-widest mt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-300" /> {group.category}
          </p>
        </div>
        <div className="relative z-10 flex flex-shrink-0 ml-3">
          <span className="text-xs font-bold text-teal-900 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-lg shadow-sm">
            ₹{group.totalBudget}/mo
          </span>
        </div>
      </div>

      {/* Student List */}
      <div className="p-5 flex-grow">
        <ul className="space-y-1">
          {group.students?.map((s: any) => (
            <li key={s.id} className="group/student flex justify-between items-center p-2 rounded-lg hover:bg-slate-50 transition-colors">
              <span className="font-medium text-slate-700 flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" /> {s.name}
              </span>
              <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover/student:opacity-100 transition-opacity">
                <button 
                  onClick={() => setEditingStudentId(s.id)}
                  className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                  title="Edit Student"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setStudentToRemove(s)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  title="Remove Student"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Footer */}
      <div className="flex border-t border-slate-100 bg-slate-50/50">
        <button
          onClick={() => {
            setViewingGroupDetails({ ...group, index: idx + 1 });
          }}
          className="flex-1 py-3 text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 border-r border-slate-100"
        >
          <Info className="w-4 h-4" /> View Details
        </button>
        <button
          onClick={() => {
            setSelectedGroupForSettings({ ...group, requestDoc });
            setGroupSettingsModalOpen(true);
          }}
          className="flex-1 py-3 text-sm font-bold text-slate-600 hover:text-teal-700 hover:bg-teal-50 transition-colors flex items-center justify-center gap-2"
        >
          <Settings className="w-4 h-4" /> Preferences
        </button>
      </div>
    </div>
  );
}
