import * as iam from 'aws-cdk-lib/aws-iam';
import { getEnvVar } from '../utils/env';
import { MANAGED_CUR_TAG } from '../config/aws';

export const bcmInlinePolicy = {
  policyName: 'bcm-cross-account-data-export',
  statements: [
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['bcm-data-exports:ListExports', 'cur:PutReportDefinition', 'cur:DescribeReportDefinitions', 'cur:ListTagsForResource'],
      resources: ['*'],
    }),
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['bcm-data-exports:CreateExport', 'bcm-data-exports:ListTagsForResource', 'bcm-data-exports:TagResource'],
      resources: ['*'],
      conditions: {
        StringEquals: {
          [`aws:RequestTag/${MANAGED_CUR_TAG.key}`]: MANAGED_CUR_TAG.value,
        },
      },
    }),
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['bcm-data-exports:GetExport', 'bcm-data-exports:DeleteExport', 'cur:DeleteReportDefinition'],
      resources: ['*'],
      conditions: {
        StringEquals: {
          [`aws:ResourceTag/${MANAGED_CUR_TAG.key}`]: MANAGED_CUR_TAG.value,
        },
      },
    }),
  ],
};

export const BCM_CROSS_ACCOUNT_ARNS = [getEnvVar('SOURCE_USER_ARN'), getEnvVar('SOURCE_ROLE_ARN')];
