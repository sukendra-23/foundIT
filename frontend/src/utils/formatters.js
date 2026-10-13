/** Format a date string to a readable format */
export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
};

/** Get greeting based on current time */
export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

/** Capitalize first letter */
export const capitalize = (str) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';

/** Truncate long text */
export const truncate = (str, n = 80) =>
  str && str.length > n ? str.slice(0, n) + '...' : str;

/** Extract first name */
export const firstName = (name) => (name || '').split(' ')[0];
