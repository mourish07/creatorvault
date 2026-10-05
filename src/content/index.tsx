// CreatorVault — Content Script

import React from 'react';
import ReactDOM from 'react-dom/client';

import './content.css';

import {
  parseInstagramProfile,
  isInstagramProfilePage,
} from '../services/instagramParser';

import type {
  ParsedInstagramProfile,
} from '../models/influencer';

import { crmStorage } from '../storage/crmStorage';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';

import {
  Camera,
  CheckCircle,
  UserPlus,
} from 'lucide-react';

import { CrmCapturePanel } from './CrmCapturePanel';

console.log(
  '[CreatorVault] Content script loaded on:',
  window.location.href
);

let rootContainer: HTMLElement | null = null;
let rootReact: ReactDOM.Root | null = null;
let currentProfile: ParsedInstagramProfile | null = null;

let checkInterval:
  ReturnType<typeof setInterval> | null = null;

let urlWatchInterval:
  ReturnType<typeof setInterval> | null = null;

/*
 * The last profile CreatorVault successfully displayed.
 */
let lastRenderedProfile:
  ParsedInstagramProfile | null = null;

/*
 * The profile that was visible BEFORE the current Instagram
 * navigation started.
 *
 * We keep this unchanged during the navigation refresh cycle.
 */
let previousProfileBeforeNavigation:
  ParsedInstagramProfile | null = null;

/*
 * Prevent rendering the exact same profile data repeatedly.
 */
let lastRenderedFingerprint =
  '';

/*
 * Current URL known by CreatorVault.
 */
let lastUrl =
  window.location.href;

/* =========================================================
   TEXT HELPERS
   ========================================================= */

function normalizeText(
  value: string | null | undefined
): string {
  return (value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\r/g, '')
    .replace(/\t/g, ' ')
    .replace(/[ ]+/g, ' ')
    .trim();
}

function isGenericInstagramBio(
  value: string | null | undefined
): boolean {
  const text =
    normalizeText(value);

  if (!text) {
    return true;
  }

  const lower =
    text.toLowerCase();

  return (
    lower.includes(
      'see instagram photos and videos from'
    ) ||
    lower.includes(
      'instagram photos and videos'
    )
  );
}

function cleanBio(
  value: string | null | undefined,
  username?: string | null,
  displayName?: string | null
): string | null {
  const text =
    normalizeText(value);

  if (!text) {
    return null;
  }

  if (
    isGenericInstagramBio(
      text
    )
  ) {
    return null;
  }

  const normalizedUsername =
    normalizeText(
      username
    )
      .replace(/^@/, '')
      .toLowerCase();

  const normalizedDisplayName =
    normalizeText(
      displayName
    ).toLowerCase();

  const lower =
    text.toLowerCase();

  if (
    normalizedUsername &&
    (
      lower ===
        normalizedUsername ||
      lower ===
        `@${normalizedUsername}`
    )
  ) {
    return null;
  }

  if (
    normalizedDisplayName &&
    lower ===
      normalizedDisplayName
  ) {
    return null;
  }

  const blocked =
    new Set([
      'follow',
      'following',
      'message',
      'contact',
      'email',
      'call',
      'subscribe',
      'posts',
      'followers',
      'about this account',
      'similar accounts',
      'suggested for you',
      'edit profile',
      'share profile',
    ]);

  if (
    blocked.has(lower)
  ) {
    return null;
  }

  if (
    /^\d[\d,.\s]*$/.test(text)
  ) {
    return null;
  }

  return text;
}

/* =========================================================
   EMBEDDED INSTAGRAM DATA
   ========================================================= */

