export interface FaceFeatures {
  face_shape: "oval" | "round" | "square" | "heart" | "oblong" | "diamond";
  face_confidence: number;
  hair_thickness: "thin" | "medium" | "thick";
  hair_texture: "straight" | "wavy" | "curly" | "coily";
  hairline: "high" | "medium" | "low" | "receding";
  forehead_size: "small" | "medium" | "large";
  jawline: "soft" | "angular" | "strong";
  current_hairstyle: string;
  photos_analyzed: number;
  notes: string;
}

export interface AgentStep {
  agent: string;
  type: "start" | "complete" | "tool" | "error" | "skip" | "thinking" | "tool_call" | "tool_result";
  message: string;
  toolName?: string;
  timestamp?: number | Date;
}

export interface StyleCandidate {
  name: string;
  style_name: string;
  description: string;
  suitable_face_shapes: string[];
  suitable_hair_types: string[];
  suitable_thickness: string[];
  maintenance_level: string;
  reference_image_url?: string;
  styling_tips?: string;
  barber_instruction?: string;
}

export interface Recommendation {
  rank: number;
  style_name: string;
  match_percentage: number;
  why_match: string[];
  styling_tips: string;
  maintenance_tips: string;
  barber_instruction: string;
  reference_image_url: string;
  image_urls?: {
    front?: string;
    left?: string;
    right?: string;
    back?: string;
    top?: string;
  };
}

export interface PipelineResult {
  features: FaceFeatures;
  recommendations: Recommendation[];
  barbershops?: BarbershopMatchResult;
}

export interface BarbershopEntry {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating: number;
  phone: string;
  city: string;
  specialties: string[];
  price_range: string;
  image: string | null;
  google_place_id: string | null;
}

export interface BarbershopResult extends BarbershopEntry {
  distance_km: number;
}

export interface BarbershopMatchResult {
  barbershops: {
    barbershop_id: string;
    name: string;
    match_reason: string;
    recommended_style: string;
    distance_km?: number;
    rating?: number;
    address?: string;
    phone?: string;
  }[];
}
