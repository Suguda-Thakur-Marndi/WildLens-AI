export interface OrganismCandidate {
  common_name: string;
  scientific_name: string;
  confidence: number;
  similarity_score?: number;
  softmax_density?: number;
  kingdom?: string;
  phylum?: string;
  class_name?: string;
  order?: string;
  family?: string;
  genus?: string;
  species?: string;
  diagnostic_traits?: string[];
  distinguishing_features?: string[];
  lookalikes?: Array<{
    common_name: string;
    scientific_name: string;
    confidence: number;
    difference: string;
  }>;
  habitat?: string;
  description?: string;
  field_verification_tip?: string;
}

export interface IdentificationResult {
  top_candidate: OrganismCandidate;
  alternatives: OrganismCandidate[];
  latency_ms: number;
  model_name: string;
  model_version?: string;
  similarity_score?: number;
  softmax_density?: number;
  calibrated_probability?: number | null;
  catalog_scope?: string;
  confidence_status?: 'confident' | 'moderate' | 'uncertain' | 'inconclusive' | string;
  candidate_count?: number;
  uncertainty_warning?: string;
  top_k_predictions?: OrganismCandidate[];
  certainty_rating: 'high' | 'moderate' | 'uncertain' | 'inconclusive';
  timestamp: string;
  image_url: string;
  distinguishing_features: string[];
  suggestions: string[];
  is_offline: boolean;
}

export interface Observation {
  id: string;
  common_name: string;
  scientific_name: string;
  family: string;
  kingdom?: string;
  photo_url: string;
  date: string;
  timestamp: number;
  location: string;
  certainty: number;
  status: 'User verified' | 'Unverified';
  notes?: string;
  userNotes?: string;
  isVerified?: boolean;
  imageDataUrl?: string;
  diagnostic_traits?: string[];
  elevation?: string;
  habitat?: string;
  exposure?: string;
}

export interface FieldMission {
  id: string;
  title: string;
  subtitle?: string;
  category: 'observation' | 'sensory' | 'botany' | 'wildlife';
  duration: string;
  difficulty: 'Easy' | 'Moderate' | 'Challenging';
  description: string;
  quote?: string;
  instructions: string[];
  prompts: string[];
  image_url: string;
  completed?: boolean;
}

export interface ModelTelemetry {
  status: 'ready' | 'loading' | 'unavailable' | 'error';
  model_name: string;
  model_revision: string;
  model_license: string;
  device: string;
  cache_directory?: string;
  supported_taxa_count: number;
  offline_capable: boolean;
  latency_ms?: number;
  memory_usage_mb?: number | null;
  // Vision Foundation Model (BioCLIP-2)
  vision_model_id?: string;
  vision_model_license?: string;
  vision_device?: string;
  vision_memory_mb?: number | null;
}

// Backward compatibility types
export type CandidateSpecies = OrganismCandidate;

export interface IdentificationResponse {
  top_candidate: OrganismCandidate;
  alternatives: OrganismCandidate[];
  latency_ms: number;
  model_name: string;
  certainty_rating: 'high' | 'moderate' | 'uncertain';
  timestamp: string;
  distinguishing_features: string[];
  suggestions: string[];
  is_offline: boolean;
}

export type JournalEntry = Observation | {
  id: string;
  timestamp: string;
  imageDataUrl?: string;
  userNotes?: string;
  isVerified?: boolean;
  [key: string]: any;
};


export interface OutdoorMission {
  id: string;
  title: string;
  category: string;
  short_objective: string;
  instructions: string[];
  suggested_duration: string;
  safety_reminder: string;
  completion_action: string;
}

export interface ModelStatusResponse {
  status: 'ready' | 'loading' | 'unavailable' | 'error';
  model_name: string;
  model_revision: string;
  model_license: string;
  device: string;
  cache_directory: string;
  supported_taxa_count: number;
  memory_usage_mb?: number | null;
  offline_capable: boolean;
  vision_model_id?: string;
  vision_model_license?: string;
  vision_device?: string;
  vision_memory_mb?: number | null;
}

export interface HealthResponse {
  status: string;
  version: string;
  model_status: string;
  device: string;
  system_memory_free_mb?: number | null;
}

