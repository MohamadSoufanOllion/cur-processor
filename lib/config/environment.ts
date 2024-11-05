import { BuildEnvironmentVariable, BuildEnvironmentVariableType } from 'aws-cdk-lib/aws-codebuild';
import { getEnvVar, transformEnvironmentVariables } from '../utils/env';

export const ENVIRONMENT = {
  INITIAL_SANDBOX_CREDS_ACCESS_KEY: getEnvVar('INITIAL_SANDBOX_CREDS_ACCESS_KEY'),
  INITIAL_SANDBOX_CREDS_ACCESS_SECRET: getEnvVar('INITIAL_SANDBOX_CREDS_ACCESS_SECRET'),
  INITIAL_SANDBOX_CROSS_CREDS_KEY: getEnvVar('INITIAL_SANDBOX_CROSS_CREDS_KEY'),
  INITIAL_SANDBOX_CROSS_CREDS_SECRET: getEnvVar('INITIAL_SANDBOX_CROSS_CREDS_SECRET'),
  CROSS_ACCOUNT_ROLE_ARN: getEnvVar('CROSS_ACCOUNT_ROLE_ARN'),
  DEST_BUCKET_ARN: getEnvVar('DEST_BUCKET_ARN'),
  SOURCE_USER_ARN: getEnvVar('SOURCE_USER_ARN'),
  SOURCE_ROLE_ARN: getEnvVar('SOURCE_ROLE_ARN'),
  CUR_EXPORT_ARN: getEnvVar('CUR_EXPORT_ARN'),
  GITHUB_SOURCE_CONNECTION_ARN: getEnvVar('GITHUB_SOURCE_CONNECTION_ARN'),
  GITHUB_REPO_NAME: getEnvVar('GITHUB_REPO_NAME'),
};

export type CDKEnvVariableDictionary = {
  [key: string]: BuildEnvironmentVariable;
};

export const CODE_BUILD_ENV_VARS: CDKEnvVariableDictionary = transformEnvironmentVariables(
  ENVIRONMENT,
  BuildEnvironmentVariableType.PLAINTEXT,
);
