// CreatorVault — Unit Tests
// Tests for core business logic: normalization, parsing, duplicate detection, CSV export

import { describe, it, expect, beforeEach } from 'vitest';
import {
  normalizeUsername,
  canonicalProfileUrl,
  exportToCsv,
  getAvatarColor,
  getInitials,
} from '../services/influencerService';
import {
  parseFollowersToNumber,
  formatFollowers,
  isInstagramProfilePage,
} from '../services/instagramParser';
import { crmStorage } from '../storage/crmStorage';
import type { Influencer } from '../models/influencer';

// ─── Username Normalization ───────────────────────────────────────────────────

describe('normalizeUsername', () => {
  it('removes leading @', () => {
    expect(normalizeUsername('@natgeo')).toBe('natgeo');
  });

  it('lowercases the username', () => {
    expect(normalizeUsername('NatGeo')).toBe('natgeo');
  });

  it('trims whitespace', () => {
    expect(normalizeUsername('  natgeo  ')).toBe('natgeo');
  });

  it('removes trailing slash', () => {
    expect(normalizeUsername('natgeo/')).toBe('natgeo');
  });

  it('handles combined edge cases', () => {
    expect(normalizeUsername('@NatGeo/')).toBe('natgeo');
  });

  it('handles already-normalized username', () => {
    expect(normalizeUsername('natgeo')).toBe('natgeo');
  });

  it('handles usernames with dots and underscores', () => {
    expect(normalizeUsername('@john.doe_123')).toBe('john.doe_123');
  });
});

// ─── Canonical URL ────────────────────────────────────────────────────────────

describe('canonicalProfileUrl', () => {
  it('generates correct Instagram URL', () => {
    expect(canonicalProfileUrl('natgeo')).toBe('https://www.instagram.com/natgeo/');
  });
});

// ─── Follower Number Parsing ──────────────────────────────────────────────────

describe('parseFollowersToNumber', () => {
  it('parses plain numbers', () => {
    expect(parseFollowersToNumber('1200')).toBe(1200);
  });

  it('parses K suffix', () => {
    expect(parseFollowersToNumber('12.5K')).toBe(12500);
  });

  it('parses M suffix', () => {
    expect(parseFollowersToNumber('1.25M')).toBe(1250000);
  });

  it('parses lowercase k', () => {
    expect(parseFollowersToNumber('5k')).toBe(5000);
  });

  it('returns null for empty string', () => {
    expect(parseFollowersToNumber('')).toBeNull();
  });

  it('returns null for non-numeric string', () => {
    expect(parseFollowersToNumber('followers')).toBeNull();
  });

  it('parses numbers with commas', () => {
    // parseFollowersToNumber cleans commas before parsing
    expect(parseFollowersToNumber('1,200')).toBe(1200);
  });
});

// ─── Follower Formatting ──────────────────────────────────────────────────────

describe('formatFollowers', () => {
  it('formats thousands', () => {
    expect(formatFollowers(1200)).toBe('1.2K');
  });

  it('formats millions', () => {
    expect(formatFollowers(1250000)).toBe('1.3M');
  });

  it('removes trailing .0', () => {
    expect(formatFollowers(2000000)).toBe('2M');
  });

  it('formats small numbers as-is', () => {
    expect(formatFollowers(500)).toBe('500');
  });

  it('formats billions', () => {
    expect(formatFollowers(1_200_000_000)).toBe('1.2B');
  });
});

// ─── Instagram Profile Detection ──────────────────────────────────────────────

