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

export interface StyleCandidate {
  name: string;
  description: string;
  suitable_face_shapes: string[];
  suitable_hair_types: string[];
  suitable_thickness: string[];
  maintenance_level: string;
  trending: boolean;
  styling_tips: string;
  barber_instruction: string;
  reference_image_url: string;
}

export interface MatchResult {
  style: StyleCandidate;
  match_score: number;
  reasons: string[];
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
  image_urls: {
    front?: string;
    left?: string;
    right?: string;
    back?: string;
    top?: string;
  };
  barbershop: any;
}

export interface AgentStep {
  agent: string;
  type: "thinking" | "tool_call" | "tool_result" | "complete" | "error";
  message: string;
  toolName?: string;
  timestamp: Date;
}

export interface PipelineResult {
  features: FaceFeatures;
  recommendations: Recommendation[];
}
