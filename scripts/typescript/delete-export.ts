import { BCMDataExportsClient, DeleteExportCommand } from '@aws-sdk/client-bcm-data-exports'; // ES Modules import
// const { BCMDataExportsClient, deleteExportCommand } = require("@aws-sdk/client-bcm-data-exports"); // CommonJS import
import { AwsCredentialIdentity } from '@smithy/types';
import { assumeRole, INITIAL_SANDBOX_CRDS } from './assume-role';
import { getEnvVar } from '../../lib/utils/env';
// const { BCMDataExportsClient, ListExportsCommand } = require("@aws-sdk/client-bcm-data-exports"); // CommonJS import

async function deleteExportWithAssumeRole() {
  const credentials = await assumeRole();
  if (credentials) {
    await deleteExport(credentials);
  } else {
    console.log('Failed to assume role.');
  }
}

async function deleteExport(credentials?: AwsCredentialIdentity | null) {
  const creds = credentials || INITIAL_SANDBOX_CRDS;
  console.log(creds);

  const client = new BCMDataExportsClient({
    credentials: creds,
  });
  const input = {
    // deleteExportRequest
    ExportArn: getEnvVar('CUR_EXPORT_ARN'), // required
  };
  const command = new DeleteExportCommand(input);
  const response = await client.send(command);
  console.log(JSON.stringify(response, null, 2));
}

async function main() {
  const arg = process.argv.slice(2)[0]; // Skip the first two default args

  if (arg) {
    console.log('assuming a Role');

    await deleteExportWithAssumeRole();
  } else {
    console.log('NOT assuming a Role');

    await deleteExport();
  }
}

// To run the main function
main().catch((error) => console.error('Error in main function:', error));