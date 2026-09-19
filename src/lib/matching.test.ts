import test from 'node:test'
import assert from 'node:assert/strict'

import { scoreMatch, rankMatches } from './matching'

test('scores a strong overlap with matching name, age, date, and description', () => {
  const result = scoreMatch(
    {
      name: 'Bikash Babu',
      age: 40,
      description: 'Blue jacket, glasses',
      last_seen_date: '2026-08-26T14:00:00.000Z',
      location: { latitude: 27.7172, longitude: 85.324 },
    },
    {
      name: 'Bikash Bahadur Babu',
      age: 40,
      description: 'Navy jacket, glasses',
      sighting_date: '2026-08-27T09:00:00.000Z',
      location: { latitude: 27.728, longitude: 85.331 },
    },
  )

  assert.ok(result.score >= 0.8)
  assert.equal(result.label, 'strong overlap')
  assert.equal(result.factors.name.score > 0.7, true)
  assert.equal(result.factors.location.score > 0.7, true)
})

test('renormalizes scoring when age data is missing', () => {
  const result = scoreMatch(
    {
      name: 'Asha Rai',
      description: 'Black backpack, red scarf',
      last_seen_date: '2026-08-26T14:00:00.000Z',
      location: { latitude: 27.7172, longitude: 85.324 },
    },
    {
      name: 'Asha R. Rai',
      description: 'Dark backpack, red scarf',
      sighting_date: '2026-08-27T09:00:00.000Z',
      location: { latitude: 27.728, longitude: 85.331 },
    },
  )

  assert.ok(result.score >= 0.75)
  assert.equal(result.factors.age.available, false)
  assert.equal(result.factors.age.renormalized, true)
})

test('returns a zero score for a verified gender conflict', () => {
  const result = scoreMatch(
    {
      name: 'Maria Patel',
      age: 32,
      gender: 'female',
      description: 'Long brown hair',
      last_seen_date: '2026-08-20T12:00:00.000Z',
      location: { latitude: 27.7172, longitude: 85.324 },
    },
    {
      name: 'Maria Patel',
      age: 32,
      gender: 'male',
      description: 'Long brown hair',
      sighting_date: '2026-08-21T12:00:00.000Z',
      location: { latitude: 27.718, longitude: 85.325 },
    },
  )

  assert.equal(result.score, 0)
  assert.match(result.explanation, /gender/i)
})

test('ranks candidates by strongest overlap', () => {
  const candidates = [
    {
      name: 'Amit Shrestha',
      age: 28,
      description: 'Blue jacket',
      sighting_date: '2026-08-27T09:00:00.000Z',
      location: { latitude: 27.728, longitude: 85.331 },
    },
    {
      name: 'Rita Das',
      age: 28,
      description: 'Red shirt',
      sighting_date: '2026-08-10T09:00:00.000Z',
      location: { latitude: 27.95, longitude: 85.4 },
    },
  ]

  const ranked = rankMatches(
    {
      name: 'Amit Shrestha',
      age: 28,
      description: 'Blue jacket',
      last_seen_date: '2026-08-26T14:00:00.000Z',
      location: { latitude: 27.7172, longitude: 85.324 },
    },
    candidates,
  )

  assert.equal(ranked[0].candidate.name, 'Amit Shrestha')
  assert.ok(ranked[0].score > ranked[1].score)
})
