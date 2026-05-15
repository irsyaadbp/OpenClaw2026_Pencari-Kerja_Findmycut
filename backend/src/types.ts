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

export interface Recommendation {
  rank: number;
  style_name: string;
  match_percentage: number;
  why_match: string[];
  styling_tips: string;
  maintenance_tips: string;
  barber_instruction: string;
  reference_image_url: string;
}

export interface PipelineResult {
  features: FaceFeatures;
  recommendations: Recommendation[];
}
