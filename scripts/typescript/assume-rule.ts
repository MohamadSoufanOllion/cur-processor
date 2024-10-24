import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';
import { AwsCredentialIdentity } from '@smithy/types';
import { ACCOUNTS } from '../../lib/config/aws';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

// Usage example (ensure environment variables or default credentials are set)
const CROSS_ACCOUNT_ROLE_ARN = 'arn:aws:iam::070284094934:role/CrossAccountStack-CURDataExportCrossAccountRoleFBCE-0euVvFaN99bK'; // Replace with your role ARN
const SESSION_NAME = '12345acdxdb'; // Session name can be anything descriptiv

const EXTERNAL_ID = 'ollion-ex-id';

export const JOEY_CREDS = {
  accessKeyId: process.env.JOEY_CREDS_ACCESS_KEY!,
  secretAccessKey: process.env.JOEY_CREDS_ACCESS_SECRET!,
  accountId: ACCOUNTS.OLLION_SANDBOX,
};
export const JOEY_CROSS_CREDS = {
  accessKeyId: process.env.JOEY_CROSS_CREDS_KEY!,
  secretAccessKey: process.env.JOEY_CROSS_CREDS_SECRET!,
  accountId: ACCOUNTS.OLLION_CROSS_ACCOUNT,
};

console.log(JOEY_CREDS, JOEY_CROSS_CREDS);

export async function assumeRole(roleArn: string = CROSS_ACCOUNT_ROLE_ARN, sessionName: string = SESSION_NAME) {
  // Create an STS client
  const stsClient = new STSClient({ credentials: JOEY_CREDS });

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
      const { AccessKeyId, SecretAccessKey, SessionToken, Expiration } = response.Credentials;
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
