import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gvbcfjgxrgnvjfuedtfs.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2YmNmamd4cmdudmpmdWVkdGZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MTA2NTMsImV4cCI6MjA5NDA4NjY1M30.fsregKbRRXmgG-k_Ylny8QkoNI7lLJGMUuSIJqODiMA'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
