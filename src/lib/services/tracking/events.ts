/**
 * Analytics event name constants
 * 
 * Centralized event names to ensure consistency and prevent typos.
 * All event names use snake_case convention.
 */

// Authentication Events
export const AUTH_EVENTS = {
  LOGIN_INITIATED: 'login_initiated',
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILED: 'login_failed',
  LOGOUT: 'logout',
  SIGNUP_DETECTED: 'signup_detected',
} as const

// Billing & Subscription Events
export const BILLING_EVENTS = {
  CHECKOUT_STARTED: 'checkout_started',
  CHECKOUT_REDIRECTED: 'checkout_redirected',
  CHECKOUT_CANCELLED: 'checkout_cancelled',
  PLAN_SELECTED: 'plan_selected',
  BILLING_INTERVAL_SELECTED: 'billing_interval_selected',
  CUSTOMER_PORTAL_ACCESSED: 'customer_portal_accessed',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
  SUBSCRIPTION_REACTIVATED: 'subscription_reactivated',
  SUBSCRIPTION_DOWNGRADED: 'subscription_downgraded',
  SUBSCRIPTION_UPGRADED: 'subscription_upgraded',
} as const

// Video Export Events
export const VIDEO_EXPORT_EVENTS = {
  VIDEO_EXPORT_STARTED: 'video_export_started',
  VIDEO_EXPORT_COMPLETED: 'video_export_completed',
  VIDEO_EXPORT_FAILED: 'video_export_failed',
  VIDEO_EXPORT_CANCELLED: 'video_export_cancelled',
  VIDEO_EXPORT_FORMAT_SELECTED: 'video_export_format_selected',
  VIDEO_EXPORT_RESOLUTION_SELECTED: 'video_export_resolution_selected',
  VIDEO_EXPORT_LIMIT_REACHED: 'video_export_limit_reached',
} as const

// Sharing Events
export const SHARING_EVENTS = {
  SHARE_DIALOG_OPENED: 'share_dialog_opened',
  SHARE_METHOD_SELECTED: 'share_method_selected',
  SHARE_LINK_GENERATED: 'share_link_generated',
  EMBED_CODE_COPIED: 'embed_code_copied',
  SHARE_PLATFORM_CLICKED: 'share_platform_clicked',
  SHARE_METADATA_UPDATED: 'share_metadata_updated',
} as const

// Account Management Events
export const ACCOUNT_EVENTS = {
  DELETE_ACCOUNT_INITIATED: 'delete_account_initiated',
  DELETE_ACCOUNT_CONFIRMED: 'delete_account_confirmed',
  DELETE_ACCOUNT_COMPLETED: 'delete_account_completed',
  DELETE_ACCOUNT_FAILED: 'delete_account_failed',
} as const

// Error Events
export const ERROR_EVENTS = {
  CLIENT_ERROR_OCCURRED: 'client_error_occurred',
  API_ERROR_OCCURRED: 'api_error_occurred',
  RATE_LIMIT_HIT: 'rate_limit_hit',
} as const

// All events combined for easy access
export const ANALYTICS_EVENTS = {
  ...AUTH_EVENTS,
  ...BILLING_EVENTS,
  ...VIDEO_EXPORT_EVENTS,
  ...SHARING_EVENTS,
  ...ACCOUNT_EVENTS,
  ...ERROR_EVENTS,
} as const

