// CreatorVault — CRM Capture Panel
//
// The main influencer save form injected into Instagram profile pages.

import React from 'react';

import {
  X,
  CheckCircle,
  Loader2,
  ExternalLink,
  AlertCircle,
  Edit3,
} from 'lucide-react';

import type {
  ParsedInstagramProfile,
  InfluencerStatus,
} from '../models/influencer';

import { ALL_STATUSES } from '../models/influencer';

import {
  createInfluencerFromParsed,
  findExistingInfluencer,
  updateInfluencer,
} from '../services/influencerService';

import { Avatar } from '../components/Avatar';

import {
  TagPill,
} from '../components/Badge';

import { Button } from '../components/Button';

/* =========================================================
   HELPERS
   ========================================================= */

const QUICK_TAGS = [
  'Fashion',
  'Beauty',
  'Fitness',
  'Travel',
  'Food',
  'Tech',
  'Lifestyle',
  'Gaming',
  'UGC',
];

/**
 * Normalize text without destroying line breaks.
 */
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

/**
 * Instagram sometimes exposes a generic SEO description.
 * Never save that text as the biography.
 */
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
      'instagram photos and videos from'
    )
  );
}

/**
 * Clean a biography value.
 */
function cleanBio(
  value:
    | string
    | null
    | undefined,
  username?: string | null,
  displayName?: string | null
): string | null {
  if (!value) {
    return null;
  }

  const text =
    value
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
      .replace(/\u00a0/g, ' ')
      .trim();

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

  const usernameText =
    normalizeText(
      username
    )
      .replace(/^@/, '')
      .toLowerCase();

  const displayNameText =
    normalizeText(
      displayName
    ).toLowerCase();

  const lower =
    text.toLowerCase();

  if (
    usernameText &&
    (
      lower ===
        usernameText ||
      lower ===
        `@${usernameText}`
    )
  ) {
    return null;
  }

  if (
    displayNameText &&
    lower ===
      displayNameText
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
      'edit profile',
      'share profile',
      'about this account',
      'similar accounts',
      'suggested for you',
      'view translation',
      'translation',
    ]);

  if (
    blocked.has(lower)
  ) {
    return null;
  }

  /*
   * Reject statistics-only text.
   */
  if (
    /^\d[\d,.\sKMBkmb]*$/.test(
      text
    )
  ) {
    return null;
  }

  if (
    /\b\d[\d,.\sKMBkmb]*\s+followers\b/i.test(
      text
    ) &&
    /\b\d[\d,.\sKMBkmb]*\s+following\b/i.test(
      text
    )
  ) {
    return null;
  }

  if (
    /\b\d[\d,.\sKMBkmb]*\s+posts?\b/i.test(
      text
    ) &&
    /\b\d[\d,.\sKMBkmb]*\s+followers?\b/i.test(
      text
    )
  ) {
    return null;
  }

  /*
   * Avoid tiny placeholder-like strings.
   */
  const lettersOnly =
    text.replace(
      /[^A-Za-z]/g,
      ''
    );

  const meaningful =
    text.replace(
      /[\s_\\-•·.]/g,
      ''
    );

  if (
    lettersOnly.length <= 2 &&
    meaningful.length <= 8
  ) {
    return null;
  }

  if (
    text.length > 1000
  ) {
    return null;
  }

  return text;
}

/**
 * Build the final profile used by this panel.
 *
 * IMPORTANT:
 * We deliberately do not scrape Instagram again here.
 * The parser/index.tsx pipeline is the single source of truth.
 */
function buildFreshProfile(
  profile:
    ParsedInstagramProfile
): ParsedInstagramProfile {
  const finalBio =
    cleanBio(
      profile.bio,
      profile.username,
      profile.displayName
    );

  const finalProfile:
    ParsedInstagramProfile =
    {
      ...profile,
      bio:
        finalBio,
    };

  console.log(
    '[CreatorVault] Capture panel profile:',
    finalProfile
  );

  return finalProfile;
}

