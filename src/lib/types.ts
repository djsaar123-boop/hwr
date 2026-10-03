export type Role = "user" | "coach" | "admin";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: Role;
};

export type Option = {
  id: string;
  question_id: string;
  label: string;
  emoji: string | null;
  score_fraction: number;
  sort_order: number;
  is_active: boolean;
  is_na: boolean;
};

export type Question = {
  id: string;
  area_id: string;
  title: string;
  short_label: string;
  emoji: string | null;
  fact: string | null;
  prompt: string;
  weight: number;
  tip: string | null;
  sort_order: number;
  is_active: boolean;
  options: Option[];
};

export type Area = {
  id: string;
  slug: string;
  name: string;
  title: string | null;
  emoji: string | null;
  tagline: string | null;
  color: string;
  sort_order: number;
  is_active: boolean;
  questions: Question[];
};

export type Band = {
  id: string;
  min_score: number;
  label: string;
  emoji: string | null;
  message: string | null;
};

export type AreaScore = {
  area_id: string;
  slug: string;
  name: string;
  color: string;
  score: number;
  max: number;
  pct: number | null;
};

export type Assessment = {
  id: string;
  user_id: string;
  status: "in_progress" | "completed";
  total_score: number | null;
  raw_points: number | null;
  max_points: number | null;
  band_label: string | null;
  band_emoji: string | null;
  area_scores: AreaScore[] | null;
  started_at: string;
  completed_at: string | null;
};

export type Answer = {
  question_id: string;
  option_id: string;
  area_id: string;
  weight: number;
  score_fraction: number;
  points: number;
};

export type CoachSettings = { number: string; message: string };
