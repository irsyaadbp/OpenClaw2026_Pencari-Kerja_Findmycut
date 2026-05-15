import type { BarbershopResult, BarbershopEntry } from "../types";

// ============ HAVERSINE DISTANCE ============
function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Generate area_key from lat/lng (rounded to 2 decimals ≈ ~1km² area)
 */
function getAreaKey(lat: number, lng: number): string {
  return `${lat.toFixed(2)}_${lng.toFixed(2)}`;
}

// ============ DB + GOOGLE MAPS CLIENT ============

let dbClient: any = null;
let googleMapsApiKey: string | null = null;
let googleMapsRadius: number = 5000; // default 5km in meters

export function setBarbershopDbClient(client: any) {
  dbClient = client;
}

export function setGoogleMapsConfig(apiKey: string, radius?: number) {
  googleMapsApiKey = apiKey;
  if (radius) googleMapsRadius = radius;
}

/**
 * Check if we have cached barbershops for this area (TTL: 7 days)
 */
async function getCachedBarbershops(areaKey: string): Promise<BarbershopEntry[] | null> {
  if (!dbClient) return null;

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const result = await dbClient`
      SELECT * FROM barbershop_cache 
      WHERE area_key = ${areaKey} 
      AND fetched_at > ${sevenDaysAgo}::timestamp
      ORDER BY rating DESC
    `;
    if (result.length > 0) {
      return result.map((r: any) => ({
        id: r.id,
        name: r.name,
        address: r.address,
        lat: r.lat,
        lng: r.lng,
        rating: r.rating,
        phone: r.phone,
        city: r.city,
        specialties: r.specialties || [],
        price_range: r.price_range,
        image: r.image_url,
        google_place_id: r.google_place_id,
      }));
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch barbershops from Google Maps Places API (Nearby Search)
 */
async function fetchFromGoogleMaps(lat: number, lng: number): Promise<BarbershopEntry[]> {
  if (!googleMapsApiKey) return [];

  try {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${googleMapsRadius}&type=hair_care&keyword=barbershop&key=${googleMapsApiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "OK" || !data.results) return [];

    return data.results.slice(0, 10).map((place: any) => ({
      id: place.place_id,
      name: place.name,
      address: place.vicinity || place.formatted_address || "",
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
      rating: place.rating || 0,
      phone: "",
      city: "",
      specialties: [], // Google Maps doesn't provide this directly
      price_range: place.price_level ? `Level ${place.price_level}` : "",
      image: place.photos?.[0]
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${googleMapsApiKey}`
        : null,
      google_place_id: place.place_id,
    }));
  } catch (err) {
    console.error("[Barbershop Tools] Google Maps API error:", err);
    return [];
  }
}

/**
 * Save fetched barbershops to DB cache
 */
async function cacheBarbershops(barbershops: BarbershopEntry[], areaKey: string, source: string): Promise<void> {
  if (!dbClient || barbershops.length === 0) return;

  try {
    for (const b of barbershops) {
      await dbClient`
        INSERT INTO barbershop_cache (name, address, lat, lng, rating, phone, city, specialties, price_range, image_url, area_key, source, google_place_id, fetched_at)
        VALUES (${b.name}, ${b.address}, ${b.lat}, ${b.lng}, ${b.rating}, ${b.phone}, ${b.city}, ${JSON.stringify(b.specialties)}::jsonb, ${b.price_range}, ${b.image}, ${areaKey}, ${source}, ${b.google_place_id}, NOW())
        ON CONFLICT (google_place_id) DO UPDATE SET
          rating = EXCLUDED.rating,
          fetched_at = NOW()
      `;
    }
  } catch (err) {
    console.error("[Barbershop Tools] Cache write error:", err);
  }
}

// ============ TOOL DEFINITIONS ============

export const barbershopTools = [
  {
    type: "function" as const,
    function: {
      name: "search_nearby_barbershops",
      description: "Search barbershops within a radius of user location. Uses hybrid approach: DB cache → Google Maps API → local JSON fallback.",
      parameters: {
        type: "object",
        properties: {
          latitude: { type: "number", description: "User latitude" },
          longitude: { type: "number", description: "User longitude" },
          radius_km: { type: "number", description: "Search radius in km (default 10)" },
          style_name: { type: "string", description: "Recommended hairstyle to match specialties" },
        },
        required: ["latitude", "longitude"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_barbershop_details",
      description: "Get full details of a barbershop by ID.",
      parameters: {
        type: "object",
        properties: {
          barbershop_id: { type: "string", description: "Barbershop ID" },
        },
        required: ["barbershop_id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "calculate_distance",
      description: "Calculate distance in km between two coordinates.",
      parameters: {
        type: "object",
        properties: {
          lat1: { type: "number" },
          lng1: { type: "number" },
          lat2: { type: "number" },
          lng2: { type: "number" },
        },
        required: ["lat1", "lng1", "lat2", "lng2"],
      },
    },
  },
];

// ============ LOCAL JSON DATA (fallback) ============

let localBarbershopData: BarbershopEntry[] = [];

export function loadBarbershopData(data: BarbershopEntry[]) {
  localBarbershopData = data;
}

// ============ TOOL HANDLERS ============

export function handleBarbershopTool(
  toolName: string,
  args: Record<string, any>
): any {
  // Wrap async handler for sync interface
  switch (toolName) {
    case "search_nearby_barbershops":
      return handleSearchNearby(args);
    case "get_barbershop_details":
      return handleGetDetails(args);
    case "calculate_distance":
      return handleCalculateDistance(args);
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

/**
 * Async version of handleBarbershopTool (for use with async agent loop)
 */
export async function handleBarbershopToolAsync(
  toolName: string,
  args: Record<string, any>
): Promise<any> {
  switch (toolName) {
    case "search_nearby_barbershops":
      return await handleSearchNearbyAsync(args);
    case "get_barbershop_details":
      return handleGetDetails(args);
    case "calculate_distance":
      return handleCalculateDistance(args);
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

/**
 * Hybrid search: DB cache → Google Maps → JSON fallback
 */
async function handleSearchNearbyAsync(args: Record<string, any>): Promise<any> {
  const { latitude, longitude, radius_km = 10, style_name } = args;
  const areaKey = getAreaKey(latitude, longitude);

  let allBarbershops: BarbershopEntry[] = [];
  let source = "json";

  // 1. Check DB cache first
  const cached = await getCachedBarbershops(areaKey);
  if (cached && cached.length > 0) {
    allBarbershops = cached;
    source = "db_cache";
  }
  // 2. If no cache, try Google Maps API
  else if (googleMapsApiKey) {
    const googleResults = await fetchFromGoogleMaps(latitude, longitude);
    if (googleResults.length > 0) {
      allBarbershops = googleResults;
      source = "google_maps";
      // Cache for future requests
      await cacheBarbershops(googleResults, areaKey, "google_maps");
    }
  }

  // 3. Fallback to local JSON
  if (allBarbershops.length === 0) {
    allBarbershops = localBarbershopData;
    source = "json_fallback";
  }

  // Calculate distance + filter by radius
  let results: BarbershopResult[] = allBarbershops
    .map((b) => ({
      ...b,
      distance_km: haversineDistance(latitude, longitude, b.lat, b.lng),
    }))
    .filter((b) => b.distance_km <= radius_km)
    .sort((a, b) => a.distance_km - b.distance_km);

  // Boost barbershops that specialize in the recommended style
  if (style_name) {
    const styleLower = style_name.toLowerCase();
    results = results.sort((a, b) => {
      const aMatch = a.specialties?.some((s) =>
        styleLower.includes(s.toLowerCase()) || s.toLowerCase().includes(styleLower)
      ) ? 1 : 0;
      const bMatch = b.specialties?.some((s) =>
        styleLower.includes(s.toLowerCase()) || s.toLowerCase().includes(styleLower)
      ) ? 1 : 0;
      if (aMatch !== bMatch) return bMatch - aMatch;
      return a.distance_km - b.distance_km;
    });
  }

  return {
    count: results.length,
    source,
    area_key: areaKey,
    barbershops: results.slice(0, 5),
  };
}

/**
 * Sync version (uses local data only — for backward compatibility)
 */
function handleSearchNearby(args: Record<string, any>): any {
  const { latitude, longitude, radius_km = 10, style_name } = args;

  let results: BarbershopResult[] = localBarbershopData
    .map((b) => ({
      ...b,
      distance_km: haversineDistance(latitude, longitude, b.lat, b.lng),
    }))
    .filter((b) => b.distance_km <= radius_km)
    .sort((a, b) => a.distance_km - b.distance_km);

  if (style_name) {
    const styleLower = style_name.toLowerCase();
    results = results.sort((a, b) => {
      const aMatch = a.specialties?.some((s) =>
        styleLower.includes(s.toLowerCase()) || s.toLowerCase().includes(styleLower)
      ) ? 1 : 0;
      const bMatch = b.specialties?.some((s) =>
        styleLower.includes(s.toLowerCase()) || s.toLowerCase().includes(styleLower)
      ) ? 1 : 0;
      if (aMatch !== bMatch) return bMatch - aMatch;
      return a.distance_km - b.distance_km;
    });
  }

  return {
    count: results.length,
    source: "json",
    barbershops: results.slice(0, 5),
  };
}

function handleGetDetails(args: Record<string, any>): any {
  const barbershop = localBarbershopData.find((b) => b.id === args.barbershop_id);
  if (!barbershop) return { error: "Barbershop not found" };
  return barbershop;
}

function handleCalculateDistance(args: Record<string, any>): any {
  const { lat1, lng1, lat2, lng2 } = args;
  return {
    distance_km: Math.round(haversineDistance(lat1, lng1, lat2, lng2) * 100) / 100,
  };
}
