// CreatorVault — Instagram Profile Parser
//
// Uses layered extraction strategies with graceful fallbacks.
// Does NOT attempt to bypass auth, privacy controls, or CAPTCHAs.
// Only processes publicly visible, already-rendered information.

import type { ParsedInstagramProfile } from '../models/influencer';

// ─── URL Detection ──────────────────────────────────────────────────────────

/** Non-profile route patterns to exclude */
const EXCLUDED_ROUTES = [
  /^\/explore/,
  /^\/reels(?:\/|$)/,
  /^\/direct(?:\/|$)/,
  /^\/accounts(?:\/|$)/,
  /^\/settings(?:\/|$)/,
  /^\/hashtag(?:\/|$)/,
  /^\/search(?:\/|$)/,
  /^\/stories(?:\/|$)/,
  /^\/p(?:\/|$)/,
  /^\/tv(?:\/|$)/,
  /^\/reel(?:\/|$)/,
];

/** Returns true if the current URL is an Instagram profile page */
export function isInstagramProfilePage(
  url: string = window.location.href
): boolean {
  try {
    const parsed = new URL(url);

    if (!parsed.hostname.includes('instagram.com')) {
      return false;
    }

    const path = parsed.pathname;

    // Must match /username/ or /username
    if (!path.match(/^\/[a-zA-Z0-9._]+\/?$/)) {
      return false;
    }

    // Must not be a known non-profile route
    if (
      EXCLUDED_ROUTES.some(
        (re) => re.test(path)
      )
    ) {
      return false;
    }

    // Skip root path
    if (
      path === '/' ||
      path === ''
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/** Extract username from URL path */
function extractUsernameFromUrl(
  url: string = window.location.href
): string | null {
  try {
    const parsed =
      new URL(url);

    const match =
      parsed.pathname.match(
        /^\/([a-zA-Z0-9._]+)\/?$/
      );

    return match
      ? match[1]
      : null;
  } catch {
    return null;
  }
}

// ─── Follower Count Parsing ─────────────────────────────────────────────────

/** Parse a formatted follower string into a numeric approximation */
export function parseFollowersToNumber(
  raw: string
): number | null {
  if (!raw) {
    return null;
  }

  const cleaned =
    raw
      .replace(/,/g, '')
      .replace(/\s/g, '')
      .toLowerCase();

  const match =
    cleaned.match(
      /^([\d.]+)([kmb]?)$/
    );

  if (!match) {
    return null;
  }

  const num =
    parseFloat(
      match[1]
    );

  const suffix =
    match[2];

  if (
    Number.isNaN(num)
  ) {
    return null;
  }

  if (
    suffix === 'k'
  ) {
    return Math.round(
      num * 1_000
    );
  }

  if (
    suffix === 'm'
  ) {
    return Math.round(
      num * 1_000_000
    );
  }

  if (
    suffix === 'b'
  ) {
    return Math.round(
      num * 1_000_000_000
    );
  }

  return Math.round(
    num
  );
}

/** Format a number into a compact display string */
export function formatFollowers(
  n: number
): string {
  if (
    n >=
    1_000_000_000
  ) {
    return `${(
      n /
      1_000_000_000
    )
      .toFixed(1)
      .replace(
        /\.0$/,
        ''
      )}B`;
  }

  if (
    n >=
    1_000_000
  ) {
    return `${(
      n /
      1_000_000
    )
      .toFixed(1)
      .replace(
        /\.0$/,
        ''
      )}M`;
  }

  if (
    n >=
    1_000
  ) {
    return `${(
      n /
      1_000
    )
      .toFixed(1)
      .replace(
        /\.0$/,
        ''
      )}K`;
  }

  return String(n);
}

// ─── DOM Extraction Helpers ─────────────────────────────────────────────────

function safeText(
  el: Element | null
): string | null {
  if (!el) {
    return null;
  }

  const text =
    el.textContent?.trim();

  return (
    text ||
    null
  );
}

function safeAttr(
  el: Element | null,
  attr: string
): string | null {
  if (!el) {
    return null;
  }

  return (
    el
      .getAttribute(attr)
      ?.trim() ||
    null
  );
}

/** Try multiple CSS selectors, return first match */
function trySelectors(
  selectors: string[]
): Element | null {
  for (
    const sel of selectors
  ) {
    try {
      const el =
        document.querySelector(
          sel
        );

      if (el) {
        return el;
      }
    } catch {
      // Invalid selector — skip
    }
  }

  return null;
}

// ─── Bio Cleaning ───────────────────────────────────────────────────────────

/*
 * Remove Unicode combining marks such as the strike-through mark
 * seen in strings like:
 *
 * 7̶ 7̶ 7̶
 *
 * Also remove zero-width/invisible formatting characters.
 */
function normalizeBioText(
  value: string
): string {
  return value
    .normalize('NFKC')
    .replace(
      /[\u200B-\u200D\u2060\uFEFF]/g,
      ''
    )
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
    .replace(
      /[\r\t]+/g,
      ' ')
    .replace(
      /\u00a0/g,
      ' '
    );
}

/**
 * Returns true for obviously invalid/placeholder content.
 */
function isInvalidBioCandidate(
  text: string,
  username: string,
  displayName: string
): boolean {
  const normalized =
    normalizeBioText(
      text
    )
      .replace(
        /\s+/g,
        ' '
      )
      .trim();

  if (!normalized) {
    return true;
  }

  const lower =
    normalized.toLowerCase();

  /* Generic Instagram SEO text */
  if (
    lower.includes(
      'see instagram photos and videos from'
    ) ||
    lower.includes(
      'instagram photos and videos from'
    ) ||
    lower.includes(
      'instagram photos and videos'
    )
  ) {
    return true;
  }

  /* Username */
  const cleanUsername =
    username
      .replace(/^@/, '')
      .trim()
      .toLowerCase();

  if (
    cleanUsername &&
    (
      lower ===
        cleanUsername ||
      lower ===
        `@${cleanUsername}`
    )
  ) {
    return true;
  }

  /* Display name */
  const cleanDisplayName =
    displayName
      .trim()
      .toLowerCase();

  if (
    cleanDisplayName &&
    lower ===
      cleanDisplayName
  ) {
    return true;
  }

  /* Instagram controls */
  const ignored =
    new Set([
      'follow',
      'following',
      'message',
      'contact',
      'email',
      'call',
      'subscribe',
      'edit profile',
      'share profile',
      'about this account',
      'similar accounts',
      'suggested for you',
      'view translation',
      'translation',
      'posts',
      'followers',
    ]);

  if (
    ignored.has(
      lower
    )
  ) {
    return true;
  }

  /*
   * Remove formatting/symbols temporarily so we can decide
   * whether the candidate actually contains meaningful content.
   */
  const meaningful =
    normalized
      .replace(
        /[\s\p{P}\p{S}]/gu,
        ''
      );

  /*
   * A candidate made only of numbers is not a biography.
   *
   * This specifically catches:
   *
   * 7̶ 7̶ 7̶
   * 123
   * 402
   * 2,529
   * 12
   */
  if (
    /^[\d\s,.$KMBkmb]+$/.test(
      normalized
    )
  ) {
    return true;
  }

  /*
   * Repeated numeric placeholders such as:
   * 7 7 7
   * 7-7-7
   * 77 77
   */
  if (
    /^\d(?:[\s._\-]+\d){1,20}$/.test(
      normalized
    )
  ) {
    return true;
  }

  /*
   * Very small meaningless values.
   */
  if (
    meaningful.length ===
    0
  ) {
    return true;
  }

  /*
   * If there are no letters/numbers at all, it's safest
   * not to treat the candidate as a biography.
   */
  if (
    !/[A-Za-z0-9]/.test(
      meaningful
    )
  ) {
    return true;
  }

  /*
   * Very long blobs are not profile bios.
   */
  if (
    normalized.length >
    1000
  ) {
    return true;
  }

  return false;
}

/**
 * Clean and validate a biography candidate.
 */
function cleanBio(
  value:
    | string
    | null
    | undefined,
  username = '',
  displayName = ''
): string | null {
  if (!value) {
    return null;
  }

  const text =
    normalizeBioText(
      value
    )
      .trim();

  if (!text) {
    return null;
  }

  if (
    isInvalidBioCandidate(
      text,
      username,
      displayName
    )
  ) {
    return null;
  }

  /*
   * Preserve legitimate bio line breaks.
   */
  const lines =
    text
      .split(/\r?\n/)
      .map(
        (line) =>
          line.trim()
      )
      .filter(Boolean);

  if (
    lines.length ===
    0
  ) {
    return null;
  }

  return lines.join(
    '\n'
  );
}

// ─── Extraction Strategies ───────────────────────────────────────────────────

/**
 * Strategy 1: Extract username.
 * URL is the most reliable source.
 */
function extractUsername(): string | null {
  // Layer 1: URL path
  const fromUrl =
    extractUsernameFromUrl();

  if (fromUrl) {
    return fromUrl;
  }

  // Layer 2: Canonical link
  const canonical =
    document.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]'
    );

  if (
    canonical?.href
  ) {
    const fromCanonical =
      extractUsernameFromUrl(
        canonical.href
      );

    if (
      fromCanonical
    ) {
      return fromCanonical;
    }
  }

  // Layer 3: OG URL
  const ogUrl =
    document.querySelector<HTMLMetaElement>(
      'meta[property="og:url"]'
    );

  if (
    ogUrl?.content
  ) {
    const fromOg =
      extractUsernameFromUrl(
        ogUrl.content
      );

    if (fromOg) {
      return fromOg;
    }
  }

  // Layer 4: Page title pattern
  const title =
    document.title;

  const titleMatch =
    title.match(
      /@([a-zA-Z0-9._]+)/
    );

  if (
    titleMatch
  ) {
    return titleMatch[1];
  }

  return null;
}

/**
 * Strategy 2: Extract display name.
 */
function extractDisplayName(): string | null {
  // Layer 1: OG title metadata
  const ogTitle =
    document.querySelector<HTMLMetaElement>(
      'meta[property="og:title"]'
    );

  if (
    ogTitle?.content
  ) {
    /*
     * Common format:
     * Name (@username) • Instagram photos and videos
     */
    const usernameMatch =
      ogTitle.content.match(
        /^(.+?)\s*\(@/
      );

    if (
      usernameMatch?.[1]
    ) {
      return usernameMatch[1].trim();
    }

    /*
     * Other format:
     * Name • Instagram
     */
    const simpleMatch =
      ogTitle.content.match(
        /^(.+?)\s*[•|·]/
      );

    if (
      simpleMatch?.[1]
    ) {
      return simpleMatch[1].trim();
    }
  }

  // Layer 2: Profile header headings
  const headings =
    document.querySelectorAll(
      'header h1, header h2, main header h1, main header h2'
    );

  for (
    const h of headings
  ) {
    const text =
      normalizeBioText(
        h.textContent ||
          ''
      ).trim();

    if (
      text &&
      text.length <
        100
    ) {
      return text;
    }
  }

  // Layer 3: Known Instagram selectors
  const nameSelectors =
    [
      'header section h1',
      'header h1',
      '[data-testid="user-name"]',
      'div[class*="user"] h1',
    ];

  const nameEl =
    trySelectors(
      nameSelectors
    );

  if (nameEl) {
    const text =
      safeText(
        nameEl
      );

    if (
      text &&
      text.length <
        100
    ) {
      return text;
    }
  }

  // Layer 4: Page title
  const titleMatch =
    document.title.match(
      /^(.+?)\s*(?:\(@|•|·|\|)/
    );

  if (
    titleMatch?.[1]
  ) {
    return titleMatch[1].trim();
  }

  return null;
}

/**
 * Strategy 3: Extract bio.
 */
function extractBio(): string | null {
  const username =
    extractUsername()
      ?.replace(
        /^@/,
        ''
      )
      .toLowerCase() ||
    '';

  const displayName =
    extractDisplayName()
      ?.trim()
      .toLowerCase() ||
    '';

  /*
   * ==========================================================
   * PRIMARY SOURCE: VISIBLE INSTAGRAM PROFILE HEADER
   * ==========================================================
   */

  const header =
    document.querySelector(
      'header'
    );

  if (header) {
    const headerText =
      (header as HTMLElement)
        .innerText ||
      '';

    const lines =
      headerText
        .split(/\r?\n/)
        .map(
          (line) =>
            line.trim()
        )
        .filter(Boolean);

    /*
     * Find the statistics section.
     */
    let statsIndex =
      -1;

    for (
      let i = 0;
      i < lines.length;
      i++
    ) {
      const line =
        lines[i].toLowerCase();

      if (
        line.includes(
          'followers'
        ) &&
        (
          line.includes(
            'following'
          ) ||
          line.includes(
            'posts'
          )
        )
      ) {
        statsIndex =
          i;

        break;
      }
    }

    /*
     * Sometimes "followers" is on its own line.
     */
    if (
      statsIndex ===
      -1
    ) {
      for (
        let i = 0;
        i < lines.length;
        i++
      ) {
        if (
          /\bfollowers?\b/i.test(
            lines[i]
          )
        ) {
          statsIndex =
            i;

          break;
        }
      }
    }

    if (
      statsIndex >=
      0
    ) {
      const bioLines:
        string[] = [];

      for (
        let i =
          statsIndex + 1;
        i <
          lines.length;
        i++
      ) {
        const originalLine =
          lines[i];

        const line =
          normalizeBioText(
            originalLine
          ).trim();

        if (!line) {
          continue;
        }

        const lower =
          line.toLowerCase();

        /*
         * Stop at profile action buttons.
         */
        if (
          lower ===
            'follow' ||
          lower ===
            'following' ||
          lower ===
            'message' ||
          lower ===
            'edit profile' ||
          lower ===
            'contact' ||
          lower ===
            'share profile' ||
          lower ===
            'add to story' ||
          lower ===
            'more options'
        ) {
          break;
        }

        /*
         * Ignore additional statistics.
         *
         * Examples:
         * 402 posts
         * 2,529 followers
         * 12 following
         */
        if (
          /^\s*[\d,.]+(?:\s*[KMBkmb])?\s+(?:posts?|followers?|following)\s*$/i.test(
            line
          )
        ) {
          continue;
        }

        /*
         * Ignore bare statistics.
         */
        if (
          /^[\d,.]+(?:\s*[KMBkmb])?$/.test(
            line
          )
        ) {
          continue;
        }

        /*
         * Ignore username.
         */
        if (
          username &&
          lower ===
            username
        ) {
          continue;
        }

        if (
          username &&
          lower ===
            `@${username}`
        ) {
          continue;
        }

        /*
         * Ignore display name.
         */
        if (
          displayName &&
          lower ===
            displayName
        ) {
          continue;
        }

        /*
         * Ignore generic Instagram text.
         */
        if (
          lower.includes(
            'instagram photos and videos from'
          ) ||
          lower.includes(
            'see instagram photos and videos from'
          )
        ) {
          continue;
        }

        /*
         * Ignore obvious controls.
         */
        if (
          lower ===
            'view translation' ||
          lower ===
            'translation'
        ) {
          continue;
        }

        /*
         * Ignore URLs because the profile URL belongs
         * in profileUrl, not bio.
         */
        if (
          /^https?:\/\//i.test(
            line
          ) ||
          /^www\./i.test(
            line
          ) ||
          /^[a-z0-9-]+\.(?:com|in|net|org|io|co)(?:\/.*)?$/i.test(
            line
          )
        ) {
          continue;
        }

        /*
         * Only add a line if it survives the strict
         * bio validation.
         */
        const cleanedLine =
          cleanBio(
            line,
            username,
            displayName
          );

        if (
          cleanedLine
        ) {
          bioLines.push(
            cleanedLine
          );
        }
      }

      /*
       * Remove category if it is the first line.
       */
      const category =
        extractCategory();

      if (
        category &&
        bioLines.length >
          0 &&
        bioLines[0]
          .toLowerCase() ===
          category.toLowerCase()
      ) {
        bioLines.shift();
      }

      const visibleBio =
        cleanBio(
          bioLines.join(
            '\n'
          ),
          username,
          displayName
        );

      if (
        visibleBio
      ) {
        console.log(
          '[CreatorVault] REAL VISIBLE BIO:',
          visibleBio
        );

        return visibleBio;
      }
    }
  }

  /*
   * ==========================================================
   * SECONDARY SOURCE: EMBEDDED BIOGRAPHY DATA
   * ==========================================================
   */

  const scripts =
    document.querySelectorAll(
      'script'
    );

  for (
    const script of scripts
  ) {
    const content =
      script.textContent ||
      '';

    if (!content) {
      continue;
    }

    const patterns =
      [
        /"biography"\s*:\s*"((?:\\.|[^"\\])*)"/gi,
        /"bio"\s*:\s*"((?:\\.|[^"\\])*)"/gi,
      ];

    for (
      const pattern of
      patterns
    ) {
      let match:
        RegExpExecArray |
        null;

      while (
        (
          match =
            pattern.exec(
              content
            )
        ) !== null
      ) {
        let value =
          match[1];

        try {
          value =
            JSON.parse(
              `"${value}"`
            );
        } catch {
          value =
            value
              .replace(
                /\\n/g,
                '\n'
              )
              .replace(
                /\\"/g,
                '"'
              )
              .replace(
                /\\\\/g,
                '\\'
              );
        }

        const bio =
          cleanBio(
            value,
            username,
            displayName
          );

        if (
          bio
        ) {
          console.log(
            '[CreatorVault] REAL EMBEDDED BIO:',
            bio
          );

          return bio;
        }
      }
    }
  }

  /*
   * IMPORTANT:
   *
   * Do not use broad div/span/meta fallbacks here.
   *
   * Returning null is safer than saving incorrect data.
   */
  return null;
}

