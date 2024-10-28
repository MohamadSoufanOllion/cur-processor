/**
 * Retrieves and validates the existence of an environment variable.
 * Throws an error if the environment variable is not set.
 *
 * @param {string} variableName - The name of the environment variable to check.
 * @returns {string} - The value of the environment variable if it exists.
 *
 * @throws {Error} - Throws an error if the environment variable is not set.
 */
export function getEnvVar(variableName: string): string {
  const value = process.env[variableName];
  if (value === undefined) {
    throw new Error(`Environment variable ${variableName} is not set.`);
  }
  return value;
}
