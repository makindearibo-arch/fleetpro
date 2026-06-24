import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bddmsrbfygbuyfdpieyl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZG1zcmJmeWdidXlmZHBpZXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMDAzNzQsImV4cCI6MjA4Nzg3NjM3NH0.K3fpzvO31F7SylOedGJOW6qeb6_4D5KfQmXOW3xFYF8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Keep the DEFAULT cross-tab lock (Web Locks API): it coordinates the
    // auth-token refresh across tabs, so a user with two FleetPro tabs doesn't
    // fire two refreshes that rotate each other's refresh token and trip the
    // auth server's 429 rate limit (which was signing staff out).
    //
    // But raise the steal-timeout from the 5s default to 30s. On a slow
    // connection the single coordinated refresh can hold the lock longer than
    // 5s; the other startup fetches then time out and force-"steal" the lock,
    // which aborts them ("Lock broken by another request with the 'steal'
    // option") and made diesel_readings come back empty. 30s leaves ample room
    // for a slow refresh while still recovering from a genuinely orphaned lock.
    lockAcquireTimeout: 30000,
  },
});