/* =========================================================
   TAG SELECTOR
   ========================================================= */

interface QuickTagSelectorProps {
  tags: string[];
  onChange: (
    tags: string[]
  ) => void;
}

const QuickTagSelector:
  React.FC<
    QuickTagSelectorProps
  > = ({
    tags,
    onChange,
  }) => {
    const [
      customInput,
      setCustomInput,
    ] =
      React.useState('');

    const toggleTag = (
      tag: string
    ) => {
      if (
        tags.includes(tag)
      ) {
        onChange(
          tags.filter(
            (item) =>
              item !== tag
          )
        );
      } else {
        onChange([
          ...tags,
          tag,
        ]);
      }
    };

    const addCustom = () => {
      const trimmed =
        customInput.trim();

      if (
        trimmed &&
        !tags.includes(
          trimmed
        )
      ) {
        onChange([
          ...tags,
          trimmed,
        ]);

        setCustomInput(
          ''
        );
      }
    };

    return (
      <div
        style={{
          display:
            'flex',
          flexDirection:
            'column',
          gap:
            8,
        }}
      >
        <div
          style={{
            display:
              'flex',
            flexWrap:
              'wrap',
            gap:
              6,
          }}
        >
          {QUICK_TAGS.map(
            (tag) => (
              <button
                key={
                  tag
                }
                type="button"
                onClick={() =>
                  toggleTag(
                    tag
                  )
                }
                style={{
                  padding:
                    '4px 10px',
                  borderRadius:
                    9999,
                  fontSize:
                    12,
                  fontWeight:
                    500,
                  border:
                    tags.includes(
                      tag
                    )
                      ? '1.5px solid #4a5af0'
                      : '1.5px solid #e5e7eb',
                  background:
                    tags.includes(
                      tag
                    )
                      ? '#e0eaff'
                      : '#fff',
                  color:
                    tags.includes(
                      tag
                    )
                      ? '#4a5af0'
                      : '#4b5563',
                  cursor:
                    'pointer',
                  fontFamily:
                    'inherit',
                }}
              >
                {tag}
              </button>
            )
          )}
        </div>

        <div
          style={{
            display:
              'flex',
            gap:
              6,
          }}
        >
          <input
            type="text"
            value={
              customInput
            }
            onChange={(
              e
            ) =>
              setCustomInput(
                e.target
                  .value
              )
            }
            onKeyDown={(
              e
            ) => {
              if (
                e.key ===
                'Enter'
              ) {
                e.preventDefault();

                addCustom();
              }
            }}
            placeholder="Custom tag..."
            style={{
              flex:
                1,
              padding:
                '6px 10px',
              border:
                '1px solid #e5e7eb',
              borderRadius:
                6,
              fontSize:
                12,
              outline:
                'none',
              fontFamily:
                'inherit',
              color:
                '#111827',
              background:
                '#fff',
            }}
          />

          <button
            type="button"
            onClick={
              addCustom
            }
            disabled={
              !customInput.trim()
            }
            style={{
              padding:
                '6px 12px',
              background:
                '#4a5af0',
              color:
                '#fff',
              border:
                'none',
              borderRadius:
                6,
              fontSize:
                12,
              fontWeight:
                500,
              cursor:
                customInput.trim()
                  ? 'pointer'
                  : 'not-allowed',
              opacity:
                customInput.trim()
                  ? 1
                  : 0.5,
              fontFamily:
                'inherit',
            }}
          >
            Add
          </button>
        </div>

        {tags.length >
          0 && (
          <div
            style={{
              display:
                'flex',
              flexWrap:
                'wrap',
              gap:
                6,
            }}
          >
            {tags.map(
              (tag) => (
                <TagPill
                  key={
                    tag
                  }
                  label={
                    tag
                  }
                  onRemove={() =>
                    toggleTag(
                      tag
                    )
                  }
                />
              )
            )}
          </div>
        )}
      </div>
    );
  };

