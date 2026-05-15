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

// ============ TOOL DEFINITIONS ============

export const barbershopTools = [
  {
    type: "function" as const,
    function: {
      name: "search_nearby_barbershops",
      description: "Search barbershops within a radius of user location. Uses local dataset (Haversine distance).",
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

// ============ TOOL HANDLERS ============

let barbershopData: BarbershopEntry[] = [];

export function loadBarbershopData(data: BarbershopEntry[]) {
  barbershopData = data;
}

export function handleBarbershopTool(
  toolName: string,
  args: Record<string, any>
): any {
  switch (toolName) {
    case "search_nearby_barbershops": {
      const { latitude, longitude, radius_km = 10, style_name } = args;
      let results: BarbershopResult[] = barbershopData
        .map((b) => ({
          ...b,
          distance_km: haversineDistance(latitude, longitude, b.lat, b.lng),
        }))
        .filter((b) => b.distance_km <= radius_km)
        .sort((a, b) => a.distance_km - b.distance_km);

      // If style provided, boost barbershops that specialize in it
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
        barbershops: results.slice(0, 5),
      };
    }

    case "get_barbershop_details": {
      const barbershop = barbershopData.find((b) => b.id === args.barbershop_id);
      if (!barbershop) return { error: "Barbershop not found" };
      return barbershop;
    }

    case "calculate_distance": {
      const { lat1, lng1, lat2, lng2 } = args;
      return {
        distance_km: Math.round(haversineDistance(lat1, lng1, lat2, lng2) * 100) / 100,
      };
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}
