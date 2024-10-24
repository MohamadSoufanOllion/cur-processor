import { BCMDataExportsClient, GetExportCommand } from '@aws-sdk/client-bcm-data-exports'; // ES Modules import
// const { BCMDataExportsClient, GetExportCommand } = require("@aws-sdk/client-bcm-data-exports"); // CommonJS import
import { AwsCredentialIdentity } from '@smithy/types';
import { assumeRole, JOEY_CREDS, JOEY_CROSS_CREDS } from './assume-rule';
// const { BCMDataExportsClient, ListExportsCommand } = require("@aws-sdk/client-bcm-data-exports"); // CommonJS import

async function getExportWithAssumeRole() {
  const credentials = await assumeRole();
  if (credentials) {
    await getExport(credentials);
  } else {
    console.log('Failed to assume role.');
  }
}

async function getExport(credentials?: AwsCredentialIdentity | null) {
  const creds = credentials || JOEY_CREDS;
  console.log(creds);

  const client = new BCMDataExportsClient({
    credentials: creds,
  });
  const input = {
    // GetExportRequest
    // ExportArn: 'arn:aws:bcm-data-exports:us-east-1:070284094934:export/CostUsageReport_20240401-a85bb64f-39d2-4be9-908a-c3dfbcdc2834',
    ExportArn: 'arn:aws:bcm-data-exports:us-east-1:070284094934:export/CUR_FOR_CROSS_ACCOUNT-70550114-8178-4de0-8ac5-738299c385e5', // required
  };
  const command = new GetExportCommand(input);
  const response = await client.send(command);
  console.log(JSON.stringify(response, null, 2));
}

async function main() {
  const arg = process.argv.slice(2)[0]; // Skip the first two default args

  if (arg) {
    console.log('assuming a Role');

    await getExportWithAssumeRole();
  } else {
    console.log('NOT assuming a Role');

    await getExport();
  }
}

// To run the main function
main().catch((error) => console.error('Error in main function:', error));