/* =========================================================
   FIELD ROW
   ========================================================= */

const FieldRow:
  React.FC<{
    label: string;
    value:
      | string
      | null
      | undefined;
  }> = ({
    label,
    value,
  }) => (
    <div
      style={{
        display:
          'flex',
        gap:
          12,
        fontSize:
          13,
      }}
    >
      <span
        style={{
          color:
            '#9ca3af',
          fontWeight:
            500,
          minWidth:
            80,
          flexShrink:
            0,
        }}
      >
        {label}
      </span>

      <span
        style={{
          color:
            value
              ? '#111827'
              : '#d1d5db',
          fontStyle:
            value
              ? 'normal'
              : 'italic',
          flex:
            1,
          wordBreak:
            'break-word',
          whiteSpace:
            label === 'Bio'
              ? 'pre-line'
              : 'normal',
          lineHeight:
            1.4,
        }}
      >
        {value ||
          'Not available'}
      </span>
    </div>
  );

/* =========================================================
   MAIN PANEL
   ========================================================= */

type PanelState =
  | 'preview'
  | 'saving'
  | 'success'
  | 'duplicate'
  | 'error';

interface CrmCapturePanelProps {
  profile:
    ParsedInstagramProfile;

  onClose:
    () => void;

  onSaved:
    () => void;
}

