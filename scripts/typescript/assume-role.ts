import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';
import { AwsCredentialIdentity } from '@smithy/types';
import { ACCOUNTS, EXTERNAL_ID } from '../../lib/config/aws';
import * as dotenv from 'dotenv';
import { getEnvVar } from '../../lib/utils/env';

dotenv.config({ path: '../../.env' });

// Usage example (ensure environment variables or default credentials are set)
const CROSS_ACCOUNT_ROLE_ARN = getEnvVar('CROSS_ACCOUNT_ROLE_ARN'); // Replace with your role ARN
const SESSION_NAME = '12345acdxdb'; // Session name can be anything descriptiv

export const INITIAL_SANDBOX_CRDS = {
  accessKeyId: getEnvVar('JOEY_CREDS_ACCESS_KEY'),
  secretAccessKey: getEnvVar('JOEY_CREDS_ACCESS_SECRET'),
  accountId: ACCOUNTS.INITIAL_SANDBOX,
};
export const INITIAL_CROSS_ACCOUNT_CREDS = {
  accessKeyId: getEnvVar('JOEY_CROSS_CREDS_KEY'),
  secretAccessKey: getEnvVar('JOEY_CROSS_CREDS_SECRET'),
  accountId: ACCOUNTS.INITIAL_CROSS_ACCOUNT,
};

console.log(INITIAL_SANDBOX_CRDS, INITIAL_CROSS_ACCOUNT_CREDS);

export async function assumeRole(roleArn: string = CROSS_ACCOUNT_ROLE_ARN, sessionName: string = SESSION_NAME) {
  // Create an STS client
  const stsClient = new STSClient({ credentials: INITIAL_SANDBOX_CRDS });

  // Define the command to assume the role
  const command = new AssumeRoleCommand({
    RoleArn: roleArn,
    RoleSessionName: sessionName,
    ExternalId: EXTERNAL_ID,
  });

  try {
    // Send the command to STS
    const response = await stsClient.send(command);

    if (response.Credentials) {
      // Extract and return the temporary credentials
      const { AccessKeyId, SecretAccessKey, SessionToken } = response.Credentials;
      return {
        accessKeyId: AccessKeyId,
        secretAccessKey: SecretAccessKey,
        sessionToken: SessionToken,
        accountId: roleArn.split(':')[4],
      } as AwsCredentialIdentity;
    } else {
      throw new Error('No credentials returned from STS');
    }
  } catch (error) {
    console.error(`Error assuming role: ${error}`);
    return null;
  }
}
