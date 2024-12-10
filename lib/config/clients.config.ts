import { BCM_CROSS_ACCOUNT_ARNS } from '../constructs/bcm-cross-account-policy';
import { getEnvVar } from '../utils/env';
import { EXTERNAL_ID, ACCOUNTS } from './aws';

export const CLIENT_STACK_CONFIG = {
  externalId: EXTERNAL_ID,
  bcmCrossAccountArns: BCM_CROSS_ACCOUNT_ARNS,
  destinationBucketArn: getEnvVar('DEST_BUCKET_ARN'), // Replace with actual destination bucket ARN
  destinationAccount: ACCOUNTS.QUICKSIGHT,
  dataExportName: 'CrossAccount-CostUsageReport',
};
