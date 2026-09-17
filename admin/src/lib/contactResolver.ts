import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

export interface ResolvedContact {
  name?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  upiId?: string;
  bankDetails?: {
    accountNumber?: string;
    ifsc?: string;
    bankName?: string;
  };
}

// In-memory cache to prevent repeated redundant Firestore reads
const cache = new Map<string, any>();

/**
 * Clean and format a phone number for direct WhatsApp web/app link
 * Correctly handles 10-digit Indian numbers, numbers with leading 0, or already having country code (91)
 */
export function formatWhatsAppUrl(phone?: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";

  if (digits.length === 10) {
    return `https://wa.me/91${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return `https://wa.me/91${digits.slice(1)}`;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return `https://wa.me/${digits}`;
  }
  return `https://wa.me/${digits}`;
}

/**
 * Format phone number for tel: links
 */
export function formatTelUrl(phone?: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  return digits ? `tel:${digits}` : "";
}

/**
 * Helper to pick the first non-empty phone string from an object
 */
function extractPhone(data: any): string | undefined {
  if (!data) return undefined;
  const candidates = [
    data.phone,
    data.whatsapp,
    data.phoneNumber,
    data.whatsappNumber,
    data.mobile,
    data.contactNumber,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim().length > 0) {
      return c.trim();
    }
  }
  return undefined;
}

/**
 * Helper to pick the first non-empty email string from an object
 */
function extractEmail(data: any): string | undefined {
  if (!data) return undefined;
  const candidates = [data.email, data.userEmail, data.parentEmail, data.tutorEmail];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim().length > 0) {
      return c.trim();
    }
  }
  return undefined;
}

/**
 * Resolve comprehensive Tutor contact details without restrictions.
 * Checks tutors/{tutorDocId} -> users/{tutorDocId}.
 */
export async function resolveTutorContact(
  tutorDocId?: string,
  existing?: { name?: string; phone?: string; email?: string }
): Promise<ResolvedContact> {
  const result: ResolvedContact = {
    name: existing?.name || "",
    phone: existing?.phone || "",
    email: existing?.email || "",
  };

  if (!tutorDocId) return result;

  const cacheKey = `tutor:${tutorDocId}`;
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    return {
      name: result.name || cached.name,
      phone: result.phone || cached.phone,
      whatsapp: cached.whatsapp || result.phone || cached.phone,
      email: result.email || cached.email,
      upiId: cached.upiId,
      bankDetails: cached.bankDetails,
    };
  }

  try {
    // 1. Query tutors collection
    const tSnap = await getDoc(doc(db, "tutors", tutorDocId));
    if (tSnap.exists()) {
      const tData = tSnap.data();
      if (!result.name && tData.name) result.name = tData.name;
      if (!result.phone) result.phone = extractPhone(tData);
      if (!result.email && tData.email) result.email = extractEmail(tData);
      if (tData.whatsapp) result.whatsapp = tData.whatsapp;
      if (tData.upiId) result.upiId = tData.upiId;
      if (tData.bankAccount || tData.ifsc) {
        result.bankDetails = {
          accountNumber: tData.bankAccount,
          ifsc: tData.ifsc,
          bankName: tData.bankName,
        };
      }
    }

    // 2. Fallback to users collection if phone or email missing
    if (!result.phone || !result.email || !result.name) {
      const uSnap = await getDoc(doc(db, "users", tutorDocId));
      if (uSnap.exists()) {
        const uData = uSnap.data();
        if (!result.name && uData.name) result.name = uData.name;
        if (!result.phone) result.phone = extractPhone(uData);
        if (!result.email && uData.email) result.email = extractEmail(uData);
        if (!result.upiId && uData.upiId) result.upiId = uData.upiId;
      }
    }

    cache.set(cacheKey, { ...result });
  } catch (err) {
    console.warn(`[contactResolver] Error resolving tutor ${tutorDocId}:`, err);
  }

  return result;
}

/**
 * Resolve comprehensive Parent & Student contact details without restrictions.
 * Checks parents/{parentDocId} -> users/{parentDocId} -> students/{studentDocId}.
 */
