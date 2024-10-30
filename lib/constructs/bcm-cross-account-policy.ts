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

export const bcmBucketPolicy = {
  Version: '2012-10-17',
  Statement: [
    {
      Effect: 'Allow',
      Principal: {
        Service: ['billingreports.amazonaws.com', 'bcm-data-exports.amazonaws.com'],
      },
      Action: ['s3:PutObject', 's3:GetBucketPolicy'],
      Resource: ['arn:aws:s3:::', 'arn:aws:s3:::/*'],
      Condition: {
        StringLike: {
          'aws:SourceArn': ['arn:aws:cur:us-east-1:187940856853:definition/*', 'arn:aws:bcm-data-exports:us-east-1:187940856853:export/*'],
          'aws:SourceAccount': '187940856853',
        },
      },
    },
  ],
};

// Define the structure for the parameters needed to configure the policy
interface BcmBucketPolicyParams {
  bucketArn: string;
  accountNumber: string;
  region: string;
}

// Function to build the common policy structure
const buildBcmBucketPolicyStructure = ({ bucketArn, accountNumber, region }: BcmBucketPolicyParams) => ({
  sid: 'EnableAWSDataExportsToWriteToS3AndCheckPolicy',
  effect: 'Allow' as iam.Effect.ALLOW,
  principals: [new iam.ServicePrincipal('billingreports.amazonaws.com'), new iam.ServicePrincipal('bcm-data-exports.amazonaws.com')],
  actions: ['s3:PutObject', 's3:GetBucketPolicy'],
  resources: [bucketArn, `${bucketArn}/*`],
  conditions: {
    StringLike: {
      'aws:SourceArn': [
        `arn:aws:cur:${region}:${accountNumber}:definition/*`,
        `arn:aws:bcm-data-exports:${region}:${accountNumber}:export/*`,
      ],
      'aws:SourceAccount': accountNumber,
    },
  },
});

// Create a function that returns a configured PolicyStatement based on input parameters
export const bcmBucketPolicyStatement = (params: BcmBucketPolicyParams): iam.PolicyStatement => {
  const policyStructure = buildBcmBucketPolicyStructure(params);
  return new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    sid: policyStructure.sid,
    principals: policyStructure.principals,
    actions: policyStructure.actions,
    resources: policyStructure.resources,
    conditions: policyStructure.conditions,
  });
};

// Define a function to generate the CloudFormation-compatible policy document based on the provided parameters
export const bcmCfnBucketPolicyStatement = (params: BcmBucketPolicyParams): { Version: string; Statement: any[] } => {
  const policyStructure = buildBcmBucketPolicyStructure(params);
  return {
    Version: '2012-10-17',
    Statement: [
      {
        Sid: policyStructure.sid,
        Effect: policyStructure.effect,
        Principal: {
          Service: policyStructure.principals.map((p) => (p as iam.ServicePrincipal).service),
        },
        Action: policyStructure.actions,
        Resource: policyStructure.resources,
        Condition: policyStructure.conditions,
      },
    ],
  };
};

export const BCM_CROSS_ACCOUNT_ARNS = [getEnvVar('SOURCE_USER_ARN'), getEnvVar('SOURCE_ROLE_ARN')];
