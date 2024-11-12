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

// Define a type for the environment variable object
interface EnvironmentVariable {
  value: any;
  type: any; // Could be changed to an enum or specific union type if types are predefined
}

// Define a type alias for the transformed environment variable dictionary
type EnvVariableDictionary = { [key: string]: EnvironmentVariable };

/**
 * Transforms an environment object into a dictionary with specific structure.
 *
 * @param envVars An object containing the environment variables to be transformed.
 * @returns A dictionary where each key is mapped to an EnvironmentVariable object.
 */
export function transformEnvironmentVariables(envVars: Record<string, string>, type: string = 'PLAINTEXT'): EnvVariableDictionary {
  return Object.entries(envVars).reduce<EnvVariableDictionary>((acc, [key, value]) => {
    acc[key] = { value, type }; // Use provided type or default to 'PLAINTEXT'
    return acc;
  }, {});
}
