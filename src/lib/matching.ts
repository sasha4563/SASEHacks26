type LocationLike = {
  latitude?: number | null
  longitude?: number | null
}

type PersonRecord = {
  name?: string | null
  age?: number | null
  gender?: string | null
  description?: string | null
  last_seen_date?: string | Date | null
  location?: LocationLike | null
}

type SightingRecord = {
  name?: string | null
  age?: number | null
  gender?: string | null
  description?: string | null
  sighting_date?: string | Date | null
  location?: LocationLike | null
}

type FactorScore = {
  score: number
  available: boolean
  weight: number
  renormalized: boolean
  reason: string
}

type MatchFactors = {
  name: FactorScore
  location: FactorScore
  age: FactorScore
  date: FactorScore
  description: FactorScore
}

type MatchResult = {
  score: number
  label: 'strong overlap' | 'some overlap' | 'limited overlap'
  factors: MatchFactors
  explanation: string
}

const BASE_WEIGHTS = {
  name: 0.3,
  location: 0.25,
  age: 0.15,
  date: 0.15,
  description: 0.15,
} as const

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const normalizeName = (value?: string | null) =>
  (value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const normalizeTokens = (value?: string | null) => {
  const normalized = normalizeName(value)
  return normalized ? normalized.split(' ').filter(Boolean) : []
}

const normalizeDescriptorToken = (token: string) => {
  const synonymMap: Record<string, string> = {
    navy: 'blue',
    dark: 'black',
    black: 'black',
    brown: 'brown',
    blonde: 'blonde',
    blue: 'blue',
    red: 'red',
    white: 'white',
    green: 'green',
    yellow: 'yellow',
    orange: 'orange',
    purple: 'purple',
    grey: 'gray',
    gray: 'gray',
    glasses: 'glasses',
    spectacles: 'glasses',
    backpack: 'backpack',
    bag: 'backpack',
    jacket: 'jacket',
    coat: 'jacket',
    hoodie: 'jacket',
    shirt: 'shirt',
    tshirt: 'shirt',
  }

  return synonymMap[token] ?? token
}

const tokenOverlapScore = (a?: string | null, b?: string | null) => {
  const left = normalizeTokens(a)
  const right = normalizeTokens(b)

  if (!left.length || !right.length) return 0

  const leftSet = new Set(left.map(normalizeDescriptorToken))
  const rightSet = new Set(right.map(normalizeDescriptorToken))
  const intersection = [...leftSet].filter((token) => rightSet.has(token)).length
  const union = new Set([...leftSet, ...rightSet]).size

  if (!union) return 0

  const semanticSimilarity = intersection / union
  const prefixBoost = left[0] && right[0] && left[0] === right[0] ? 0.15 : 0

  return clamp(semanticSimilarity + prefixBoost, 0, 1)
}

const similarityFromLevenshtein = (a: string, b: string) => {
  const first = normalizeName(a)
  const second = normalizeName(b)

  if (!first || !second) return 0
  if (first === second) return 1

  const matrix = Array.from({ length: first.length + 1 }, () => Array(second.length + 1).fill(0))

  for (let i = 0; i <= first.length; i += 1) matrix[i][0] = i
  for (let j = 0; j <= second.length; j += 1) matrix[0][j] = j

  for (let i = 1; i <= first.length; i += 1) {
    for (let j = 1; j <= second.length; j += 1) {
      const cost = first[i - 1] === second[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      )
    }
  }

  const maxLength = Math.max(first.length, second.length)
  return 1 - matrix[first.length][second.length] / maxLength
}

const normalizeDate = (value?: string | Date | null) => {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const toHours = (ms: number) => ms / (1000 * 60 * 60)

const haversineKm = (a: LocationLike | null | undefined, b: LocationLike | null | undefined) => {
  if (!a || !b || a.latitude == null || a.longitude == null || b.latitude == null || b.longitude == null) {
    return null
  }

  const toRad = (value: number) => (value * Math.PI) / 180
  const earthRadiusKm = 6371

  const dLat = toRad(b.latitude - a.latitude)
  const dLon = toRad(b.longitude - a.longitude)

  const latA = toRad(a.latitude)
  const latB = toRad(b.latitude)

  const hav =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(latA) * Math.cos(latB)

  const c = 2 * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav))
  return earthRadiusKm * c
}

