import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { User } from 'firebase/auth';
import {
  ADMIN_PASSCODE,
  deduplicateEpisodeList,
  forceSaveDefaultEpisodesToLocalStorage,
  getCanonicalVideoKey,
  getEpisodeSeriesId,
  inferEpisodeCategory,
  isLegacyBrokenEpisode,
  syncLocalStorageCatalogMigration,
  toSeriesId,
} from '../constants';
import { auth } from '../firebase';
import {
  addDramaEpisode,
  deleteDramaEpisode,
  deleteDramaSeriesFromFirestore,
  reorderDramaEpisodes,
  restoreDefaultEpisodes,
  subscribeEpisodes,
  subscribeSeries,
  unlockAdminAccess,
  updateDramaEpisode,
  upsertDramaSeries,
} from '../services/dramawinService';
import { DramaEpisode, DramaSeries } from '../types';
import {
  addLocalEpisode,
  deleteLocalEpisode,
  deleteLocalSection,
  isEpisodeDeleted,
  loadDeletedIds,
  loadLocalEpisodes,
  loadLocalSections,
  recordDeletedIds,
  removeDeletedSeriesMarker,
  renameLocalSection,
  reorderLocalSeries,
  saveLocalEpisodes,
  saveLocalSection,
  updateLocalEpisode,
} from '../utils/localState';

export interface CatalogEpisodeInput {
  title: string;
  series: string;
  seriesId?: string;
  category?: string;
  episodeLabel: string;
  duration: string;
  rewardCoins: number;
  coverImage: string;
  thumbnailUrl?: string;
  synopsis: string;
  sponsorUrl: string;
  youtubeUrl?: string;
  videoUrl?: string;
  startTime?: number;
}

const KNOWN_CLOUD_EP_IDS_KEY = 'dramawin_known_cloud_ep_ids_v1';

function readKnownCloudIds(): Set<string> {
  if (typeof window === 'undefined' || !window.localStorage) return new Set();
  try {
    const raw = window.localStorage.getItem(KNOWN_CLOUD_EP_IDS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? new Set(parsed.filter((id): id is string => typeof id === 'string' && id.length > 0))
      : new Set();
  } catch {
    return new Set();
  }
}

function writeKnownCloudIds(ids: Iterable<string>): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(KNOWN_CLOUD_EP_IDS_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // Ignore storage quota errors
  }
}

function getEpisodeTimestampMs(ep: DramaEpisode): number {
  if (typeof ep.updatedAtMs === 'number' && Number.isFinite(ep.updatedAtMs)) {
    return ep.updatedAtMs;
  }
  if (ep.updatedAt && typeof ep.updatedAt.toMillis === 'function') {
    return ep.updatedAt.toMillis();
  }
  return 0;
}

export function mergeCatalogEpisodes(
  cloudItems: DramaEpisode[],
  localItems: DramaEpisode[],
  deletedSet: Set<string>
): DramaEpisode[] {
  const byId = new Map<string, DramaEpisode>();

  for (const ep of cloudItems) {
    if (!ep?.id || isLegacyBrokenEpisode(ep) || isEpisodeDeleted(ep, deletedSet)) continue;
    byId.set(ep.id, ep);
  }

  for (const localEp of localItems) {
    if (!localEp?.id || isLegacyBrokenEpisode(localEp) || isEpisodeDeleted(localEp, deletedSet)) {
      continue;
    }
    const existingCloud = byId.get(localEp.id);
    if (!existingCloud) {
      byId.set(localEp.id, localEp);
      continue;
    }
    const localMs = getEpisodeTimestampMs(localEp);
    const cloudMs = getEpisodeTimestampMs(existingCloud);
    if (localMs > cloudMs) {
      byId.set(localEp.id, {
        ...existingCloud,
        ...localEp,
      });
    }
  }

  return deduplicateEpisodeList(Array.from(byId.values())).sort(
    (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)
  );
}

