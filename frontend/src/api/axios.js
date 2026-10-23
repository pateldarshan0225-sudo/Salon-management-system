import axios from 'axios';
const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api', withCredentials: true, timeout: 20000 });
api.interceptors.response.use(response => response, error => {
  if (error.response?.status === 401 && !error.config.url.includes('/auth/')) window.dispatchEvent(new Event('auth-expired'));
  return Promise.reject(error);
});
export const messageOf = error => error.response?.data?.message || (error.code === 'ERR_NETWORK' ? 'Unable to reach the salon server. Please try again shortly.' : error.message || 'Please try again.');
export default api;
