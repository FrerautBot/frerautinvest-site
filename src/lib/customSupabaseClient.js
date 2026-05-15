import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zkjbwdstqnehamfvpsfr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpramJ3ZHN0cW5laGFtZnZwc2ZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3Mjg2OTgsImV4cCI6MjA3MjMwNDY5OH0.K_40mePjpXUo96jhL1kfEJ8xzlP_v-xACVqagEtPcw4';

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};