interface CatalogContextValue {
  episodes: DramaEpisode[];
  sections: string[];
  cloudSeries: DramaSeries[];
  deletedIds: string[];
  createSection: (name: string) => Promise<void>;
  renameSection: (oldName: string, newName: string) => Promise<void>;
  deleteSection: (name: string, removeEpisodes?: boolean) => Promise<void>;
  addEpisode: (input: CatalogEpisodeInput & { sortOrder: number }) => Promise<void>;
  updateEpisode: (episodeId: string, input: CatalogEpisodeInput) => Promise<void>;
  deleteEpisode: (episodeId: string) => Promise<void>;
  reorderSeries: (orderedSeriesNames: string[]) => Promise<void>;
  restoreCatalogDefaults: () => Promise<void>;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

export const CatalogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [localEpisodes, setLocalEpisodes] = useState<DramaEpisode[]>(() => {
    syncLocalStorageCatalogMigration();
    return loadLocalEpisodes();
  });
  const [localSections, setLocalSections] = useState<string[]>(() =>
    loadLocalSections(loadLocalEpisodes())
  );
  const [cloudEpisodes, setCloudEpisodes] = useState<DramaEpisode[]>([]);
  const [cloudSeries, setCloudSeries] = useState<DramaSeries[]>([]);
  const [cloudEpisodesLoaded, setCloudEpisodesLoaded] = useState(false);
  const [cloudSeriesLoaded, setCloudSeriesLoaded] = useState(false);
  const [deletedIds, setDeletedIds] = useState<string[]>(() => loadDeletedIds());

  // Subscribe to Firestore live snapshots & merge cleanly without overwriting local Admin changes
  useEffect(() => {
    const unsubSeries = subscribeSeries(
      (seriesList) => {
        const currentDeleted = new Set(loadDeletedIds());
        const cleanSeries = seriesList.filter(
          (s) =>
            !currentDeleted.has(s.seriesId) &&
            !currentDeleted.has(s.id) &&
            !/gojo|jujutsu|jjk|candy\s*man/i.test(`${s.seriesId} ${s.title}`)
        );
        setCloudSeriesLoaded(true);
        setCloudSeries(cleanSeries);
      },
      () => {
        // Keep local catalog active if Firestore is unavailable
      }
    );

    const unsubEpisodes = subscribeEpisodes(
      (items) => {
        const currentDeletedList = loadDeletedIds();
        const prevKnownCloud = readKnownCloudIds();
        const incomingCloudIds = new Set(items.map((ep) => ep.id).filter(Boolean));

        // Any item previously known to be in cloud and now absent was genuinely deleted in Firestore
        const remotelyDeletedIds: string[] = [];
        prevKnownCloud.forEach((knownId) => {
          if (!incomingCloudIds.has(knownId)) {
            remotelyDeletedIds.push(knownId);
          }
        });

        const updatedDeleted =
          remotelyDeletedIds.length > 0
            ? recordDeletedIds(remotelyDeletedIds)
            : currentDeletedList;
        const updatedDeletedSet = new Set(updatedDeleted);
        if (remotelyDeletedIds.length > 0) {
          setDeletedIds(updatedDeleted);
        }
        writeKnownCloudIds(incomingCloudIds);

        const cleanCloud = deduplicateEpisodeList(
          items.filter(
            (ep) => !isLegacyBrokenEpisode(ep) && !isEpisodeDeleted(ep, updatedDeletedSet)
          )
        );
        setCloudEpisodesLoaded(true);
        setCloudEpisodes(cleanCloud);

        const currentLocal = loadLocalEpisodes();
        const merged = mergeCatalogEpisodes(cleanCloud, currentLocal, updatedDeletedSet);
        const saved = saveLocalEpisodes(merged);
        setLocalEpisodes(saved);
        setLocalSections(loadLocalSections(saved));
      },
      () => {
        // Keep local catalog active if Firestore is unavailable
      }
    );

    return () => {
      unsubSeries();
      unsubEpisodes();
    };
  }, []);

