// CreatorVault — Dashboard

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
} from 'react';

import {
  Search,
  Download,
  Trash2,
  ExternalLink,
  Edit3,
  Users,
  Camera,
  LayoutDashboard,
  Settings,
  Star,
  Loader2,
  FolderKanban,
  CheckCircle,
  X,
} from 'lucide-react';

import type {
  Influencer,
  InfluencerStatus,
} from '../models/influencer';

import {
  ALL_STATUSES,
  STATUS_CONFIG,
} from '../models/influencer';

import { crmStorage } from '../storage/crmStorage';

import {
  downloadCsv,
  updateInfluencer,
  toggleFavorite,
} from '../services/influencerService';

import { Avatar } from '../components/Avatar';

import {
  StatusBadge,
  TagPill,
} from '../components/Badge';

import { Button } from '../components/Button';

import { ConfirmDialog } from '../components/ConfirmDialog';

import {
  ToastContainer,
  useToast,
} from '../components/Toast';

import { InfluencerDetailModal } from './InfluencerDetailModal';

import { InfluencerEditModal } from './InfluencerEditModal';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatFollowers(
  raw: string | null,
  numeric: number | null
): string {
  if (raw && raw.trim()) {
    return raw.trim();
  }

  if (
    numeric !== null &&
    numeric !== undefined
  ) {
    return numeric.toLocaleString('en-US');
  }

  return '—';
}

function formatDate(
  iso: string
): string {
  const date =
    new Date(iso);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '—';
  }

  return date.toLocaleDateString(
    'en-US',
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }
  );
}

function normalizeStatus(
  status:
    | InfluencerStatus
    | null
    | undefined
): InfluencerStatus {
  if (
    status &&
    (
      ALL_STATUSES as readonly string[]
    ).includes(status)
  ) {
    return status;
  }

  return 'New';
}

function normalizeSearchText(
  value:
    | string
    | null
    | undefined
): string {
  return (
    value || ''
  )
    .toString()
    .trim()
    .toLowerCase();
}

// ─── Dashboard ─────────────────────────────────────────────────────────────

