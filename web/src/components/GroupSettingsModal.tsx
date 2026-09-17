"use client";

import { useState, useEffect } from 'react';
import { X, Save, Clock, MapPin, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface GroupSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  category: string;
  initialData: any;
  parentId: string;
  onSave: () => void;
  studentNames?: string[];
}

export default function GroupSettingsModal({
  isOpen,
  onClose,
  groupId,
  category,
  initialData,
  parentId,
  onSave,
  studentNames = []
}: GroupSettingsModalProps) {
  const [formData, setFormData] = useState({
    mode: '',
    addressFlat: '',
    addressStreet: '',
    addressPincode: '',
    latitude: null as number | null,
    longitude: null as number | null,
    teacherGenderPreference: 'No Preference',
    hours: '',
    days: '',
    specificDays: [] as string[]
  });
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showLocationConfirmModal, setShowLocationConfirmModal] = useState(false);

  const handleDetectLocation = () => {
    setShowLocationConfirmModal(true);
  };

  const executeDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      try {
        const { latitude, longitude } = position.coords;
        const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        
        const data = await res.json();
        
        const street = data.locality || '';
        const city = data.city || '';
        const pincode = data.postcode || '';
        
        setFormData(prev => ({
          ...prev,
          addressStreet: `${street}${street && city ? ', ' : ''}${city}` || prev.addressStreet,
          addressPincode: pincode || prev.addressPincode,
          latitude,
          longitude
        }));
        toast.success('Location detected and address updated successfully!');
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.error('Geocoding request timed out');
        } else {
          console.error('Error fetching location details:', err);
        }
        toast.error('Failed to automatically detect your address. Please enter it manually.');
      } finally {
        setLocationLoading(false);
      }
    }, (error) => {
      console.warn('Geolocation error:', error.message);
      toast.error('Failed to get location. Please ensure location permissions are granted.');
      setLocationLoading(false);
    }, { timeout: 10000, maximumAge: 0, enableHighAccuracy: true });
  };

  useEffect(() => {
    if (initialData) {
      setFormData({
        mode: initialData.mode === 'Offline (Home Tuition)' ? 'Offline' : (initialData.mode || ''),
        addressFlat: initialData.addressFlat || '',
        addressStreet: initialData.addressStreet || initialData.area || '',
        addressPincode: initialData.addressPincode || initialData.city || '',
        latitude: initialData.latitude || null,
        longitude: initialData.longitude || null,
        teacherGenderPreference: initialData.teacherGenderPreference || 'No Preference',
        hours: initialData.preferredTimeRange || '',
        days: initialData.daysPerWeek || '',
        specificDays: initialData.specificDays || []
      });
    } else {
      setFormData({
        mode: category === 'programming' ? 'Online' : '',
        addressFlat: '',
        addressStreet: '',
        addressPincode: '',
        latitude: null,
        longitude: null,
        teacherGenderPreference: 'No Preference',
        hours: '',
        days: '',
        specificDays: []
      });
    }
  }, [initialData, category, isOpen]);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const isAddressChange = ['addressFlat', 'addressStreet', 'addressPincode'].includes(name);
      let newSpecificDays = prev.specificDays;
      
      if (name === 'days' && value !== 'Flexible / Any Days' && value !== '') {
        const allowedDaysCount = parseInt(value);
        if (!isNaN(allowedDaysCount) && newSpecificDays.length > allowedDaysCount) {
          newSpecificDays = newSpecificDays.slice(0, allowedDaysCount);
        }
      }

      return { 
        ...prev, 
        [name]: value,
        specificDays: newSpecificDays,
        ...(isAddressChange ? { latitude: null, longitude: null } : {})
      };
    });
  };

  const handleSpecificDay = (day: string) => {
    setFormData(prev => {
      const currentDays = prev.specificDays;
      const isRemoving = currentDays.includes(day);
      
      if (!isRemoving && prev.days && prev.days !== 'Flexible / Any Days' && prev.days !== '') {
        const allowedDaysCount = parseInt(prev.days);
        if (!isNaN(allowedDaysCount) && currentDays.length >= allowedDaysCount) {
           toast.error(`You can only select up to ${allowedDaysCount} days.`);
           return prev;
        }
      }
      
      const newDays = isRemoving ? currentDays.filter(d => d !== day) : [...currentDays, day];
      return { ...prev, specificDays: newDays };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.mode && category !== 'programming') {
      toast.error('Please select a mode');
      return;
    }

    setLoading(true);
    try {
      const { db } = await import('@/utils/firebase/client');
      const { collection, query, where, getDocs, updateDoc, doc, setDoc } = await import('firebase/firestore');

      const combinedAddress = formData.mode === 'Online' ? '' : [formData.addressFlat, formData.addressStreet, formData.addressPincode].filter(Boolean).join(', ');

      let finalLat = formData.latitude;
      let finalLng = formData.longitude;

      if ((formData.mode === 'Offline' || formData.mode === 'Offline (Home Tuition)') && (!finalLat || !finalLng) && combinedAddress) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(combinedAddress)}&limit=1`, {
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          
          const data = await res.json();
          if (data && data.length > 0) {
            finalLat = parseFloat(data[0].lat);
            finalLng = parseFloat(data[0].lon);
          }
        } catch (err: any) {
          if (err.name === 'AbortError') {
            console.error('Geocoding request timed out');
          } else {
            console.error("Geocoding failed during save:", err);
          }
        }
      }

      let cleanMode = formData.mode;
      if (cleanMode === 'Offline (Home Tuition)') cleanMode = 'Offline';
      if (!cleanMode) cleanMode = 'Online';

      const groupRef = doc(db, 'groups', groupId);
      await setDoc(groupRef, {
        groupDocId: groupId,
        mode: cleanMode,
        area: combinedAddress,
        city: cleanMode === 'Online' ? '' : (formData.addressPincode || combinedAddress.split(',').pop()?.trim() || ''),
        latitude: cleanMode === 'Online' ? null : finalLat,
        longitude: cleanMode === 'Online' ? null : finalLng,
        teacherGenderPreference: formData.teacherGenderPreference,
        preferredTimeRange: formData.hours,
        daysPerWeek: formData.days,
        specificDays: formData.specificDays,
        parentId: parentId,
        parentDocId: parentId,
        updatedAt: Date.now()
      }, { merge: true });

      let q = query(collection(db, 'tuition_requests'), where('groupDocId', '==', groupId));
      let snap = await getDocs(q);
      if (snap.empty) {
        const legacyQ = query(collection(db, 'tuition_requests'), where('groupId', '==', groupId));
        snap = await getDocs(legacyQ);
      }

      if (!snap.empty) {
        for (const requestDoc of snap.docs) {
          await updateDoc(requestDoc.ref, {
            groupDocId: groupId,
            parentDocId: parentId,
            mode: cleanMode,
            teacherGenderPreference: formData.teacherGenderPreference,
            area: combinedAddress,
            city: cleanMode === 'Online' ? '' : (formData.addressPincode || combinedAddress.split(',').pop()?.trim() || ''),
            latitude: cleanMode === 'Online' ? null : finalLat,
            longitude: cleanMode === 'Online' ? null : finalLng,
            preferredTimeRange: formData.hours,
            daysPerWeek: formData.days,
            specificDays: formData.specificDays
          });
        }
      }

      toast.success('Group settings updated successfully!');
      onSave();
      onClose();
    } catch (error: any) {
      toast.error('Error updating settings: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-3xl shadow-2xl w-[calc(100%-2rem)] max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-[#00a992] p-4 sm:p-6 text-white shrink-0">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">Group Preferences</h2>
              <p className="text-teal-50 font-medium mt-1">
                {studentNames.length > 0 
                  ? `Updating settings for: ${studentNames.join(', ')}`
                  : 'Update settings for this group of students.'}
              </p>
            </div>
            <button onClick={onClose} className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-grow">
          <form id="group-settings-form" onSubmit={handleSubmit} className="space-y-8">
            
            {category !== 'programming' && (
              <div>
                <label className="block text-sm font-semibold mb-3">Teaching Mode <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 gap-4">
                  <label className={`cursor-pointer border-2 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 transition-all ${
                    formData.mode === 'Online' ? 'border-[#00a992] bg-emerald-50 text-emerald-700 shadow-sm' : 'border-slate-200 hover:border-emerald-200'
                  }`}>
                    <input type="radio" name="mode" value="Online" checked={formData.mode === 'Online'} onChange={handleChange} className="sr-only" />
                    <span className="font-bold">Online</span>
                  </label>
                  <label className={`cursor-pointer border-2 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 transition-all ${
                    (formData.mode === 'Offline' || formData.mode === 'Offline (Home Tuition)') ? 'border-[#00a992] bg-emerald-50 text-emerald-700 shadow-sm' : 'border-slate-200 hover:border-emerald-200'
                  }`}>
                    <input type="radio" name="mode" value="Offline" checked={formData.mode === 'Offline' || formData.mode === 'Offline (Home Tuition)'} onChange={handleChange} className="sr-only" />
                    <span className="font-bold text-center">Offline<br/><span className="text-xs opacity-70">(Home Tuition)</span></span>
                  </label>
                </div>
              </div>
            )}

            {(formData.mode === 'Offline' || formData.mode === 'Offline (Home Tuition)') && (
              <div className="bg-emerald-50/50 border border-emerald-100 p-6 rounded-2xl space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-emerald-800 flex items-center gap-2"><MapPin className="w-4 h-4" /> Address for Home Tuition</h4>
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={locationLoading}
                    className="text-xs font-bold text-emerald-600 bg-emerald-100/50 px-3 py-1.5 rounded-lg hover:bg-emerald-200 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{locationLoading ? 'Detecting...' : 'Detect Current Location'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  name="addressFlat"
                  value={formData.addressFlat}
                  onChange={handleChange}
                  placeholder="Flat / House No. / Building"
                  className="w-full border border-emerald-200 rounded-xl px-4 py-3 bg-white"
                />
                <input
                  type="text"
                  name="addressStreet"
                  value={formData.addressStreet}
                  onChange={handleChange}
                  placeholder="Street / Area / Locality"
                  className="w-full border border-emerald-200 rounded-xl px-4 py-3 bg-white"
                />
                <input
                  type="text"
                  name="addressPincode"
                  value={formData.addressPincode}
                  onChange={handleChange}
                  placeholder="Pincode / City"
                  className="w-full border border-emerald-200 rounded-xl px-4 py-3 bg-white"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold mb-3">Teacher Gender Preference</label>
              <div className="flex flex-wrap gap-3">
                {['No Preference', 'Male', 'Female'].map((gender) => (
                  <label key={gender} className={`cursor-pointer border-2 rounded-xl px-4 py-2 transition-all ${
                    formData.teacherGenderPreference === gender ? 'border-[#00a992] bg-emerald-50 text-emerald-700 font-bold' : 'border-slate-200 text-slate-600 hover:border-emerald-200'
                  }`}>
                    <input type="radio" name="teacherGenderPreference" value={gender} checked={formData.teacherGenderPreference === gender} onChange={handleChange} className="sr-only" />
                    {gender}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h4 className="font-bold text-slate-800 flex items-center gap-2"><Clock className="w-4 h-4" /> Timings & Days (Optional)</h4>
              
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Preferred Time Range</label>
                <select name="hours" value={formData.hours} onChange={handleChange} className="w-full border border-slate-300 rounded-xl px-4 py-3 bg-white">
                  <option value="">Flexible / Any Time</option>
                  <option value="Morning (8 AM - 12 PM)">Morning (8 AM - 12 PM)</option>
                  <option value="Afternoon (12 PM - 4 PM)">Afternoon (12 PM - 4 PM)</option>
                  <option value="Evening (4 PM - 8 PM)">Evening (4 PM - 8 PM)</option>
                  <option value="Night (After 8 PM)">Night (After 8 PM)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Days per Week</label>
                <select name="days" value={formData.days} onChange={handleChange} className="w-full border border-slate-300 rounded-xl px-4 py-3 bg-white">
                  <option value="">Flexible / Any Days</option>
                  <option value="1">1 Day / Week</option>
                  <option value="2">2 Days / Week</option>
                  <option value="3">3 Days / Week</option>
                  <option value="4">4 Days / Week</option>
                  <option value="5">5 Days / Week</option>
                  <option value="6">6 Days / Week</option>
                  <option value="7">Everyday</option>
                </select>
              </div>

              {formData.days && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Specific Days of the Week (Optional)</label>
                  <div className="flex flex-wrap gap-2">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                      const isChecked = formData.specificDays.includes(day);
                      const maxDays = formData.days === '7' ? 7 : parseInt(formData.days) || 0;
                      const isAtMax = maxDays > 0 && formData.specificDays.length >= maxDays;
                      const isDisabled = !isChecked && isAtMax;
                      return (
                        <label key={day} className={`flex items-center gap-2 border rounded-lg px-3 py-2 bg-white transition-colors ${isDisabled ? 'opacity-50 cursor-not-allowed border-slate-200' : 'cursor-pointer border-slate-300 hover:border-[#00a992]'} ${isChecked ? 'border-[#00a992] bg-emerald-50' : ''}`}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isDisabled}
                            onChange={() => handleSpecificDay(day)}
                            className="accent-[#00a992]"
                          />
                          <span className="text-xs font-medium">{day.substring(0, 3)}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

          </form>
        </div>

        <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 shrink-0 flex flex-col sm:flex-row justify-end gap-3">
          <button onClick={onClose} className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors text-center">
            Cancel
          </button>
          <button 
            type="submit" 
            form="group-settings-form"
            disabled={loading}
            className="w-full sm:w-auto bg-[#00a992] text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-600 transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save Preferences
          </button>
        </div>

      </div>

      {showLocationConfirmModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 relative overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-teal-50 text-[#00a992] rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-teal-100">
              <MapPin className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Location Permission</h3>
            <p className="text-slate-600 mb-8 font-medium text-sm leading-relaxed">
              Allow Mushi to access your device location to automatically detect and fill your offline tutoring address?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowLocationConfirmModal(false)}
                className="flex-1 py-3.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLocationConfirmModal(false);
                  executeDetectLocation();
                }}
                className="flex-1 py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#00a992] to-teal-500 text-white font-bold shadow-lg shadow-teal-500/25 hover:from-[#009b86] hover:to-teal-600 transition-all"
              >
                Allow Access
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
