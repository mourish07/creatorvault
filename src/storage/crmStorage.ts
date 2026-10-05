// CreatorVault — Chrome Storage Service
// Provides a clean data-access abstraction over chrome.storage.local
// Can be replaced with Supabase/Firebase without UI changes

import type { Influencer, CreateInfluencerInput, UpdateInfluencerInput } from '../models/influencer';

const STORAGE_KEY = 'creatorvault_influencers';

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateId(normalizedUsername: string): string {
  return `cv_${normalizedUsername}_${Date.now()}`;
}

async function readAll(): Promise<Influencer[]> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      const data = result[STORAGE_KEY];
      resolve(Array.isArray(data) ? data : []);
    });
  });
}

async function writeAll(influencers: Influencer[]): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [STORAGE_KEY]: influencers }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve();
    });
  });
}

// ─── Public API ─────────────────────────────────────────────────────────────

export const crmStorage = {
  /** Retrieve all influencers sorted by createdAt descending */
  async getInfluencers(): Promise<Influencer[]> {
    const all = await readAll();
    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  /** Get a single influencer by ID */
  async getInfluencer(id: string): Promise<Influencer | null> {
    const all = await readAll();
    return all.find((inf) => inf.id === id) ?? null;
  },

  /** Find an influencer by normalized username */
  async findByUsername(normalizedUsername: string): Promise<Influencer | null> {
    const all = await readAll();
    return all.find((inf) => inf.normalizedUsername === normalizedUsername.toLowerCase().trim()) ?? null;
  },

  /** Create a new influencer; throws if duplicate username exists */
  async createInfluencer(input: CreateInfluencerInput): Promise<Influencer> {
    const all = await readAll();
    const existing = all.find((inf) => inf.normalizedUsername === input.normalizedUsername);
    if (existing) {
      throw new Error(`DUPLICATE:${existing.id}`);
    }
    const now = new Date().toISOString();
    const influencer: Influencer = {
      ...input,
      id: generateId(input.normalizedUsername),
      createdAt: now,
      updatedAt: now,
    };
    all.push(influencer);
    await writeAll(all);
    return influencer;
  },

  /** Update an existing influencer by ID */
  async updateInfluencer(id: string, updates: UpdateInfluencerInput): Promise<Influencer> {
    const all = await readAll();
    const index = all.findIndex((inf) => inf.id === id);
    if (index === -1) throw new Error(`Influencer not found: ${id}`);
    const updated: Influencer = {
      ...all[index],
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };
    all[index] = updated;
    await writeAll(all);
    return updated;
  },

  /** Toggle favorite status */
  async toggleFavorite(id: string): Promise<Influencer> {
    const all = await readAll();
    const index = all.findIndex((inf) => inf.id === id);
    if (index === -1) throw new Error(`Influencer not found: ${id}`);
    const updated: Influencer = {
      ...all[index],
      favorite: !(all[index].favorite ?? false),
      updatedAt: new Date().toISOString(),
    };
    all[index] = updated;
    await writeAll(all);
    return updated;
  },

  /** Delete an influencer by ID */
  async deleteInfluencer(id: string): Promise<void> {
    const all = await readAll();
    const filtered = all.filter((inf) => inf.id !== id);
    await writeAll(filtered);
  },

  /** Search influencers by query (matches name, username, bio, tags) */
  async searchInfluencers(query: string): Promise<Influencer[]> {
    const all = await this.getInfluencers();
    if (!query.trim()) return all;
    const q = query.toLowerCase().trim();
    return all.filter((inf) =>
      inf.displayName.toLowerCase().includes(q) ||
      inf.normalizedUsername.includes(q) ||
      (inf.bio?.toLowerCase().includes(q) ?? false) ||
      inf.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  },

  /** Clear all CRM data */
  async clearAllInfluencers(): Promise<void> {
    await writeAll([]);
  },

  /** Get summary metrics */
  async getMetrics(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    totalFollowers: number;
    recentlyAdded: number;
  }> {
    const all = await readAll();
    const byStatus: Record<string, number> = {};
    let totalFollowers = 0;
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    let recentlyAdded = 0;

    for (const inf of all) {
      byStatus[inf.status] = (byStatus[inf.status] ?? 0) + 1;
      if (inf.followersNumeric) totalFollowers += inf.followersNumeric;
      if (new Date(inf.createdAt).getTime() > oneWeekAgo) recentlyAdded++;
    }

    return { total: all.length, byStatus, totalFollowers, recentlyAdded };
  },

  /** Subscribe to storage changes */
  onChanged(callback: () => void): () => void {
    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (STORAGE_KEY in changes) callback();
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  },
};
