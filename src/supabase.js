import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bddmsrbfygbuyfdpieyl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZG1zcmJmeWdidXlmZHBpZXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMDAzNzQsImV4cCI6MjA4Nzg3NjM3NH0.K3fpzvO31F7SylOedGJOW6qeb6_4D5KfQmXOW3xFYF8';

// In-memory, per-tab auth lock.
//
// By default supabase-js guards token access with the browser's Web Locks API
// (navigator.locks), which is shared ACROSS tabs. When the app fires its ~23
// initial table fetches at once (or a second tab is open), the lock contends
// and supabase aborts losers with:
//   "AbortError: Lock broken by another request with the 'steal' option"
// Those aborted fetches return empty — which is why diesel_readings came back
// as 0 rows and store staff saw no readings.
//
// This lock serializes token access WITHIN the tab using a simple promise
// chain per lock name. No navigator.locks, no cross-tab stealing, no timeouts.
const _lockChains = {};
const inMemoryLock = (name, _acquireTimeout, fn) => {
  const prev = _lockChains[name] || Promise.resolve();
  const run = prev.then(fn, fn); // run fn whether the previous holder resolved or rejected
  _lockChains[name] = run.then(() => {}, () => {}); // keep the chain alive, swallow result
  return run;
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    lock: inMemoryLock,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