export const DashboardApp:
  React.FC = () => {
  const [
    activeTab,
    setActiveTab,
  ] = useState<
    | 'overview'
    | 'creators'
    | 'favorites'
    | 'pipeline'
    | 'settings'
  >('overview');

  const [
    influencers,
    setInfluencers,
  ] = useState<
    Influencer[]
  >([]);

  const [
    metrics,
    setMetrics,
  ] = useState({
    total: 0,
    byStatus:
      {} as Record<
        string,
        number
      >,
    totalFollowers: 0,
    recentlyAdded: 0,
  });

  const [
    loading,
    setLoading,
  ] = useState(true);

  // Existing Creators / Pipeline search
  const [
    searchQuery,
    setSearchQuery,
  ] = useState('');

  // Overview-specific filters and sorting
  const [
    overviewSearch,
    setOverviewSearch,
  ] = useState('');

  const [
    overviewStatusFilter,
    setOverviewStatusFilter,
  ] = useState<
    'all' | InfluencerStatus
  >('all');

  const [
    overviewFavoriteFilter,
    setOverviewFavoriteFilter,
  ] = useState<
    'all' | 'favorites'
  >('all');

  const [
    overviewSortBy,
    setOverviewSortBy,
  ] = useState<
    'recent' |
    'name' |
    'followers'
  >('recent');

  const [
    overviewSortOrder,
    setOverviewSortOrder,
  ] = useState<
    'asc' | 'desc'
  >('desc');

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<
    'all' | InfluencerStatus
  >('all');

  const [
    selectedInf,
    setSelectedInf,
  ] =
    useState<Influencer | null>(
      null
    );

  const [
    editInf,
    setEditInf,
  ] =
    useState<Influencer | null>(
      null
    );

  const [
    deleteId,
    setDeleteId,
  ] =
    useState<string | null>(
      null
    );

  const [
    updatingStatusId,
    setUpdatingStatusId,
  ] =
    useState<string | null>(
      null
    );

  const {
    toasts,
    addToast,
    dismissToast,
  } = useToast();

  // ─── Load CRM data ───────────────────────────────────────────────────────

  const loadData =
    useCallback(
      async () => {
        try {
          setLoading(
            true
          );

          const [
            allInfluencers,
            metricsData,
          ] =
            await Promise.all([
              crmStorage.getInfluencers(),
              crmStorage.getMetrics(),
            ]);

          setInfluencers(
            Array.isArray(
              allInfluencers
            )
              ? allInfluencers
              : []
          );

          setMetrics(
            metricsData
          );
        } catch (err) {
          console.error(
            '[CreatorVault] Failed to load CRM data:',
            err
          );

          addToast(
            'Failed to load CRM data.',
            'error'
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [addToast]
    );

  useEffect(() => {
    void loadData();

    const unsub =
      crmStorage.onChanged(
        () => {
          void loadData();
        }
      );

    return unsub;
  }, [loadData]);

  // ─── Creators / Favorites filtering ─────────────────────────────────────

  const filteredCreators =
    useMemo(() => {
      const query =
        searchQuery
          .trim()
          .toLowerCase();

      let result =
        [...influencers];

      if (
        activeTab ===
        'favorites'
      ) {
        result =
          result.filter(
            (inf) =>
              Boolean(
                inf.favorite
              )
          );
      }

      if (
        statusFilter !==
        'all'
      ) {
        result =
          result.filter(
            (inf) =>
              normalizeStatus(
                inf.status
              ) ===
              statusFilter
          );
      }

      if (query) {
        result =
          result.filter(
            (inf) => {
              const name =
                normalizeSearchText(
                  inf.displayName
                );

              const username =
                normalizeSearchText(
                  inf.username
                );

              const usernameWithoutAt =
                username.replace(
                  /^@/,
                  ''
                );

              const bio =
                normalizeSearchText(
                  inf.bio
                );

              const tags =
                (
                  inf.tags ??
                  []
                )
                  .map(
                    (tag) =>
                      normalizeSearchText(
                        tag
                      )
                  )
                  .join(
                    ' '
                  );

              const status =
                normalizeSearchText(
                  normalizeStatus(
                    inf.status
                  )
                );

              const profileUrl =
                normalizeSearchText(
                  inf.profileUrl
                );

              const followers =
                normalizeSearchText(
                  formatFollowers(
                    inf.followers,
                    inf.followersNumeric
                  )
                );

              return (
                name.includes(
                  query
                ) ||
                username.includes(
                  query
                ) ||
                usernameWithoutAt.includes(
                  query
                ) ||
                bio.includes(
                  query
                ) ||
                tags.includes(
                  query
                ) ||
                status.includes(
                  query
                ) ||
                profileUrl.includes(
                  query
                ) ||
                followers.includes(
                  query
                )
              );
            }
          );
      }

      return result;
    }, [
      influencers,
      activeTab,
      searchQuery,
      statusFilter,
    ]);

  const hasCreatorFilters =
    Boolean(
      searchQuery.trim()
    ) ||
    statusFilter !==
      'all';

  const clearCreatorFilters =
    () => {
      setSearchQuery('');
      setStatusFilter(
        'all'
      );
    };

  // ─── Recently Added ──────────────────────────────────────────────────────

  const recentlyAdded =
    useMemo(() => {
      return [
        ...influencers,
      ]
        .sort(
          (a, b) =>
            new Date(
              b.createdAt
            ).getTime() -
            new Date(
              a.createdAt
            ).getTime()
        )
        .slice(
          0,
          5
        );
    }, [influencers]);

  // ─── Overview Filter + Sort ─────────────────────────────────────────────

  const overviewFilteredCreators =
    useMemo(() => {
      const query =
        overviewSearch
          .trim()
          .toLowerCase();

      let result =
        [...influencers];

      // Search
      if (query) {
        result =
          result.filter(
            (inf) => {
              const name =
                normalizeSearchText(
                  inf.displayName
                );

              const username =
                normalizeSearchText(
                  inf.username
                );

              const usernameWithoutAt =
                username.replace(
                  /^@/,
                  ''
                );

              const bio =
                normalizeSearchText(
                  inf.bio
                );

              const tags =
                (
                  inf.tags ??
                  []
                )
                  .map(
                    (tag) =>
                      normalizeSearchText(
                        tag
                      )
                  )
                  .join(
                    ' '
                  );

              const status =
                normalizeSearchText(
                  normalizeStatus(
                    inf.status
                  )
                );

              const profileUrl =
                normalizeSearchText(
                  inf.profileUrl
                );

              const followers =
                normalizeSearchText(
                  formatFollowers(
                    inf.followers,
                    inf.followersNumeric
                  )
                );

              return (
                name.includes(
                  query
                ) ||
                username.includes(
                  query
                ) ||
                usernameWithoutAt.includes(
                  query
                ) ||
                bio.includes(
                  query
                ) ||
                tags.includes(
                  query
                ) ||
                status.includes(
                  query
                ) ||
                profileUrl.includes(
                  query
                ) ||
                followers.includes(
                  query
                )
              );
            }
          );
      }

      // Status
      if (
        overviewStatusFilter !==
        'all'
      ) {
        result =
          result.filter(
            (inf) =>
              normalizeStatus(
                inf.status
              ) ===
              overviewStatusFilter
          );
      }

      // Favorites
      if (
        overviewFavoriteFilter ===
        'favorites'
      ) {
        result =
          result.filter(
            (inf) =>
              Boolean(
                inf.favorite
              )
          );
      }

      // Sorting
      result.sort(
        (a, b) => {
          let comparison =
            0;

          if (
            overviewSortBy ===
            'name'
          ) {
            comparison =
              (
                a.displayName ??
                ''
              ).localeCompare(
                b.displayName ??
                  '',
                undefined,
                {
                  sensitivity:
                    'base',
                }
              );
          }

          if (
            overviewSortBy ===
            'followers'
          ) {
            comparison =
              (
                a.followersNumeric ??
                0
              ) -
              (
                b.followersNumeric ??
                0
              );
          }

          if (
            overviewSortBy ===
            'recent'
          ) {
            comparison =
              new Date(
                a.createdAt
              ).getTime() -
              new Date(
                b.createdAt
              ).getTime();
          }

          return overviewSortOrder ===
            'asc'
            ? comparison
            : -comparison;
        }
      );

      return result;
    }, [
      influencers,
      overviewSearch,
      overviewStatusFilter,
      overviewFavoriteFilter,
      overviewSortBy,
      overviewSortOrder,
    ]);

  const overviewHasFilters =
    Boolean(
      overviewSearch.trim()
    ) ||
    overviewStatusFilter !==
      'all' ||
    overviewFavoriteFilter !==
      'all' ||
    overviewSortBy !==
      'recent' ||
    overviewSortOrder !==
      'desc';

  const clearOverviewFilters =
    () => {
      setOverviewSearch(
        ''
      );

      setOverviewStatusFilter(
        'all'
      );

      setOverviewFavoriteFilter(
        'all'
      );

      setOverviewSortBy(
        'recent'
      );

      setOverviewSortOrder(
        'desc'
      );
    };

  // ─── Actions ─────────────────────────────────────────────────────────────

  const handleExport =
    () => {
      downloadCsv(
        influencers
      );

      addToast(
        'Export complete',
        'success'
      );
    };

  const handleToggleFavorite =
    async (
      id: string,
      e: React.MouseEvent
    ) => {
      e.stopPropagation();

      try {
        await toggleFavorite(
          id
        );

        addToast(
          'Favorite updated',
          'success'
        );

        await loadData();
      } catch (error) {
        console.error(
          error
        );

        addToast(
          'Failed to update favorite',
          'error'
        );
      }
    };

  const handleDelete =
    async () => {
      if (!deleteId) {
        return;
      }

      try {
        await crmStorage.deleteInfluencer(
          deleteId
        );

        addToast(
          'Creator removed',
          'success'
        );

        setDeleteId(
          null
        );

        if (
          selectedInf?.id ===
          deleteId
        ) {
          setSelectedInf(
            null
          );
        }

        await loadData();
      } catch (error) {
        console.error(
          error
        );

        addToast(
          'Failed to delete creator',
          'error'
        );
      }
    };

  const handlePipelineStatusChange =
    async (
      id: string,
      status: InfluencerStatus
    ) => {
      try {
        setUpdatingStatusId(
          id
        );

        await updateInfluencer(
          id,
          {
            status,
          }
        );

        addToast(
          `Status changed to ${status}`,
          'success'
        );

        await loadData();
      } catch (error) {
        console.error(
          '[CreatorVault] Failed to update pipeline status:',
          error
        );

        addToast(
          'Failed to update status',
          'error'
        );
      } finally {
        setUpdatingStatusId(
          null
        );
      }
    };

  // ─── Navigation ─────────────────────────────────────────────────────────

  const changeTab =
    (
      tab:
        | 'overview'
        | 'creators'
        | 'favorites'
        | 'pipeline'
        | 'settings'
    ) => {
      setActiveTab(
        tab
      );

      setSearchQuery(
        ''
      );

      setStatusFilter(
        'all'
      );
    };

  const renderNavItems =
    () => (
      <nav
        style={{
          display:
            'flex',
          flexDirection:
            'column',
          gap:
            4,
          marginTop:
            32,
        }}
      >
        {[
          {
            id:
              'overview',
            icon:
              LayoutDashboard,
            label:
              'Overview',
          },
          {
            id:
              'creators',
            icon:
              Users,
            label:
              'Creators',
          },
          {
            id:
              'pipeline',
            icon:
              FolderKanban,
            label:
              'Pipeline',
          },
          {
            id:
              'favorites',
            icon:
              Star,
            label:
              'Favorites',
          },
          {
            id:
              'settings',
            icon:
              Settings,
            label:
              'Settings',
          },
        ].map(
          (
            item
          ) => (
            <button
              key={
                item.id
              }
              onClick={() =>
                changeTab(
                  item.id as
                    | 'overview'
                    | 'creators'
                    | 'favorites'
                    | 'pipeline'
                    | 'settings'
                )
              }
              style={{
                display:
                  'flex',
                alignItems:
                  'center',
                gap:
                  12,
                padding:
                  '10px 16px',
                borderRadius:
                  8,
                border:
                  'none',
                background:
                  activeTab ===
                  item.id
                    ? '#eff6ff'
                    : 'transparent',
                color:
                  activeTab ===
                  item.id
                    ? '#4f46e5'
                    : '#6b7280',
                fontSize:
                  14,
                fontWeight:
                  500,
                cursor:
                  'pointer',
                transition:
                  'all 0.2s',
                textAlign:
                  'left',
              }}
            >
              <item.icon
                size={
                  18
                }
              />

              {
                item.label
              }
            </button>
          )
        )}
      </nav>
    );

  // ─── Table ──────────────────────────────────────────────────────────────

  const renderTable =
    (
      list: Influencer[]
    ) => (
      <div
        style={{
          background:
            '#fff',
          borderRadius:
            12,
          border:
            '1px solid #e5e7eb',
          overflow:
            'hidden',
          boxShadow:
            '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div
          style={{
            overflowX:
              'auto',
          }}
        >
          <table
            style={{
              width:
                '100%',
              borderCollapse:
                'collapse',
              textAlign:
                'left',
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom:
                    '1px solid #e5e7eb',
                  background:
                    '#f9fafb',
                }}
              >
                <th
                  style={{
                    padding:
                      '12px 24px',
                    fontSize:
                      12,
                    fontWeight:
                      600,
                    color:
                      '#6b7280',
                    textTransform:
                      'uppercase',
                    letterSpacing:
                      '0.05em',
                  }}
                >
                  Creator
                </th>

                <th
                  style={{
                    padding:
                      '12px 24px',
                    fontSize:
                      12,
                    fontWeight:
                      600,
                    color:
                      '#6b7280',
                    textTransform:
                      'uppercase',
                    letterSpacing:
                      '0.05em',
                  }}
                >
                  Followers
                </th>

                <th
                  style={{
                    padding:
                      '12px 24px',
                    fontSize:
                      12,
                    fontWeight:
                      600,
                    color:
                      '#6b7280',
                    textTransform:
                      'uppercase',
                    letterSpacing:
                      '0.05em',
                  }}
                >
                  Status
                </th>

                <th
                  style={{
                    padding:
                      '12px 24px',
                    fontSize:
                      12,
                    fontWeight:
                      600,
                    color:
                      '#6b7280',
                    textTransform:
                      'uppercase',
                    letterSpacing:
                      '0.05em',
                  }}
                >
                  Tags
                </th>

                <th
                  style={{
                    padding:
                      '12px 24px',
                    fontSize:
                      12,
                    fontWeight:
                      600,
                    color:
                      '#6b7280',
                    textTransform:
                      'uppercase',
                    letterSpacing:
                      '0.05em',
                  }}
                >
                  Added
                </th>

                <th
                  style={{
                    padding:
                      '12px 24px',
                  }}
                />
              </tr>
            </thead>

            <tbody>
              {list.map(
                (
                  inf
                ) => (
                  <tr
                    key={
                      inf.id
                    }
                    style={{
                      borderBottom:
                        '1px solid #e5e7eb',
                      transition:
                        'background 0.2s',
                    }}
                    className="table-row"
                  >
                    <td
                      style={{
                        padding:
                          '16px 24px',
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
                          cursor:
                            'pointer',
                        }}
                        onClick={() =>
                          setSelectedInf(
                            inf
                          )
                        }
                      >
                        <Avatar
                          name={
                            inf.displayName
                          }
                          imageUrl={
                            inf.profileImage
                          }
                          size={
                            40
                          }
                        />

                        <div>
                          <div
                            style={{
                              fontWeight:
                                600,
                              color:
                                '#111827',
                              fontSize:
                                14,
                            }}
                          >
                            {
                              inf.displayName
                            }{' '}
                            {inf.verified && (
                              <CheckCircle
                                size={
                                  14
                                }
                                color="#3b82f6"
                                style={{
                                  display:
                                    'inline',
                                  verticalAlign:
                                    'middle',
                                }}
                              />
                            )}
                          </div>

                          <div
                            style={{
                              color:
                                '#6b7280',
                              fontSize:
                                13,
                            }}
                          >
                            {
                              inf.username
                            }
                          </div>
                        </div>
                      </div>
                    </td>

                    <td
                      style={{
                        padding:
                          '16px 24px',
                        color:
                          '#374151',
                        fontSize:
                          14,
                        fontWeight:
                          500,
                      }}
                    >
                      {formatFollowers(
                        inf.followers,
                        inf.followersNumeric
                      )}
                    </td>

                    <td
                      style={{
                        padding:
                          '16px 24px',
                      }}
                    >
                      <StatusBadge
                        status={normalizeStatus(
                          inf.status
                        )}
                      />
                    </td>

                    <td
                      style={{
                        padding:
                          '16px 24px',
                      }}
                    >
                      <div
                        style={{
                          display:
                            'flex',
                          gap:
                            6,
                          flexWrap:
                            'wrap',
                        }}
                      >
                        {(
                          inf.tags ??
                          []
                        )
                          .slice(
                            0,
                            2
                          )
                          .map(
                            (
                              tag
                            ) => (
                              <TagPill
                                key={
                                  tag
                                }
                                label={
                                  tag
                                }
                              />
                            )
                          )}

                        {(
                          inf.tags ??
                          []
                        ).length >
                          2 && (
                          <span
                            style={{
                              fontSize:
                                12,
                              color:
                                '#6b7280',
                            }}
                          >
                            +
                            {inf.tags.length -
                              2}
                          </span>
                        )}
                      </div>
                    </td>

                    <td
                      style={{
                        padding:
                          '16px 24px',
                        color:
                          '#6b7280',
                        fontSize:
                          13,
                      }}
                    >
                      {formatDate(
                        inf.createdAt
                      )}
                    </td>

                    <td
                      style={{
                        padding:
                          '16px 24px',
                        textAlign:
                          'right',
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
                          justifyContent:
                            'flex-end',
                        }}
                      >
                        <button
                          onClick={(
                            e
                          ) =>
                            handleToggleFavorite(
                              inf.id,
                              e
                            )
                          }
                          style={{
                            background:
                              'none',
                            border:
                              'none',
                            cursor:
                              'pointer',
                            color:
                              inf.favorite
                                ? '#eab308'
                                : '#d1d5db',
                          }}
                          title={
                            inf.favorite
                              ? 'Remove from favorites'
                              : 'Add to favorites'
                          }
                        >
                          <Star
                            size={
                              18
                            }
                            fill={
                              inf.favorite
                                ? 'currentColor'
                                : 'none'
                            }
                          />
                        </button>

                        <button
                          onClick={() =>
                            setEditInf(
                              inf
                            )
                          }
                          style={{
                            background:
                              'none',
                            border:
                              'none',
                            cursor:
                              'pointer',
                            color:
                              '#6b7280',
                          }}
                          title="Edit"
                        >
                          <Edit3
                            size={
                              16
                            }
                          />
                        </button>

                        <button
                          onClick={() =>
                            window.open(
                              inf.profileUrl,
                              '_blank'
                            )
                          }
                          style={{
                            background:
                              'none',
                            border:
                              'none',
                            cursor:
                              'pointer',
                            color:
                              '#6b7280',
                          }}
                          title="Open Instagram"
                        >
                          <ExternalLink
                            size={
                              16
                            }
                          />
                        </button>

                        <button
                          onClick={() =>
                            setDeleteId(
                              inf.id
                            )
                          }
                          style={{
                            background:
                              'none',
                            border:
                              'none',
                            cursor:
                              'pointer',
                            color:
                              '#ef4444',
                          }}
                          title="Delete"
                        >
                          <Trash2
                            size={
                              16
                            }
                          />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>

        {list.length ===
          0 && (
          <div
            style={{
              padding:
                48,
              textAlign:
                'center',
              color:
                '#6b7280',
              fontSize:
                14,
            }}
          >
            {hasCreatorFilters
              ? 'No creators match your search or filter.'
              : 'No creators found.'}
          </div>
        )}
      </div>
    );

  // ─── Overview ────────────────────────────────────────────────────────────

  const renderOverview =
    () => (
      <div className="animate-fade-in">
        {/* Metrics */}

        <div
          style={{
            display:
              'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(200px, 1fr))',
            gap:
              20,
            marginBottom:
              32,
          }}
        >
          {[
            {
              label:
                'Total Creators',
              value:
                metrics.total,
              color:
                '#111827',
            },
            {
              label:
                'New',
              value:
                metrics.byStatus[
                  'New'
                ] || 0,
              color:
                STATUS_CONFIG[
                  'New'
                ].color,
            },
            {
              label:
                'Contacted',
              value:
                metrics.byStatus[
                  'Contacted'
                ] || 0,
              color:
                STATUS_CONFIG[
                  'Contacted'
                ].color,
            },
            {
              label:
                'Collaborating',
              value:
                metrics.byStatus[
                  'Collaborating'
                ] || 0,
              color:
                STATUS_CONFIG[
                  'Collaborating'
                ].color,
            },
            {
              label:
                'Recently Added',
              value:
                metrics.recentlyAdded,
              color:
                '#111827',
            },
          ].map(
            (
              metric
            ) => (
              <div
                key={
                  metric.label
                }
                style={{
                  background:
                    '#fff',
                  borderRadius:
                    12,
                  padding:
                    20,
                  border:
                    '1px solid #e5e7eb',
                  boxShadow:
                    '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <div
                  style={{
                    fontSize:
                      13,
                    color:
                      '#6b7280',
                    fontWeight:
                      500,
                  }}
                >
                  {
                    metric.label
                  }
                </div>

                <div
                  style={{
                    fontSize:
                      32,
                    fontWeight:
                      700,
                    color:
                      metric.color,
                    marginTop:
                      8,
                  }}
                >
                  {
                    metric.value
                  }
                </div>
              </div>
            )
          )}
        </div>

        {/* Filter & Sort */}

        <div
          style={{
            background:
              '#fff',
            border:
              '1px solid #e5e7eb',
            borderRadius:
              12,
            padding:
              20,
            marginBottom:
              32,
            boxShadow:
              '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div
            style={{
              display:
                'flex',
              alignItems:
                'center',
              justifyContent:
                'space-between',
              gap:
                16,
              marginBottom:
                16,
              flexWrap:
                'wrap',
            }}
          >
            <div>
              <div
                style={{
                  fontSize:
                    16,
                  fontWeight:
                    600,
                  color:
                    '#111827',
                }}
              >
                Filter & Sort
              </div>

              <div
                style={{
                  fontSize:
                    12,
                  color:
                    '#6b7280',
                  marginTop:
                    4,
                }}
              >
                Filter and organize your
                CRM creators.
              </div>
            </div>

            {overviewHasFilters && (
              <button
                onClick={
                  clearOverviewFilters
                }
                style={{
                  border:
                    'none',
                  background:
                    '#eef2ff',
                  color:
                    '#4f46e5',
                  borderRadius:
                    7,
                  padding:
                    '7px 12px',
                  fontSize:
                    12,
                  fontWeight:
                    600,
                  cursor:
                    'pointer',
                }}
              >
                Clear filters
              </button>
            )}
          </div>

          <div
            style={{
              display:
                'grid',
              gridTemplateColumns:
                'minmax(220px, 1.6fr) repeat(4, minmax(140px, 1fr))',
              gap:
                12,
            }}
          >
            {/* Search */}

            <div
              style={{
                position:
                  'relative',
              }}
            >
              <Search
                size={
                  16
                }
                color="#9ca3af"
                style={{
                  position:
                    'absolute',
                  left:
                    12,
                  top:
                    11,
                }}
              />

              <input
                type="text"
                placeholder="Search creators..."
                value={
                  overviewSearch
                }
                onChange={(
                  e
                ) =>
                  setOverviewSearch(
                    e.target
                      .value
                  )
                }
                style={{
                  width:
                    '100%',
                  height:
                    38,
                  padding:
                    '0 36px',
                  borderRadius:
                    8,
                  border:
                    '1px solid #d1d5db',
                  fontSize:
                    13,
                  outline:
                    'none',
                  boxSizing:
                    'border-box',
                }}
              />

              {overviewSearch && (
                <button
                  onClick={() =>
                    setOverviewSearch(
                      ''
                    )
                  }
                  title="Clear search"
                  style={{
                    position:
                      'absolute',
                    right:
                      8,
                    top:
                      6,
                    width:
                      24,
                    height:
                      24,
                    borderRadius:
                      '50%',
                    border:
                      'none',
                    background:
                      '#f3f4f6',
                    color:
                      '#6b7280',
                    cursor:
                      'pointer',
                    display:
                      'flex',
                    alignItems:
                      'center',
                    justifyContent:
                      'center',
                  }}
                >
                  <X
                    size={
                      14
                    }
                  />
                </button>
              )}
            </div>

            {/* Status */}

            <select
              value={
                overviewStatusFilter
              }
              onChange={(
                e
              ) =>
                setOverviewStatusFilter(
                  e.target
                    .value as
                    | 'all'
                    | InfluencerStatus
                )
              }
              style={{
                height:
                  38,
                padding:
                  '0 12px',
                borderRadius:
                  8,
                border:
                  '1px solid #d1d5db',
                background:
                  '#fff',
                fontSize:
                  13,
                color:
                  '#374151',
                outline:
                  'none',
                cursor:
                  'pointer',
              }}
            >
              <option value="all">
                All statuses
              </option>

              {ALL_STATUSES.map(
                (
                  status
                ) => (
                  <option
                    key={
                      status
                    }
                    value={
                      status
                    }
                  >
                    {
                      status
                    }
                  </option>
                )
              )}
            </select>

            {/* Favorites */}

            <select
              value={
                overviewFavoriteFilter
              }
              onChange={(
                e
              ) =>
                setOverviewFavoriteFilter(
                  e.target
                    .value as
                    | 'all'
                    | 'favorites'
                )
              }
              style={{
                height:
                  38,
                padding:
                  '0 12px',
                borderRadius:
                  8,
                border:
                  '1px solid #d1d5db',
                background:
                  '#fff',
                fontSize:
                  13,
                color:
                  '#374151',
                outline:
                  'none',
                cursor:
                  'pointer',
              }}
            >
              <option value="all">
                All creators
              </option>

              <option value="favorites">
                Favorites only
              </option>
            </select>

            {/* Sort By */}

            <select
              value={
                overviewSortBy
              }
              onChange={(
                e
              ) =>
                setOverviewSortBy(
                  e.target
                    .value as
                    | 'recent'
                    | 'name'
                    | 'followers'
                )
              }
              style={{
                height:
                  38,
                padding:
                  '0 12px',
                borderRadius:
                  8,
                border:
                  '1px solid #d1d5db',
                background:
                  '#fff',
                fontSize:
                  13,
                color:
                  '#374151',
                outline:
                  'none',
                cursor:
                  'pointer',
              }}
            >
              <option value="recent">
                Sort: Recently added
              </option>

              <option value="name">
                Sort: Name
              </option>

              <option value="followers">
                Sort: Followers
              </option>
            </select>

            {/* Order */}

            <select
              value={
                overviewSortOrder
              }
              onChange={(
                e
              ) =>
                setOverviewSortOrder(
                  e.target
                    .value as
                    | 'asc'
                    | 'desc'
                )
              }
              style={{
                height:
                  38,
                padding:
                  '0 12px',
                borderRadius:
                  8,
                border:
                  '1px solid #d1d5db',
                background:
                  '#fff',
                fontSize:
                  13,
                color:
                  '#374151',
                outline:
                  'none',
                cursor:
                  'pointer',
              }}
            >
              <option value="desc">
                Descending
              </option>

              <option value="asc">
                Ascending
              </option>
            </select>
          </div>

          <div
            style={{
              marginTop:
                14,
              fontSize:
                12,
              color:
                '#6b7280',
            }}
          >
            Showing{' '}
            <strong
              style={{
                color:
                  '#111827',
              }}
            >
              {
                overviewFilteredCreators.length
              }
            </strong>{' '}
            of{' '}
            <strong
              style={{
                color:
                  '#111827',
              }}
            >
              {
                influencers.length
              }
            </strong>{' '}
            creators
          </div>
        </div>

        {/* Creator Results */}

        <div>
          <div
            style={{
              display:
                'flex',
              alignItems:
                'center',
              justifyContent:
                'space-between',
              marginBottom:
                16,
            }}
          >
            <h3
              style={{
                fontSize:
                  16,
                fontWeight:
                  600,
                color:
                  '#111827',
                margin:
                  0,
              }}
            >
              Creators
            </h3>
          </div>

          {overviewFilteredCreators.length >
          0 ? (
            renderTable(
              overviewFilteredCreators
            )
          ) : (
            <div
              style={{
                background:
                  '#fff',
                borderRadius:
                  12,
                border:
                  '1px dashed #d1d5db',
                padding:
                  48,
                textAlign:
                  'center',
                color:
                  '#6b7280',
              }}
            >
              <Users
                size={
                  32
                }
                color="#9ca3af"
                style={{
                  marginBottom:
                    12,
                }}
              />

              <div
                style={{
                  fontSize:
                    15,
                  fontWeight:
                    600,
                  color:
                    '#374151',
                  marginBottom:
                    6,
                }}
              >
                No creators found
              </div>

              <div
                style={{
                  fontSize:
                    13,
                }}
              >
                Try changing your
                search or filters.
              </div>
            </div>
          )}
        </div>
      </div>
    );

  // ─── Creators / Favorites ────────────────────────────────────────────────

  const renderCreators =
    () => (
      <div className="animate-fade-in">
        <div
          style={{
            display:
              'flex',
            gap:
              12,
            marginBottom:
              24,
            alignItems:
              'center',
            flexWrap:
              'wrap',
          }}
        >
          <div
            style={{
              position:
                'relative',
              flex:
                1,
              minWidth:
                240,
            }}
          >
            <Search
              size={
                16
              }
              color="#9ca3af"
              style={{
                position:
                  'absolute',
                left:
                  12,
                top:
                  10,
              }}
            />

            <input
              type="text"
              placeholder="Search name, username, bio, tags..."
              value={
                searchQuery
              }
              onChange={(
                e
              ) =>
                setSearchQuery(
                  e.target
                    .value
                )
              }
              style={{
                width:
                  '100%',
                padding:
                  '9px 36px',
                borderRadius:
                  8,
                border:
                  '1px solid #d1d5db',
                fontSize:
                  14,
                outline:
                  'none',
                boxSizing:
                  'border-box',
              }}
            />
          </div>

          <select
            value={
              statusFilter
            }
            onChange={(
              e
            ) =>
              setStatusFilter(
                e.target
                  .value as
                  | 'all'
                  | InfluencerStatus
              )
            }
            style={{
              minWidth:
                170,
              padding:
                '9px 12px',
              borderRadius:
                8,
              border:
                '1px solid #d1d5db',
              background:
                '#fff',
              fontSize:
                14,
              color:
                '#374151',
              outline:
                'none',
              cursor:
                'pointer',
            }}
          >
            <option value="all">
              All statuses
            </option>

            {ALL_STATUSES.map(
              (
                status
              ) => (
                <option
                  key={
                    status
                  }
                  value={
                    status
                  }
                >
                  {
                    status
                  }
                </option>
              )
            )}
          </select>

          {hasCreatorFilters && (
            <button
              onClick={
                clearCreatorFilters
              }
              style={{
                height:
                  38,
                padding:
                  '0 14px',
                borderRadius:
                  8,
                border:
                  '1px solid #d1d5db',
                background:
                  '#fff',
                color:
                  '#4f46e5',
                fontSize:
                  13,
                fontWeight:
                  600,
                cursor:
                  'pointer',
              }}
            >
              Clear
            </button>
          )}
        </div>

        {hasCreatorFilters && (
          <div
            style={{
              marginBottom:
                16,
              fontSize:
                13,
              color:
                '#6b7280',
            }}
          >
            Showing{' '}
            <strong
              style={{
                color:
                  '#111827',
              }}
            >
              {
                filteredCreators.length
              }
            </strong>{' '}
            of{' '}
            <strong
              style={{
                color:
                  '#111827',
              }}
            >
              {activeTab ===
              'favorites'
                ? influencers.filter(
                    (
                      inf
                    ) =>
                      Boolean(
                        inf.favorite
                      )
                  ).length
                : influencers.length}
            </strong>{' '}
            creators
          </div>
        )}

        {renderTable(
          filteredCreators
        )}
      </div>
    );

  // ─── Pipeline ────────────────────────────────────────────────────────────

  const renderPipelineCard =
    (
      inf: Influencer
    ) => {
      const currentStatus =
        normalizeStatus(
          inf.status
        );

      const isUpdating =
        updatingStatusId ===
        inf.id;

      return (
        <div
          key={
            inf.id
          }
          style={{
            background:
              '#fff',
            border:
              '1px solid #e5e7eb',
            borderRadius:
              12,
            padding:
              16,
            boxShadow:
              '0 1px 2px rgba(0,0,0,0.04)',
          }}
        >
          <div
            style={{
              display:
                'flex',
              alignItems:
                'flex-start',
              gap:
                10,
              marginBottom:
                14,
            }}
          >
            <div
              onClick={() =>
                setSelectedInf(
                  inf
                )
              }
              style={{
                cursor:
                  'pointer',
              }}
            >
              <Avatar
                name={
                  inf.displayName
                }
                imageUrl={
                  inf.profileImage
                }
                size={
                  42
                }
              />
            </div>

            <div
              style={{
                minWidth:
                  0,
                flex:
                  1,
                cursor:
                  'pointer',
              }}
              onClick={() =>
                setSelectedInf(
                  inf
                )
              }
            >
              <div
                style={{
                  display:
                    'flex',
                  alignItems:
                    'center',
                  gap:
                    4,
                }}
              >
                <span
                  style={{
                    fontSize:
                      14,
                    fontWeight:
                      600,
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
                  {
                    inf.displayName
                  }
                </span>

                {inf.verified && (
                  <CheckCircle
                    size={
                      13
                    }
                    color="#3b82f6"
                  />
                )}
              </div>

              <div
                style={{
                  fontSize:
                    12,
                  color:
                    '#6b7280',
                  marginTop:
                    3,
                }}
              >
                {
                  inf.username
                }
              </div>
            </div>

            <button
              onClick={(
                e
              ) =>
                handleToggleFavorite(
                  inf.id,
                  e
                )
              }
              style={{
                background:
                  'none',
                border:
                  'none',
                cursor:
                  'pointer',
                color:
                  inf.favorite
                    ? '#eab308'
                    : '#d1d5db',
                padding:
                  2,
              }}
              title="Favorite"
            >
              <Star
                size={
                  16
                }
                fill={
                  inf.favorite
                    ? 'currentColor'
                    : 'none'
                }
              />
            </button>
          </div>

          <div
            style={{
              display:
                'flex',
              alignItems:
                'center',
              justifyContent:
                'space-between',
              gap:
                8,
              marginBottom:
                12,
            }}
          >
            <span
              style={{
                fontSize:
                  12,
                color:
                  '#6b7280',
              }}
            >
              Followers
            </span>

            <span
              style={{
                fontSize:
                  13,
                fontWeight:
                  600,
                color:
                  '#374151',
              }}
            >
              {formatFollowers(
                inf.followers,
                inf.followersNumeric
              )}
            </span>
          </div>

          {inf.bio && (
            <p
              style={{
                fontSize:
                  12,
                lineHeight:
                  1.45,
                color:
                  '#6b7280',
                margin:
                  '0 0 12px',
                display:
                  '-webkit-box',
                WebkitLineClamp:
                  3,
                WebkitBoxOrient:
                  'vertical',
                overflow:
                  'hidden',
              }}
            >
              {
                inf.bio
              }
            </p>
          )}

          {(
            inf.tags ??
            []
          ).length >
            0 && (
            <div
              style={{
                display:
                  'flex',
                gap:
                  5,
                flexWrap:
                  'wrap',
                marginBottom:
                  12,
              }}
            >
              {(
                inf.tags ??
                []
              )
                .slice(
                  0,
                  3
                )
                .map(
                  (
                    tag
                  ) => (
                    <TagPill
                      key={
                        tag
                      }
                      label={
                        tag
                      }
                    />
                  )
                )}
            </div>
          )}

          <div
            style={{
              borderTop:
                '1px solid #f3f4f6',
              paddingTop:
                12,
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
              <select
                value={
                  currentStatus
                }
                disabled={
                  isUpdating
                }
                onChange={(
                  e
                ) =>
                  void handlePipelineStatusChange(
                    inf.id,
                    e.target
                      .value as InfluencerStatus
                  )
                }
                style={{
                  flex:
                    1,
                  minWidth:
                    0,
                  padding:
                    '7px 30px 7px 10px',
                  borderRadius:
                    7,
                  border:
                    '1px solid #d1d5db',
                  background:
                    '#fff',
                  fontSize:
                    12,
                  color:
                    '#374151',
                  cursor:
                    isUpdating
                      ? 'wait'
                      : 'pointer',
                  outline:
                    'none',
                }}
              >
                {ALL_STATUSES.map(
                  (
                    status
                  ) => (
                    <option
                      key={
                        status
                      }
                      value={
                        status
                      }
                    >
                      {
                        status
                      }
                    </option>
                  )
                )}
              </select>

              {isUpdating && (
                <Loader2
                  size={
                    15
                  }
                  color="#4f46e5"
                  className="animate-spin"
                />
              )}

              <button
                onClick={() =>
                  setEditInf(
                    inf
                  )
                }
                style={{
                  width:
                    32,
                  height:
                    32,
                  borderRadius:
                    7,
                  border:
                    '1px solid #e5e7eb',
                  background:
                    '#fff',
                  color:
                    '#6b7280',
                  display:
                    'flex',
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                  cursor:
                    'pointer',
                }}
                title="Edit creator"
              >
                <Edit3
                  size={
                    14
                  }
                />
              </button>
            </div>
          </div>
        </div>
      );
    };

  const renderPipeline =
    () => {
      const query =
        normalizeSearchText(
          searchQuery
        );

      let pipelineCreators =
        [
          ...influencers,
        ];

      if (
        statusFilter !==
        'all'
      ) {
        pipelineCreators =
          pipelineCreators.filter(
            (inf) =>
              normalizeStatus(
                inf.status
              ) ===
              statusFilter
          );
      }

      if (query) {
        pipelineCreators =
          pipelineCreators.filter(
            (inf) => {
              const name =
                normalizeSearchText(
                  inf.displayName
                );

              const username =
                normalizeSearchText(
                  inf.username
                );

              const bio =
                normalizeSearchText(
                  inf.bio
                );

              const tags =
                (
                  inf.tags ??
                  []
                )
                  .map(
                    (tag) =>
                      normalizeSearchText(
                        tag
                      )
                  )
                  .join(
                    ' '
                  );

              const status =
                normalizeSearchText(
                  normalizeStatus(
                    inf.status
                  )
                );

              return (
                name.includes(
                  query
                ) ||
                username.includes(
                  query
                ) ||
                username
                  .replace(
                    /^@/,
                    ''
                  )
                  .includes(
                    query
                  ) ||
                bio.includes(
                  query
                ) ||
                tags.includes(
                  query
                ) ||
                status.includes(
                  query
                )
              );
            }
          );
      }

      return (
        <div className="animate-fade-in">
          <div
            style={{
              display:
                'flex',
              gap:
                12,
              marginBottom:
                24,
              alignItems:
                'center',
              flexWrap:
                'wrap',
            }}
          >
            <div
              style={{
                flex:
                  1,
                minWidth:
                  240,
              }}
            >
              <div
                style={{
                  fontSize:
                    14,
                  color:
                    '#6b7280',
                }}
              >
                Move creators through
                your collaboration
                pipeline.
              </div>
            </div>

            <div
              style={{
                position:
                  'relative',
                width:
                  280,
                maxWidth:
                  '100%',
              }}
            >
              <Search
                size={
                  16
                }
                color="#9ca3af"
                style={{
                  position:
                    'absolute',
                  left:
                    12,
                  top:
                    10,
                }}
              />

              <input
                type="text"
                placeholder="Search pipeline..."
                value={
                  searchQuery
                }
                onChange={(
                  e
                ) =>
                  setSearchQuery(
                    e.target
                      .value
                  )
                }
                style={{
                  width:
                    '100%',
                  padding:
                    '9px 12px 9px 36px',
                  borderRadius:
                    8,
                  border:
                    '1px solid #d1d5db',
                  fontSize:
                    14,
                  outline:
                    'none',
                  boxSizing:
                    'border-box',
                }}
              />
            </div>

            <select
              value={
                statusFilter
              }
              onChange={(
                e
              ) =>
                setStatusFilter(
                  e.target
                    .value as
                    | 'all'
                    | InfluencerStatus
                )
              }
              style={{
                minWidth:
                  160,
                padding:
                  '9px 12px',
                borderRadius:
                  8,
                border:
                  '1px solid #d1d5db',
                background:
                  '#fff',
                fontSize:
                  14,
                color:
                  '#374151',
                outline:
                  'none',
                cursor:
                  'pointer',
              }}
            >
              <option value="all">
                All statuses
              </option>

              {ALL_STATUSES.map(
                (
                  status
                ) => (
                  <option
                    key={
                      status
                    }
                    value={
                      status
                    }
                  >
                    {
                      status
                    }
                  </option>
                )
              )}
            </select>

            {(searchQuery ||
              statusFilter !==
                'all') && (
              <button
                onClick={
                  clearCreatorFilters
                }
                style={{
                  height:
                    38,
                  padding:
                    '0 14px',
                  borderRadius:
                    8,
                  border:
                    '1px solid #d1d5db',
                  background:
                    '#fff',
                  color:
                    '#4f46e5',
                  fontSize:
                    13,
                  fontWeight:
                    600,
                  cursor:
                    'pointer',
                }}
              >
                Clear
              </button>
            )}
          </div>

          {pipelineCreators.length ===
          0 ? (
            <div
              style={{
                background:
                  '#fff',
                border:
                  '1px dashed #d1d5db',
                borderRadius:
                  16,
                padding:
                  '64px 24px',
                textAlign:
                  'center',
              }}
            >
              <div
                style={{
                  width:
                    64,
                  height:
                    64,
                  borderRadius:
                    '50%',
                  background:
                    '#e0e7ff',
                  display:
                    'flex',
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                  margin:
                    '0 auto 20px',
                }}
              >
                <FolderKanban
                  size={
                    30
                  }
                  color="#4f46e5"
                />
              </div>

              <h2
                style={{
                  fontSize:
                    20,
                  fontWeight:
                    600,
                  color:
                    '#111827',
                  marginBottom:
                    8,
                }}
              >
                {influencers.length ===
                0
                  ? 'No creators in the pipeline yet'
                  : 'No creators match your search or filter'}
              </h2>

              <p
                style={{
                  color:
                    '#6b7280',
                  fontSize:
                    14,
                  margin:
                    '0 auto',
                  maxWidth:
                    520,
                }}
              >
                {influencers.length ===
                0
                  ? 'Add an influencer from Instagram and they will appear here automatically.'
                  : 'Try another creator, username, bio, tag, or status.'}
              </p>
            </div>
          ) : (
            <div
              style={{
                display:
                  'grid',
                gridTemplateColumns:
                  'repeat(4, minmax(240px, 1fr))',
                gap:
                  16,
                alignItems:
                  'start',
                overflowX:
                  'auto',
                paddingBottom:
                  12,
              }}
            >
              {ALL_STATUSES.map(
                (
                  status
                ) => {
                  const columnCreators =
                    pipelineCreators.filter(
                      (
                        inf
                      ) =>
                        normalizeStatus(
                          inf.status
                        ) ===
                        status
                    );

                  const config =
                    STATUS_CONFIG[
                      status
                    ];

                  return (
                    <div
                      key={
                        status
                      }
                      style={{
                        background:
                          '#f9fafb',
                        border:
                          '1px solid #e5e7eb',
                        borderRadius:
                          12,
                        minWidth:
                          240,
                        maxWidth:
                          360,
                        overflow:
                          'hidden',
                      }}
                    >
                      <div
                        style={{
                          padding:
                            '14px 14px 12px',
                          borderBottom:
                            '1px solid #e5e7eb',
                          background:
                            '#fff',
                        }}
                      >
                        <div
                          style={{
                            display:
                              'flex',
                            alignItems:
                              'center',
                            justifyContent:
                              'space-between',
                            gap:
                              8,
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
                                  8,
                                height:
                                  8,
                                borderRadius:
                                  '50%',
                                background:
                                  config.color,
                              }}
                            />

                            <span
                              style={{
                                fontSize:
                                  13,
                                fontWeight:
                                  600,
                                color:
                                  '#111827',
                              }}
                            >
                              {
                                status
                              }
                            </span>
                          </div>

                          <span
                            style={{
                              minWidth:
                                24,
                              height:
                                24,
                              padding:
                                '0 7px',
                              borderRadius:
                                12,
                              background:
                                '#f3f4f6',
                              display:
                                'inline-flex',
                              alignItems:
                                'center',
                              justifyContent:
                                'center',
                              fontSize:
                                11,
                              fontWeight:
                                600,
                              color:
                                '#6b7280',
                            }}
                          >
                            {
                              columnCreators.length
                            }
                          </span>
                        </div>
                      </div>

                      <div
                        style={{
                          display:
                            'flex',
                          flexDirection:
                            'column',
                          gap:
                            10,
                          padding:
                            10,
                          minHeight:
                            180,
                        }}
                      >
                        {columnCreators.length >
                        0 ? (
                          columnCreators.map(
                            (
                              inf
                            ) =>
                              renderPipelineCard(
                                inf
                              )
                          )
                        ) : (
                          <div
                            style={{
                              minHeight:
                                150,
                              display:
                                'flex',
                              alignItems:
                                'center',
                              justifyContent:
                                'center',
                              textAlign:
                                'center',
                              color:
                                '#9ca3af',
                              fontSize:
                                12,
                              padding:
                                16,
                            }}
                          >
                            No creators
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>
      );
    };

  // ─── Settings ────────────────────────────────────────────────────────────

  const renderSettings =
    () => (
      <div
        className="animate-fade-in"
        style={{
          background:
            '#fff',
          borderRadius:
            12,
          padding:
            32,
          border:
            '1px solid #e5e7eb',
          maxWidth:
            600,
        }}
      >
        <h3
          style={{
            fontSize:
              18,
            fontWeight:
              600,
            color:
              '#111827',
            marginBottom:
              24,
          }}
        >
          Settings
        </h3>

        <div
          style={{
            marginBottom:
              32,
          }}
        >
          <h4
            style={{
              fontSize:
                14,
              fontWeight:
                600,
              color:
                '#374151',
              marginBottom:
                12,
            }}
          >
            Data Management
          </h4>

          <div
            style={{
              display:
                'flex',
              gap:
                16,
            }}
          >
            <Button
              icon={
                <Download
                  size={
                    16
                  }
                />
              }
              variant="secondary"
              onClick={
                handleExport
              }
            >
              Export CSV
            </Button>

            <Button
              icon={
                <Trash2
                  size={
                    16
                  }
                />
              }
              variant="danger"
              onClick={() =>
                setDeleteId(
                  'ALL'
                )
              }
            >
              Clear All Data
            </Button>
          </div>
        </div>

        <div>
          <h4
            style={{
              fontSize:
                14,
              fontWeight:
                600,
              color:
                '#374151',
              marginBottom:
                12,
            }}
          >
            About CreatorVault
          </h4>

          <p
            style={{
              color:
                '#6b7280',
              fontSize:
                14,
              lineHeight:
                1.5,
            }}
          >
            Version 1.0.0
            <br />
            Instagram Influencer
            CRM
          </p>
        </div>
      </div>
    );

  // ─── Main Render ─────────────────────────────────────────────────────────

  return (
    <div
      style={{
        display:
          'flex',
        minHeight:
          '100vh',
        background:
          '#f3f4f6',
        fontFamily:
          'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Sidebar */}

      <div
        style={{
          width:
            240,
          background:
            '#fff',
          borderRight:
            '1px solid #e5e7eb',
          padding:
            '24px 16px',
          display:
            'flex',
          flexDirection:
            'column',
          flexShrink:
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
              10,
            padding:
              '0 8px',
          }}
        >
          <div
            style={{
              width:
                32,
              height:
                32,
              borderRadius:
                8,
              background:
                '#4f46e5',
              display:
                'flex',
              alignItems:
                'center',
              justifyContent:
                'center',
            }}
          >
            <Camera
              size={
                18
              }
              color="#fff"
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
                letterSpacing:
                  '-0.02em',
              }}
            >
              CreatorVault
            </div>

            <div
              style={{
                fontSize:
                  11,
                color:
                  '#6b7280',
                fontWeight:
                  500,
                textTransform:
                  'uppercase',
                letterSpacing:
                  '0.05em',
              }}
            >
              Influencer CRM
            </div>
          </div>
        </div>

        {renderNavItems()}
      </div>

      {/* Main Content */}

      <div
        style={{
          flex:
            1,
          display:
            'flex',
          flexDirection:
            'column',
          minWidth:
            0,
        }}
      >
        <header
          style={{
            height:
              64,
            background:
              '#fff',
            borderBottom:
              '1px solid #e5e7eb',
            display:
              'flex',
            alignItems:
              'center',
            justifyContent:
              'space-between',
            padding:
              '0 32px',
            flexShrink:
              0,
          }}
        >
          <h1
            style={{
              fontSize:
                20,
              fontWeight:
                600,
              color:
                '#111827',
              textTransform:
                'capitalize',
              margin:
                0,
            }}
          >
            {
              activeTab
            }
          </h1>

          <Button
            variant="secondary"
            size="sm"
            icon={
              <Download
                size={
                  14
                }
              />
            }
            onClick={
              handleExport
            }
          >
            Export CSV
          </Button>
        </header>

        <main
          style={{
            padding:
              32,
            flex:
              1,
            overflowY:
              'auto',
          }}
        >
          {loading ? (
            <div
              style={{
                display:
                  'flex',
                justifyContent:
                  'center',
                padding:
                  64,
              }}
            >
              <Loader2
                size={
                  32
                }
                className="animate-spin"
                color="#4f46e5"
              />
            </div>
          ) : (
            <>
              {activeTab ===
                'overview' &&
                renderOverview()}

              {(activeTab ===
                'creators' ||
                activeTab ===
                  'favorites') &&
                renderCreators()}

              {activeTab ===
                'pipeline' &&
                renderPipeline()}

              {activeTab ===
                'settings' &&
                renderSettings()}
            </>
          )}
        </main>
      </div>

      {/* Toasts */}

      <ToastContainer
        toasts={
          toasts
        }
        onDismiss={
          dismissToast
        }
      />

      {/* Detail Modal */}

      {selectedInf && (
        <InfluencerDetailModal
          influencer={
            selectedInf
          }
          onClose={() =>
            setSelectedInf(
              null
            )
          }
          onEdit={() => {
            setSelectedInf(
              null
            );

            setEditInf(
              selectedInf
            );
          }}
          onDelete={() => {
            setSelectedInf(
              null
            );

            setDeleteId(
              selectedInf.id
            );
          }}
        />
      )}

      {/* Edit Modal */}

      {editInf && (
        <InfluencerEditModal
          influencer={
            editInf
          }
          onClose={() =>
            setEditInf(
              null
            )
          }
          onSave={(updates) =>
            updateInfluencer(
              editInf.id,
              updates
            ).then(
              async () => {
                addToast(
                  'Creator updated',
                  'success'
                );

                setEditInf(
                  null
                );

                await loadData();
              }
            )
          }
        />
      )}

      {/* Delete Confirmation */}

      <ConfirmDialog
        open={
          !!deleteId
        }
        title={
          deleteId ===
          'ALL'
            ? 'Clear All Data'
            : 'Delete Creator'
        }
        message={
          deleteId ===
          'ALL'
            ? 'Are you sure you want to permanently delete all creators from your CRM? This cannot be undone.'
            : 'Are you sure you want to delete this creator?'
        }
        danger
        onConfirm={async () => {
          if (
            deleteId ===
            'ALL'
          ) {
            await crmStorage.clearAllInfluencers();

            addToast(
              'All data cleared',
              'success'
            );

            setDeleteId(
              null
            );

            await loadData();
          } else {
            await handleDelete();
          }
        }}
        onCancel={() =>
          setDeleteId(
            null
          )
        }
      />
    </div>
  );
};