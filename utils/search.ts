import Fuse from "fuse.js";

// Utility for fuzzy searching

/**
 * Performs a fuzzy search on a list of objects.
 * @param list The array of objects to search.
 * @param keys The keys of the objects to search against (e.g. ['name', 'city']).
 * @param query The search query string.
 * @param threshold Fuzzy threshold (0.0 = perfect match, 1.0 = match anything). Default 0.3.
 * @returns The filtered and sorted list of objects.
 */
export function fuzzySearch<T>(
  list: T[],
  keys: string[],
  query: string,
  threshold = 0.5,
): T[] {
  if (!query || !query.trim()) {
    return list;
  }

  // Safety check for empty list
  if (!list || list.length === 0) return [];

  try {
    const fuse = new Fuse(list, {
      keys,
      threshold,
      ignoreLocation: true,
    });

    return fuse.search(query).map((result) => result.item);
  } catch (error) {
    console.error("Fuse search error:", error);
    return list; // Fallback
  }
}
