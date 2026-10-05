import { createClient } from '@supabase/supabase-js';
import { navigatorLock, processLock } from '@supabase/auth-js';

const supabaseUrl = 'https://bddmsrbfygbuyfdpieyl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZG1zcmJmeWdidXlmZHBpZXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMDAzNzQsImV4cCI6MjA4Nzg3NjM3NH0.K3fpzvO31F7SylOedGJOW6qeb6_4D5KfQmXOW3xFYF8';

// supabase-js drops the `auth.lockAcquireTimeout` option (its internal
// _initSupabaseAuthClient only forwards a fixed subset of auth options), so the
// Web-Locks steal-timeout stays at its 5s default — on a slow connection one
// token refresh holds the lock past 5s and the ~23 startup fetches force-steal
// it, aborting them ("Lock ... was not released within 5000ms" / "Lock broken
// by another request with the 'steal' option") so tables came back empty.
//
// supabase-js DOES forward a custom `lock`, so wrap the real cross-tab
// navigatorLock with a longer 25s timeout. This keeps cross-tab refresh
// coordination (so two tabs don't fire competing refreshes that rotate each
// other's token and trip the auth 429 rate limit) while giving a slow refresh
// ample room to finish before the lock is stolen. Falls back to processLock
// where the Web Locks API is unavailable.
const hasWebLocks = typeof globalThis !== 'undefined' && globalThis.navigator && globalThis.navigator.locks;
const longLock = hasWebLocks ? (name, _acquireTimeout, fn) => navigatorLock(name, 25000, fn) : processLock;

// A second client used ONLY to create user accounts (Settings > Team Members).
// It keeps its session in memory under its own storage key, so creating a
// user can never replace the admin's own login. With email auto-confirm on,
// signUp returns a session: on the main client that logged the admin in AS
// the new user, and the profile insert then ran as them -- which the
// 20261005 access rules refuse (only a Super Admin may create profiles).
export const signupClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'fp-signup-client' },
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    lock: longLock,
  },
});
