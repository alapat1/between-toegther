// Screening Room data layer — TMDB (movies/mainstream TV) + AniList (anime),
// merged into one candidate shape so the swipe deck / mood slider don't care
// which API a title came from. Per roadmap.md: TMDB attribution is a single
// quiet text line at the end of the scroll, no logo required.
const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';
const ANILIST_URL = 'https://graphql.anilist.co';

/** @typedef {{source:'tmdb_movie'|'tmdb_tv'|'anilist', sourceId:string, title:string, posterUrl:string|null, mediaType:string, genres:string[], overview:string}} Candidate */

function tmdbToCandidate(item, mediaType) {
  return {
    source: mediaType === 'movie' ? 'tmdb_movie' : 'tmdb_tv',
    sourceId: String(item.id),
    title: item.title || item.name,
    posterUrl: item.poster_path ? `${TMDB_IMG}${item.poster_path}` : null,
    mediaType,
    genres: item.genre_ids || [],
    overview: item.overview || ''
  };
}

export async function fetchTmdbTrending(mediaType = 'movie', page = 1) {
  if (!TMDB_KEY) return [];
  const res = await fetch(`${TMDB_BASE}/trending/${mediaType}/week?api_key=${TMDB_KEY}&page=${page}`);
  if (!res.ok) return [];
  const json = await res.json();
  return (json.results || []).map((r) => tmdbToCandidate(r, mediaType));
}

export async function fetchTmdbByGenre(mediaType, genreId, page = 1) {
  if (!TMDB_KEY) return [];
  const res = await fetch(
    `${TMDB_BASE}/discover/${mediaType}?api_key=${TMDB_KEY}&with_genres=${genreId}&sort_by=popularity.desc&page=${page}`
  );
  if (!res.ok) return [];
  const json = await res.json();
  return (json.results || []).map((r) => tmdbToCandidate(r, mediaType));
}

export async function searchTmdb(query) {
  if (!TMDB_KEY || !query) return [];
  const res = await fetch(`${TMDB_BASE}/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  const json = await res.json();
  return (json.results || [])
    .filter((r) => r.media_type === 'movie' || r.media_type === 'tv')
    .map((r) => tmdbToCandidate(r, r.media_type));
}

const ANILIST_TRENDING_QUERY = `
query ($page: Int) {
  Page(page: $page, perPage: 25) {
    media(sort: TRENDING_DESC, type: ANIME) {
      id
      title { romaji english }
      coverImage { large }
      genres
      description(asHtml: false)
      format
    }
  }
}`;

export async function fetchAnilistTrending(page = 1) {
  const res = await fetch(ANILIST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: ANILIST_TRENDING_QUERY, variables: { page } })
  });
  if (!res.ok) return [];
  const json = await res.json();
  const media = json?.data?.Page?.media || [];
  return media.map((m) => ({
    source: 'anilist',
    sourceId: String(m.id),
    title: m.title.english || m.title.romaji,
    posterUrl: m.coverImage?.large || null,
    mediaType: 'anime',
    genres: m.genres || [],
    overview: (m.description || '').replace(/<[^>]+>/g, '')
  }));
}

/**
 * Builds a mixed candidate deck honoring a taste profile's mix preference.
 * mix: 'movies' | 'series' | 'both' (default 'both', includes anime unless
 * anime_pref === 'skip').
 */
export async function buildDeck({ mix = 'both', includeAnime = true, page = 1 } = {}) {
  const fetches = [];
  if (mix === 'movies' || mix === 'both') fetches.push(fetchTmdbTrending('movie', page));
  if (mix === 'series' || mix === 'both') fetches.push(fetchTmdbTrending('tv', page));
  if (includeAnime) fetches.push(fetchAnilistTrending(page));
  const results = await Promise.all(fetches);
  const merged = results.flat();
  // shuffle so the deck doesn't always front-load one source
  return merged.sort(() => Math.random() - 0.5);
}

export const TMDB_GENRE_CHIPS = [
  { id: 28, label: 'action' },
  { id: 35, label: 'comedy' },
  { id: 27, label: 'horror' },
  { id: 10749, label: 'romance' },
  { id: 53, label: 'thriller' },
  { id: 18, label: 'drama' }
];

export const ANIME_CHIP = { id: 'anime', label: 'anime' };
