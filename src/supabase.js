import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bddmsrbfygbuyfdpieyl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZG1zcmJmeWdidXlmZHBpZXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMDAzNzQsImV4cCI6MjA4Nzg3NjM3NH0.K3fpzvO31F7SylOedGJOW6qeb6_4D5KfQmXOW3xFYF8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
