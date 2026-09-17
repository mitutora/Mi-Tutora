export const generateReferralCode = (name: string, uid: string): string => {
  // Ensure we have a valid string to work with
  const safeName = (name || 'USER').trim();
  
  // Extract up to the first 4 alphabetical characters from the name, pad with 'X' if shorter
  const namePart = (safeName.replace(/[^a-zA-Z]/g, '') + 'XXXX')
    .substring(0, 4)
    .toUpperCase();
    
  // Extract a 6-character chunk from the UID (skipping the first few chars to add entropy)
  // Firebase UIDs are 28 chars long.
  const uidPart = (uid || Math.random().toString(36).substring(2, 10))
    .substring(4, 10)
    .toUpperCase();
    
  return `${namePart}-${uidPart}`;
};