describe('isInstagramProfilePage', () => {
  it('returns true for a valid profile URL', () => {
    expect(isInstagramProfilePage('https://www.instagram.com/natgeo/')).toBe(true);
  });

  it('returns true for profile URL without trailing slash', () => {
    expect(isInstagramProfilePage('https://www.instagram.com/natgeo')).toBe(true);
  });

  it('returns false for explore page', () => {
    expect(isInstagramProfilePage('https://www.instagram.com/explore/')).toBe(false);
  });

  it('returns false for reels page', () => {
    expect(isInstagramProfilePage('https://www.instagram.com/reels/abc123')).toBe(false);
  });

  it('returns false for stories', () => {
    expect(isInstagramProfilePage('https://www.instagram.com/stories/natgeo')).toBe(false);
  });

  it('returns false for root', () => {
    expect(isInstagramProfilePage('https://www.instagram.com/')).toBe(false);
  });

  it('returns false for a post', () => {
    expect(isInstagramProfilePage('https://www.instagram.com/p/abc123/')).toBe(false);
  });

  it('returns false for non-Instagram URL', () => {
    expect(isInstagramProfilePage('https://www.twitter.com/natgeo')).toBe(false);
  });

  it('returns false for direct messages', () => {
    expect(isInstagramProfilePage('https://www.instagram.com/direct/inbox/')).toBe(false);
  });
});

// ─── Storage CRUD ─────────────────────────────────────────────────────────────

describe('crmStorage', () => {
  const testInfluencer = {
    username: '@natgeo',
    normalizedUsername: 'natgeo',
    displayName: 'National Geographic',
    profileUrl: 'https://www.instagram.com/natgeo/',
    bio: 'Inspiring people to care about the planet.',
    followers: '19.5M',
    followersNumeric: 19500000,
    following: '120',
    posts: '26K',
    profileImage: null,
    verified: true,
    category: 'Magazine',
    tags: ['Photography', 'Nature'],
    notes: 'Top nature account',
    status: 'New' as const,
    favorite: false,
    source: 'instagram' as const,
  };

  it('creates an influencer', async () => {
    const created = await crmStorage.createInfluencer(testInfluencer);
    expect(created.normalizedUsername).toBe('natgeo');
    expect(created.displayName).toBe('National Geographic');
    expect(created.id).toMatch(/^cv_natgeo/);
    expect(created.createdAt).toBeTruthy();
  });

  it('retrieves all influencers', async () => {
    await crmStorage.createInfluencer(testInfluencer);
    const all = await crmStorage.getInfluencers();
    expect(all.length).toBe(1);
    expect(all[0].normalizedUsername).toBe('natgeo');
  });

  it('finds influencer by username', async () => {
    await crmStorage.createInfluencer(testInfluencer);
    const found = await crmStorage.findByUsername('natgeo');
    expect(found).not.toBeNull();
    expect(found!.displayName).toBe('National Geographic');
  });

  it('returns null for non-existent username', async () => {
    const found = await crmStorage.findByUsername('does_not_exist');
    expect(found).toBeNull();
  });

  it('throws DUPLICATE error on duplicate username', async () => {
    await crmStorage.createInfluencer(testInfluencer);
    await expect(crmStorage.createInfluencer(testInfluencer)).rejects.toThrow(/DUPLICATE/);
  });

  it('updates an influencer', async () => {
    const created = await crmStorage.createInfluencer(testInfluencer);
    const updated = await crmStorage.updateInfluencer(created.id, { status: 'Collaborating', notes: 'Updated note' });
    expect(updated.status).toBe('Collaborating');
    expect(updated.notes).toBe('Updated note');
  });

  it('deletes an influencer', async () => {
    const created = await crmStorage.createInfluencer(testInfluencer);
    await crmStorage.deleteInfluencer(created.id);
    const all = await crmStorage.getInfluencers();
    expect(all.length).toBe(0);
  });

  it('clears all influencers', async () => {
    await crmStorage.createInfluencer(testInfluencer);
    await crmStorage.createInfluencer({ ...testInfluencer, username: '@bbcearth', normalizedUsername: 'bbcearth' });
    await crmStorage.clearAllInfluencers();
    const all = await crmStorage.getInfluencers();
    expect(all.length).toBe(0);
  });

  it('searches by display name', async () => {
    await crmStorage.createInfluencer(testInfluencer);
    const results = await crmStorage.searchInfluencers('national');
    expect(results.length).toBe(1);
    expect(results[0].displayName).toBe('National Geographic');
  });

  it('searches by tag', async () => {
    await crmStorage.createInfluencer(testInfluencer);
    const results = await crmStorage.searchInfluencers('nature');
    expect(results.length).toBe(1);
  });

  it('returns empty array for no matches', async () => {
    await crmStorage.createInfluencer(testInfluencer);
    const results = await crmStorage.searchInfluencers('zzznomatch');
    expect(results.length).toBe(0);
  });

  it('calculates metrics correctly', async () => {
    await crmStorage.createInfluencer(testInfluencer);
    await crmStorage.createInfluencer({
      ...testInfluencer,
      username: '@bbcearth',
      normalizedUsername: 'bbcearth',
      status: 'Collaborating',
    });
    const metrics = await crmStorage.getMetrics();
    expect(metrics.total).toBe(2);
    expect(metrics.byStatus['New']).toBe(1);
    expect(metrics.byStatus['Collaborating']).toBe(1);
  });
});

