export function validateAccount(values, register = false) {
  const errors = {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email || '')) errors.email = 'Enter a valid email address.';
  if (!values.password) errors.password = 'Enter your password.';
  if (register) {
    if (!(values.name || '').trim()) errors.name = 'Enter your name.';
    if (!/^\d{10}$/.test(values.phone || '')) errors.phone = 'Enter a 10-digit phone number.';
    if ((values.password || '').length < 8 || !/[a-z]/i.test(values.password) || !/\d/.test(values.password)) errors.password = 'Use at least 8 characters, including a letter and a number.';
  }
  return errors;
}
