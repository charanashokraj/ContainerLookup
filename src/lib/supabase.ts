import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://zbywtycrrdkvcctjyiqc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieXd0eWNycmRrdmNjdGp5aXFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2NDc5NjAsImV4cCI6MjA5NTIyMzk2MH0.3_1S2NpF4p6rTRRl2qWebBQGZWCdwOiVrgf2J8CNjcg'
);

export interface Profile {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  status: 'pending' | 'active' | 'disabled';
  created_at: string;
  activated_at: string | null;
}