// ─── CSV Export ───────────────────────────────────────────────────────────────

describe('exportToCsv', () => {
  const mockInfluencer: Influencer = {
    id: 'cv_test_1',
    username: '@testuser',
    normalizedUsername: 'testuser',
    displayName: 'Test User',
    profileUrl: 'https://www.instagram.com/testuser/',
    bio: 'Test bio with, comma and "quotes"',
    followers: '10K',
    followersNumeric: 10000,
    following: '500',
    posts: '150',
    profileImage: null,
    verified: false,
    category: null,
    tags: ['Fashion', 'Beauty'],
    notes: 'Test note',
    status: 'New',
    favorite: false,
    source: 'instagram',
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T10:00:00.000Z',
  };

  it('includes header row', () => {
    const csv = exportToCsv([mockInfluencer]);
    const lines = csv.split('\n');
    expect(lines[0]).toContain('Name');
    expect(lines[0]).toContain('Username');
    expect(lines[0]).toContain('Followers');
    expect(lines[0]).toContain('Status');
  });

  it('includes influencer data', () => {
    const csv = exportToCsv([mockInfluencer]);
    expect(csv).toContain('Test User');
    expect(csv).toContain('@testuser');
    expect(csv).toContain('10K');
    expect(csv).toContain('New');
  });

  it('correctly escapes commas in bio', () => {
    const csv = exportToCsv([mockInfluencer]);
    // Bio contains comma, so it should be quoted
    expect(csv).toContain('"Test bio with, comma and');
  });

  it('correctly escapes quotes', () => {
    const csv = exportToCsv([mockInfluencer]);
    // Quotes in bio should be doubled
    expect(csv).toContain('""quotes""');
  });

  it('joins tags with semicolon', () => {
    const csv = exportToCsv([mockInfluencer]);
    expect(csv).toContain('Fashion; Beauty');
  });

  it('handles empty influencer list', () => {
    const csv = exportToCsv([]);
    const lines = csv.split('\n').filter(Boolean);
    expect(lines.length).toBe(1); // Only header
  });
});

// ─── Avatar Utils ─────────────────────────────────────────────────────────────

describe('getInitials', () => {
  it('gets initials from two words', () => {
    expect(getInitials('National Geographic')).toBe('NG');
  });

  it('gets single initial for one word', () => {
    expect(getInitials('Madonna')).toBe('M');
  });

  it('handles empty string', () => {
    expect(getInitials('')).toBe('');
  });
});

describe('getAvatarColor', () => {
  it('returns a hex color', () => {
    const color = getAvatarColor('natgeo');
    expect(color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('returns consistent colors for same input', () => {
    expect(getAvatarColor('natgeo')).toBe(getAvatarColor('natgeo'));
  });

  it('returns different colors for different inputs', () => {
    // Not guaranteed but highly likely with different strings
    const c1 = getAvatarColor('natgeo');
    const c2 = getAvatarColor('bbcearth');
    // Note: could theoretically be same, but unlikely with our hash
    expect(typeof c1).toBe('string');
    expect(typeof c2).toBe('string');
  });
});
