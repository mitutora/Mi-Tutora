export interface DocumentRequirement {
  id: string;
  label: string;
  description: string;
  required: boolean;
}

export const MAX_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export function validateResumeFile(file: { name: string; size: number; type?: string }): {
  valid: boolean;
  error?: string;
} {
  if (!file) {
    return { valid: false, error: 'No file provided.' };
  }

  const isResumeFormat = /\.(pdf|doc|docx)$/i.test(file.name);
  if (!isResumeFormat) {
    return { valid: false, error: 'Invalid file format. Only PDF and Word documents (.pdf, .doc, .docx) are allowed.' };
  }

  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size (${sizeMb} MB) exceeds the maximum 5MB limit. Please upload a smaller file.`,
    };
  }

  return { valid: true };
}

export function isResumeComplete(
  existingResume?: { url?: string } | null,
  stagedFile?: any | null
): boolean {
  const hasStaged = Boolean(stagedFile);
  const hasExisting = Boolean(existingResume && existingResume.url);
  return hasStaged || hasExisting;
}

export function getRequiredDocuments(qualification: string): DocumentRequirement[] {
  if (!qualification || typeof qualification !== 'string') {
    return [];
  }

  const cleanQual = qualification.trim();

  const doc10th: DocumentRequirement = {
    id: 'marksheet_10th',
    label: '10th Standard Marksheet',
    description: 'Class 10 / SSLC / Matriculation marksheet or passing certificate',
    required: false,
  };

  const doc12th: DocumentRequirement = {
    id: 'marksheet_12th',
    label: '12th / PUC Marksheet',
    description: 'Class 12 / PUC / Intermediate / Diploma marksheet',
    required: false,
  };

  const docBachelor: DocumentRequirement = {
    id: 'degree_certificate',
    label: 'Bachelor Degree Certificate',
    description: 'Graduation degree certificate, provisional certificate, or consolidated marksheet',
    required: false,
  };

  const docMaster: DocumentRequirement = {
    id: 'master_certificate',
    label: 'Post-Graduate / Master Degree Certificate',
    description: "Master's degree certificate or final year consolidated marksheet",
    required: false,
  };

  const docPhD: DocumentRequirement = {
    id: 'phd_certificate',
    label: 'Doctorate / PhD Degree Certificate',
    description: 'Doctoral degree certificate or official provisional notification',
    required: false,
  };

  const docOther: DocumentRequirement = {
    id: 'other_certificate',
    label: 'Highest Qualification Certificate',
    description: 'Official degree, diploma, or marksheet for your highest qualification',
    required: false,
  };

  switch (cleanQual) {
    case '10th':
      return [doc10th];

    case '12th':
      return [doc10th, doc12th];

    case 'B.E / B.Tech':
      return [
        doc10th,
        doc12th,
        {
          ...docBachelor,
          label: 'B.E / B.Tech Degree Certificate',
          description: 'Engineering degree certificate or consolidated marksheet',
        },
      ];

    case 'B.Sc':
      return [
        doc10th,
        doc12th,
        {
          ...docBachelor,
          label: 'B.Sc Degree Certificate',
          description: 'Bachelor of Science degree certificate or final marksheet',
        },
      ];

    case 'B.A':
      return [
        doc10th,
        doc12th,
        {
          ...docBachelor,
          label: 'B.A Degree Certificate',
          description: 'Bachelor of Arts degree certificate or final marksheet',
        },
      ];

    case 'B.Com':
      return [
        doc10th,
        doc12th,
        {
          ...docBachelor,
          label: 'B.Com Degree Certificate',
          description: 'Bachelor of Commerce degree certificate or final marksheet',
        },
      ];

    case 'M.Sc':
      return [
        doc10th,
        doc12th,
        docBachelor,
        {
          ...docMaster,
          label: 'M.Sc Degree Certificate',
          description: 'Master of Science degree certificate or final marksheet',
        },
      ];

    case 'M.A':
      return [
        doc10th,
        doc12th,
        docBachelor,
        {
          ...docMaster,
          label: 'M.A Degree Certificate',
          description: 'Master of Arts degree certificate or final marksheet',
        },
      ];

    case 'PhD':
      return [doc10th, doc12th, docMaster, docPhD];

    case 'Other':
      return [doc10th, doc12th, docOther];

    default:
      return [doc10th, doc12th, docOther];
  }
}

export function validatePdfFile(file: { name: string; size: number; type?: string }): {
  valid: boolean;
  error?: string;
} {
  if (!file) {
    return { valid: false, error: 'No file provided.' };
  }

  // Strictly check PDF extension
  const isPdf = /\.pdf$/i.test(file.name);
  if (!isPdf) {
    return { valid: false, error: 'Only PDF documents (.pdf) are allowed.' };
  }

  // Check file size (max 5MB)
  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size (${sizeMb} MB) exceeds the maximum 5MB limit. Please upload a smaller PDF.`,
    };
  }

  return { valid: true };
}

export function isVerificationComplete(
  qualification: string,
  existingDocs?: Record<string, any> | null,
  pendingFiles?: Record<string, any> | null
): boolean {
  if (!qualification) return false;

  const required = getRequiredDocuments(qualification);
  if (required.length === 0) return false;

  for (const doc of required) {
    const hasPending = Boolean(pendingFiles && pendingFiles[doc.id]);
    const hasExisting = Boolean(existingDocs && existingDocs[doc.id]?.url);

    if (!hasPending && !hasExisting) {
      return false;
    }
  }

  return true;
}
