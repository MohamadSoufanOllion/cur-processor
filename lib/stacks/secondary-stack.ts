import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { ACCOUNTS, EXTERNAL_ID } from '../config/aws';
import { BCM_CROSS_ACCOUNT_ARNS, bcmInlinePolicy } from '../constructs/bcm-cross-account-policy';

const sourceBucketName = 'temp-cur-source-bucket';
const externalId = EXTERNAL_ID;
const bcmCrossAccountArns = BCM_CROSS_ACCOUNT_ARNS;
const destinationBucketArn = 'arn:aws:s3:::curprocessorstack-curbucket1acad2a6-josrlebznwwi'; // Replace with actual destination bucket ARN
const destinationAccount = ACCOUNTS.OLLION_SANDBOX;

export class AnotherStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const arnPrincipals = bcmCrossAccountArns.map((arn) => new iam.ArnPrincipal(arn));
    const bcmCrossAccountRole = new iam.Role(this, 'CUR-Data-Export-Cross-Account-Role', {
      assumedBy: new iam.CompositePrincipal(...arnPrincipals),
      description:
        'This is a role for Sagemaker notebook role from Quicksight account to assume to trigger the CUR generation for he current account',
      externalIds: [externalId],
    });

    bcmCrossAccountRole.attachInlinePolicy(new iam.Policy(this, 'BCMInlinePolicy', bcmInlinePolicy));

    const curSourceAccountNumber = this.account; // Replace with actual account number

    // IAM Role for replication
    const replicationRole = new iam.Role(this, 'ReplicationRole', {
      assumedBy: new iam.ServicePrincipal('s3.amazonaws.com'),
    });

    // Grant read permissions to the replication role from the source bucket
    replicationRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'SourceBucketPermissions',
        actions: [
          's3:GetObject',
          's3:GetObjectVersion',
          's3:GetObjectTagging',
          's3:GetObjectRetention',
          's3:GetObjectVersionTagging',
          's3:GetObjectVersionAcl',
          's3:ListBucket',
          's3:GetObjectVersionForReplication',
          's3:GetObjectLegalHold',
          's3:GetReplicationConfiguration',
        ],
        resources: [
          `arn:aws:s3:::${sourceBucketName}`,
          `arn:aws:s3:::${sourceBucketName}/*`, // Replace with your actual source bucket ARN pattern
        ],
      }),
    );

    replicationRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'DestinationBucketPermissions',
        actions: [
          's3:ReplicateObject',
          's3:ObjectOwnerOverrideToBucketOwner',
          's3:GetObjectVersionTagging',
          's3:ReplicateTags',
          's3:ReplicateDelete',
        ],
        resources: [
          destinationBucketArn,
          `${destinationBucketArn}/*`, // Replace with your actual source bucket ARN pattern
        ],
      }),
    );

    // Define the source bucket
    const curSourceBucket = new s3.CfnBucket(this, 'CURSourceBucket', {
      bucketName: sourceBucketName, // Replace with actual source bucket name
      versioningConfiguration: {
        status: 'Enabled',
      },
      replicationConfiguration: {
        role: replicationRole.roleArn,
        rules: [
          {
            id: 'ReplicateCURCrossAccount',
            status: 'Enabled',
            destination: {
              bucket: destinationBucketArn,
              storageClass: 'STANDARD',
              account: destinationAccount,
              accessControlTranslation: { owner: 'Destination' },
            },
            prefix: `cross-account-cur/${curSourceAccountNumber}`, // Specify folder in source bucket
          },
        ],
      },
    });

    new cdk.CfnOutput(this, 'SourceReplicationRoleArn', {
      value: replicationRole.roleArn,
    });
    new cdk.CfnOutput(this, 'SourceBucketArn', {
      value: curSourceBucket.attrArn,
    });

    // Add permissions allowing the destination role to perform replication actions
    // Creating a policy for the source bucket
    new s3.CfnBucketPolicy(this, 'CURSourceBucketPolicy', {
      bucket: curSourceBucket.ref,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'EnableAWSDataExportsToWriteToS3AndCheckPolicy',
            Effect: 'Allow',
            Principal: {
              Service: ['billingreports.amazonaws.com', 'bcm-data-exports.amazonaws.com'],
            },
            Action: ['s3:PutObject', 's3:GetBucketPolicy'],
            Resource: [curSourceBucket.attrArn, `${curSourceBucket.attrArn}/*`],
            Condition: {
              StringLike: {
                'aws:SourceArn': [
                  `arn:aws:cur:${this.region}:${curSourceAccountNumber}:definition/*`,
                  `arn:aws:bcm-data-exports:${this.region}:${curSourceAccountNumber}:export/*`,
                ],
                'aws:SourceAccount': curSourceAccountNumber,
              },
            },
          },
        ],
      },
    });
  }
}
