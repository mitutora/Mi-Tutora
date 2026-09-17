import React from 'react';
import { Edit2, Phone, MessageCircle } from 'lucide-react';
import DemoForm from '@/components/DemoForm';

interface ParentProfileCardProps {
  data: any;
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
  onSuccess: () => void;
}

export function ParentProfileCard({ data, isEditing, setIsEditing, onSuccess }: ParentProfileCardProps) {
  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-2">
        <h2 className="text-2xl font-black text-gray-900">Parent / Guardian Profile</h2>
        {!isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            className="bg-white border border-emerald-200 text-emerald-700 px-5 py-2.5 rounded-xl font-bold text-sm shadow-md hover:bg-emerald-50 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center gap-2"
          >
            <Edit2 className="w-4 h-4" /> Edit Profile
          </button>
        )}
      </div>
      
      {isEditing ? (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden relative mb-8">
          <div className="bg-emerald-50 border-b border-emerald-100 p-4 text-emerald-800 flex justify-between items-center font-medium text-sm">
            <span>Editing Parent / Guardian Profile</span>
            <button onClick={() => setIsEditing(false)} className="font-bold underline">Cancel</button>
          </div>
          <div className="p-4 sm:p-6 md:p-8">
            <DemoForm 
              isDashboard={true} 
              hasProfile={true} 
              parentOnly={true}
              defaultIsEditing={true}
              initialData={{
                guardianName: data?.profile?.name || data?.user?.displayName || '',
                email: data?.profile?.email || data?.user?.email || '',
                phoneNumber: data?.profile?.phone || '',
                whatsappNumber: data?.profile?.whatsapp || '',
                address: data?.profile?.address || '',
              }} 
              onSuccess={onSuccess} 
            />
          </div>
        </div>
      ) : (
        <div className="relative bg-white/80 backdrop-blur-md rounded-3xl shadow-xl shadow-teal-900/5 border border-white/50 hover:shadow-2xl hover:shadow-teal-900/10 transition-all duration-300 overflow-hidden mb-8 group">
          <div className="bg-gradient-to-br from-[#00a992] to-teal-600 p-4 sm:p-6 md:p-8 flex justify-between items-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3 group-hover:scale-110 transition-transform duration-700" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-teal-900/10 rounded-full blur-xl translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
              <div className="flex items-center gap-3.5 sm:gap-5 min-w-0 flex-1 w-full sm:w-auto">
                <div className="w-11 h-11 sm:w-12 sm:h-12 bg-white/20 rounded-2xl flex items-center justify-center text-lg sm:text-xl font-bold text-white backdrop-blur-md shadow-inner border border-white/30 shrink-0">
                  {(data?.profile?.name || data?.user?.displayName || 'P').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate">{data?.profile?.name || data?.user?.displayName || 'Parent Profile'}</h3>
                  <p className="text-xs sm:text-sm font-medium text-emerald-100/90 mt-0.5 truncate">{data?.profile?.email || data?.user?.email || 'No email provided'}</p>
                </div>
              </div>
              {data?.profile?.parentId && (
                <div className="flex items-center sm:flex-col items-start sm:items-end justify-between sm:justify-start gap-1 sm:gap-0.5 w-full sm:w-auto pt-2.5 sm:pt-0 border-t border-white/15 sm:border-t-0 shrink-0">
                   <p className="text-[11px] text-emerald-100/80 font-bold uppercase tracking-wider mb-0.5">Parent ID</p>
                   <p className="text-sm sm:text-base md:text-lg font-bold text-white font-mono bg-white/10 px-2.5 sm:px-3 py-1 rounded-lg border border-white/20 backdrop-blur-sm shadow-sm tracking-wide">{data?.profile?.parentId}</p>
                </div>
              )}
            </div>
          </div>
          <div className="p-5 sm:p-8 bg-slate-50/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Phone Number</p>
                <p className="text-lg font-bold text-slate-800">{data?.profile?.phone || '-'}</p>
              </div>
              {data?.profile?.whatsapp && (
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5" /> WhatsApp</p>
                  <p className="text-lg font-bold text-slate-800">{data?.profile?.whatsapp}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
