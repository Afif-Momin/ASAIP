export type CloudProvider = 'AWS' | 'Azure' | 'GCP';
export type Complexity = 'Low' | 'Medium' | 'High' | 'Very High' | string;
export type Severity = 'Critical' | 'High' | 'Medium' | 'Low' | string;

export interface RequirementsAnalysis {
  functional_requirements: string[];
  non_functional_requirements: string[];
  constraints: string[];
  missing_requirements: string[];
  risks: string[];
  questions: string[];
  summary: string;
  analysis_mode: string;
}

export interface ArchitectureScores {
  scalability: number;
  security: number;
  maintainability: number;
  cost_efficiency: number;
  reliability: number;
  performance: number;
  development_complexity: number;
}

export type ScoreKey = keyof ArchitectureScores;
export type ArchitectureWeights = Record<ScoreKey, number>;

export interface TechnologyStack {
  frontend: string[];
  backend: string[];
  database: string[];
  api: string[];
  authentication: string[];
  deployment: string[];
}

export interface DiagramPosition { x: number; y: number }
export interface DiagramNode {
  id: string;
  label: string;
  type: string;
  description: string;
  position: DiagramPosition;
  tier?: string;
}
export interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  kind?: string;
}
export interface ArchitectureDiagram {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

export interface Architecture {
  id: number;
  project_id: number;
  name: string;
  description: string;
  pattern: string;
  technology_stack: TechnologyStack;
  infrastructure_components: string[];
  scalability_strategy: string;
  security_strategy: string;
  maintainability_assessment: string;
  advantages: string[];
  disadvantages: string[];
  complexity: Complexity;
  initial_development_cost: number;
  monthly_infrastructure_cost: number;
  recommended_use_cases: string[];
  tradeoffs: string[];
  suitability_explanation: string;
  diagram: ArchitectureDiagram;
  scores: ArchitectureScores;
  analysis_mode: string;
  created_at: string;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  domain: string;
  target_users: string;
  concurrent_users: number;
  daily_requests: number;
  functional_requirements: string[];
  non_functional_requirements: string[];
  budget: number;
  team_size: number;
  preferred_languages: string[];
  cloud_provider: string;
  data_sensitivity: string;
  availability: string;
  growth: string;
  deployment_preference: string;
  requirements_analysis: RequirementsAnalysis | null;
  created_at: string;
  updated_at: string;
  architectures: Architecture[];
}

export interface ProjectPayload {
  name: string;
  description: string;
  domain: string;
  target_users: string;
  concurrent_users: number;
  daily_requests: number;
  functional_requirements: string;
  non_functional_requirements: string;
  budget: number;
  team_size: number;
  preferred_languages: string;
  cloud_provider: string;
  data_sensitivity: string;
  availability: string;
  growth: string;
  deployment_preference: string;
}

export interface ComparisonResult {
  architecture_id: number;
  architecture_name: string;
  scores: ArchitectureScores;
  weighted_score: number;
  rank: number;
}
export interface Comparison {
  project_id: number;
  weights: ArchitectureWeights;
  results: ComparisonResult[];
  recommended_architecture_id: number;
  explanation: string;
}

export interface CostBreakdownItem {
  component: string;
  monthly_cost: number;
  details: string;
}
export interface CostEstimate {
  architecture_id: number;
  provider: string;
  currency: 'INR';
  setup_cost: number;
  monthly_cost: number;
  annual_cost: number;
  breakdown: CostBreakdownItem[];
  budget_utilization: number;
  optimization_suggestions: string[];
  disclaimer: string;
}

export interface ScalabilityScenario {
  name: string;
  expected_users: number;
  requests_per_second: number;
  infrastructure_changes: string[];
  bottlenecks: string[];
  scaling_strategy: string;
  estimated_monthly_cost: number;
  performance_risks: string[];
}
export interface ScalabilityAnalysis {
  architecture_id: number;
  scenarios: ScalabilityScenario[];
  explanation: string;
}

export interface CriticIssue {
  title: string;
  severity: Severity;
  affected_component: string;
  explanation: string;
  why_it_matters: string;
  recommended_fix: string;
  expected_improvement: string;
}
export interface CriticReview {
  architecture_id: number;
  risk_score: number;
  summary: string;
  issues: CriticIssue[];
  reviewed_at: string;
  analysis_mode: string;
}

export interface EvolutionStage {
  stage: number;
  name: string;
  description: string;
  changes: string[];
  reasons: string[];
  new_components: string[];
  benefits: string[];
  complexity: string;
  cost_impact: number;
}
export interface EvolutionAnalysis {
  architecture_id: number;
  stages: EvolutionStage[];
  summary: string;
}

export interface PlatformConfig {
  analysis_mode: 'demo' | 'ai';
  ai_provider: 'demo' | 'openrouter' | 'anthropic';
  ai_configured: boolean;
  ai_model: string | null;
  ai_fallback_models: string[];
  provider_error: string | null;
  currency: 'INR';
  supported_providers: string[];
}
