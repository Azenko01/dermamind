/** Public runtime config. Only the API address — the app holds no secrets (PLAN.md 2.2). */
export const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