const compareNames = (missingPerson?: PersonRecord | null, sighting?: SightingRecord | null): FactorScore => {
  const missingName = missingPerson?.name
  const sightingName = sighting?.name

  if (!missingName || !sightingName) {
    return {
      score: 0,
      available: false,
      weight: BASE_WEIGHTS.name,
      renormalized: false,
      reason: 'Name information is missing for one or both records.',
    }
  }

  const tokenScore = tokenOverlapScore(missingName, sightingName)
  const fuzzyScore = similarityFromLevenshtein(missingName, sightingName)
  const score = Math.max(tokenScore, fuzzyScore)

  return {
    score: clamp(score, 0, 1),
    available: true,
    weight: BASE_WEIGHTS.name,
    renormalized: false,
    reason: `Name similarity is ${score.toFixed(2)} based on normalized name comparison.`,
  }
}

const compareLocations = (missingPerson?: PersonRecord | null, sighting?: SightingRecord | null): FactorScore => {
  const distanceKm = haversineKm(missingPerson?.location ?? null, sighting?.location ?? null)

  if (distanceKm == null) {
    return {
      score: 0,
      available: false,
      weight: BASE_WEIGHTS.location,
      renormalized: false,
      reason: 'Location information is missing for one or both records.',
    }
  }

  let score = 0

  if (distanceKm < 1) score = 1
  else if (distanceKm <= 5) score = 0.8
  else if (distanceKm <= 10) score = 0.6
  else if (distanceKm <= 25) score = 0.3
  else score = 0.1

  return {
    score,
    available: true,
    weight: BASE_WEIGHTS.location,
    renormalized: false,
    reason: `Location is approximately ${distanceKm.toFixed(1)} km away, giving a location score of ${score.toFixed(2)}.`,
  }
}

const compareAges = (missingPerson?: PersonRecord | null, sighting?: SightingRecord | null): FactorScore => {
  const missingAge = missingPerson?.age
  const sightingAge = sighting?.age

  if (missingAge == null || sightingAge == null) {
    return {
      score: 0,
      available: false,
      weight: BASE_WEIGHTS.age,
      renormalized: false,
      reason: 'Age information is unavailable for one or both records.',
    }
  }

  const delta = Math.abs(missingAge - sightingAge)
  let score = 0

  if (delta === 0) score = 1
  else if (delta <= 2) score = 0.85
  else if (delta <= 5) score = 0.6
  else if (delta <= 10) score = 0.3

  return {
    score,
    available: true,
    weight: BASE_WEIGHTS.age,
    renormalized: false,
    reason: `Age difference is ${delta} years, producing an age score of ${score.toFixed(2)}.`,
  }
}

const compareDates = (missingPerson?: PersonRecord | null, sighting?: SightingRecord | null): FactorScore => {
  const missingDate = normalizeDate(missingPerson?.last_seen_date)
  const sightingDate = normalizeDate(sighting?.sighting_date)

  if (!missingDate || !sightingDate) {
    return {
      score: 0,
      available: false,
      weight: BASE_WEIGHTS.date,
      renormalized: false,
      reason: 'Date information is missing for one or both records.',
    }
  }

  const deltaHours = Math.abs(toHours(sightingDate.getTime() - missingDate.getTime()))
  const deltaDays = deltaHours / 24

  let score = 0.1

  if (deltaDays === 0) score = 1
  else if (deltaDays <= 1) score = 0.85
  else if (deltaDays <= 3) score = 0.65
  else if (deltaDays <= 7) score = 0.4

  return {
    score,
    available: true,
    weight: BASE_WEIGHTS.date,
    renormalized: false,
    reason: `The sighting is ${deltaDays.toFixed(1)} days away from the last-seen date, giving a date score of ${score.toFixed(2)}.`,
  }
}

