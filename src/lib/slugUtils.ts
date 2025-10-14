/**
 * Utility functions for generating and handling URL slugs
 */

/**
 * Generate a URL-friendly slug from a string
 * @param text - The text to convert to a slug
 * @returns A URL-friendly slug
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Extract client name from a slug
 * @param slug - The slug to convert back to a readable name
 * @returns A readable client name
 */
export function slugToName(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Find a client by its slug
 * @param clients - Array of clients
 * @param slug - The slug to search for
 * @returns The client with matching slug, or null if not found
 */
export function findClientBySlug(clients: Array<{ id: string; name: string }>, slug: string) {
  return clients.find(client => generateSlug(client.name) === slug) || null;
}