export const CrmCapturePanel:
  React.FC<
    CrmCapturePanelProps
  > = ({
    profile,
    onClose,
    onSaved,
  }) => {
    const [
      freshProfile,
      setFreshProfile,
    ] =
      React.useState<
        ParsedInstagramProfile
      >(() =>
        buildFreshProfile(
          profile
        )
      );

    const [
      panelState,
      setPanelState,
    ] =
      React.useState<PanelState>(
        'preview'
      );

    const [
      tags,
      setTags,
    ] =
      React.useState<
        string[]
      >([]);

    const [
      notes,
      setNotes,
    ] =
      React.useState('');

    const [
      status,
      setStatus,
    ] =
      React.useState<
        InfluencerStatus
      >('New');

    const [
      errorMessage,
      setErrorMessage,
    ] =
      React.useState('');

    const [
      existingId,
      setExistingId,
    ] =
      React.useState<
        string | null
      >(null);

    /*
     * Sync when the profile changes.
     */
    React.useEffect(
      () => {
        const refreshed =
          buildFreshProfile(
            profile
          );

        setFreshProfile(
          refreshed
        );

        setErrorMessage(
          ''
        );

        setExistingId(
          null
        );

        setPanelState(
          'preview'
        );

        setTags(
          []
        );

        setNotes(
          ''
        );

        setStatus(
          'New'
        );
      },
      [
        profile.username,
        profile.displayName,
        profile.bio,
        profile.followers,
        profile.following,
        profile.posts,
        profile.profileUrl,
      ]
    );

    /*
     * Check whether this creator already exists.
     *
     * This check happens BEFORE save so the user gets a clear
     * duplicate message instead of a generic save success.
     */
    React.useEffect(
      () => {
        let cancelled =
          false;

        if (
          !freshProfile.username
        ) {
          return;
        }

        findExistingInfluencer(
          freshProfile.username
        )
          .then(
            (
              existing
            ) => {
              if (
                cancelled
              ) {
                return;
              }

              if (
                existing
              ) {
                console.log(
                  '[CreatorVault] Duplicate influencer detected:',
                  existing
                );

                setExistingId(
                  existing.id
                );

                setTags(
                  existing.tags ||
                    []
                );

                setNotes(
                  existing.notes ||
                    ''
                );

                setStatus(
                  existing.status
                );

                /*
                 * IMPORTANT:
                 *
                 * Show a dedicated duplicate state.
                 */
                setPanelState(
                  'duplicate'
                );
              } else {
                /*
                 * No existing record.
                 */
                setExistingId(
                  null
                );

                setPanelState(
                  'preview'
                );
              }
            }
          )
          .catch(
            (error) => {
              console.error(
                '[CreatorVault] Duplicate check failed:',
                error
              );
            }
          );

        return () => {
          cancelled =
            true;
        };
      },
      [
        freshProfile.username,
      ]
    );

    /*
     * Always use the raw follower value first.
     */
    const followersDisplay =
      freshProfile.followers?.trim() ||
      (
        freshProfile.followersNumeric !==
          null &&
        freshProfile.followersNumeric !==
          undefined
      )
        ? freshProfile.followers?.trim() ||
          freshProfile.followersNumeric!.toLocaleString(
            'en-US'
          )
        : null;

    /* =========================================================
       SAVE
       ========================================================= */

    const handleSave =
      async () => {
        setErrorMessage(
          ''
        );

        /*
         * Final duplicate check immediately before creating.
         *
         * This protects against two save attempts that happen
         * before the first storage update finishes.
         */
        try {
          if (
            freshProfile.username
          ) {
            const existing =
              await findExistingInfluencer(
                freshProfile.username
              );

            if (
              existing
            ) {
              console.log(
                '[CreatorVault] Duplicate prevented before create:',
                existing
              );

              setExistingId(
                existing.id
              );

              setTags(
                existing.tags ||
                  []
              );

              setNotes(
                existing.notes ||
                  ''
              );

              setStatus(
                existing.status
              );

              setPanelState(
                'duplicate'
              );

              return;
            }
          }
        } catch (error) {
          console.error(
            '[CreatorVault] Final duplicate check failed:',
            error
          );
        }

        setPanelState(
          'saving'
        );

        try {
          const profileToSave =
            buildFreshProfile(
              freshProfile
            );

          console.log(
            '[CreatorVault] Saving profile:',
            profileToSave
          );

          await createInfluencerFromParsed(
            profileToSave,
            {
              tags,
              notes,
              status,
            }
          );

          setFreshProfile(
            profileToSave
          );

          setPanelState(
            'success'
          );

          window.setTimeout(
            () => {
              onSaved();
            },
            1500
          );
        } catch (
          err
        ) {
          const message =
            err instanceof Error
              ? err.message
              : 'Unknown error';

          console.error(
            '[CreatorVault] Save failed:',
            err
          );

          /*
           * Service-level duplicate protection.
           */
          if (
            message.startsWith(
              'DUPLICATE:'
            )
          ) {
            const duplicateId =
              message
                .split(
                  ':'
                )[1]
                ?.trim();

            setExistingId(
              duplicateId ||
                null
            );

            setPanelState(
              'duplicate'
            );

            return;
          }

          setErrorMessage(
            message ||
              'Failed to save creator. Please try again.'
          );

          setPanelState(
            'error'
          );
        }
      };

    /* =========================================================
       UPDATE EXISTING RECORD
       ========================================================= */

    const handleUpdate =
      async () => {
        /*
         * We keep update available only if an existing record was
         * intentionally identified.
         */
        if (
          !existingId
        ) {
          return;
        }

        setErrorMessage(
          ''
        );

        setPanelState(
          'saving'
        );

        try {
          await updateInfluencer(
            existingId,
            {
              tags,
              notes,
              status,
            }
          );

          setPanelState(
            'success'
          );

          window.setTimeout(
            () => {
              onSaved();
            },
            1500
          );
        } catch (
          error
        ) {
          console.error(
            '[CreatorVault] Failed to update creator:',
            error
          );

          setErrorMessage(
            'Failed to update creator record.'
          );

          setPanelState(
            'error'
          );
        }
      };

    const openDashboard =
      () => {
        chrome.runtime.sendMessage(
          {
            type:
              'OPEN_DASHBOARD',
          }
        );

        onClose();
      };

    return (
      <div
        id="creatorvault-panel-overlay"
        style={{
          position:
            'fixed',
          inset:
            0,
          zIndex:
            2147483647,
          display:
            'flex',
          alignItems:
            'center',
          justifyContent:
            'center',
          padding:
            16,
          background:
            'rgba(0,0,0,0.5)',
          pointerEvents:
            'auto',
        }}
        onClick={(
          e
        ) => {
          if (
            e.target ===
            e.currentTarget
          ) {
            onClose();
          }
        }}
      >
        <div
          id="creatorvault-panel"
          style={{
            position:
              'relative',
            width:
              '100%',
            maxWidth:
              460,
            maxHeight:
              '90vh',
            overflowY:
              'auto',
            background:
              '#ffffff',
            borderRadius:
              16,
            boxShadow:
              '0 24px 60px rgba(0,0,0,0.25)',
            pointerEvents:
              'auto',
            zIndex:
              2147483647,
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
              justifyContent:
                'space-between',
              padding:
                '16px 20px 14px',
              borderBottom:
                '1px solid #f3f4f6',
            }}
          >
            <div
              style={{
                display:
                  'flex',
                alignItems:
                  'center',
                gap:
                  8,
              }}
            >
              <div
                style={{
                  width:
                    28,
                  height:
                    28,
                  background:
                    'linear-gradient(135deg, #4a5af0 0%, #7c3aed 100%)',
                  borderRadius:
                    7,
                  display:
                    'flex',
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M12 2L2 7l10 5 10-5-10-5z"
                    fill="white"
                    fillOpacity="0.9"
                  />

                  <path
                    d="M2 17l10 5 10-5M2 12l10 5 10-5"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <div>
                <div
                  style={{
                    fontSize:
                      14,
                    fontWeight:
                      700,
                    color:
                      '#111827',
                  }}
                >
                  CreatorVault
                </div>

                <div
                  style={{
                    fontSize:
                      11,
                    color:
                      '#9ca3af',
                  }}
                >
                  {panelState ===
                  'duplicate'
                    ? 'Duplicate detected'
                    : 'Add to CRM'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={
                onClose
              }
              aria-label="Close panel"
              style={{
                display:
                  'flex',
                alignItems:
                  'center',
                justifyContent:
                  'center',
                width:
                  30,
                height:
                  30,
                borderRadius:
                  8,
                background:
                  '#f3f4f6',
                border:
                  'none',
                cursor:
                  'pointer',
                color:
                  '#6b7280',
                pointerEvents:
                  'auto',
              }}
            >
              <X
                size={
                  16
                }
              />
            </button>
          </div>

          {/* Content */}

          <div
            style={{
              padding:
                20,
            }}
          >
            {/* SUCCESS */}

            {panelState ===
              'success' && (
              <div
                style={{
                  display:
                    'flex',
                  flexDirection:
                    'column',
                  alignItems:
                    'center',
                  textAlign:
                    'center',
                  gap:
                    12,
                  padding:
                    '16px 0',
                }}
              >
                <div
                  style={{
                    width:
                      56,
                    height:
                      56,
                    borderRadius:
                      '50%',
                    background:
                      '#d1fae5',
                    display:
                      'flex',
                    alignItems:
                      'center',
                    justifyContent:
                      'center',
                  }}
                >
                  <CheckCircle
                    size={
                      28
                    }
                    color="#059669"
                  />
                </div>

                <div>
                  <div
                    style={{
                      fontSize:
                        16,
                      fontWeight:
                        700,
                      color:
                        '#111827',
                      marginBottom:
                        4,
                    }}
                  >
                    Creator saved!
                  </div>

                  <div
                    style={{
                      fontSize:
                        13,
                      color:
                        '#6b7280',
                    }}
                  >
                    {freshProfile.displayName ??
                      freshProfile.username}{' '}
                    has been
                    added to your
                    CRM.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={
                    openDashboard
                  }
                  style={{
                    fontSize:
                      12,
                    color:
                      '#4a5af0',
                    background:
                      'none',
                    border:
                      'none',
                    cursor:
                      'pointer',
                    textDecoration:
                      'underline',
                    fontFamily:
                      'inherit',
                  }}
                >
                  Open CRM Dashboard →
                </button>
              </div>
            )}

            {/* SAVING */}

            {panelState ===
              'saving' && (
              <div
                style={{
                  display:
                    'flex',
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                  gap:
                    10,
                  padding:
                    '24px 0',
                  color:
                    '#6b7280',
                  fontSize:
                    13,
                }}
              >
                <Loader2
                  size={
                    18
                  }
                  style={{
                    animation:
                      'cv-spin 1s linear infinite',
                  }}
                />

                Saving creator...
              </div>
            )}

            {/* ERROR */}

            {panelState ===
              'error' && (
              <div
                style={{
                  display:
                    'flex',
                  flexDirection:
                    'column',
                  gap:
                    16,
                }}
              >
                <div
                  style={{
                    display:
                      'flex',
                    gap:
                      10,
                    padding:
                      '12px 14px',
                    background:
                      '#fee2e2',
                    borderRadius:
                      10,
                    alignItems:
                      'flex-start',
                  }}
                >
                  <AlertCircle
                    size={
                      16
                    }
                    color="#dc2626"
                  />

                  <div>
                    <div
                      style={{
                        fontSize:
                          13,
                        fontWeight:
                          600,
                        color:
                          '#991b1b',
                        marginBottom:
                          2,
                      }}
                    >
                      Unable to save
                    </div>

                    <div
                      style={{
                        fontSize:
                          12,
                        color:
                          '#b91c1c',
                      }}
                    >
                      {
                        errorMessage
                      }
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display:
                      'flex',
                    gap:
                      8,
                    justifyContent:
                      'flex-end',
                  }}
                >
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={
                      onClose
                    }
                  >
                    Cancel
                  </Button>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setErrorMessage(
                        ''
                      );

                      setPanelState(
                        'preview'
                      );
                    }}
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            )}

            {/* DUPLICATE */}

            {panelState ===
              'duplicate' && (
              <div
                style={{
                  display:
                    'flex',
                  flexDirection:
                    'column',
                  gap:
                    16,
                }}
              >
                {/* Clear duplicate message */}

                <div
                  style={{
                    display:
                      'flex',
                    gap:
                      10,
                    padding:
                      '14px 16px',
                    background:
                      '#fff7ed',
                    border:
                      '1px solid #fed7aa',
                    borderRadius:
                      10,
                    alignItems:
                      'flex-start',
                  }}
                >
                  <AlertCircle
                    size={
                      18
                    }
                    color="#ea580c"
                    style={{
                      flexShrink:
                        0,
                      marginTop:
                        1,
                    }}
                  />

                  <div>
                    <div
                      style={{
                        fontSize:
                          14,
                        fontWeight:
                          700,
                        color:
                          '#9a3412',
                        marginBottom:
                          4,
                      }}
                    >
                      Duplicate detected
                    </div>

                    <div
                      style={{
                        fontSize:
                          12,
                        lineHeight:
                          1.5,
                        color:
                          '#c2410c',
                      }}
                    >
                      This influencer is
                      already in your
                      CRM. A second
                      record was not
                      created.
                    </div>
                  </div>
                </div>

                <ProfilePreview
                  profile={
                    freshProfile
                  }
                  followersDisplay={
                    followersDisplay
                  }
                />

                {/* Existing record information */}

                <div
                  style={{
                    background:
                      '#f9fafb',
                    border:
                      '1px solid #e5e7eb',
                    borderRadius:
                      10,
                    padding:
                      '12px 14px',
                  }}
                >
                  <div
                    style={{
                      fontSize:
                        12,
                      fontWeight:
                        600,
                      color:
                        '#374151',
                      marginBottom:
                        6,
                    }}
                  >
                    Existing CRM record
                  </div>

                  <div
                    style={{
                      fontSize:
                        12,
                      color:
                        '#6b7280',
                    }}
                  >
                    @{freshProfile.username}
                    {existingId
                      ? ` • Record ID: ${existingId}`
                      : ''}
                  </div>
                </div>

                <div
                  style={{
                    display:
                      'flex',
                    gap:
                      8,
                  }}
                >
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={
                      onClose
                    }
                    style={{
                      flex:
                        1,
                    }}
                  >
                    Close
                  </Button>

                  <Button
                    variant="primary"
                    size="md"
                    onClick={
                      openDashboard
                    }
                    style={{
                      flex:
                        2,
                    }}
                  >
                    View Existing Record
                  </Button>
                </div>
              </div>
            )}

            {/* PREVIEW */}

            {panelState ===
              'preview' && (
              <div
                style={{
                  display:
                    'flex',
                  flexDirection:
                    'column',
                  gap:
                    16,
                }}
              >
                <ProfilePreview
                  profile={
                    freshProfile
                  }
                  followersDisplay={
                    followersDisplay
                  }
                />

                <EditableFields
                  tags={
                    tags
                  }
                  setTags={
                    setTags
                  }
                  notes={
                    notes
                  }
                  setNotes={
                    setNotes
                  }
                  status={
                    status
                  }
                  setStatus={
                    setStatus
                  }
                />

                <div
                  style={{
                    display:
                      'flex',
                    gap:
                      8,
                    marginTop:
                      4,
                  }}
                >
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={
                      onClose
                    }
                    style={{
                      flex:
                        1,
                    }}
                  >
                    Cancel
                  </Button>

                  <Button
                    variant="primary"
                    size="md"
                    onClick={
                      handleSave
                    }
                    style={{
                      flex:
                        2,
                    }}
                  >
                    Save to CRM
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

/* =========================================================
   PROFILE PREVIEW
   ========================================================= */

const ProfilePreview:
  React.FC<{
    profile:
      ParsedInstagramProfile;

    followersDisplay:
      | string
      | null;
  }> = ({
    profile,
    followersDisplay,
  }) => (
    <div
      style={{
        background:
          '#f9fafb',
        border:
          '1px solid #f3f4f6',
        borderRadius:
          12,
        overflow:
          'hidden',
      }}
    >
      <div
        style={{
          display:
            'flex',
          alignItems:
            'center',
          gap:
            12,
          padding:
            '14px 16px 12px',
        }}
      >
        <Avatar
          imageUrl={
            profile.profileImage
          }
          name={
            profile.displayName ??
            profile.username ??
            'Unknown'
          }
          username={
            profile.username ??
            'unknown'
          }
          size={
            46
          }
        />

        <div
          style={{
            flex:
              1,
            minWidth:
              0,
          }}
        >
          <div
            style={{
              display:
                'flex',
              alignItems:
                'center',
              gap:
                6,
            }}
          >
            <span
              style={{
                fontSize:
                  15,
                fontWeight:
                  700,
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
              {profile.displayName ??
                profile.username ??
                'Unknown Creator'}
            </span>

            {profile.verified && (
              <span
                style={{
                  fontSize:
                    11,
                  background:
                    '#e0eaff',
                  color:
                    '#4a5af0',
                  padding:
                    '1px 6px',
                  borderRadius:
                    9999,
                  fontWeight:
                    600,
                  flexShrink:
                    0,
                }}
              >
                ✓ Verified
              </span>
            )}
          </div>

          <div
            style={{
              fontSize:
                13,
              color:
                '#6b7280',
              marginTop:
                1,
            }}
          >
            @{profile.username ??
              'unknown'}
          </div>

          {followersDisplay && (
            <div
              style={{
                fontSize:
                  12,
                color:
                  '#4b5563',
                marginTop:
                  2,
                fontWeight:
                  500,
              }}
            >
              {followersDisplay}{' '}
              followers
            </div>
          )}
        </div>

        {profile.profileUrl && (
          <a
            href={
              profile.profileUrl
            }
            target="_blank"
            rel="noopener noreferrer"
            title="Open Instagram profile"
            style={{
              color:
                '#9ca3af',
              display:
                'flex',
              flexShrink:
                0,
              padding:
                4,
            }}
          >
            <ExternalLink
              size={
                14
              }
            />
          </a>
        )}
      </div>

      <div
        style={{
          borderTop:
            '1px solid #f3f4f6',
          padding:
            '12px 16px',
          display:
            'flex',
          flexDirection:
            'column',
          gap:
            8,
        }}
      >
        <FieldRow
          label="Bio"
          value={
            profile.bio
          }
        />

        <FieldRow
          label="Followers"
          value={
            followersDisplay
          }
        />

        <FieldRow
          label="Following"
          value={
            profile.following
          }
        />

        <FieldRow
          label="Posts"
          value={
            profile.posts
          }
        />

        {profile.category && (
          <FieldRow
            label="Category"
            value={
              profile.category
            }
          />
        )}
      </div>
    </div>
  );

/* =========================================================
   EDITABLE FIELDS
   ========================================================= */

const EditableFields:
  React.FC<{
    tags: string[];

    setTags: (
      tags: string[]
    ) => void;

    notes: string;

    setNotes: (
      notes: string
    ) => void;

    status:
      InfluencerStatus;

    setStatus: (
      status:
        InfluencerStatus
    ) => void;
  }> = ({
    tags,
    setTags,
    notes,
    setNotes,
    status,
    setStatus,
  }) => (
    <div
      style={{
        display:
          'flex',
        flexDirection:
          'column',
        gap:
          14,
      }}
    >
      {/* Tags */}

      <div>
        <label
          style={{
            display:
              'block',
            fontSize:
              12,
            fontWeight:
              600,
            color:
              '#374151',
            marginBottom:
              6,
          }}
        >
          Tags
        </label>

        <QuickTagSelector
          tags={
            tags
          }
          onChange={
            setTags
          }
        />
      </div>

      {/* Notes */}

      <div>
        <label
          style={{
            display:
              'block',
            fontSize:
              12,
            fontWeight:
              600,
            color:
              '#374151',
            marginBottom:
              6,
          }}
        >
          Notes
        </label>

        <textarea
          value={
            notes
          }
          onChange={(
            e
          ) =>
            setNotes(
              e.target
                .value
            )
          }
          placeholder="e.g. Great fit for skincare campaign in Q1..."
          rows={3}
          style={{
            width:
              '100%',
            padding:
              '8px 10px',
            border:
              '1px solid #e5e7eb',
            borderRadius:
              8,
            fontSize:
              12,
            outline:
              'none',
            resize:
              'vertical',
            fontFamily:
              'inherit',
            color:
              '#111827',
            lineHeight:
              1.5,
            background:
              '#fff',
            boxSizing:
              'border-box',
          }}
        />
      </div>

      {/* Pipeline Status */}

      <div>
        <label
          style={{
            display:
              'block',
            fontSize:
              12,
            fontWeight:
              600,
            color:
              '#374151',
            marginBottom:
              6,
          }}
        >
          Pipeline Status
        </label>

        <select
          value={
            status
          }
          onChange={(
            e
          ) =>
            setStatus(
              e.target
                .value as
                InfluencerStatus
            )
          }
          style={{
            width:
              '100%',
            padding:
              '8px 10px',
            border:
              '1px solid #e5e7eb',
            borderRadius:
              8,
            fontSize:
              12,
            outline:
              'none',
            background:
              '#fff',
            color:
              '#111827',
            cursor:
              'pointer',
            fontFamily:
              'inherit',
            boxSizing:
              'border-box',
          }}
        >
          {ALL_STATUSES.map(
            (
              item
            ) => (
              <option
                key={
                  item
                }
                value={
                  item
                }
              >
                {item}
              </option>
            )
          )}
        </select>
      </div>
    </div>
  );