function findBiographyInObject(
  value: unknown,
  username?: string | null,
  displayName?: string | null,
  depth = 0
): string | null {
  if (
    depth > 12 ||
    value == null
  ) {
    return null;
  }

  if (
    typeof value === 'string'
  ) {
    return null;
  }

  if (
    Array.isArray(value)
  ) {
    for (
      const item of value
    ) {
      const result =
        findBiographyInObject(
          item,
          username,
          displayName,
          depth + 1
        );

      if (result) {
        return result;
      }
    }

    return null;
  }

  if (
    typeof value !== 'object'
  ) {
    return null;
  }

  const obj =
    value as Record<
      string,
      unknown
    >;

  const preferredKeys =
    [
      'biography',
      'bio',
    ];

  for (
    const key of preferredKeys
  ) {
    const candidate =
      obj[key];

    if (
      typeof candidate ===
      'string'
    ) {
      const bio =
        cleanBio(
          candidate,
          username,
          displayName
        );

      if (bio) {
        return bio;
      }
    }

    if (
      candidate &&
      typeof candidate ===
        'object'
    ) {
      const nested =
        findBiographyInObject(
          candidate,
          username,
          displayName,
          depth + 1
        );

      if (nested) {
        return nested;
      }
    }
  }

  if (
    typeof obj.description ===
    'string'
  ) {
    const description =
      cleanBio(
        obj.description,
        username,
        displayName
      );

    if (description) {
      return description;
    }
  }

  for (
    const [key, child] of
    Object.entries(obj)
  ) {
    if (
      key === 'props' ||
      key === 'children' ||
      key === 'errors'
    ) {
      continue;
    }

    const nested =
      findBiographyInObject(
        child,
        username,
        displayName,
        depth + 1
      );

    if (nested) {
      return nested;
    }
  }

  return null;
}

function extractEmbeddedInstagramBio(
  username?: string | null,
  displayName?: string | null
): string | null {
  const scripts =
    Array.from(
      document.querySelectorAll(
        'script'
      )
    );

  for (
    const script of scripts
  ) {
    const type =
      (
        script.getAttribute(
          'type'
        ) || ''
      ).toLowerCase();

    const text =
      script.textContent ||
      '';

    if (!text.trim()) {
      continue;
    }

    if (
      type ===
        'application/json' ||
      type ===
        'application/ld+json'
    ) {
      try {
        const parsed =
          JSON.parse(
            text
          );

        const bio =
          findBiographyInObject(
            parsed,
            username,
            displayName
          );

        if (bio) {
          return bio;
        }
      } catch {
        // Ignore invalid JSON.
      }
    }
  }

  for (
    const script of scripts
  ) {
    const text =
      script.textContent ||
      '';

    if (!text.trim()) {
      continue;
    }

    const biographyMatches =
      [
        /"biography"\s*:\s*"((?:\\.|[^"\\])*)"/i,
        /"bio"\s*:\s*"((?:\\.|[^"\\])*)"/i,
      ];

    for (
      const regex of
      biographyMatches
    ) {
      const match =
        text.match(
          regex
        );

      if (
        !match?.[1]
      ) {
        continue;
      }

      try {
        const decoded =
          JSON.parse(
            `"${match[1]}"`
          );

        const bio =
          cleanBio(
            decoded,
            username,
            displayName
          );

        if (bio) {
          return bio;
        }
      } catch {
        const bio =
          cleanBio(
            match[1],
            username,
            displayName
          );

        if (bio) {
          return bio;
        }
      }
    }
  }

  return null;
}

/* =========================================================
   VISIBLE DOM BIO
   ========================================================= */

