import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ujezidocymxjkacgdrxo.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqZXppZG9jeW14amthY2dkcnhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyODM5NTYsImV4cCI6MjA3Nzg1OTk1Nn0.vsGjyG_kW_LhFjZeDi9KDSPphpFY0dxPicnnq5DQASI'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
