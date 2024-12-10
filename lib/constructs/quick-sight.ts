import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';

import { Construct } from 'constructs';
import { QUALIFIER } from '../config/aws';

const CUR_QUICKSIGHT_DATA_PREFIX = 'cur-quicksight';
export const createQuickSightResources = (scope: Construct) => {
  const quickSightCurBucket = new s3.Bucket(scope, `${QUALIFIER}-QuickSightCurBucket`, {
    versioned: true,
    removalPolicy: cdk.RemovalPolicy.DESTROY,
    autoDeleteObjects: true,
  });
  const quickSightIamRole = new iam.Role(scope, `${QUALIFIER}-QuickSightCurRole`, {
    assumedBy: new iam.ServicePrincipal('quicksight.amazonaws.com'),
  });
  quickSightIamRole.addToPolicy(
    new iam.PolicyStatement({
      actions: ['s3:GetObject', 's3:ListBucket'],
      resources: [quickSightCurBucket.bucketArn, `${quickSightCurBucket.bucketArn}/${CUR_QUICKSIGHT_DATA_PREFIX}/*`],
    }),
  );
  quickSightIamRole.addToPolicy(
    new iam.PolicyStatement({
      actions: ['kms:Decrypt', 'kms:GenerateDataKey'],
      resources: ['*'],
      conditions: {
        'ForAnyValue:StringEquals': {
          'kms:ResourceAliases': ['alias/aws/s3'],
        },
      },
    }),
  );
};
