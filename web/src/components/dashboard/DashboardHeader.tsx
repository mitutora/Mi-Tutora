import React from 'react';
import { Bell, User, BookOpen, CreditCard, LogOut, X, Star, ShieldCheck } from 'lucide-react';

interface DashboardHeaderProps {
  role: 'student' | 'teacher';
  data: any;
  allStudents?: any[];
  setActiveTab: (tab: string) => void;
  setActiveRequestViewId: (id: string | null) => void;
  handleLogout: () => void;
  handleDismissNotification: (id: string, e: React.MouseEvent) => void;
  notificationsRef: React.RefObject<HTMLDivElement | null>;
  profileRef: React.RefObject<HTMLDivElement | null>;
  isNotificationsDropdownOpen: boolean;
  setIsNotificationsDropdownOpen: (open: boolean) => void;
  isProfileDropdownOpen: boolean;
  setIsProfileDropdownOpen: (open: boolean) => void;
}

export function DashboardHeader({
  role,
  data,
  allStudents = [],
  setActiveTab,
  setActiveRequestViewId,
  handleLogout,
  handleDismissNotification,
  notificationsRef,
  profileRef,
  isNotificationsDropdownOpen,
  setIsNotificationsDropdownOpen,
  isProfileDropdownOpen,
  setIsProfileDropdownOpen
}: DashboardHeaderProps) {

  const renderNotificationText = (neg: any) => {
    if (role === 'student') {
      const studentForApp = allStudents.find((s:any) => s.id === neg.studentDocId) || { name: neg.studentName || 'Student' };
      if (neg.status === 'declined') {
        return <span>Request declined for <span className="font-bold">{studentForApp.name}</span> with tutor <span className="font-bold">{neg.tutorName}</span></span>;
      }
      if (neg.status === 'tuition_started') {
        return <span>Fees paid for <span className="font-bold">{studentForApp.name}</span> with tutor <span className="font-bold">{neg.tutorName}</span></span>;
      }
      return <span>New update on request with <span className="font-bold">{neg.tutorName}</span> for <span className="font-bold">{studentForApp.name}</span></span>;
    } else {
      if (neg.status === 'declined') {
        return <span>Request declined with <span className="font-bold">{neg.studentName || 'Student'}</span></span>;
      }
      if (neg.status === 'tuition_started') {
        return <span>Fees paid by <span className="font-bold">{neg.studentName || 'Student'}</span></span>;
      }
      return <span>New update on request with <span className="font-bold">{neg.studentName || 'Student'}</span></span>;
    }
  };

  const defaultInitial = role === 'student' ? 'S' : 'T';
  const displayTitle = role === 'student' ? 'Student' : 'Teacher';

  return (
    <header className="h-[76px] bg-white border-b border-gray-200 flex items-center justify-end px-6 sticky top-0 z-30 shadow-sm flex-shrink-0">
      <div className="flex items-center gap-6">
        <div className="relative group cursor-pointer" ref={notificationsRef} onClick={() => { if (typeof window !== 'undefined' && window.innerWidth < 768) setIsNotificationsDropdownOpen(!isNotificationsDropdownOpen) }}>
          <button className="text-gray-400 hover:text-emerald-600 transition-colors relative mt-1">
            <Bell className="w-5 h-5" />
            {((data?.allNotifications)?.length ?? 0) > 0 && (
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            )}
          </button>
          
          <div 
            className={`absolute right-0 mt-3 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-gray-100 transition-all duration-200 z-50 overflow-hidden transform origin-top-right ${isNotificationsDropdownOpen ? 'opacity-100 visible scale-100' : 'opacity-0 invisible scale-95'} md:group-hover:opacity-100 md:group-hover:visible md:group-hover:scale-100`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
              <h3 className="font-bold text-sm text-gray-900">Notifications</h3>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded-full">{data?.allNotifications?.length || 0} New</span>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {((data?.allNotifications)?.length ?? 0) > 0 ? (
                data?.allNotifications?.slice(0, 3).map((neg: any, idx: number) => (
                  <div key={idx} className="p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors flex justify-between items-start gap-2">
                    <div className="flex-1 cursor-pointer" onClick={() => { setActiveRequestViewId(neg.id); setActiveTab('requests'); setIsNotificationsDropdownOpen(false); }}>
                      <p className="text-sm text-gray-800 font-medium line-clamp-2">
                        {renderNotificationText(neg)}
                      </p>
                      <p className="text-xs text-emerald-600 font-bold mt-1">Price: ₹{neg.finalPrice || neg.currentOffer}</p>
                    </div>
                    <button onClick={(e) => handleDismissNotification(neg.id, e)} className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors" title="Dismiss">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-gray-500 text-sm">
                  No new notifications
                </div>
              )}
            </div>
            <div className="p-2 border-t border-gray-50 bg-gray-50/50">
              <button 
                onClick={() => { setActiveTab('notifications'); setIsNotificationsDropdownOpen(false); }}
                className="w-full text-center px-4 py-2 text-sm font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors"
              >
                Show all notifications
              </button>
            </div>
          </div>
        </div>
        
        <div className="relative group cursor-pointer" ref={profileRef} onClick={() => { if (typeof window !== 'undefined' && window.innerWidth < 768) setIsProfileDropdownOpen(!isProfileDropdownOpen) }}>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-[#063831] text-white flex items-center justify-center font-bold shadow-md ring-2 ring-transparent group-hover:ring-emerald-500 transition-all">
                {(data?.profile?.name || data?.user?.displayName || defaultInitial).charAt(0).toUpperCase()}
              </div>
              {role === 'teacher' && data?.profile?.aadharVerified && (
                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-[1px] shadow-sm">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                </div>
              )}
            </div>
          </div>
          
          <div 
            className={`absolute right-0 mt-2 w-56 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-gray-100 transition-all duration-200 z-50 overflow-hidden transform origin-top-right ${isProfileDropdownOpen ? 'opacity-100 visible scale-100' : 'opacity-0 invisible scale-95'} md:group-hover:opacity-100 md:group-hover:visible md:group-hover:scale-100`}
            onClick={(e) => e.stopPropagation()}
          >
             <div className="p-4 border-b border-gray-50 bg-gray-50/50">
               <div className="flex items-center gap-1.5">
                 <p className="font-bold text-sm text-gray-900 truncate">{data?.profile?.name || data?.user?.displayName || displayTitle}</p>
                 {role === 'teacher' && data?.profile?.aadharVerified && (
                   <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                 )}
               </div>
               <p className="text-xs text-gray-500 truncate mt-0.5">{data?.user?.email}</p>
               {role === 'student' && data?.profile?.parentId && <p className="text-xs text-gray-500 truncate mt-0.5 font-mono">ID: {data?.profile?.parentId}</p>}
               {role === 'teacher' && data?.profile?.tutorId && <p className="text-xs text-gray-500 truncate mt-0.5 font-mono">ID: {data?.profile?.tutorId}</p>}
             </div>
             <div className="p-2">
               <button onClick={() => { setActiveTab('profile'); setIsProfileDropdownOpen(false); }} className="w-full text-left px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl flex items-center gap-3 transition-colors">
                 <User className="w-4 h-4" /> Profile Settings
               </button>
               {role === 'student' && (
                 <button onClick={() => { setActiveTab('my_teachers'); setIsProfileDropdownOpen(false); }} className="w-full text-left px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl flex items-center gap-3 transition-colors">
                   <BookOpen className="w-4 h-4" /> My Teachers
                 </button>
               )}
               {role === 'teacher' && (
                 <>
                   <button onClick={() => { setActiveTab('my_reviews'); setIsProfileDropdownOpen(false); }} className="w-full text-left px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl flex items-center gap-3 transition-colors">
                     <Star className="w-4 h-4" /> My Reviews
                   </button>
                   <button onClick={() => { setActiveTab('subscriptions'); setIsProfileDropdownOpen(false); }} className="w-full text-left px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl flex items-center gap-3 transition-colors">
                     <CreditCard className="w-4 h-4" /> Subscriptions
                   </button>
                 </>
               )}

               <div className="h-px bg-gray-100 my-1 mx-2"></div>
               <button onClick={() => { handleLogout(); setIsProfileDropdownOpen(false); }} className="w-full text-left px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl flex items-center gap-3 transition-colors">
                 <LogOut className="w-4 h-4" /> Logout
               </button>
             </div>
          </div>
        </div>
      </div>
    </header>
  );
}
