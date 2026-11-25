// One place for the words the UI uses for "the other person". Always prefer
// their actual name; only fall back to a neutral phrase before they've joined.
export const FALLBACK_NAME = 'your person';
export const nameOr = (name) => (name && name.trim() && name !== '…' ? name.trim() : FALLBACK_NAME);
