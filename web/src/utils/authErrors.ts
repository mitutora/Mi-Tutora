export const getFriendlyAuthError = (err: any): string => {
  const code = err?.code || '';
  
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password. Please try again.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many failed login attempts. Please try again later or reset your password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please log in instead.';
    case 'auth/weak-password':
      return 'Your password is too weak. It must be at least 6 characters long.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection and try again.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is currently disabled.';
    default:
      // Clean up raw Firebase message if it exists
      let msg = err?.message || 'An unexpected error occurred.';
      msg = msg.replace('Firebase: ', '');
      msg = msg.replace(/\(auth\/[^)]+\)\.?/, '');
      return msg.trim() || 'An unexpected error occurred.';
  }
};
