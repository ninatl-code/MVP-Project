import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl = 'https://phnilkcfphwjjjpojzrh.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBobmlsa2NmcGh3ampqcG9qenJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3MzY3MTUsImV4cCI6MjA3MjMxMjcxNX0.afWUWLsfehajifhGJspcY3CJ5iZqWVk1SbuIEI-6whk'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