/**
 * Strategy 4: Extract follower count.
 */
function extractFollowers(): {
  raw: string | null;
  numeric: number | null;
} {
  const candidates:
    HTMLElement[] = [];

  /*
   * 1. Links whose destination is the followers page
   */
  const followerLinks =
    document.querySelectorAll<HTMLAnchorElement>(
      'a[href*="/followers"]'
    );

  followerLinks.forEach(
    (link) => {
      candidates.push(
        link
      );
    }
  );

  for (
    const element of
    candidates
  ) {
    const text =
      (
        element.innerText ||
        element.textContent ||
        ''
      ).trim();

    const title =
      element.getAttribute(
        'title'
      )?.trim() ||
      '';

    const aria =
      element.getAttribute(
        'aria-label'
      )?.trim() ||
      '';

    const combined =
      `${title} ${aria} ${text}`.trim();

    const match =
      combined.match(
        /([\d,.]+(?:\s*[KMB])?)\s+followers?\b/i
      );

    if (
      match?.[1]
    ) {
      const raw =
        match[1].trim();

      return {
        raw,
        numeric:
          parseFollowersToNumber(
            raw
          ),
      };
    }

    const numberOnly =
      combined.match(
        /^\s*([\d,]+)\s*$/
      );

    if (
      numberOnly?.[1]
    ) {
      const raw =
        numberOnly[1].trim();

      return {
        raw,
        numeric:
          parseFollowersToNumber(
            raw
          ),
      };
    }
  }

  /*
   * 2. Profile header text
   */
  const header =
    document.querySelector(
      'header'
    );

  if (header) {
    const text =
      (header as HTMLElement)
        .innerText ||
      '';

    const match =
      text.match(
        /([\d,.]+(?:\s*[KMB])?)\s+followers?\b/i
      );

    if (
      match?.[1]
    ) {
      const raw =
        match[1].trim();

      console.log(
        '[CreatorVault] Visible exact followers:',
        raw
      );

      return {
        raw,
        numeric:
          parseFollowersToNumber(
            raw
          ),
      };
    }
  }

  /*
   * 3. Accessible labels
   */
  const accessibleElements =
    document.querySelectorAll<HTMLElement>(
      '[aria-label*="followers" i], [title*="followers" i]'
    );

  for (
    const element of
    accessibleElements
  ) {
    const value =
      element.getAttribute(
        'aria-label'
      ) ||
      element.getAttribute(
        'title'
      ) ||
      element.innerText ||
      '';

    const match =
      value.match(
        /([\d,.]+(?:\s*[KMB])?)\s+followers?\b/i
      );

    if (
      match?.[1]
    ) {
      const raw =
        match[1].trim();

      return {
        raw,
        numeric:
          parseFollowersToNumber(
            raw
          ),
      };
    }
  }

  /*
   * 4. Exact embedded numeric data
   */
  const scripts =
    document.querySelectorAll(
      'script'
    );

  for (
    const script of scripts
  ) {
    const content =
      script.textContent ||
      '';

    if (!content) {
      continue;
    }

    const exactPatterns =
      [
        /"follower_count"\s*:\s*(\d+)/i,
        /"followers_count"\s*:\s*(\d+)/i,
        /"edge_followed_by"\s*:\s*\{\s*"count"\s*:\s*(\d+)/i,
      ];

    for (
      const pattern of
      exactPatterns
    ) {
      const match =
        content.match(
          pattern
        );

      if (
        !match?.[1]
      ) {
        continue;
      }

      const exact =
        Number(
          match[1]
        );

      if (
        Number.isFinite(
          exact
        ) &&
        exact >= 0
      ) {
        const raw =
          exact.toLocaleString(
            'en-US'
          );

        return {
          raw,
          numeric:
            exact,
        };
      }
    }
  }

  /*
   * 5. Meta fallback
   */
  const ogDescription =
    document.querySelector<HTMLMetaElement>(
      'meta[property="og:description"]'
    );

  if (
    ogDescription?.content
  ) {
    const match =
      ogDescription.content.match(
        /([\d,.]+(?:\s*[KMB])?)\s+followers?/i
      );

    if (
      match?.[1]
    ) {
      const raw =
        match[1].trim();

      return {
        raw,
        numeric:
          parseFollowersToNumber(
            raw
          ),
      };
    }
  }

  return {
    raw: null,
    numeric: null,
  };
}

/**
 * Extract following count.
 */
function extractFollowing():
  string | null {
  /*
   * 1. PRIMARY SOURCE — visible profile header
   */
  const headers =
    Array.from(
      document.querySelectorAll(
        'header'
      )
    );

  for (
    const header of
    headers
  ) {
    const headerText =
      (header as HTMLElement)
        .innerText ||
      '';

    if (!headerText) {
      continue;
    }

    const combinedMatch =
      headerText.match(
        /([\d,.]+(?:\s*[KMB])?)\s+following\b/i
      );

    if (
      combinedMatch?.[1]
    ) {
      const raw =
        combinedMatch[1].trim();

      console.log(
        '[CreatorVault] Visible exact following:',
        raw
      );

      return raw;
    }

    const lines =
      headerText
        .split(/\r?\n/)
        .map(
          (line) =>
            line.trim()
        )
        .filter(Boolean);

    for (
      let i = 0;
      i < lines.length;
      i++
    ) {
      if (
        /^following$/i.test(
          lines[i]
        )
      ) {
        const previous =
          lines[i - 1];

        if (
          previous &&
          /^[\d,.]+(?:\s*[KMB])?$/i.test(
            previous
          )
        ) {
          const raw =
            previous.trim();

          console.log(
            '[CreatorVault] Visible exact following:',
            raw
          );

          return raw;
        }
      }
    }
  }

  /*
   * 2. Accessible labels
   */
  const accessibleElements =
    document.querySelectorAll<HTMLElement>(
      '[aria-label*="following" i], [title*="following" i]'
    );

  for (
    const element of
    accessibleElements
  ) {
    const value =
      element.getAttribute(
        'aria-label'
      ) ||
      element.getAttribute(
        'title'
      ) ||
      element.innerText ||
      '';

    const match =
      value.match(
        /([\d,.]+(?:\s*[KMB])?)\s+following\b/i
      );

    if (
      match?.[1]
    ) {
      return match[1].trim();
    }
  }

  /*
   * 3. Profile header links
   */
  const followingLinks =
    document.querySelectorAll<HTMLAnchorElement>(
      'header a[href*="/following"]'
    );

  for (
    const link of
    followingLinks
  ) {
    const text =
      (
        link.innerText ||
        link.textContent ||
        ''
      ).trim();

    const title =
      link.getAttribute(
        'title'
      )?.trim() ||
      '';

    const aria =
      link.getAttribute(
        'aria-label'
      )?.trim() ||
      '';

    const combined =
      `${title} ${aria} ${text}`.trim();

    const match =
      combined.match(
        /([\d,.]+(?:\s*[KMB])?)/i
      );

    if (
      match?.[1] &&
      /^[\d,.]+(?:\s*[KMB])?$/i.test(
        match[1]
      )
    ) {
      return match[1].trim();
    }
  }

  /*
   * 4. Embedded Instagram data
   */
  const scripts =
    document.querySelectorAll(
      'script'
    );

  for (
    const script of
    scripts
  ) {
    const content =
      script.textContent ||
      '';

    if (!content) {
      continue;
    }

    const exactPatterns =
      [
        /"edge_follow"\s*:\s*\{\s*"count"\s*:\s*(\d+)/i,
        /"following_count"\s*:\s*(\d+)/i,
        /"followings_count"\s*:\s*(\d+)/i,
      ];

    for (
      const pattern of
      exactPatterns
    ) {
      const match =
        content.match(
          pattern
        );

      if (
        !match?.[1]
      ) {
        continue;
      }

      const exact =
        Number(
          match[1]
        );

      if (
        Number.isFinite(
          exact
        ) &&
        exact >= 0
      ) {
        const raw =
          exact.toLocaleString(
            'en-US'
          );

        return raw;
      }
    }
  }

  /*
   * 5. Meta description fallback
   */
  const ogDesc =
    document.querySelector<HTMLMetaElement>(
      'meta[property="og:description"]'
    );

  if (
    ogDesc?.content
  ) {
    const match =
      ogDesc.content.match(
        /([\d,.]+(?:\s*[KMB])?)\s+following/i
      );

    if (
      match?.[1]
    ) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Extract post count.
 */
function extractPosts():
  string | null {
  /*
   * Layer 1: Profile header text
   */
  const header =
    document.querySelector(
      'header'
    );

  if (header) {
    const text =
      (header as HTMLElement)
        .innerText ||
      '';

    const match =
      text.match(
        /([\d,.]+(?:\s*[KMB])?)\s+posts?\b/i
      );

    if (
      match?.[1]
    ) {
      return match[1].trim();
    }
  }

  /*
   * Layer 2: Visible stats selectors
   */
  const statSelectors =
    [
      'header section ul li',
      'ul[class*="_aa_"] li',
    ];

  for (
    const sel of
    statSelectors
  ) {
    try {
      const items =
        document.querySelectorAll(
          sel
        );

      for (
        const item of
        items
      ) {
        const text =
          item.textContent?.toLowerCase() ??
          '';

        if (
          text.includes(
            'post'
          )
        ) {
          const numEl =
            item.querySelector(
              'span[title], span[class*="_ac2a"], button span'
            ) ||
            item;

          const raw =
            (
              numEl as HTMLElement
            ).getAttribute(
              'title'
            ) ||
            numEl.textContent?.replace(
              /[^\d.,KMBkmb]/g,
              ''
            ) ||
            null;

          return (
            raw?.trim() ||
            null
          );
        }
      }
    } catch {
      // Skip invalid selector
    }
  }

  /*
   * Layer 3: OG description
   */
  const ogDesc =
    document.querySelector<HTMLMetaElement>(
      'meta[property="og:description"]'
    );

  if (
    ogDesc?.content
  ) {
    const match =
      ogDesc.content.match(
        /([\d,.]+(?:\s*[KMB])?)\s+posts?/i
      );

    if (
      match?.[1]
    ) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Extract profile image URL.
 */
function extractProfileImage():
  string | null {
  /*
   * Layer 1: OG image
   */
  const ogImage =
    document.querySelector<HTMLMetaElement>(
      'meta[property="og:image"]'
    );

  if (
    ogImage?.content
  ) {
    return ogImage.content;
  }

  /*
   * Layer 2: Profile image in header
   */
  const imgSelectors =
    [
      'header img',
      'img[data-testid="user-avatar"]',
      'canvas + span img',
      'header section img',
    ];

  const imgEl =
    trySelectors(
      imgSelectors
    ) as
      | HTMLImageElement
      | null;

  if (
    imgEl?.src &&
    !imgEl.src.includes(
      'data:'
    )
  ) {
    return imgEl.src;
  }

  return null;
}

/**
 * Check if account is verified.
 */
function extractVerified():
  boolean {
  const verifiedSelectors =
    [
      'svg[aria-label="Verified"]',
      'span[aria-label="Verified"]',
      '[data-testid="verified-badge"]',
      'span[class*="Verified"]',
    ];

  for (
    const sel of
    verifiedSelectors
  ) {
    if (
      document.querySelector(
        sel
      )
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Extract category label.
 */
function extractCategory():
  string | null {
  const categorySelectors =
    [
      'header section div[class*="_aa_c"] > div > span',
      'div[class*="_aaqf"] > span',
      'header section div span[class*="category"]',
    ];

  const el =
    trySelectors(
      categorySelectors
    );

  if (el) {
    const text =
      safeText(
        el
      );

    if (
      text &&
      text.length <
        60 &&
      !text.includes(
        '\n'
      )
    ) {
      return text;
    }
  }

  return null;
}

/**
 * Extract a field from JSON-LD structured data if present.
 */
function extractFromJsonLd(
  field: string
): string | null {
  const scripts =
    document.querySelectorAll(
      'script[type="application/ld+json"]'
    );

  for (
    const script of
    scripts
  ) {
    try {
      const data =
        JSON.parse(
          script.textContent ||
            ''
        );

      if (
        data &&
        typeof data ===
          'object' &&
        field in data
      ) {
        return String(
          data[field]
        );
      }
    } catch {
      // Skip malformed JSON
    }
  }

  return null;
}

// ─── Main Parser ─────────────────────────────────────────────────────────────

/**
 * Parse the current Instagram page and extract
 * all publicly available profile data.
 *
 * Uses layered strategies with graceful fallbacks.
 * Does not crash if data is unavailable.
 */
export function parseInstagramProfile():
  ParsedInstagramProfile {
  const profileUrl =
    window.location.origin +
    window.location.pathname;

  const username =
    extractUsername();

  const displayName =
    extractDisplayName();

  const bio =
    extractBio();

  const {
    raw: followers,
    numeric:
      followersNumeric,
  } =
    extractFollowers();

  const following =
    extractFollowing();

  const posts =
    extractPosts();

  const profileImage =
    extractProfileImage();

  const verified =
    extractVerified();

  const category =
    extractCategory();

  return {
    username,
    displayName,
    bio,
    followers,
    followersNumeric,
    following,
    posts,
    profileImage,
    verified,
    category,
    profileUrl,
  };
}