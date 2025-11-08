// config/api.ts - Create this file
export const API_URL = __DEV__ 
  ? 'http://localhost:3000' // Development (use your computer's IP for physical devices)
  : 'https://your-production-api.com'; // Production

// For physical device testing, use your computer's local IP:
// Example: 'http://192.168.1.100:3000'
