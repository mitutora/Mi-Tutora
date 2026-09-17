export interface Application {
  id: string;
  absoluteMax?: number;
  absoluteMin?: number;
  applicationId?: string;
  category?: string;
  createdAt: number;
  currentOffer?: number;
  declinedAt?: number;
  demoHours?: string;
  finalPrice?: number;
  groupDocId?: string;
  groupId?: string; // Flagged as potential drift
  initialBudget?: number;
  initiator?: string;
  lastUpdatedBy?: string;
  mode?: string;
  parentDocId?: string;
  requestDocId?: string;
  source?: string;
  status?: string;
  studentDocId?: string;
  studentDocIds?: string[];
  studentIds?: string[];
  studentName?: string;
  students?: any; // Frontend nested array
  tutorDocId?: string;
  tutorName?: string;
  updatedAt: number;
  paymentHistory?: any[]; // Flagged as potential drift
  subsequentPayments?: any[]; // Flagged as potential drift
}

export interface Group {
  id: string;
  addressFlat?: string;
  addressPincode?: string;
  addressStreet?: string;
  area?: string;
  city?: string;
  createdAt: number;
  daysPerWeek?: string;
  groupDocId?: string;
  groupId?: string; // Flagged as potential drift
  latitude?: number | null;
  longitude?: number | null;
  mode?: string;
  parentDocId?: string;
  parentId?: string; // Flagged as potential drift
  preferredTimeRange?: string;
  specificDays?: string[];
  status?: string;
  studentDocIds?: string[];
  studentIds?: string[]; // Flagged as potential drift
  teacherGenderPreference?: string;
  updatedAt: number;
  budget?: number; // Needed in frontend
  totalBudget?: number; // Needed in frontend
  rank?: number;
  category?: string;
  name?: string;
  students?: any; // Frontend nested array
}

export interface Student {
  id: string;
  board?: string;
  budget?: number;
  category?: string;
  classLevel?: string;
  createdAt: number;
  dob?: string;
  email?: string;
  gender?: string;
  groupDocId?: string;
  groupId?: string; // Flagged as potential drift
  guardianName?: string;
  isAvailable?: boolean;
  languages?: string[];
  learningGoal?: string;
  name?: string;
  parentDocId?: string;
  parentId?: string; // Flagged as potential drift
  pendingRequests?: string[];
  phoneNumber?: string;
  specialRequirements?: string;
  studentId?: string;
  studentType?: string;
  subjects?: string[];
  technologies?: string[];
  whatsappNumber?: string;
  hoursPerDay?: string;
  preferredTimeRange?: string;
  students?: any; // To fix the typing error
}

export interface Tutor {
  id: string;
  accountStatus?: string;
  area?: string;
  authUid: string;
  boards?: string[];
  category?: string;
  city?: string;
  pincode?: string;
  classes?: string[];
  dailyUsage?: { count?: number; date?: string };
  email?: string;
  experience?: string;
  feeRange?: string;
  gender?: string;
  hasProfile?: boolean;
  knownLanguages?: string[];
  languagesTaught?: string[];
  latitude?: number;
  longitude?: number;
  mode?: string;
  name?: string;
  occupation?: string;
  pendingRequests?: string[];
  phone?: string;
  preferredLocations?: string;
  preferredTimeRange?: string;
  price?: number;
  qualification?: string;
  rating?: number;
  role?: string;
  studentCount?: string;
  subjects?: string[];
  teachingApproach?: string;
  technologies?: string[];
  travelDistance?: string;
  tutorId?: string;
  verificationStatus?: string;
  verificationDocs?: Record<string, { url: string; fileName: string; uploadedAt: number }>;
  verificationSubmittedAt?: number;
  resume?: { url: string; fileName: string; uploadedAt: number };
  resumeUrl?: string;
  minFee?: number;
  suitabilityScore?: number;
  isSubscribed?: boolean;
  rank?: number;
}

export interface User {
  id: string;
  email?: string;
  fcmToken?: string;
  hasProfile?: boolean;
  name?: string;
  referralCode?: string;
  referredBy?: string;
  role?: string;
  roles?: string[];
  walletBalance?: number;
  walletbalance?: number; // Flagged as potential drift
}