function extractVisibleInstagramBio(
  username?: string | null,
  displayName?: string | null
): string | null {
  const candidates:
    Array<{
      text: string;
      score: number;
    }> = [];

  const addCandidate = (
    value:
      string | null | undefined,
    score: number
  ) => {
    const bio =
      cleanBio(
        value,
        username,
        displayName
      );

    if (!bio) {
      return;
    }

    if (
      bio.length > 500
    ) {
      return;
    }

    const existing =
      candidates.find(
        (candidate) =>
          candidate.text
            .toLowerCase() ===
          bio.toLowerCase()
      );

    if (existing) {
      existing.score =
        Math.max(
          existing.score,
          score
        );
    } else {
      candidates.push({
        text: bio,
        score,
      });
    }
  };

  const specificSelectors =
    [
      '[data-testid="user-bio"]',
      '[data-testid="user-bio"] span',
      '[data-testid="user-bio"] div',
      '[aria-label*="bio" i]',
      'span[class*="biography"]',
      'div[class*="biography"]',
      '[class*="Biography"]',
      '[class*="biography"]',
    ];

  for (
    const selector of
    specificSelectors
  ) {
    try {
      document
        .querySelectorAll(
          selector
        )
        .forEach(
          (element) => {
            addCandidate(
              element.textContent,
              120
            );
          }
        );
    } catch {
      // Ignore selector errors.
    }
  }

  const headers =
    Array.from(
      document.querySelectorAll(
        'header, main header'
      )
    );

  for (
    const header of headers
  ) {
    header
      .querySelectorAll(
        '[dir="auto"]'
      )
      .forEach(
        (element) => {
          const text =
            normalizeText(
              element.textContent
            );

          if (!text) {
            return;
          }

          let score =
            70;

          if (
            text.length >=
            15
          ) {
            score += 10;
          }

          if (
            text.length >=
            30
          ) {
            score += 10;
          }

          addCandidate(
            text,
            score
          );
        }
      );

    header
      .querySelectorAll(
        'span, div'
      )
      .forEach(
        (element) => {
          const text =
            normalizeText(
              element.textContent
            );

          if (
            !text ||
            text.length >
              350
          ) {
            return;
          }

          let score =
            20;

          if (
            element.getAttribute(
              'dir'
            ) === 'auto'
          ) {
            score += 30;
          }

          if (
            element.tagName
              .toLowerCase() ===
            'span'
          ) {
            score += 5;
          }

          if (
            text.length >=
            15
          ) {
            score += 10;
          }

          if (
            text.length >=
            30
          ) {
            score += 10;
          }

          addCandidate(
            text,
            score
          );
        }
      );
  }

  const mainElements =
    Array.from(
      document.querySelectorAll(
        'main span, main div'
      )
    );

  for (
    const element of
    mainElements
  ) {
    const text =
      normalizeText(
        element.textContent
      );

    if (
      !text ||
      text.length > 300
    ) {
      continue;
    }

    if (
      element.closest(
        'button, a'
      )
    ) {
      continue;
    }

    let score =
      10;

    if (
      element.getAttribute(
        'dir'
      ) === 'auto'
    ) {
      score += 25;
    }

    if (
      text.length >=
      20
    ) {
      score += 15;
    }

    addCandidate(
      text,
      score
    );
  }

  candidates.sort(
    (a, b) => {
      if (
        b.score !==
        a.score
      ) {
        return (
          b.score -
          a.score
        );
      }

      return (
        b.text.length -
        a.text.length
      );
    }
  );

  return (
    candidates[0]?.text ||
    null
  );
}

/* =========================================================
   FINAL PROFILE PARSER
   ========================================================= */

function getParsedProfile():
  ParsedInstagramProfile {
  const parsed =
    parseInstagramProfile();

  /*
   * IMPORTANT:
   *
   * The parser remains the single source of truth.
   *
   * We deliberately do NOT replace the display name using
   * document.title or og:title because during Instagram SPA
   * navigation those values can update at a different time
   * from the actual profile DOM.
   */

  const finalBio =
    cleanBio(
      parsed.bio,
      parsed.username,
      parsed.displayName
    );

  const finalProfile:
    ParsedInstagramProfile =
    {
      ...parsed,
      bio: finalBio,
    };

  console.log(
    '[CreatorVault] Final profile:',
    finalProfile
  );

  return finalProfile;
}

/* =========================================================
   INSTAGRAM URL HELPERS
   ========================================================= */

function getProfileUsernameFromUrl():
  string | null {
  const pathname =
    window.location.pathname
      .replace(/^\/+/, '')
      .replace(/\/+$/, '');

  if (!pathname) {
    return null;
  }

  const parts =
    pathname.split('/');

  if (
    parts.length !== 1
  ) {
    return null;
  }

  const username =
    parts[0].trim();

  const reservedRoutes =
    new Set([
      'accounts',
      'direct',
      'explore',
      'reels',
      'reel',
      'stories',
      'web',
      'about',
      'developer',
      'directory',
      'legal',
      'privacy',
      'terms',
    ]);

  if (
    reservedRoutes.has(
      username.toLowerCase()
    )
  ) {
    return null;
  }

  if (
    !/^[A-Za-z0-9._]+$/.test(
      username
    )
  ) {
    return null;
  }

  return username;
}

function profileMatchesCurrentUrl(
  profile:
    ParsedInstagramProfile | null
): boolean {
  if (!profile?.username) {
    return false;
  }

  const expectedUsername =
    getProfileUsernameFromUrl();

  if (!expectedUsername) {
    return false;
  }

  return (
    profile.username
      .replace(/^@/, '')
      .trim()
      .toLowerCase() ===
    expectedUsername
      .replace(/^@/, '')
      .trim()
      .toLowerCase()
  );
}

/* =========================================================
   PROFILE CHANGE DETECTION
   ========================================================= */

/*
 * Username is intentionally NOT included here.
 *
 * Instagram changes the URL/username first.
 * We wait for real profile identity data to update.
 */
