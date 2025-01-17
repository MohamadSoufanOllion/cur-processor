import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { bcmCfnBucketPolicyStatement, bcmInlinePolicy } from '../constructs/bcm-cross-account-policy';
import { QualifiedHearstStack } from '../constructs/qualified-hearst-stack';

export interface ClientStackProps extends cdk.StackProps {
  curBucketName: string;
  destinationBucketArn: string; // Replace with actual destination bucket ARN
  destinationAccount: string;
  bcmCrossAccountArns: string[];
  externalId: string;
}
export class ClientStack extends QualifiedHearstStack {
  constructor(scope: Construct, id: string, props: ClientStackProps) {
    super(scope, id, props);

    const curSourceAccountNumber = this.account; // Replace with actual account number

    const curBucketName = `${curSourceAccountNumber}-${props.curBucketName}`;

    const arnPrincipals = props.bcmCrossAccountArns.map((arn) => new iam.ArnPrincipal(arn));
    const bcmCrossAccountRole = new iam.Role(this, 'CUR-Data-Export-Cross-Account-Role', {
      assumedBy: new iam.CompositePrincipal(...arnPrincipals),
      description:
        'This is a role for Sagemaker notebook role from Quicksight account to assume to trigger the CUR generation for he current account -1',
      externalIds: [props.externalId],
    });

    bcmCrossAccountRole.attachInlinePolicy(new iam.Policy(this, 'BCMInlinePolicy', bcmInlinePolicy));


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
          `arn:aws:s3:::${curBucketName}`,
          `arn:aws:s3:::${curBucketName}/*`, // Replace with your actual source bucket ARN pattern
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
          props.destinationBucketArn,
          `${props.destinationBucketArn}/*`, // Replace with your actual source bucket ARN pattern
        ],
      }),
    );

    // Define the source bucket
    const curSourceBucket = new s3.CfnBucket(this, 'CURSourceBucket', {
      bucketName: curBucketName, // Replace with actual source bucket name
      versioningConfiguration: {
        status: 'Enabled',
      },
      publicAccessBlockConfiguration: {
        blockPublicAcls: true,
        ignorePublicAcls: false,
        blockPublicPolicy: false,
        restrictPublicBuckets: false,
      },
      replicationConfiguration: {
        role: replicationRole.roleArn,
        rules: [
          {
            id: 'ReplicateCURCrossAccount',
            status: 'Enabled',
            destination: {
              bucket: props.destinationBucketArn,
              storageClass: 'STANDARD',
              account: props.destinationAccount,
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
      policyDocument: bcmCfnBucketPolicyStatement({
        bucketArn: curSourceBucket.attrArn,
        accountNumber: curSourceAccountNumber,
        region: this.region,
      }),
    });
  }
}