const compareDescriptions = (missingPerson?: PersonRecord | null, sighting?: SightingRecord | null): FactorScore => {
  const missingDescription = missingPerson?.description ?? ''
  const sightingDescription = sighting?.description ?? ''

  if (!missingDescription || !sightingDescription) {
    return {
      score: 0,
      available: false,
      weight: BASE_WEIGHTS.description,
      renormalized: false,
      reason: 'Description information is missing for one or both records.',
    }
  }

  const tokenScore = tokenOverlapScore(missingDescription, sightingDescription)
  const fuzzyScore = similarityFromLevenshtein(missingDescription, sightingDescription)
  const score = Math.max(tokenScore, fuzzyScore)

  return {
    score: clamp(score, 0, 1),
    available: true,
    weight: BASE_WEIGHTS.description,
    renormalized: false,
    reason: `Description similarity is ${score.toFixed(2)} after normalized comparison.`,
  }
}

const renormalizeWeights = (factors: MatchFactors) => {
  const availableWeights = Object.entries(factors)
    .filter(([, factor]) => factor.available)
    .map(([, factor]) => factor.weight)

  const availableTotal = availableWeights.reduce((sum, weight) => sum + weight, 0)

  if (!availableTotal) {
    return factors
  }

  const renormalizedFactors: MatchFactors = { ...factors }

  for (const [key, factor] of Object.entries(factors)) {
    const typedKey = key as keyof MatchFactors
    if (!factor.available) {
      renormalizedFactors[typedKey] = {
        ...factor,
        renormalized: true,
        weight: factor.weight,
      }
      continue
    }

    const weightRatio = factor.weight / availableTotal
    renormalizedFactors[typedKey] = {
      ...factor,
      weight: weightRatio,
      renormalized: false,
    }
  }

  return renormalizedFactors
}

export const scoreMatch = (
  missingPerson: PersonRecord,
  sighting: SightingRecord,
): MatchResult => {
  const factors: MatchFactors = {
    name: compareNames(missingPerson, sighting),
    location: compareLocations(missingPerson, sighting),
    age: compareAges(missingPerson, sighting),
    date: compareDates(missingPerson, sighting),
    description: compareDescriptions(missingPerson, sighting),
  }

  const hasGenderConflict =
    missingPerson.gender && sighting.gender &&
    missingPerson.gender.toLowerCase() !== sighting.gender.toLowerCase() &&
    missingPerson.gender.toLowerCase() !== 'unknown' &&
    sighting.gender.toLowerCase() !== 'unknown'

  if (hasGenderConflict) {
    return {
      score: 0,
      label: 'limited overlap',
      factors,
      explanation: 'This record was excluded because the gender information is a verified conflict: the missing person and sighting disagree on gender.',
    }
  }

  const renormalized = renormalizeWeights(factors)

  const weightedScore = Object.entries(renormalized).reduce((total, [key, factor]) => {
    const typedKey = key as keyof MatchFactors
    return total + factor.score * factor.weight
  }, 0)

  const roundedScore = clamp(weightedScore, 0, 1)

  let label: MatchResult['label'] = 'limited overlap'
  if (roundedScore >= 0.75) label = 'strong overlap'
  else if (roundedScore >= 0.4) label = 'some overlap'

  const reasons = Object.entries(renormalized)
    .filter(([, factor]) => factor.available)
    .map(([key, factor]) => `${key}: ${factor.score.toFixed(2)} (${factor.reason})`)

  return {
    score: Number(roundedScore.toFixed(4)),
    label,
    factors: renormalized,
    explanation: `Information match score: ${roundedScore.toFixed(2)}. ${reasons.join(' | ')}`,
  }
}

export const rankMatches = <T extends SightingRecord>(
  missingPerson: PersonRecord,
  candidates: T[],
) =>
  candidates
    .map((candidate) => ({
      candidate,
      score: scoreMatch(missingPerson, candidate).score,
      result: scoreMatch(missingPerson, candidate),
    }))
    .sort((left, right) => right.score - left.score)

export const explainMatch = (missingPerson: PersonRecord, sighting: SightingRecord) => {
  const result = scoreMatch(missingPerson, sighting)
  return {
    ...result,
    summary: `Potential match: ${result.label}. ${result.explanation}`,
  }
}
