// The heavy part (DiceBear + the five style packs, ~900 KB). Loaded lazily by
// avatar.js so it never blocks the first screen; the service worker caches it
// after the first visit, so avatars also work offline.
import { createAvatar } from '@dicebear/core';
import * as lorelei from '@dicebear/lorelei';
import * as notionists from '@dicebear/notionists';
import * as openPeeps from '@dicebear/open-peeps';
import * as pixelArt from '@dicebear/pixel-art';
import * as thumbs from '@dicebear/thumbs';

const MODS = { lo: lorelei, no: notionists, op: openPeeps, px: pixelArt, th: thumbs };

// Backgrounds come from the app's own palette so every avatar sits in the brand.
const BACKGROUNDS = ['00B1D2', 'CF5C78', 'F4C12C', '80D481', 'FFBA52'];

const cache = new Map();
/** SVG data URI for a style+seed (memoised — the picker grid draws many). */
export function render(styleId, seed) {
  const key = styleId + ':' + seed;
  let uri = cache.get(key);
  if (!uri) {
    uri = createAvatar(MODS[styleId] || thumbs, { seed, backgroundColor: BACKGROUNDS, backgroundType: ['solid'] }).toDataUri();
    cache.set(key, uri);
  }
  return uri;
}
