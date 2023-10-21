/**
 * Creates a debounce function that delays the execution of a given function by a specified delay.
 *
 * @param {function} func - The function to be executed after the delay.
 * @param {number} delay - The delay in milliseconds before executing the function.
 * @throws {Error} If the delay parameter is not a positive number.
 * @return {function} - The debounced function.
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  if (typeof delay !== "number" || delay <= 0) {
    throw new Error("Delay parameter must be a positive number");
  }
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      try {
        func(...args);
      } catch (error) {}
    }, delay);
  };
}
