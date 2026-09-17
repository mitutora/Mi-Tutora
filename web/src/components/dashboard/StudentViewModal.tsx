import React from 'react';
import { Users, X, CheckCircle2, CalendarDays, ShieldCheck, Coins, Lock, Info } from 'lucide-react';
import { toast } from 'sonner';

interface StudentViewModalProps {
  selectedViewUser: any;
  selectedViewApp: any;
  setSelectedViewUser: (user: any) => void;
  setSelectedViewApp: (app: any) => void;
  data: any;
  negotiationOffer: Record<string, string>;
  setNegotiationOffer: (offer: Record<string, string>) => void;
  handleSendOffer: (user: any) => Promise<any>;
  handleDirectRequestDemo: (user: any) => Promise<any>;
  quotaExceeded: boolean;
  onUpgradeRequested?: () => void;
  offerLoading: boolean;
}

export function StudentViewModal({
  selectedViewUser,
  selectedViewApp,
  setSelectedViewUser,
  setSelectedViewApp,
  data,
  negotiationOffer,
  setNegotiationOffer,
  handleSendOffer,
  handleDirectRequestDemo,
  quotaExceeded,
  onUpgradeRequested,
  offerLoading
}: StudentViewModalProps) {
  const [asyncParentId, setAsyncParentId] = React.useState<string>('');
  const [asyncGroupId, setAsyncGroupId] = React.useState<string>('');

  React.useEffect(() => {
    let isMounted = true;
    setAsyncParentId('');
    setAsyncGroupId('');

    if (!selectedViewUser) return;

    const currentParentId = selectedViewUser.parentId || selectedViewApp?.parentId || selectedViewUser.students?.[0]?.parentId;
    const currentGroupId = selectedViewUser.groupId || selectedViewApp?.groupId || selectedViewUser.students?.[0]?.groupId;

    const pDocId = selectedViewUser.parentDocId || selectedViewApp?.parentDocId || selectedViewUser.students?.[0]?.parentDocId;
    if (!currentParentId && pDocId) {
      import('@/utils/firebase/client').then(({ db }) => {
        import('firebase/firestore').then(({ doc, getDoc }) => {
          getDoc(doc(db, 'parents', pDocId)).then((snap) => {
            if (isMounted && snap.exists()) {
              const pData = snap.data();
              if (pData?.parentId) setAsyncParentId(pData.parentId);
            }
          }).catch(console.error);
        });
      });
    }

    const gDocId = selectedViewUser.groupDocId || selectedViewApp?.groupDocId || selectedViewUser.students?.[0]?.groupDocId || (selectedViewUser.id && !selectedViewUser.id.startsWith('indv_') ? selectedViewUser.id : null);
    if ((!currentGroupId || currentGroupId.length > 15) && gDocId && !gDocId.startsWith('indv_')) {
      import('@/utils/firebase/client').then(({ db }) => {
        import('firebase/firestore').then(({ doc, getDoc }) => {
          getDoc(doc(db, 'groups', gDocId)).then((snap) => {
            if (isMounted && snap.exists()) {
              const gData = snap.data();
              if (gData?.groupId) setAsyncGroupId(gData.groupId);
            }
          }).catch(console.error);
        });
      });
    }

    return () => {
      isMounted = false;
    };
  }, [selectedViewUser?.id, selectedViewUser?.parentId, selectedViewUser?.groupId, selectedViewUser?.parentDocId, selectedViewUser?.groupDocId]);

  if (!selectedViewUser) return null;

  const enteredOffer = negotiationOffer[selectedViewUser?.id];
  const effectiveBudget = (enteredOffer !== undefined && enteredOffer !== '')
    ? Number(enteredOffer)
    : (Number(selectedViewApp?.finalPrice) || Number(selectedViewApp?.currentOffer) || Number(selectedViewUser?.budget) || 0);

  const hasNumericBudget = !isNaN(effectiveBudget) && effectiveBudget > 0;
  const month1PlatformFee = Math.round(effectiveBudget * 0.40);
  const month1TutorShare = Math.round(effectiveBudget * 0.60);
  const month2TutorShare = effectiveBudget;

  return (
    <div className="fixed inset-0 z-[100] flex items-center sm:items-start justify-center p-3 sm:p-4 bg-gray-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl relative my-auto sm:my-8 max-h-[92vh] flex flex-col overflow-hidden">
        <button 
          onClick={() => { setSelectedViewUser(null); setSelectedViewApp(null); }}
          className="absolute top-4 right-4 p-2 bg-black/10 hover:bg-black/20 text-white rounded-full transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="bg-[#00a992] p-5 sm:p-8 md:p-10 text-white flex-shrink-0 relative overflow-hidden">
          <div className="relative z-10 flex items-start gap-4 sm:gap-6">
            <div className="w-14 h-14 sm:w-20 sm:h-20 bg-white/20 rounded-2xl flex items-center justify-center text-2xl sm:text-4xl font-black backdrop-blur-md shadow-inner border border-white/30 flex-shrink-0">
              {((selectedViewUser.students?.[0]?.guardianName || selectedViewUser.students?.[0]?.parentName || selectedViewUser.guardianName || selectedViewUser.parentName || selectedViewUser.name)?.charAt(0) || 'S')}
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight">{selectedViewUser.students?.[0]?.guardianName || selectedViewUser.students?.[0]?.parentName || selectedViewUser.parentName || selectedViewUser.guardianName || 'Parent'}</h3>
              <div className="flex gap-2 mt-1.5 flex-wrap">
                {(() => {
                  const parentId = selectedViewUser.parentId || selectedViewApp?.parentId || selectedViewUser.students?.[0]?.parentId || asyncParentId;
                  const rawGroupId = selectedViewUser.groupId || selectedViewApp?.groupId || selectedViewUser.students?.[0]?.groupId || asyncGroupId;
                  const groupId = rawGroupId && !rawGroupId.startsWith('indv_') ? rawGroupId : '';
                  return (
                    <>
                      {parentId && (
                        <p className="text-emerald-100 font-mono font-bold uppercase tracking-wider text-xs sm:text-sm bg-black/10 inline-block px-2 py-1 rounded-md border border-white/20 shadow-sm">
                          Parent ID: {parentId}
                        </p>
                      )}
                      {groupId && (
                        <p className="text-emerald-100 font-mono font-bold uppercase tracking-wider text-xs sm:text-sm bg-black/10 inline-block px-2 py-1 rounded-md border border-white/20 shadow-sm">
                          Group ID: {groupId}
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>
              <p className="text-emerald-100 font-bold capitalize mt-1 text-sm sm:text-lg flex items-center gap-2">
                <Users className="w-4 h-4" /> {selectedViewUser.students?.length || 1} Student(s)
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-8 md:p-10 overflow-y-auto">
          <div className="space-y-8">
            {/* Contact Information Block */}
            {(!selectedViewApp || !['demo_booking_phase', 'demo_scheduled', 'waiting_for_parent_decision', 'demo_booked', 'tuition_started', 'confirmed', 'accepted'].includes(selectedViewApp.status)) ? (
              <div className="bg-orange-50 rounded-2xl p-6 border border-orange-100 flex items-center justify-center">
                <p className="text-sm font-bold text-orange-600 text-center">Contact details will be revealed once the demo is booked or tuition is active.</p>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <h4 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                  Contact Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(() => {
                    const contactSource = selectedViewUser.phoneNumber ? selectedViewUser : (selectedViewUser.students?.[0] || selectedViewUser);
                    const phone = contactSource.phoneNumber || contactSource.whatsappNumber || contactSource.parentDetails?.phone || contactSource.parentDetails?.whatsapp || contactSource.phone || contactSource.whatsapp;
                    const email = contactSource.email || contactSource.parentDetails?.email;
                    return (
                      <>
                        {phone && (
                          <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Phone</p>
                            <p className="font-bold text-gray-800">{phone}</p>
                          </div>
                        )}
                        {email && (
                          <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Email</p>
                            <p className="font-bold text-gray-800 break-all">{email}</p>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Individual Students List */}
            {(selectedViewUser.students && selectedViewUser.students.length > 0 ? selectedViewUser.students : [selectedViewUser]).map((studentDetail: any, index: number) => (
              <div key={studentDetail.id || index} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <h4 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                  {studentDetail.name || 'Student'} <span className="text-sm font-medium text-gray-500">({studentDetail.category})</span>
                </h4>
                {studentDetail.studentId && (
                  <p className="text-xs text-slate-500 font-mono font-bold mb-3 uppercase tracking-wider">
                    ID: {studentDetail.studentId}
                  </p>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {studentDetail.classLevel && (
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Class</p>
                      <p className="font-bold text-gray-800">{studentDetail.classLevel} {studentDetail.board && `(${studentDetail.board})`}</p>
                    </div>
                  )}
                  
                  {studentDetail.category === 'programming' && (studentDetail.technologies?.length ?? 0) > 0 && (
                    <div className="sm:col-span-2">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Technologies</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {studentDetail.technologies.map((t: string) => (
                          <span key={t} className="px-2 py-1 bg-white text-gray-700 text-xs font-bold rounded-md border border-gray-200 shadow-sm">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {studentDetail.category === 'languages' && (studentDetail.languages?.length ?? 0) > 0 && (
                    <div className="sm:col-span-2">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Languages</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {studentDetail.languages.map((l: string) => (
                          <span key={l} className="px-2 py-1 bg-white text-gray-700 text-xs font-bold rounded-md border border-gray-200 shadow-sm">{l}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {(!studentDetail.category || studentDetail.category === 'school') && (studentDetail.subjects?.length ?? 0) > 0 && (
                    <div className="sm:col-span-2">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Subjects</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {studentDetail.subjects.map((s: string) => (
                          <span key={s} className="px-2 py-1 bg-white text-gray-700 text-xs font-bold rounded-md border border-gray-200 shadow-sm">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Common Group Schedule & Timing Preferences */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200/80">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 pb-2 border-b border-gray-200 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-emerald-600" /> Group Schedule & Timing Preferences
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Preferred Days</p>
                  <p className="font-bold text-gray-800">
                    {(() => {
                      const days = selectedViewUser.daysPerWeek || selectedViewApp?.daysPerWeek || selectedViewUser.students?.[0]?.daysPerWeek;
                      const specific = selectedViewUser.specificDays || selectedViewApp?.specificDays || selectedViewUser.students?.[0]?.specificDays;
                      if (!days && (!specific || specific.length === 0)) return 'Flexible';
                      let label = days ? (days.toLowerCase().includes('day') || days === 'Everyday' ? days : `${days} Days / Week`) : '';
                      if (specific && specific.length > 0) {
                        return label ? `${label} (${specific.join(', ')})` : specific.join(', ');
                      }
                      return label || 'Flexible';
                    })()}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Preferred Time / Duration</p>
                  <p className="font-bold text-gray-800">
                    {selectedViewUser.preferredTimeRange || selectedViewApp?.preferredTimeRange || selectedViewUser.hours || selectedViewUser.students?.[0]?.hours || 'Flexible / Any Time'}
                  </p>
                </div>
              </div>
            </div>

            {/* Group Budget & Delivery Mode */}
            <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">
                  {selectedViewApp ? (selectedViewApp.status === 'tuition_started' ? (selectedViewApp.feePaid ? 'Amount Received' : 'Pending 7-Day Trial') : 'Amount to be Received') : 'Total Budget'}
                </p>
                <p className="text-3xl font-black text-emerald-700">₹{selectedViewApp?.finalPrice || selectedViewApp?.currentOffer || selectedViewUser.budget || 'Negotiable'}<span className="text-base font-bold text-emerald-600/70">/mo</span></p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Mode & Location</p>
                <p className="font-bold text-emerald-800 capitalize">{selectedViewUser.students?.[0]?.preferredMode || selectedViewUser.preferredMode || 'Online'}</p>
                {(selectedViewUser.students?.[0]?.preferredMode || selectedViewUser.preferredMode)?.toLowerCase() !== 'online' && (
                  <p className="text-sm font-medium text-emerald-700 mt-1 max-w-[200px] truncate" title={selectedViewUser.students?.[0]?.area || selectedViewUser.address}>
                    {selectedViewUser.students?.[0]?.area || selectedViewUser.address || 'Address hidden'}
                  </p>
                )}
              </div>
            </div>

            {/* Tuition Fee Breakdown: Month 1 Escrow vs Month 2+ Direct */}
            <div className="bg-slate-50 rounded-2xl p-5 sm:p-6 border border-slate-200/80">
              <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                    <Coins className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Earnings Transparency & Payout Structure
                  </h4>
                </div>
                {enteredOffer && (
                  <span className="text-[11px] bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Live Projected from Your Offer
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Month 1 Card */}
                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" /> Month 1 (Trial & Escrow)
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                        60% Net Payout
                      </span>
                    </div>

                    <div className="my-2">
                      <p className="text-2xl font-black text-slate-900">
                        {hasNumericBudget ? `₹${month1TutorShare.toLocaleString('en-IN')}` : '60% of fee'}
                        <span className="text-xs font-semibold text-slate-500 ml-1.5">Take-Home</span>
                      </p>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-2.5 mt-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Gross Student Fee:</span>
                        <span className="font-semibold text-slate-800">
                          {hasNumericBudget ? `₹${effectiveBudget.toLocaleString('en-IN')}` : 'Tuition Fee'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Platform Matching & Escrow (40%):</span>
                        <span className="font-semibold text-rose-600">
                          {hasNumericBudget ? `-₹${month1PlatformFee.toLocaleString('en-IN')}` : '-40%'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-start gap-1.5 text-[11px] text-slate-500 leading-tight">
                    <Lock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <span>Held in institutional escrow post 7-day trial and released to your UPI on Day 30.</span>
                  </div>
                </div>

                {/* Month 2 & Beyond Card */}
                <div className="bg-white rounded-xl p-4 border border-emerald-200 bg-emerald-50/20 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Coins className="w-4 h-4 text-emerald-600" /> Month 2 & Beyond
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                        100% Direct Retainer
                      </span>
                    </div>

                    <div className="my-2">
                      <p className="text-2xl font-black text-emerald-700">
                        {hasNumericBudget ? `₹${month2TutorShare.toLocaleString('en-IN')}` : '100% of fee'}
                        <span className="text-xs font-semibold text-emerald-600/80 ml-1.5">/month</span>
                      </p>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600 border-t border-emerald-100 pt-2.5 mt-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Platform Commission:</span>
                        <span className="font-semibold text-emerald-600">₹0 (0% Commission)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Your Retainer:</span>
                        <span className="font-semibold text-emerald-700">100% Full Fee</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3.5 pt-2.5 border-t border-emerald-100 flex items-start gap-1.5 text-[11px] text-emerald-800/80 leading-tight">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>Zero platform deduction. Full monthly fee paid directly by the parent to you.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        
        {/* Actions */}
        {(() => {
          const hasNegotiation = data?.applications?.some((app: any) => (app.groupDocId || app.studentDocId) === selectedViewUser.id && ['negotiating'].includes(app.status));
          const isPending = data?.applications?.some((app: any) => (app.groupDocId || app.studentDocId) === selectedViewUser.id && ['demo_requested_by_student', 'demo_requested_by_teacher', 'demo_pending_payment', 'demo_booked', 'pending', 'accepted'].includes(app.status));
          const isHired = data?.applications?.some((app: any) => (app.groupDocId || app.studentDocId) === selectedViewUser.id && ['tuition_started'].includes(app.status));
          const cooldownApp = data?.applications?.find((app: any) => (app.groupDocId || app.studentDocId) === selectedViewUser.id && app.status === 'declined' && app.declinedAt && (Date.now() - app.declinedAt < 7 * 24 * 60 * 60 * 1000));
          
          if (isHired || isPending || hasNegotiation || cooldownApp || selectedViewApp) {
            let message = 'Currently unavailable for new requests.';
            if (isHired) message = 'This student has already been hired.';
            else if (cooldownApp) message = `Available in ${Math.ceil((cooldownApp.declinedAt + 7 * 24 * 60 * 60 * 1000 - Date.now()) / (24 * 60 * 60 * 1000))} days.`;
            else if (hasNegotiation || isPending || selectedViewApp) message = 'You already have an active request or demo with this student.';
            
            return (
              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-center text-gray-500 font-medium text-sm">
                {message}
              </div>
            );
          }
          
          return (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-[10px] text-gray-500 leading-tight mb-2">Type a value below to negotiate — earnings breakdown above will update automatically.</p>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Your Offer (₹/mo)</label>
                  <input 
                    type="number"
                    min={selectedViewUser.budget || 0}
                    max={selectedViewUser.budget ? Math.floor(selectedViewUser.budget * 1.4) : undefined}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-bold text-emerald-700 bg-gray-50"
                    placeholder={selectedViewUser.budget ? `e.g. ${selectedViewUser.budget}` : "e.g. 500"}
                    value={negotiationOffer[selectedViewUser.id] || ''}
                    onChange={(e) => setNegotiationOffer({...negotiationOffer, [selectedViewUser.id]: e.target.value})}
                  />
                  {selectedViewUser.budget && negotiationOffer[selectedViewUser.id] && parseInt(negotiationOffer[selectedViewUser.id]) >= selectedViewUser.budget * 1.3 && parseInt(negotiationOffer[selectedViewUser.id]) <= selectedViewUser.budget * 1.4 && (
                    <p className="text-xs text-yellow-600 font-medium mt-1">Note: Your offer is quite high compared to the student's budget. They might reject it.</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {negotiationOffer[selectedViewUser.id] ? (
                    <button 
                      onClick={async () => { 
                        if (quotaExceeded) {
                          toast.error("You have reached your weekly token quota. Upgrade to Pro for more tokens!");
                          setSelectedViewUser(null);
                          onUpgradeRequested?.();
                          return;
                        }
                        const success = await handleSendOffer(selectedViewUser); 
                        if (success) setSelectedViewUser(null); 
                      }}
                      disabled={offerLoading}
                      className={`flex-1 font-bold py-3 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 text-sm disabled:opacity-50 ${quotaExceeded ? 'bg-gray-300 text-gray-500 hover:bg-gray-300' : 'bg-[#00a992] hover:bg-[#008f7b] text-white'}`}
                    >
                      <CheckCircle2 className="w-4 h-4" /> {offerLoading ? 'Sending...' : 'Negotiate'}
                    </button>
                  ) : (
                    <button 
                      onClick={async () => { 
                        if (quotaExceeded) {
                          toast.error("You have reached your weekly token quota. Upgrade to Pro for more tokens!");
                          setSelectedViewUser(null);
                          onUpgradeRequested?.();
                          return;
                        }
                        const success = await handleDirectRequestDemo(selectedViewUser); 
                        if (success) setSelectedViewUser(null); 
                      }}
                      className={`flex-1 py-3 px-6 font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all ${quotaExceeded ? 'bg-gray-300 text-gray-500 hover:bg-gray-300 shadow-none' : 'bg-[#00a992] hover:bg-[#008f7b] text-white shadow-[#00a992]/20'}`}
                    >
                      <CheckCircle2 className="w-4 h-4" /> Request Demo
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
        </div>
      </div>
    </div>
  );
}