function hasProfileIdentityChanged(
  previous:
    ParsedInstagramProfile | null,
  current:
    ParsedInstagramProfile
): boolean {
  if (!previous) {
    return true;
  }

  const previousName =
    normalizeText(
      previous.displayName
    ).toLowerCase();

  const currentName =
    normalizeText(
      current.displayName
    ).toLowerCase();

  const previousBio =
    normalizeText(
      previous.bio
    ).toLowerCase();

  const currentBio =
    normalizeText(
      current.bio
    ).toLowerCase();

  const previousImage =
    previous.profileImage ||
    '';

  const currentImage =
    current.profileImage ||
    '';

  const previousVerified =
    Boolean(
      previous.verified
    );

  const currentVerified =
    Boolean(
      current.verified
    );

  return (
    previousName !==
      currentName ||
    previousBio !==
      currentBio ||
    previousImage !==
      currentImage ||
    previousVerified !==
      currentVerified
  );
}

function getProfileFingerprint(
  profile:
    ParsedInstagramProfile | null
): string {
  if (!profile) {
    return '';
  }

  return JSON.stringify({
    username:
      profile.username ||
      '',

    displayName:
      normalizeText(
        profile.displayName
      ),

    bio:
      normalizeText(
        profile.bio
      ),

    followers:
      normalizeText(
        profile.followers
      ),

    following:
      normalizeText(
        profile.following
      ),

    posts:
      normalizeText(
        profile.posts
      ),

    profileImage:
      profile.profileImage ||
      '',

    verified:
      Boolean(
        profile.verified
      ),
  });
}

/* =========================================================
   CRM HELPERS
   ========================================================= */

async function checkSaved(
  username: string
) {
  const normalized =
    username
      .replace(/^@/, '')
      .toLowerCase()
      .trim();

  return await crmStorage.findByUsername(
    normalized
  );
}

/* =========================================================
   FLOATING CARD HELPERS
   ========================================================= */

function hideFloatingCard() {
  if (rootContainer) {
    rootContainer.style.display =
      'none';
  }
}

function showFloatingCard() {
  if (rootContainer) {
    rootContainer.style.display =
      'block';
  }
}

/* =========================================================
   FLOATING CARD
   ========================================================= */

function mountFloatingCard():
  boolean {
  if (
    !isInstagramProfilePage()
  ) {
    hideFloatingCard();

    return false;
  }

  const parsed =
    getParsedProfile();

  console.log(
    '[CreatorVault] Parsed profile during navigation check:',
    parsed
  );

  /*
   * Never use profile data whose username does not match
   * the current Instagram URL.
   */
  if (
    !profileMatchesCurrentUrl(
      parsed
    )
  ) {
    console.log(
      '[CreatorVault] Waiting: parsed username does not match URL.',
      {
        parsed:
          parsed.username,
        urlUsername:
          getProfileUsernameFromUrl(),
      }
    );

    hideFloatingCard();

    return false;
  }

  if (!parsed.username) {
    hideFloatingCard();

    return false;
  }

  /*
   * When navigating from A to B:
   *
   * Instagram may already show username B while the rest
   * of the DOM still contains A.
   *
   * Do NOT show anything until real profile identity data
   * has changed.
   */
  if (
    previousProfileBeforeNavigation &&
    !hasProfileIdentityChanged(
      previousProfileBeforeNavigation,
      parsed
    )
  ) {
    console.log(
      '[CreatorVault] Waiting for Instagram to replace previous profile data...'
    );

    hideFloatingCard();

    return false;
  }

  /*
   * New profile data is ready enough to display.
   *
   * We continue rescanning during the navigation refresh
   * period, so followers/following/posts/bio are updated
   * as Instagram finishes rendering them.
   */
  currentProfile =
    parsed;

  const fingerprint =
    getProfileFingerprint(
      parsed
    );

  /*
   * Only re-render when actual captured data changed.
   */
  const shouldRender =
    fingerprint !==
      lastRenderedFingerprint ||
    !rootContainer ||
    !document.body.contains(
      rootContainer
    );

  if (
    !shouldRender
  ) {
    return true;
  }

  lastRenderedFingerprint =
    fingerprint;

  lastRenderedProfile =
    parsed;

  showFloatingCard();

  if (
    !rootContainer ||
    !document.body.contains(
      rootContainer
    )
  ) {
    console.log(
      '[CreatorVault] Creating root container'
    );

    rootContainer =
      document.createElement(
        'div'
      );

    rootContainer.id =
      'creatorvault-root';

    rootContainer.style.cssText =
      'display: block !important; position: fixed !important; bottom: 0 !important; right: 0 !important; z-index: 2147483647 !important; pointer-events: auto;';

    document.body.appendChild(
      rootContainer
    );

    if (rootReact) {
      try {
        rootReact.unmount();
      } catch {
        // Ignore.
      }

      rootReact =
        null;
    }
  }

  if (!rootReact) {
    rootReact =
      ReactDOM.createRoot(
        rootContainer
      );
  }

  try {
    rootReact.render(
      <FloatingCardApp
        key={parsed.username}
        profile={parsed}
      />
    );

    console.log(
      '[CreatorVault] Rendered:',
      parsed.username,
      {
        displayName:
          parsed.displayName,
        followers:
          parsed.followers,
        following:
          parsed.following,
        posts:
          parsed.posts,
        bio:
          parsed.bio,
      }
    );

    return true;
  } catch (error) {
    console.error(
      '[CreatorVault] Render failed:',
      error
    );

    return false;
  }
}

