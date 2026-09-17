import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Clock, IndianRupee } from "lucide-react";
import { parse24To12Hour, to24HourTime } from "@/utils/timeFormat";

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (value: string, date?: string, time?: string) => void;
  title: string;
  description: string;
  placeholder: string;
  type: "price" | "timing" | "demo_booking";
  initialValue?: string;
  initialDate?: string;
  initialTime?: string;
  min?: number;
  max?: number;
  isOnline?: boolean;
}

export default function ActionModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  description,
  placeholder,
  type,
  initialValue = "",
  initialDate = "",
  initialTime = "",
  min,
  max,
  isOnline = false,
}: ActionModalProps) {
  const [value, setValue] = useState(initialValue);
  const [dateValue, setDateValue] = useState(initialDate);
  const [hour, setHour] = useState("05");
  const [minute, setMinute] = useState("00");
  const [period, setPeriod] = useState<"AM" | "PM">("PM");
  const [platform, setPlatform] = useState("Google Meet");
  const [linkValue, setLinkValue] = useState("");

  // Reset value when modal opens
  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
      setDateValue(initialDate);
      const parsed = parse24To12Hour(initialTime);
      setHour(parsed.hour);
      setMinute(parsed.minute);
      setPeriod(parsed.period);
      setPlatform("Google Meet");
      setLinkValue("");
    }
  }, [isOpen, initialValue, initialDate, initialTime]);

  const baseMinutes = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];
  const minuteOptions = minute && !baseMinutes.includes(minute)
    ? [...baseMinutes, minute].sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
    : baseMinutes;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (type === "price") {
      if (!value.trim()) return;
      const parsed = parseFloat(value);
      if (isNaN(parsed) || parsed <= 0) {
        return;
      }
    } else if (type !== "timing" && type !== "demo_booking") {
      if (!value.trim()) return;
    }

    if (type === "timing" || type === "demo_booking") {
      const time24 = to24HourTime(hour, minute, period);
      if (!dateValue || !time24) return;
      onSubmit(value, dateValue, time24);
    } else {
      onSubmit(value);
    }
    setValue("");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-md max-h-[90vh] flex flex-col bg-white rounded-3xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="p-5 sm:p-8 overflow-y-auto">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                    {type === "price" ? (
                      <IndianRupee className="w-6 h-6" />
                    ) : (
                      <Clock className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{title}</h3>
                    <p className="text-sm text-gray-500 font-medium mt-1">
                      {description}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="mb-8">
                  <div className="relative">
                    {type === "price" && (
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="text-gray-500 font-bold">&#8377;</span>
                      </div>
                    )}
                    {type === "price" ? (
                      <input
                        type="number"
                        min={min !== undefined ? min : "0"}
                        max={max}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder={placeholder}
                        className="w-full bg-slate-50 border border-gray-200 rounded-2xl py-4 pl-8 pr-4 text-gray-900 font-medium focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        autoFocus
                        required
                      />
                    ) : (
                      <div className="flex flex-col gap-4">
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">Select Date <span className="text-red-500 font-bold ml-0.5">*</span></label>
                          <input
                            type="date"
                            min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]}
                            value={dateValue}
                            onChange={(e) => setDateValue(e.target.value)}
                            className="w-full bg-slate-50 border border-gray-200 rounded-2xl py-4 px-4 text-gray-900 font-medium focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">Select Time <span className="text-red-500 font-bold ml-0.5">*</span></label>
                          <div className="grid grid-cols-12 gap-2 items-center">
                            {/* Hour Select */}
                            <div className="col-span-4">
                              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Hour</label>
                              <select
                                value={hour}
                                onChange={(e) => setHour(e.target.value)}
                                className="w-full bg-slate-50 border border-gray-200 rounded-xl py-3 px-3 text-gray-900 font-bold text-base focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
                              >
                                {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((h) => (
                                  <option key={h} value={h}>{h}</option>
                                ))}
                              </select>
                            </div>

                            {/* Separator */}
                            <div className="col-span-1 text-center font-black text-gray-400 text-xl pt-4">:</div>

                            {/* Minute Select */}
                            <div className="col-span-4">
                              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Minute</label>
                              <select
                                value={minute}
                                onChange={(e) => setMinute(e.target.value)}
                                className="w-full bg-slate-50 border border-gray-200 rounded-xl py-3 px-3 text-gray-900 font-bold text-base focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
                              >
                                {minuteOptions.map((m) => (
                                  <option key={m} value={m}>{m}</option>
                                ))}
                              </select>
                            </div>

                            {/* AM/PM Toggle Buttons */}
                            <div className="col-span-3 pt-4">
                              <div className="flex bg-slate-100 p-1 rounded-xl border border-gray-200">
                                <button
                                  type="button"
                                  onClick={() => setPeriod('AM')}
                                  className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${
                                    period === 'AM'
                                      ? 'bg-emerald-600 text-white shadow-sm'
                                      : 'text-gray-600 hover:text-gray-900'
                                  }`}
                                >
                                  AM
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPeriod('PM')}
                                  className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${
                                    period === 'PM'
                                      ? 'bg-emerald-600 text-white shadow-sm'
                                      : 'text-gray-600 hover:text-gray-900'
                                  }`}
                                >
                                  PM
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Live Feedback Preview Badge */}
                          <div className="mt-3 flex items-center justify-between px-3.5 py-2.5 bg-emerald-50/70 border border-emerald-200/60 rounded-xl">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-emerald-600" />
                              <span className="text-xs font-semibold text-emerald-900">Selected Demo Time:</span>
                            </div>
                            <span className="text-sm font-black text-emerald-700 tracking-wide">
                              {hour}:{minute} {period}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-3.5 px-4 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={type === "price" ? !value.trim() : (!dateValue || !hour || !minute)}
                    className="flex-1 py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold rounded-xl hover:from-emerald-700 hover:to-teal-600 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-emerald-500/25"
                  >
                    Submit
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
