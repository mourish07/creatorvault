// CreatorVault — Influencer Service
// Business logic layer between storage and UI.
// Handles ID generation, normalization, duplicate detection, and CSV export.

import type {
  Influencer,
  ParsedInstagramProfile,
  InfluencerStatus,
  UpdateInfluencerInput,
} from '../models/influencer';
import { crmStorage } from '../storage/crmStorage';

// ─── Username Normalization ───────────────────────────────────────────────────

/** Normalize an Instagram username for stable deduplication */
export function normalizeUsername(username: string): string {
  return username
    .replace(/^@/, '')      // Remove leading @
    .toLowerCase()          // Lowercase
    .trim()                 // Strip whitespace
    .replace(/\/$/, '');    // Remove trailing slash
}

/** Generate a canonical profile URL from a normalized username */
export function canonicalProfileUrl(normalizedUsername: string): string {
  return `https://www.instagram.com/${normalizedUsername}/`;
}

// ─── Influencer Creation ─────────────────────────────────────────────────────

/**
 * Create a new influencer from parsed Instagram data.
 * Handles normalization and duplicate prevention.
 * Returns the created influencer or throws on duplicate.
 */
export async function createInfluencerFromParsed(
  parsed: ParsedInstagramProfile,
  options: { tags?: string[]; notes?: string; status?: InfluencerStatus } = {}
): Promise<Influencer> {
  const rawUsername = parsed.username ?? 'unknown';
  const normalized = normalizeUsername(rawUsername);

  return crmStorage.createInfluencer({
    username: rawUsername.startsWith('@') ? rawUsername : `@${rawUsername}`,
    normalizedUsername: normalized,
    displayName: parsed.displayName ?? rawUsername,
    profileUrl: parsed.profileUrl || canonicalProfileUrl(normalized),
    bio: parsed.bio,
    followers: parsed.followers,
    followersNumeric: parsed.followersNumeric,
    following: parsed.following,
    posts: parsed.posts,
    profileImage: parsed.profileImage,
    verified: parsed.verified,
    category: parsed.category,
    tags: options.tags ?? [],
    notes: options.notes ?? '',
    status: options.status ?? 'New',
    favorite: false,
    source: 'instagram',
  });
}

// ─── Duplicate Detection ──────────────────────────────────────────────────────

/**
 * Check if an influencer already exists by normalized username
 */
export async function findExistingInfluencer(username: string): Promise<Influencer | null> {
  const normalized = normalizeUsername(username);
  return crmStorage.findByUsername(normalized);
}

// ─── Update Influencer ────────────────────────────────────────────────────────

export async function updateInfluencer(
  id: string,
  updates: UpdateInfluencerInput
): Promise<Influencer> {
  return crmStorage.updateInfluencer(id, updates);
}

export async function toggleFavorite(id: string): Promise<Influencer> {
  return crmStorage.toggleFavorite(id);
}

// ─── Search & Filter ──────────────────────────────────────────────────────────

export interface FilterOptions {
  query?: string;
  status?: InfluencerStatus | '';
  tag?: string;
  favoritesOnly?: boolean;
  sortBy?: 'newest' | 'oldest' | 'name' | 'followers' | 'updated';
}

export async function getFilteredInfluencers(filters: FilterOptions = {}): Promise<Influencer[]> {
  let influencers = await crmStorage.getInfluencers();

  // Text search
  if (filters.query?.trim()) {
    const q = filters.query.toLowerCase().trim();
    influencers = influencers.filter(
      (inf) =>
        inf.displayName.toLowerCase().includes(q) ||
        inf.normalizedUsername.includes(q) ||
        (inf.bio?.toLowerCase().includes(q) ?? false) ||
        inf.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  // Status filter
  if (filters.status) {
    influencers = influencers.filter((inf) => inf.status === filters.status);
  }

  // Tag filter
  if (filters.tag) {
    influencers = influencers.filter((inf) => inf.tags.includes(filters.tag!));
  }

  // Favorites filter
  if (filters.favoritesOnly) {
    influencers = influencers.filter((inf) => inf.favorite);
  }

  // Sorting
  const sortBy = filters.sortBy ?? 'newest';
  influencers.sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'name':
        return a.displayName.localeCompare(b.displayName);
      case 'followers':
        return (b.followersNumeric ?? 0) - (a.followersNumeric ?? 0);
      case 'updated':
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      default:
        return 0;
    }
  });

  return influencers;
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

function escapeCsvCell(value: string | null | undefined): string {
  const str = value ?? '';
  // If cell contains comma, quote, or newline — wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCsv(influencers: Influencer[]): string {
  const headers = [
    'Name', 'Username', 'Profile URL', 'Bio', 'Followers', 'Following',
    'Posts', 'Verified', 'Category', 'Status', 'Tags', 'Notes',
    'Created At', 'Updated At',
  ];

  const rows = influencers.map((inf) => [
    escapeCsvCell(inf.displayName),
    escapeCsvCell(inf.username),
    escapeCsvCell(inf.profileUrl),
    escapeCsvCell(inf.bio),
    escapeCsvCell(inf.followers),
    escapeCsvCell(inf.following),
    escapeCsvCell(inf.posts),
    inf.verified ? 'Yes' : 'No',
    escapeCsvCell(inf.category),
    escapeCsvCell(inf.status),
    escapeCsvCell(inf.tags.join('; ')),
    escapeCsvCell(inf.notes),
    escapeCsvCell(new Date(inf.createdAt).toLocaleDateString()),
    escapeCsvCell(new Date(inf.updatedAt).toLocaleDateString()),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  return csvContent;
}

export function downloadCsv(influencers: Influencer[]): void {
  const csv = exportToCsv(influencers);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `creatorvault-export-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── Avatar Generation ────────────────────────────────────────────────────────

/** Deterministic avatar color from username */
export function getAvatarColor(seed: string): string {
  const colors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
    '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
    '#f97316', '#84cc16',
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  return colors[Math.abs(hash) % colors.length];
}

/** Get initials for avatar fallback */
export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .filter(Boolean)
    .slice(0, 2)
    .join('');
}