/* =========================================================
   FLOATING CARD APP
   ========================================================= */

const FloatingCardApp:
  React.FC<{
    profile:
      ParsedInstagramProfile;
  }> = ({
    profile,
  }) => {
  const [
    existingId,
    setExistingId,
  ] =
    React.useState<
      string | null
    >(null);

  const [
    message,
    setMessage,
  ] =
    React.useState<
      string | null
    >(null);

  const [
    showCapturePanel,
    setShowCapturePanel,
  ] =
    React.useState(false);

  const [
    captureProfile,
    setCaptureProfile,
  ] =
    React.useState<
      ParsedInstagramProfile
    >(profile);

  React.useEffect(
    () => {
      let active = true;

      setCaptureProfile(
        profile
      );

      setExistingId(
        null
      );

      setMessage(
        null
      );

      setShowCapturePanel(
        false
      );

      checkSaved(
        profile.username!
      ).then(
        (inf) => {
          if (!active) {
            return;
          }

          setExistingId(
            inf?.id ||
              null
          );
        }
      );

      const unsub =
        crmStorage.onChanged(
          () => {
            checkSaved(
              profile.username!
            ).then(
              (inf) => {
                if (!active) {
                  return;
                }

                setExistingId(
                  inf?.id ||
                    null
                );
              }
            );
          }
        );

      return () => {
        active =
          false;

        unsub();
      };
    },
    [
      profile.username,
    ]
  );

  const showMessage = (
    text: string
  ) => {
    setMessage(
      text
    );

    window.setTimeout(
      () => {
        setMessage(
          null
        );
      },
      3500
    );
  };

  const handleAddToCRM =
    async () => {
      setMessage(
        null
      );

      try {
        const freshProfile =
          getParsedProfile();

        /*
         * Ensure Add to CRM never captures a profile belonging
         * to a different current URL.
         */
        if (
          !profileMatchesCurrentUrl(
            freshProfile
          )
        ) {
          showMessage(
            'Instagram profile is still loading. Please try again.'
          );

          return;
        }

        console.log(
          '[CreatorVault] Fresh profile before CRM capture:',
          freshProfile
        );

        setCaptureProfile(
          freshProfile
        );
      } catch (error) {
        console.error(
          '[CreatorVault] Failed to refresh profile:',
          error
        );

        setCaptureProfile(
          profile
        );
      }

      setShowCapturePanel(
        true
      );
    };

  const handleCapturePanelSaved =
    async () => {
      setShowCapturePanel(
        false
      );

      const saved =
        await checkSaved(
          captureProfile.username!
        );

      setExistingId(
        saved?.id ||
          null
      );

      showMessage(
        'Influencer added to CRM successfully.'
      );
    };

  const handleCapturePanelClose =
    () => {
      setShowCapturePanel(
        false
      );
    };

  const openDashboard =
    () => {
      chrome.runtime.sendMessage(
        {
          type:
            'OPEN_DASHBOARD',
        }
      );
    };

  const isSuccessMessage =
    message?.includes(
      'successfully'
    ) ?? false;

  const isDuplicateMessage =
    message?.includes(
      'already'
    ) ?? false;

  return (
    <>
      <div
        style={{
          width: 320,
          margin:
            '0 0 20px 20px',
          padding: 16,
          borderRadius: 14,
          background:
            '#ffffff',
          border:
            '1px solid #e5e7eb',
          boxShadow:
            '0 10px 30px rgba(0, 0, 0, 0.12)',
          pointerEvents:
            'auto',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        {/* Header */}

        <div
          style={{
            display:
              'flex',
            alignItems:
              'center',
            gap: 10,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background:
                'linear-gradient(135deg, #4a5af0 0%, #7c3aed 100%)',
              display:
                'flex',
              alignItems:
                'center',
              justifyContent:
                'center',
              flexShrink: 0,
            }}
          >
            <Camera
              size={17}
              color="#ffffff"
            />
          </div>

          <div
            style={{
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color:
                  '#111827',
              }}
            >
              CreatorVault
            </div>

            <div
              style={{
                fontSize: 11,
                color:
                  '#9ca3af',
              }}
            >
              Instagram Influencer CRM
            </div>
          </div>
        </div>

        {/* Profile */}

        <div
          style={{
            display:
              'flex',
            alignItems:
              'center',
            gap: 10,
            marginBottom: 12,
          }}
        >
          <Avatar
            name={
              profile.displayName ||
              profile.username ||
              'Creator'
            }
            imageUrl={
              profile.profileImage
            }
            size={42}
          />

          <div
            style={{
              minWidth: 0,
              flex: 1,
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color:
                  '#111827',
                overflow:
                  'hidden',
                textOverflow:
                  'ellipsis',
                whiteSpace:
                  'nowrap',
              }}
            >
              {profile.displayName ||
                profile.username ||
                'Instagram Creator'}
            </div>

            {profile.username && (
              <div
                style={{
                  fontSize: 12,
                  color:
                    '#6b7280',
                  marginTop: 2,
                }}
              >
                @{profile.username}
              </div>
            )}
          </div>
        </div>

        {/* Stats */}

        <div
          style={{
            display:
              'flex',
            gap: 8,
            marginBottom: 12,
          }}
        >
          {profile.followers && (
            <div
              style={{
                flex: 1,
                padding:
                  '8px 10px',
                background:
                  '#f9fafb',
                borderRadius: 8,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color:
                    '#9ca3af',
                  marginBottom: 2,
                }}
              >
                Followers
              </div>

              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color:
                    '#111827',
                }}
              >
                {profile.followers}
              </div>
            </div>
          )}

          {profile.following && (
            <div
              style={{
                flex: 1,
                padding:
                  '8px 10px',
                background:
                  '#f9fafb',
                borderRadius: 8,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color:
                    '#9ca3af',
                  marginBottom: 2,
                }}
              >
                Following
              </div>

              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color:
                    '#111827',
                }}
              >
                {profile.following}
              </div>
            </div>
          )}
        </div>

        {/* Status message */}

        {message && (
          <div
            role="status"
            style={{
              display:
                'flex',
              alignItems:
                'center',
              gap: 8,
              padding:
                '9px 11px',
              marginBottom: 10,
              borderRadius: 8,
              background:
                isSuccessMessage
                  ? '#ecfdf5'
                  : isDuplicateMessage
                    ? '#eff6ff'
                    : '#fef2f2',
              color:
                isSuccessMessage
                  ? '#047857'
                  : isDuplicateMessage
                    ? '#1d4ed8'
                    : '#b91c1c',
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            <CheckCircle
              size={14}
            />

            <span>
              {message}
            </span>
          </div>
        )}

        {/* Add / Dashboard button */}

        {!existingId ? (
          <Button
            variant="primary"
            size="md"
            onClick={
              handleAddToCRM
            }
            style={{
              width: '100%',
            }}
            icon={
              <UserPlus
                size={16}
              />
            }
          >
            Add to CRM
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="md"
            onClick={
              openDashboard
            }
            style={{
              width: '100%',
            }}
          >
            <CheckCircle
              size={16}
            />
            In CRM — View Dashboard
          </Button>
        )}
      </div>

      {/* CRM Capture Panel */}

      {showCapturePanel && (
        <CrmCapturePanel
          profile={
            captureProfile
          }
          onClose={
            handleCapturePanelClose
          }
          onSaved={
            handleCapturePanelSaved
          }
        />
      )}
    </>
  );
};

