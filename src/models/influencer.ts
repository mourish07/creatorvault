// CreatorVault — Influencer Data Model
// Defines the core Influencer entity and related types

export type InfluencerStatus =
  | 'New'
  | 'Contacted'
  | 'Negotiating'
  | 'Collaborating'
  | 'Completed'
  | 'Archived';

export interface Influencer {
  // Identity
  id: string;                     // Stable ID derived from normalized username
  username: string;               // Raw username as captured (may include @)
  normalizedUsername: string;     // Lowercase, no @, trimmed
  displayName: string;            // Full display name / real name
  profileUrl: string;             // Canonical Instagram profile URL

  // Profile data
  bio: string | null;             // Profile biography (null = unavailable, '' = empty)
  followers: string | null;       // Formatted follower string e.g. "1.2M" (null = unavailable)
  followersNumeric: number | null; // Numeric approximation of followers
  following: string | null;       // Following count
  posts: string | null;           // Post count
  profileImage: string | null;    // Profile image URL (null = unavailable)
  verified: boolean;              // Is account verified/checkmarked
  category: string | null;        // Account category if visible

  // CRM fields
  tags: string[];                 // User-defined tags e.g. ["Fashion", "Beauty"]
  notes: string;                  // Internal marketer notes
  status: InfluencerStatus;       // CRM pipeline status
  favorite: boolean;              // Is this creator starred/favorited?

  // Metadata
  source: 'instagram';            // Data source
  createdAt: string;              // ISO 8601 creation timestamp
  updatedAt: string;              // ISO 8601 last updated timestamp
}

// Partial type for creating a new influencer (omits generated fields)
export type CreateInfluencerInput = Omit<Influencer, 'id' | 'createdAt' | 'updatedAt'>;

// Partial type for updating an influencer
export type UpdateInfluencerInput = Partial<Omit<Influencer, 'id' | 'createdAt' | 'normalizedUsername'>>;

// Parsed data from Instagram page (before full Influencer creation)
export interface ParsedInstagramProfile {
  username: string | null;
  displayName: string | null;
  bio: string | null;
  followers: string | null;
  followersNumeric: number | null;
  following: string | null;
  posts: string | null;
  profileImage: string | null;
  verified: boolean;
  category: string | null;
  profileUrl: string;
}

// Status display config
export const STATUS_CONFIG: Record<InfluencerStatus, { label: string; color: string; bg: string }> = {
  New:          { label: 'New',          color: '#0066cc', bg: '#e6f0ff' },
  Contacted:    { label: 'Contacted',    color: '#7c3aed', bg: '#ede9fe' },
  Negotiating:  { label: 'Negotiating', color: '#d97706', bg: '#fef3c7' },
  Collaborating:{ label: 'Collaborating',color: '#059669', bg: '#d1fae5' },
  Completed:    { label: 'Completed',    color: '#374151', bg: '#f3f4f6' },
  Archived:     { label: 'Archived',     color: '#9ca3af', bg: '#f9fafb' },
};

export const ALL_STATUSES: InfluencerStatus[] = [
  'New', 'Contacted', 'Negotiating', 'Collaborating', 'Completed', 'Archived'
];

export const SUGGESTED_TAGS = [
  'Fashion', 'Beauty', 'Fitness', 'Travel', 'Food', 'Tech',
  'Lifestyle', 'Gaming', 'UGC', 'Micro Influencer', 'Macro Influencer',
  'Skincare', 'Luxury', 'Wellness', 'Parenting', 'Finance', 'Sports',
];