export async function resolveParentContact(
  parentDocId?: string,
  studentDocId?: string,
  existing?: { name?: string; phone?: string; email?: string }
): Promise<ResolvedContact> {
  const result: ResolvedContact = {
    name: existing?.name || "",
    phone: existing?.phone || "",
    email: existing?.email || "",
  };

  const cacheKey = `parent:${parentDocId}:${studentDocId}`;
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    return {
      name: result.name || cached.name,
      phone: result.phone || cached.phone,
      whatsapp: cached.whatsapp || result.phone || cached.phone,
      email: result.email || cached.email,
    };
  }

  try {
    // 1. Query parents collection
    if (parentDocId) {
      const pSnap = await getDoc(doc(db, "parents", parentDocId));
      if (pSnap.exists()) {
        const pData = pSnap.data();
        if (!result.name && pData.name) result.name = pData.name;
        if (!result.phone) result.phone = extractPhone(pData);
        if (!result.email && pData.email) result.email = extractEmail(pData);
        if (pData.whatsapp) result.whatsapp = pData.whatsapp;
      }

      // 2. Query users collection
      if (!result.phone || !result.email || !result.name) {
        const uSnap = await getDoc(doc(db, "users", parentDocId));
        if (uSnap.exists()) {
          const uData = uSnap.data();
          if (!result.name && uData.name) result.name = uData.name;
          if (!result.phone) result.phone = extractPhone(uData);
          if (!result.email && uData.email) result.email = extractEmail(uData);
        }
      }
    }

    // 3. Query students collection if phone is still missing or if studentDocId is provided
    if (studentDocId && (!result.phone || !result.email)) {
      const sSnap = await getDoc(doc(db, "students", studentDocId));
      if (sSnap.exists()) {
        const sData = sSnap.data();
        if (!result.phone) result.phone = extractPhone(sData);
        if (!result.email && sData.email) result.email = extractEmail(sData);
        if (!result.name && sData.guardianName) result.name = sData.guardianName;
      }
    }

    cache.set(cacheKey, { ...result });
  } catch (err) {
    console.warn(`[contactResolver] Error resolving parent ${parentDocId}:`, err);
  }

  return result;
}

/**
 * Resolve Referrer Contact details (for Student or Teacher referral payouts).
 * Checks users/{referrerId} -> parents/{referrerId} -> tutors/{referrerId}.
 */
export async function resolveReferrerContact(
  referrerId?: string,
  existing?: { name?: string; phone?: string; email?: string; upiId?: string }
): Promise<ResolvedContact> {
  const result: ResolvedContact = {
    name: existing?.name || "",
    phone: existing?.phone || "",
    email: existing?.email || "",
    upiId: existing?.upiId || "",
  };

  if (!referrerId) return result;

  const cacheKey = `referrer:${referrerId}`;
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    return {
      name: result.name || cached.name,
      phone: result.phone || cached.phone,
      whatsapp: cached.whatsapp || result.phone || cached.phone,
      email: result.email || cached.email,
      upiId: cached.upiId || result.upiId,
    };
  }

  try {
    // 1. Query users
    const uSnap = await getDoc(doc(db, "users", referrerId));
    if (uSnap.exists()) {
      const uData = uSnap.data();
      if (!result.name && uData.name) result.name = uData.name;
      if (!result.phone) result.phone = extractPhone(uData);
      if (!result.email && uData.email) result.email = extractEmail(uData);
      if (!result.upiId && uData.upiId) result.upiId = uData.upiId;
    }

    // 2. Query parents
    if (!result.phone || !result.email) {
      const pSnap = await getDoc(doc(db, "parents", referrerId));
      if (pSnap.exists()) {
        const pData = pSnap.data();
        if (!result.name && pData.name) result.name = pData.name;
        if (!result.phone) result.phone = extractPhone(pData);
        if (!result.email && pData.email) result.email = extractEmail(pData);
      }
    }

    // 3. Query tutors
    if (!result.phone || !result.email) {
      const tSnap = await getDoc(doc(db, "tutors", referrerId));
      if (tSnap.exists()) {
        const tData = tSnap.data();
        if (!result.name && tData.name) result.name = tData.name;
        if (!result.phone) result.phone = extractPhone(tData);
        if (!result.email && tData.email) result.email = extractEmail(tData);
        if (!result.upiId && tData.upiId) result.upiId = tData.upiId;
      }
    }

    cache.set(cacheKey, { ...result });
  } catch (err) {
    console.warn(`[contactResolver] Error resolving referrer ${referrerId}:`, err);
  }

  return result;
}
