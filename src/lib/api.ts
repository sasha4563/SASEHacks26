import { supabase } from './supabase'

// Search for people by name
export async function searchPeople(name: string) {
  const { data, error } = await supabase
    .from('people')
    .select('*')
    .ilike('name', `%${name}%`)

  // Stop if Supabase returns an error
  if (error) {
    throw error
  }

  return data
}


// Add a new missing person to the database
export async function submitMissingPerson(person: {
  name: string
  age?: number
  gender?: string
  description?: string
  clothing?: string
  last_seen_date?: string
  last_seen_location?: string
}) {
  const { data, error } = await supabase
    .from('people')
    .insert({
      name: person.name,
      age: person.age,
      gender: person.gender,
      description: person.description,
      clothing: person.clothing,
      last_seen_date: person.last_seen_date,
      last_seen_location: person.last_seen_location,
      status: 'missing',
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  // Return the person that was added
  return data
}


// Add a new sighting to the database
export async function submitSighting(sighting: {
  name?: string
  age?: number
  description?: string
  sighting_date?: string
  location_id: string
}) {
  const { data, error } = await supabase
    .from('sightings')
    .insert({
      name: sighting.name,
      age: sighting.age,
      description: sighting.description,
      sighting_date: sighting.sighting_date,
      location_id: sighting.location_id,
      verification_status: 'unverified',
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  // Return the sighting that was added
  return data
}


// Get all sightings and their location information
export async function getSightings() {
  const { data, error } = await supabase
    .from('sightings')
    .select('*, locations(*)')

  if (error) {
    throw error
  }

  return data
}


// Add a new location to the database
export async function createLocation(location: {
  name?: string
  latitude?: number
  longitude?: number
  address?: string
  location_type?: string
}) {
  const { data, error } = await supabase
    .from('locations')
    .insert({
      name: location.name,
      latitude: location.latitude,
      longitude: location.longitude,
      address: location.address,
      location_type: location.location_type,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  // Return the new location so its id can be used for a sighting
  return data
}