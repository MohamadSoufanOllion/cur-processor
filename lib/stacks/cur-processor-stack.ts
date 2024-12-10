import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sagemaker from 'aws-cdk-lib/aws-sagemaker';

import { createQuickSightResources } from '../constructs/quick-sight';
import { bcmBucketPolicyStatement } from '../constructs/bcm-cross-account-policy';
import { QualifiedHearstStack } from '../constructs/qualified-hearst-stack';
import { QUALIFIER } from '../config/aws';
import { createCurProcessorResources } from '../constructs/cur-processor';

export interface CurProcessorStackProps extends cdk.StackProps {
  curBucketName?: string;
  sourceReplicationRolesArns: string[];
  clientsBcmCrossAccountRolesArns: string[];
}
export class CurProcessorStack extends QualifiedHearstStack {
  constructor(scope: Construct, id: string, props: CurProcessorStackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    const curBucket = new s3.Bucket(this, 'CURBucket', {
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    curBucket.addToResourcePolicy(
      bcmBucketPolicyStatement({ bucketArn: curBucket.bucketArn, accountNumber: this.account, region: this.region }),
    );
    const clientsReplicationsPrincipals = props.sourceReplicationRolesArns.map((arn) => new iam.ArnPrincipal(arn));
    curBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        principals: clientsReplicationsPrincipals,
        actions: [
          's3:ReplicateDelete',
          's3:ReplicateObject',
          's3:ObjectOwnerOverrideToBucketOwner',
          's3:GetBucketVersioning',
          's3:PutBucketVersioning',
        ],
        resources: [`arn:aws:s3:::${curBucket.bucketName}/*`, `arn:aws:s3:::${curBucket.bucketName}`],
      }),
    );

    new cdk.CfnOutput(this, 'DestBucketArn', {
      value: curBucket.bucketArn,
    });

    // const processedDataBucket = new s3.Bucket(this, 'ProcessedDataBucket', {
    //   versioned: true,
    //   removalPolicy: cdk.RemovalPolicy.DESTROY,
    //   autoDeleteObjects: true,
    // });

    // const scriptBucket = new s3.Bucket(this, 'ScriptBucket', {
    //   versioned: true,
    //   removalPolicy: cdk.RemovalPolicy.DESTROY,
    //   autoDeleteObjects: true,
    // });

    createQuickSightResources(this);

    createCurProcessorResources(this, { curBucket });

    const sagemakerRole = new iam.Role(this, `${QUALIFIER}-SageMakerRole`, {
      assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess')],
    });

    sagemakerRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['sts:AssumeRole'],
        resources: props.clientsBcmCrossAccountRolesArns,
      }),
    );

    const notebookInstance = new sagemaker.CfnNotebookInstance(this, 'NotebookInstance', {
      instanceType: 'ml.t2.medium',
      roleArn: sagemakerRole.roleArn,
      notebookInstanceName: `${QUALIFIER}-CURProcessingNotebook`,
      volumeSizeInGb: 10,
      directInternetAccess: 'Enabled',
      rootAccess: 'Enabled',
    });
  }
}
