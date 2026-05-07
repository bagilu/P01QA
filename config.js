window.APP_CONFIG = {
  SUPABASE_URL: "https://mfljkyvdadxlrbxlboce.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mbGpreXZkYWR4bHJieGxib2NlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4MTQwMDUsImV4cCI6MjA4MDM5MDAwNX0.Z4OeacVpO8yM1d1uOWZ6jU2Gl7wgEbhXvAFSqF5pBRs",

  EMAIL_DOMAIN: "@gms.tcu.edu.tw",

  STORAGE_KEY_ACCOUNT: "P04_ACCOUNT",
  STORAGE_KEY_NICKNAME: "P04_NICKNAME",
  NICKNAME_MAX_LENGTH: 20,

  NOTIFICATION_POLL_MS: 3000,
  NOTIFICATION_DISPLAY_MS: 8000,

  FUNCTIONS: {
    SUBMIT_SMILE_EVENT:
      "https://mfljkyvdadxlrbxlboce.supabase.co/functions/v1/P04_submit_smile_event",

    GET_HOME_STATS:
      "https://mfljkyvdadxlrbxlboce.supabase.co/functions/v1/P04_get_home_stats",

    GET_RECORDS_BY_DATE:
      "https://mfljkyvdadxlrbxlboce.supabase.co/functions/v1/P04_get_records_by_date",

    GET_RECENT_NOTICE:
      "https://mfljkyvdadxlrbxlboce.supabase.co/functions/v1/P04_get_recent_notice"
    
  }
};