/* =========================================================
   MESSAGE LISTENER
   ========================================================= */

chrome.runtime.onMessage.addListener(
  (
    message,
    _sender,
    sendResponse
  ) => {
    if (
      message.type ===
      'GET_PROFILE_DATA'
    ) {
      let profile =
        currentProfile;

      if (
        !profile ||
        !profileMatchesCurrentUrl(
          profile
        )
      ) {
        if (
          isInstagramProfilePage()
        ) {
          const parsed =
            getParsedProfile();

          profile =
            profileMatchesCurrentUrl(
              parsed
            )
              ? parsed
              : null;
        } else {
          profile =
            null;
        }
      }

      sendResponse({
        profile,
      });

      return false;
    }

    if (
      message.type ===
      'OPEN_CRM_PANEL'
    ) {
      mountFloatingCard();

      sendResponse({
        success: true,
      });

      return false;
    }

    return false;
  }
);

/* =========================================================
   DETECTION LOOP
   ========================================================= */

function stopDetectionLoop() {
  if (checkInterval) {
    clearInterval(
      checkInterval
    );

    checkInterval =
      null;
  }
}

/*
 * IMPORTANT:
 *
 * We do NOT stop after the first successful parse.
 *
 * Instagram updates profile data in stages:
 *
 * 1. URL / username
 * 2. display name / profile image
 * 3. followers / following / posts
 * 4. bio and other details
 *
 * Therefore we keep rescanning for 10 seconds.
 */
