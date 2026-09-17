import React, { useState, useEffect } from 'react';
import { User, X, CheckCircle2, TrendingUp, CalendarDays, Star, ShieldCheck, MapPin, Navigation, Globe, Clock, AlertTriangle, AlertCircle, ArrowRight, Lock } from 'lucide-react';

interface TutorViewModalProps {
  selectedViewUser: any;
  selectedViewApp: any;
  setSelectedViewUser: (user: any) => void;
  setSelectedViewApp: (app: any) => void;
  data: any;
  activeGroup: any;
  negotiationOffer: Record<string, string>;
  setNegotiationOffer: (offer: Record<string, string>) => void;
  handleRequestTutor: (tutor: any) => Promise<any>;
  handleDirectRequestDemo: (tutor: any) => Promise<any>;
  dailyRequestsCount: number;
  setActionConfirmModal: (modal: any) => void;
  offerLoading?: boolean;
  onPayFee?: (app: any) => void;
}

export function TutorViewModal({
  selectedViewUser,
  selectedViewApp,
  setSelectedViewUser,
  setSelectedViewApp,
  data,
  activeGroup,
  negotiationOffer,
  setNegotiationOffer,
  handleRequestTutor,
  handleDirectRequestDemo,
  dailyRequestsCount,
  setActionConfirmModal,
  offerLoading,
  onPayFee
}: TutorViewModalProps) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  useEffect(() => {
    if (selectedViewUser?.id) {
      setReviewsLoading(true);
      fetch(`/api/reviews?tutorDocId=${selectedViewUser.id}`)
        .then(res => res.json())
        .then(resData => {
          if (resData.success) setReviews(resData.reviews || []);
        })
        .catch(err => console.error('Error fetching reviews:', err))
        .finally(() => setReviewsLoading(false));
    }
  }, [selectedViewUser?.id]);

  if (!selectedViewUser) return null;

  const getTutorBasePrice = (tutor: any) => {
    if (activeGroup?.students?.length > 1 && tutor.groupFeeRange) return tutor.groupFeeRange;
    return tutor.feeRange || 0;
  };

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
              {selectedViewUser.name?.charAt(0) || 'T'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight">{selectedViewUser.name}</h3>
                {selectedViewUser.aadharVerified && (
                  <ShieldCheck className="w-6 h-6 sm:w-8 sm:h-8 text-white/90 drop-shadow-md flex-shrink-0" />
                )}
              </div>
              {selectedViewUser.tutorId && (
                <p className="text-emerald-100 font-mono font-bold mt-1.5 uppercase tracking-wider text-xs sm:text-sm bg-black/10 inline-block px-2 py-1 rounded-md border border-white/20 shadow-sm">
                  ID: {selectedViewUser.tutorId}
                </p>
              )}
              <p className="text-emerald-100 font-bold capitalize mt-1 text-sm sm:text-lg flex items-center gap-2">
                <User className="w-4 h-4" /> {selectedViewUser.category || 'Tutor'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-8 md:p-10 overflow-y-auto">
          <div className="space-y-8">
            
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <h4 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                Contact & Professional Details
              </h4>
              {(!selectedViewApp || !['demo_scheduled', 'waiting_for_parent_decision', 'demo_booked', 'tuition_started', 'confirmed', 'accepted'].includes(selectedViewApp.status)) ? (
                <div className="mb-4 p-4 bg-orange-50 rounded-xl border border-orange-100 flex items-center justify-center">
                  <p className="text-sm font-bold text-orange-600 text-center">Contact details will be revealed once the demo is scheduled.</p>
                </div>
              ) : null}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedViewApp && ['demo_scheduled', 'waiting_for_parent_decision', 'demo_booked', 'tuition_started', 'confirmed', 'accepted'].includes(selectedViewApp.status) && (selectedViewUser.phone || selectedViewUser.whatsapp || selectedViewUser.phoneNumber) && (
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Phone Number</p>
                    <p className="font-bold text-gray-800">{selectedViewUser.phone || selectedViewUser.whatsapp || selectedViewUser.phoneNumber}</p>
                  </div>
                )}
                {selectedViewApp && ['demo_scheduled', 'waiting_for_parent_decision', 'demo_booked', 'tuition_started', 'confirmed', 'accepted'].includes(selectedViewApp.status) && selectedViewUser.email && (
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Email</p>
                    <p className="font-bold text-gray-800 break-all">{selectedViewUser.email}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Experience</p>
                  <p className="font-bold text-gray-800">{selectedViewUser.experience || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Highest Qualification</p>
                  <p className="font-bold text-gray-800">{selectedViewUser.qualification || 'Not specified'}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <h4 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                Teaching Expertise
              </h4>
              <div className="grid grid-cols-1 gap-4">
                {selectedViewUser.category === 'programming' && (selectedViewUser.technologies?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Technologies</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedViewUser.technologies.map((t: string) => (
                        <span key={t} className="px-2 py-1 bg-white text-gray-700 text-xs font-bold rounded-md border border-gray-200 shadow-sm">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedViewUser.category === 'languages' && (selectedViewUser.languagesTaught?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Languages</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedViewUser.languagesTaught.map((l: string) => (
                        <span key={l} className="px-2 py-1 bg-white text-gray-700 text-xs font-bold rounded-md border border-gray-200 shadow-sm">{l}</span>
                      ))}
                    </div>
                  </div>
                )}
                
                {(!selectedViewUser.category || selectedViewUser.category === 'school') && (selectedViewUser.subjects?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Subjects</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedViewUser.subjects.map((s: string) => (
                        <span key={s} className="px-2 py-1 bg-white text-gray-700 text-xs font-bold rounded-md border border-gray-200 shadow-sm">{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Teaching Approach</p>
                  <p className="font-bold text-gray-800">{selectedViewUser.teachingApproach || 'Not specified'}</p>
                </div>
              </div>
            </div>

            {/* Offline Tuition & Travel Preferences (Shown when teacher conducts offline/in-person classes) */}
            {selectedViewUser.mode?.toLowerCase() !== 'online' && (
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200/80 shadow-sm">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-gray-900 leading-tight">Offline Tuition & Travel</h4>
                      <p className="text-xs text-gray-500 font-medium">In-person & home tuition preferences</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full border border-emerald-200 capitalize">
                    {selectedViewUser.mode || 'Offline'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Preferred Locations */}
                  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-1.5">
                      <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Preferred Locations</p>
                    </div>
                    <p className="font-bold text-gray-800 text-sm">
                      {selectedViewUser.preferredLocations || selectedViewUser.locations || [selectedViewUser.area, selectedViewUser.city].filter(Boolean).join(', ') || 'Open to all nearby areas'}
                    </p>
                  </div>

                  {/* Willingness to Travel */}
                  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Navigation className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Willingness to Travel</p>
                    </div>
                    <p className="font-bold text-gray-800 text-sm">
                      {selectedViewUser.travelDistance || selectedViewUser.travelKm
                        ? `Within ${String(selectedViewUser.travelDistance || selectedViewUser.travelKm).replace(/[^0-9.]/g, '')} km radius`
                        : 'Within local vicinity'}
                    </p>
                  </div>

                  {/* Tutor Base Locality */}
                  {(selectedViewUser.area || selectedViewUser.city || selectedViewUser.pincode) && (
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm sm:col-span-2">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Globe className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tutor Base Locality</p>
                      </div>
                      <p className="font-bold text-gray-800 text-sm">
                        {[selectedViewUser.area, selectedViewUser.city, selectedViewUser.pincode].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">
                  {selectedViewApp ? (selectedViewApp.status === 'tuition_started' ? 'Agreed Monthly Fee' : 'Amount to be Paid') : 'Total Budget'}
                </p>
                <p className="text-3xl font-black text-emerald-700">₹{selectedViewApp?.finalPrice || selectedViewApp?.currentOffer || selectedViewUser.feeRange || 'Negotiable'}<span className="text-base font-bold text-emerald-600/70">/mo</span></p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Teaching Mode</p>
                <p className="font-bold text-emerald-800 capitalize">{selectedViewUser.mode || 'Online'}</p>
                {selectedViewUser.mode?.toLowerCase() === 'online' ? (
                  <p className="text-xs font-semibold text-emerald-600 mt-0.5">Online (Google Meet / Zoom)</p>
                ) : (
                  <p className="text-xs font-semibold text-emerald-600 mt-0.5">Offline / In-Person</p>
                )}
              </div>
            </div>

            {selectedViewApp && selectedViewApp.status === 'tuition_started' && (() => {
              const parseTimestamp = (val: any) => {
                if (!val) return 0;
                if (typeof val === 'number') return val;
                if (typeof val.toMillis === 'function') return val.toMillis();
                if (val.seconds) return val.seconds * 1000;
                if (val._seconds) return val._seconds * 1000;
                const parsed = new Date(val).getTime();
                return isNaN(parsed) ? 0 : parsed;
              };

              const startMs = parseTimestamp(selectedViewApp.startDate) || parseTimestamp(selectedViewApp.createdAt) || Date.now();
              const nowTime = Date.now();
              const daysElapsed = Math.max(0, Math.floor((nowTime - startMs) / (24 * 60 * 60 * 1000)));

              const isFeePaid = Boolean(selectedViewApp.feePaid);
              const day7DueDate = startMs + (7 * 24 * 60 * 60 * 1000);
              const day30Date = startMs + (30 * 24 * 60 * 60 * 1000);

              const day7DateStr = new Date(day7DueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
              const day30DateStr = new Date(day30Date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

              const isInTrial = !isFeePaid && daysElapsed < 7;
              const isGracePeriod = !isFeePaid && daysElapsed >= 7 && daysElapsed < 20;
              const isLockedOverdue = !isFeePaid && daysElapsed >= 20;

              const subsequentPayments: any[] = Array.isArray(selectedViewApp.subsequentPayments) ? selectedViewApp.subsequentPayments : [];
              const totalPaymentsMade = (isFeePaid ? 1 : 0) + subsequentPayments.length;

              const nextMonthNumber = 1 + subsequentPayments.length;
              const nextPaymentDueDate = selectedViewApp.nextPaymentDate 
                ? new Date(selectedViewApp.nextPaymentDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                : new Date(startMs + (nextMonthNumber * 30 * 24 * 60 * 60 * 1000)).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

              const paymentsList: Array<{
                id: string;
                title: string;
                amount: number;
                date: number;
                method: string;
                isEscrow: boolean;
                status: string;
                paymentId?: string;
              }> = [];

              if (isFeePaid) {
                const paidDate = parseTimestamp(selectedViewApp.feePaidAt) || parseTimestamp(selectedViewApp.updatedAt) || startMs;
                paymentsList.push({
                  id: 'month_1_payment',
                  title: 'Month 1 Tuition (Platform Escrow)',
                  amount: selectedViewApp.finalPrice || 0,
                  date: paidDate,
                  method: 'MiTutora Online Checkout',
                  isEscrow: true,
                  status: 'Paid & Escrow Protected',
                  paymentId: selectedViewApp.paymentId || selectedViewApp.orderId || ''
                });
              }

              subsequentPayments.forEach((pmt: any, idx: number) => {
                paymentsList.push({
                  id: `month_${idx + 2}_payment`,
                  title: `Month ${idx + 2} Direct Tuition`,
                  amount: pmt.amount || selectedViewApp.finalPrice || 0,
                  date: parseTimestamp(pmt.date) || Date.now(),
                  method: 'Direct Payment to Tutor',
                  isEscrow: false,
                  status: 'Paid Direct'
                });
              });

              return (
                <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-5">
                  <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                    <div>
                      <h4 className="text-xl font-bold text-gray-900">Payment Details</h4>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">Track your tuition fee schedule and escrow status.</p>
                    </div>
                    <span className="text-xs bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-bold">
                      {totalPaymentsMade} {totalPaymentsMade === 1 ? 'Payment' : 'Payments'} Made
                    </span>
                  </div>

                  {/* Payment Milestone Status Card */}
                  {!isFeePaid ? (
                    <div className={`p-4 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                      isLockedOverdue 
                        ? 'bg-rose-50 border-rose-200 text-rose-950' 
                        : isGracePeriod 
                          ? 'bg-orange-50 border-orange-200 text-orange-950' 
                          : 'bg-amber-50 border-amber-200 text-amber-950'
                    }`}>
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 shrink-0">
                          {isLockedOverdue ? (
                            <AlertCircle className="w-5 h-5 text-rose-600" />
                          ) : isGracePeriod ? (
                            <AlertTriangle className="w-5 h-5 text-orange-600" />
                          ) : (
                            <Clock className="w-5 h-5 text-amber-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                            Month 1 Tuition Fee Due
                          </p>
                          <p className="text-sm font-bold mt-0.5">
                            {isLockedOverdue ? (
                              'Payment Overdue — Account Locked'
                            ) : isGracePeriod ? (
                              `Payment Due (Grace Period ends ${new Date(startMs + 20 * 24 * 60 * 60 * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})`
                            ) : (
                              `Due on ${day7DateStr} (Trial Day 7)`
                            )}
                          </p>
                          <p className="text-xs opacity-90 mt-1">
                            {isLockedOverdue 
                              ? 'Your payment grace period has expired. Classes are paused until tuition dues are cleared.' 
                              : isGracePeriod 
                                ? `Trial ended on ${day7DateStr}. You have ${Math.max(1, 20 - daysElapsed)} days remaining to clear dues before account lockout.` 
                                : `7-day trial in progress (${Math.max(0, 7 - daysElapsed)} days remaining). Your fee is held in platform escrow until Day 30.`}
                          </p>
                        </div>
                      </div>

                      {onPayFee && (
                        isInTrial ? (
                          <button
                            type="button"
                            disabled
                            title={`7-day trial in progress. Payment unlocks on Day 7 (${day7DateStr}).`}
                            className="bg-slate-100/90 text-slate-400 border border-slate-200/90 font-bold text-xs px-4 py-2.5 rounded-xl shadow-none cursor-not-allowed select-none opacity-75 backdrop-blur-[2px] flex items-center gap-1.5 shrink-0 transition-all"
                          >
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Unlocks Day 7 ({Math.max(1, 7 - daysElapsed)}d left)</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onPayFee(selectedViewApp)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-1.5 shrink-0 active:scale-95"
                          >
                            <span>Pay Fee (₹{(selectedViewApp.finalPrice || 0).toLocaleString()})</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )
                      )}
                    </div>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-200/80 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Month 1 Settled</p>
                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">Platform Escrow Protected</span>
                          </div>
                          <p className="text-sm font-bold text-gray-900 mt-0.5">
                            Next Payment Due: {nextPaymentDueDate} (Month {nextMonthNumber} Direct)
                          </p>
                          <p className="text-xs text-slate-600 mt-1">
                            Month 1 fee is held in platform escrow for 30 days. Month 2+ direct tuition is paid directly to your tutor with 0% platform fee.
                          </p>
                        </div>
                      </div>
                      <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400 shrink-0">
                        <CalendarDays className="w-5 h-5" />
                      </div>
                    </div>
                  )}

                  {/* Payment History */}
                  <div>
                    <p className="text-sm font-bold text-gray-800 mb-3">Payment History</p>
                    <div className="space-y-2 max-h-52 overflow-y-auto custom-scrollbar pr-1">
                      {paymentsList.length > 0 ? (
                        paymentsList.map((payment) => (
                          <div key={payment.id} className="flex justify-between items-center p-3.5 bg-white border border-gray-100 rounded-xl hover:border-emerald-200 transition-colors shadow-sm">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                                payment.isEscrow ? 'bg-teal-50 text-teal-600' : 'bg-emerald-50 text-emerald-600'
                              }`}>
                                {payment.isEscrow ? <ShieldCheck className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-gray-900">{payment.title}</p>
                                <p className="text-xs font-medium text-slate-500 mt-0.5">
                                  {payment.method} • {new Date(payment.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                  {payment.paymentId ? ` • ID: ${payment.paymentId}` : ''}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-gray-900">₹{payment.amount?.toLocaleString()}</p>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded inline-block mt-0.5 ${
                                payment.isEscrow ? 'text-teal-700 bg-teal-50 border border-teal-200/60' : 'text-emerald-700 bg-emerald-50 border border-emerald-200/60'
                              }`}>
                                {payment.status}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-center text-xs font-medium text-gray-500">
                          No payments recorded yet. Month 1 tuition fee will appear here once cleared.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
            
            {selectedViewUser.mode?.toLowerCase() !== 'online' && selectedViewUser.address && (
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 mt-8">
                <h4 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                  Residential Address
                </h4>
                <p className="font-bold text-gray-800">{selectedViewUser.address}</p>
              </div>
            )}

            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 mt-8">
              <h4 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200 flex items-center gap-2">
                <Star className="w-5 h-5 text-emerald-600" /> Parent Reviews
              </h4>
              <div className="space-y-4 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                {reviewsLoading ? (
                  <p className="text-sm text-gray-500 font-medium">Loading reviews...</p>
                ) : reviews.length > 0 ? (
                  reviews.map((review) => (
                    <div key={review.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200 fill-slate-50'}`} />
                        ))}
                      </div>
                      <p className="text-sm font-medium text-gray-700 italic">"{review.comment}"</p>
                    </div>
                  ))
                ) : (
                  <div className="p-4 bg-white rounded-xl border border-dashed border-gray-200 text-center">
                    <p className="text-sm font-medium text-gray-500">No reviews have been written for this tutor yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

        {/* Actions */}
        {(() => {
          if (selectedViewApp?.status === 'waiting_for_parent_decision') {
            return (
              <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => {
                    setActionConfirmModal({ isOpen: true, type: 'hire', appId: selectedViewApp.id, teacherName: selectedViewApp.tutorName || 'the teacher' });
                    setSelectedViewUser(null);
                    setSelectedViewApp(null);
                  }}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-black text-sm shadow-lg transform hover:scale-105 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> Hire Teacher
                </button>
                <button 
                  onClick={() => {
                    setActionConfirmModal({ isOpen: true, type: 'reject', appId: selectedViewApp.id, teacherName: selectedViewApp.tutorName || 'the teacher' });
                    setSelectedViewUser(null);
                    setSelectedViewApp(null);
                  }}
                  className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 px-5 py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center"
                >
                  Reject
                </button>
              </div>
            );
          }

          const matchGroup = (app: any) => {
            if (app.groupDocId) return app.groupDocId === activeGroup?.id;
            return activeGroup?.students?.some((s:any) => s.id === app.studentDocId) || false;
          };
          const activeAppForGroup = data?.applications?.find((app: any) => matchGroup(app) && ['negotiating', 'pending', 'reviewing', 'offer_sent', 'demo_requested_by_student', 'demo_requested_by_teacher', 'demo_pending_payment', 'demo_booking_phase', 'demo_scheduled', 'waiting_for_parent_decision', 'demo_booked', 'accepted', 'tuition_started'].includes(app.status));
          const hiredAppForGroup = data?.applications?.find((app: any) => matchGroup(app) && app.status === 'tuition_started');
          const hasNegotiation = data?.applications?.some((app: any) => app.tutorDocId === selectedViewUser.id && ['negotiating'].includes(app.status));
          const isPending = data?.applications?.some((app: any) => app.tutorDocId === selectedViewUser.id && ['demo_requested_by_student', 'demo_requested_by_teacher', 'demo_pending_payment', 'demo_booked', 'pending', 'accepted'].includes(app.status));
          const isHired = data?.applications?.some((app: any) => app.tutorDocId === selectedViewUser.id && ['tuition_started'].includes(app.status));
          const cooldownApp = data?.applications?.find((app: any) => app.tutorDocId === selectedViewUser.id && app.status === 'declined' && app.declinedAt && (Date.now() - app.declinedAt < 7 * 24 * 60 * 60 * 1000));
          
          if (isHired || isPending || hasNegotiation || cooldownApp || selectedViewApp || activeAppForGroup || hiredAppForGroup) {
            return (
              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-center text-gray-500 font-medium text-sm">
                {hiredAppForGroup ? 'A teacher has already been hired for this group.' : (activeAppForGroup && activeAppForGroup.tutorDocId !== selectedViewUser.id ? 'You have an active demo with another tutor for this group.' : 'Currently unavailable for new requests.')}
              </div>
            );
          }
          
          return (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-[10px] text-gray-500 leading-tight mb-2">Type a value below to negotiate, or leave empty to request a demo at the original price.</p>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Your Offer (₹/mo)</label>
                  <input 
                    type="number"
                    min={getTutorBasePrice(selectedViewUser) ? Math.ceil(getTutorBasePrice(selectedViewUser) * 0.6) : 0}
                    max={getTutorBasePrice(selectedViewUser) || undefined}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-bold text-emerald-700 bg-gray-50"
                    placeholder={getTutorBasePrice(selectedViewUser) ? `e.g. ${getTutorBasePrice(selectedViewUser)}` : "e.g. 500"}
                    value={negotiationOffer[selectedViewUser.id] || ''}
                    onChange={(e) => setNegotiationOffer({...negotiationOffer, [selectedViewUser.id]: e.target.value})}
                  />
                  {getTutorBasePrice(selectedViewUser) > 0 && negotiationOffer[selectedViewUser.id] && parseInt(negotiationOffer[selectedViewUser.id]) >= getTutorBasePrice(selectedViewUser) * 0.6 && parseInt(negotiationOffer[selectedViewUser.id]) <= getTutorBasePrice(selectedViewUser) * 0.7 && (
                    <p className="text-xs text-yellow-600 font-medium mt-1">Note: Your offer is quite low. The teacher is highly likely to reject it.</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {negotiationOffer[selectedViewUser.id] ? (
                    <button 
                      onClick={async () => { 
                        const success = await handleRequestTutor(selectedViewUser); 
                        if (success) setSelectedViewUser(null); 
                      }}
                      className={`flex-1 py-3 px-6 font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all ${dailyRequestsCount >= 5 ? 'bg-gray-300 text-gray-500 cursor-not-allowed hover:bg-gray-300 shadow-none' : 'bg-[#00a992] hover:bg-[#008f7b] text-white shadow-[#00a992]/20'}`}
                    >
                      <CheckCircle2 className="w-4 h-4" /> Negotiate
                    </button>
                  ) : (
                    <button 
                      onClick={async () => { 
                        const success = await handleDirectRequestDemo(selectedViewUser); 
                        if (success) setSelectedViewUser(null); 
                      }}
                      className={`flex-1 py-3 px-6 font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all ${dailyRequestsCount >= 5 ? 'bg-gray-300 text-gray-500 cursor-not-allowed hover:bg-gray-300 shadow-none' : 'bg-[#00a992] hover:bg-[#008f7b] text-white shadow-[#00a992]/20'}`}
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
