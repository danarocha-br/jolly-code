/**
 * Checks if a given URL is valid.
 *
 * @param {string} url - The URL to be checked.
 * @return {Promise<boolean>} A Promise that resolves to a boolean indicating whether the URL is valid or not.
 */
export async function isValidURL(url: string): Promise<boolean> {
  try {
    new URL(url);
    return true; // the provided string is a valid URL
  } catch (_) {
    return false; // the provided string is not a valid URL
  }
}
