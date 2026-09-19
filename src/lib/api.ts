import { supabase } from './supabase'

export async function searchPeople(name: string) {
  const { data, error } = await supabase
    .from('people')
    .select('*')
    .ilike('name', `%${name}%`)

  if (error) {
    throw error
  }

  return data
}