function runDetectionLoop() {
  stopDetectionLoop();

  let attempts =
    0;

  checkInterval =
    setInterval(
      () => {
        attempts++;

        mountFloatingCard();

        if (
          attempts >= 40
        ) {
          stopDetectionLoop();

          /*
           * Navigation cycle is finished.
           */
          previousProfileBeforeNavigation =
            null;
        }
      },
      250
    );
}

/* =========================================================
   INSTAGRAM SPA NAVIGATION
   ========================================================= */

function handleNavigation() {
  const currentUrl =
    window.location.href;

  /*
   * URL changed.
   */
  if (
    currentUrl !==
    lastUrl
  ) {
    console.log(
      '[CreatorVault] Instagram URL changed:',
      {
        from:
          lastUrl,
        to:
          currentUrl,
      }
    );

    /*
     * Save the last correctly displayed profile.
     *
     * IMPORTANT:
     * Do not overwrite this while waiting for the new page.
     */
    previousProfileBeforeNavigation =
      lastRenderedProfile ||
      currentProfile;

    lastUrl =
      currentUrl;

    /*
     * Immediately invalidate old profile.
     */
    currentProfile =
      null;

    /*
     * Clear rendered fingerprint.
     */
    lastRenderedFingerprint =
      '';

    /*
     * Hide the old card immediately.
     */
    hideFloatingCard();

    if (
      isInstagramProfilePage()
    ) {
      /*
       * Start the 10-second refresh cycle.
       */
      runDetectionLoop();
    } else {
      stopDetectionLoop();

      previousProfileBeforeNavigation =
        null;
    }

    return;
  }

  /*
   * Same URL.
   */
  if (
    !isInstagramProfilePage()
  ) {
    hideFloatingCard();

    currentProfile =
      null;

    previousProfileBeforeNavigation =
      null;

    stopDetectionLoop();

    return;
  }

  /*
   * Current profile is missing.
   *
   * Try again.
   */
  if (!currentProfile) {
    mountFloatingCard();
  }
}

/* =========================================================
   URL WATCHER
   ========================================================= */

/*
 * Instagram is a SPA and normally changes the URL without
 * performing a full page reload.
 *
 * Poll the URL directly instead of trying to monkey-patch
 * history.pushState/replaceState.
 */
function startUrlWatcher() {
  if (
    urlWatchInterval
  ) {
    clearInterval(
      urlWatchInterval
    );
  }

  urlWatchInterval =
    setInterval(
      () => {
        handleNavigation();
      },
      200
    );
}

/* =========================================================
   MUTATION OBSERVER
   ========================================================= */

const observer =
  new MutationObserver(
    () => {
      handleNavigation();
    }
  );

observer.observe(
  document.body,
  {
    childList: true,
    subtree: true,
  }
);

/* =========================================================
   HISTORY / BACK BUTTON
   ========================================================= */

window.addEventListener(
  'popstate',
  handleNavigation
);

window.addEventListener(
  'hashchange',
  handleNavigation
);

/* =========================================================
   INITIAL LOAD
   ========================================================= */

startUrlWatcher();

runDetectionLoop();

export {};