  // Cross-tab localStorage sync (if /admin is edited in another tab, user tabs update immediately)
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (
        !event.key ||
        event.key === 'dramawin_episodes' ||
        event.key === 'dramawin_sections_v1' ||
        event.key === 'dramawin_deleted_ids_v1'
      ) {
        const refreshedEps = loadLocalEpisodes();
        setLocalEpisodes(refreshedEps);
        setLocalSections(loadLocalSections(refreshedEps));
        setDeletedIds(loadDeletedIds());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const deletedIdSet = useMemo(() => new Set(deletedIds), [deletedIds]);

  const episodes: DramaEpisode[] = useMemo(() => {
    if (!cloudEpisodesLoaded) {
      return deduplicateEpisodeList(
        localEpisodes.filter(
          (ep) => !isLegacyBrokenEpisode(ep) && !isEpisodeDeleted(ep, deletedIdSet)
        )
      ).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    }
    return mergeCatalogEpisodes(cloudEpisodes, localEpisodes, deletedIdSet);
  }, [cloudEpisodesLoaded, cloudEpisodes, localEpisodes, deletedIdSet]);

  const sections: string[] = useMemo(() => {
    const map = new Map<string, string>();
    const register = (raw: string) => {
      const clean = raw.trim().replace(/\s+/g, ' ');
      if (!clean || /gojo|jujutsu|jjk|candy\s*man/i.test(clean)) return;
      const sId = toSeriesId(clean);
      if (deletedIdSet.has(sId)) return;
      if (!map.has(sId)) map.set(sId, clean);
    };

    localSections.forEach(register);
    if (cloudSeriesLoaded) {
      cloudSeries.forEach((s) => register(s.title));
    }
    episodes.forEach((ep) => register(ep.series));
    return Array.from(map.values());
  }, [cloudSeriesLoaded, cloudSeries, episodes, localSections, deletedIdSet]);

  const ensureFirebaseAdminGrant = useCallback(async (): Promise<User | null> => {
    const activeUser = auth.currentUser;
    if (!activeUser) return null;
    try {
      await unlockAdminAccess(activeUser.uid, ADMIN_PASSCODE);
    } catch {
      // Primary admin email does not require admins/{uid} doc if email matches rule
    }
    return activeUser;
  }, []);

  const createSection = useCallback(
    async (name: string) => {
      const cleanName = name.trim().slice(0, 60);
      if (!cleanName) return;
      const seriesId = toSeriesId(cleanName);
      setDeletedIds(removeDeletedSeriesMarker(cleanName));
      setLocalSections(saveLocalSection(cleanName));
      setCloudSeries((prev) => {
        if (prev.some((s) => s.seriesId === seriesId)) return prev;
        return [
          ...prev,
          {
            id: seriesId,
            seriesId,
            title: cleanName,
            category: inferEpisodeCategory(cleanName),
            coverImage: 'none',
            synopsis: `${cleanName} drama series.`,
            episodeIds: [],
            sortOrder: prev.length + 1,
            isPublic: true,
          },
        ];
      });

      const activeUser = await ensureFirebaseAdminGrant();
      if (activeUser) {
        await upsertDramaSeries({
          title: cleanName,
          seriesId,
          category: inferEpisodeCategory(cleanName),
          sortOrder: cloudSeries.length + 1,
        });
      }
    },
    [cloudSeries.length, ensureFirebaseAdminGrant]
  );

  const renameSection = useCallback(
    async (oldName: string, newName: string) => {
      const cleanNew = newName.trim().slice(0, 60);
      if (!cleanNew || cleanNew === oldName) return;
      const oldSeriesId = toSeriesId(oldName);
      const targetSeriesId = toSeriesId(cleanNew);

      setDeletedIds(removeDeletedSeriesMarker(cleanNew));
      const result = renameLocalSection(oldName, cleanNew);
      setLocalEpisodes(result.episodes);
      setLocalSections(result.sections);

      const now = Date.now();
      setCloudEpisodes((prev) =>
        prev.map((ep) =>
          ep.series === oldName || getEpisodeSeriesId(ep) === oldSeriesId
            ? {
                ...ep,
                series: cleanNew,
                seriesId: targetSeriesId,
                category: inferEpisodeCategory(cleanNew, ep.title, ep.category),
                updatedAtMs: now,
              }
            : ep
        )
      );
      setCloudSeries((prev) =>
        prev.map((s) =>
          s.seriesId === oldSeriesId || s.title === oldName
            ? { ...s, id: targetSeriesId, seriesId: targetSeriesId, title: cleanNew }
            : s
        )
      );

      const activeUser = await ensureFirebaseAdminGrant();
      if (activeUser) {
        const matching = (cloudEpisodes.length > 0 ? cloudEpisodes : episodes).filter(
          (ep) => ep.series === oldName || getEpisodeSeriesId(ep) === oldSeriesId
        );
        for (const ep of matching) {
          await updateDramaEpisode(ep.id, {
            title: ep.title,
            series: cleanNew,
            seriesId: targetSeriesId,
            category: inferEpisodeCategory(cleanNew, ep.title, ep.category),
            episodeLabel: ep.episodeLabel,
            duration: ep.duration,
            rewardCoins: ep.rewardCoins,
            coverImage: ep.coverImage,
            thumbnailUrl: ep.thumbnailUrl,
            synopsis: ep.synopsis,
            sponsorUrl: ep.sponsorUrl,
            youtubeUrl: ep.youtubeUrl,
            videoUrl: ep.videoUrl,
            startTime: ep.startTime,
            sortOrder: ep.sortOrder,
          });
        }
        await deleteDramaSeriesFromFirestore(oldSeriesId, []);
      }
    },
    [cloudEpisodes, ensureFirebaseAdminGrant, episodes]
  );

  const deleteSection = useCallback(
    async (name: string, removeEpisodes = true) => {
      const targetSeriesId = toSeriesId(name);
      const matching = episodes.filter(
        (ep) => ep.series === name || getEpisodeSeriesId(ep) === targetSeriesId
      );
      const result = deleteLocalSection(name, removeEpisodes);
      const nextDeleted = recordDeletedIds([
        targetSeriesId,
        ...result.deletedIds,
        ...(removeEpisodes ? matching.map((m) => m.id) : []),
      ]);
      setDeletedIds(nextDeleted);
      setLocalEpisodes(result.episodes);
      setLocalSections(result.sections);

      setCloudSeries((prev) =>
        prev.filter((s) => s.seriesId !== targetSeriesId && s.title !== name)
      );

      if (removeEpisodes) {
        const removedIds = new Set(matching.map((m) => m.id));
        setCloudEpisodes((prev) =>
          prev.filter(
            (ep) =>
              !removedIds.has(ep.id) &&
              ep.series !== name &&
              getEpisodeSeriesId(ep) !== targetSeriesId
          )
        );
      }

      const activeUser = await ensureFirebaseAdminGrant();
      if (activeUser) {
        await deleteDramaSeriesFromFirestore(
          targetSeriesId,
          removeEpisodes ? matching.map((m) => m.id) : []
        );
      }
    },
    [ensureFirebaseAdminGrant, episodes]
  );

  const addEpisode = useCallback(
    async (input: CatalogEpisodeInput & { sortOrder: number }) => {
      const episodeId = `ep-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const resolvedSeriesId = toSeriesId(input.series);
      const resolvedCategory = inferEpisodeCategory(input.series, input.title, input.category);
      const incomingVideoKey = getCanonicalVideoKey(input.videoUrl || input.youtubeUrl);

      if (incomingVideoKey) {
        const duplicateEp = episodes.find(
          (ep) =>
            getEpisodeSeriesId(ep) === resolvedSeriesId &&
            getCanonicalVideoKey(ep.videoUrl || ep.youtubeUrl) === incomingVideoKey
        );
        if (duplicateEp) {
          throw new Error(
            `Duplicate blocked: "${duplicateEp.episodeLabel}" ("${duplicateEp.title}") already uses this video URL in "${input.series}".`
          );
        }
      }

      setDeletedIds(removeDeletedSeriesMarker(resolvedSeriesId));

      const normalizedInput: CatalogEpisodeInput & { sortOrder: number; id: string } = {
        ...input,
        id: episodeId,
        seriesId: resolvedSeriesId,
        category: resolvedCategory,
      };

      const nextList = addLocalEpisode(normalizedInput);
      const createdEp = nextList.find((ep) => ep.id === episodeId);
      setLocalEpisodes(nextList);
      setLocalSections(loadLocalSections(nextList));

      if (createdEp) {
        setCloudEpisodes((prev) => deduplicateEpisodeList([...prev, createdEp]));
        setCloudSeries((prev) => {
          const exists = prev.some((s) => s.seriesId === resolvedSeriesId);
          if (!exists) {
            return [
              ...prev,
              {
                id: resolvedSeriesId,
                seriesId: resolvedSeriesId,
                title: createdEp.series,
                category: resolvedCategory,
                coverImage: createdEp.coverImage || 'none',
                synopsis: createdEp.synopsis,
                episodeIds: [episodeId],
                sortOrder: input.sortOrder,
                isPublic: true,
              },
            ];
          }
          return prev.map((s) =>
            s.seriesId === resolvedSeriesId
              ? {
                  ...s,
                  episodeIds: Array.from(new Set([...(s.episodeIds || []), episodeId])),
                }
              : s
          );
        });
      }

      const activeUser = await ensureFirebaseAdminGrant();
      if (activeUser) {
        await addDramaEpisode(normalizedInput);
      }
    },
    [ensureFirebaseAdminGrant, episodes]
  );

  const updateEpisode = useCallback(
    async (episodeId: string, input: CatalogEpisodeInput) => {
      const resolvedSeriesId = toSeriesId(input.series);
      const resolvedCategory = inferEpisodeCategory(input.series, input.title, input.category);
      const incomingVideoKey = getCanonicalVideoKey(input.videoUrl || input.youtubeUrl);

      if (incomingVideoKey) {
        const duplicateEp = episodes.find(
          (ep) =>
            ep.id !== episodeId &&
            getEpisodeSeriesId(ep) === resolvedSeriesId &&
            getCanonicalVideoKey(ep.videoUrl || ep.youtubeUrl) === incomingVideoKey
        );
        if (duplicateEp) {
          throw new Error(
            `Duplicate blocked: "${duplicateEp.episodeLabel}" ("${duplicateEp.title}") already uses this video URL in "${input.series}".`
          );
        }
      }

      setDeletedIds(removeDeletedSeriesMarker(resolvedSeriesId));

      const normalizedInput: CatalogEpisodeInput = {
        ...input,
        seriesId: resolvedSeriesId,
        category: resolvedCategory,
      };
      const nextList = updateLocalEpisode(episodeId, normalizedInput);
      const updatedEp = nextList.find((ep) => ep.id === episodeId);
      setLocalEpisodes(nextList);
      setLocalSections(loadLocalSections(nextList));

      if (updatedEp) {
        setCloudEpisodes((prev) => {
          const found = prev.some((ep) => ep.id === episodeId);
          return found
            ? prev.map((ep) => (ep.id === episodeId ? updatedEp : ep))
            : deduplicateEpisodeList([...prev, updatedEp]);
        });
      }

      const matchedSortOrder =
        updatedEp?.sortOrder ??
        episodes.find((ep) => ep.id === episodeId)?.sortOrder ??
        1;

      const activeUser = await ensureFirebaseAdminGrant();
      if (activeUser) {
        await updateDramaEpisode(episodeId, {
          ...normalizedInput,
          sortOrder: matchedSortOrder,
        });
      }
    },
    [ensureFirebaseAdminGrant, episodes]
  );

  const deleteEpisode = useCallback(
    async (episodeId: string) => {
      const targetEp = episodes.find((ep) => ep.id === episodeId);
      const seriesIdHint = targetEp ? getEpisodeSeriesId(targetEp) : undefined;
      setDeletedIds(recordDeletedIds([episodeId]));
      const nextList = deleteLocalEpisode(episodeId);
      setLocalEpisodes(nextList);
      setLocalSections(loadLocalSections(nextList));
      setCloudEpisodes((prev) => prev.filter((ep) => ep.id !== episodeId));
      if (seriesIdHint) {
        setCloudSeries((prev) =>
          prev.map((s) =>
            s.seriesId === seriesIdHint
              ? { ...s, episodeIds: (s.episodeIds || []).filter((id) => id !== episodeId) }
              : s
          )
        );
      }

      const activeUser = await ensureFirebaseAdminGrant();
      if (activeUser) {
        await deleteDramaEpisode(episodeId, seriesIdHint);
      }
    },
    [ensureFirebaseAdminGrant, episodes]
  );

  const reorderSeries = useCallback(
    async (orderedSeriesNames: string[]) => {
      const result = reorderLocalSeries(orderedSeriesNames);
      setLocalSections(result.sections);
      setLocalEpisodes(result.episodes);

      const orderMap = new Map<string, number>();
      result.sections.forEach((name, idx) => orderMap.set(name, idx));
      setCloudEpisodes((prev) =>
        [...prev]
          .sort((a, b) => {
            const idxA = orderMap.get(a.series?.trim() || '') ?? 9999;
            const idxB = orderMap.get(b.series?.trim() || '') ?? 9999;
            if (idxA !== idxB) return idxA - idxB;
            return (a.sortOrder || 0) - (b.sortOrder || 0);
          })
          .map((ep, idx) => ({ ...ep, sortOrder: idx + 1 }))
      );

      const activeUser = await ensureFirebaseAdminGrant();
      if (activeUser && cloudEpisodes.length > 0) {
        const sortedCloud = [...cloudEpisodes]
          .sort((a, b) => {
            const idxA = orderMap.get(a.series?.trim() || '') ?? 9999;
            const idxB = orderMap.get(b.series?.trim() || '') ?? 9999;
            if (idxA !== idxB) return idxA - idxB;
            return (a.sortOrder || 0) - (b.sortOrder || 0);
          })
          .map((ep, idx) => ({ id: ep.id, sortOrder: idx + 1 }));
        await reorderDramaEpisodes(sortedCloud);
      }
    },
    [cloudEpisodes, ensureFirebaseAdminGrant]
  );

  const restoreCatalogDefaults = useCallback(async () => {
    const allIds = episodes.map((ep) => ep.id).filter(Boolean);
    if (allIds.length > 0) {
      setDeletedIds(recordDeletedIds(allIds));
    }
    const cleared = forceSaveDefaultEpisodesToLocalStorage();
    setLocalEpisodes(cleared);
    setLocalSections([]);
    setCloudEpisodes([]);
    setCloudSeries([]);
    writeKnownCloudIds([]);

    const activeUser = await ensureFirebaseAdminGrant();
    if (activeUser) {
      for (const ep of cloudEpisodes) {
        await deleteDramaEpisode(ep.id);
      }
      await restoreDefaultEpisodes();
    }
  }, [cloudEpisodes, ensureFirebaseAdminGrant, episodes]);

  const value = useMemo<CatalogContextValue>(
    () => ({
      episodes,
      sections,
      cloudSeries,
      deletedIds,
      createSection,
      renameSection,
      deleteSection,
      addEpisode,
      updateEpisode,
      deleteEpisode,
      reorderSeries,
      restoreCatalogDefaults,
    }),
    [
      episodes,
      sections,
      cloudSeries,
      deletedIds,
      createSection,
      renameSection,
      deleteSection,
      addEpisode,
      updateEpisode,
      deleteEpisode,
      reorderSeries,
      restoreCatalogDefaults,
    ]
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
};

export function useCatalog(): CatalogContextValue {
  const ctx = useContext(CatalogContext);
  if (!ctx) {
    throw new Error('useCatalog must be used inside a CatalogProvider.');
  }
  return ctx;
}
