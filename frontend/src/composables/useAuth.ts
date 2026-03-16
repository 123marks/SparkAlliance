import { ref } from 'vue'
import { supabase } from '../supabase'
import type { User, Session } from '@supabase/supabase-js'

const user = ref<User | null>(null)
const session = ref<Session | null>(null)
const loadingParams = ref(true)

export function useAuth() {
  // Initialize the session from Supabase
  const initAuth = async () => {
    loadingParams.value = true
    try {
      const { data } = await supabase.auth.getSession()
      session.value = data.session
      user.value = data.session?.user || null
    } catch (error) {
      console.error('Error fetching session:', error)
    } finally {
      loadingParams.value = false
    }

    // Set up a listener for auth state changes
    supabase.auth.onAuthStateChange((_event, currentSession) => {
      session.value = currentSession
      user.value = currentSession?.user || null
    })
  }

  return {
    user,
    session,
    isLoading: loadingParams,
    initAuth
  }
}
