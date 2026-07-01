// Single source of truth for the internal address that receives operational
// notifications: cash-control closures / reports / stock alerts, the public
// contact form, and planner requests.
//
// Historically these were hardcoded and split between "@tequierofeliz.mx" and
// "@tequierofeliz.com", which caused several notifications (e.g. cash-control
// closures) to never reach the real inbox. Everything now resolves through this
// constant so there is one place to change it. Override on Vercel by setting
// ADMIN_NOTIFICATION_EMAIL if the destination ever changes.
export const ADMIN_NOTIFICATION_EMAIL =
  process.env.ADMIN_NOTIFICATION_EMAIL ?? 'admin@tequierofeliz.com';
