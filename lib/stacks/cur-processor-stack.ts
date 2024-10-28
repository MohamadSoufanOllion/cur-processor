import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

import * as glue from 'aws-cdk-lib/aws-glue';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as athena from 'aws-cdk-lib/aws-athena';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as sagemaker from 'aws-cdk-lib/aws-sagemaker';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';

import * as path from 'path';
import { createQuickSightResources } from '../constructs/quick-sight';
import { ACCOUNTS } from '../config/aws';

const EMAIL_ADDRESS_FOR_NOTIFICATIONS = 'mohamad.soufan@ollion.com';
const CUR_REPORT_FOLDER_DESTINATION = 'cur-data';

const sourceReplicationRolesArns = [
  `arn:aws:iam::${ACCOUNTS.INITIAL_CROSS_ACCOUNT}:role/CrossAccountStack-ReplicationRoleCE149CEC-uCXlV4L5GME2`,
];
export class CurProcessorStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    const curBucket = new s3.Bucket(this, 'CURBucket', {
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const clientsReplicationsPrincipals = sourceReplicationRolesArns.map((arn) => new iam.ArnPrincipal(arn));
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

    const processedDataBucket = new s3.Bucket(this, 'ProcessedDataBucket', {
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const scriptBucket = new s3.Bucket(this, 'ScriptBucket', {
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    createQuickSightResources(this);

    // Create SNS Topic
    const snsTopic = new sns.Topic(this, 'DataProcessingSNSTopic', {
      displayName: 'Data Processing Notifications',
    });

    // Optionally, add subscriptions to the topic
    // snsTopic.addSubscription(new snsSubscriptions.EmailSubscription(EMAIL_ADDRESS_FOR_NOTIFICATIONS));

    // CUR Processing Lambda
    const curProcessingLambda = new lambda.Function(this, 'CURProcessingLambda', {
      runtime: lambda.Runtime.PYTHON_3_8,
      handler: 'cur_processing_handler.main',
      code: lambda.Code.fromAsset(path.join('lambda/cur_processing')),
      environment: {
        PROCESSED_BUCKET_NAME: processedDataBucket.bucketName,
        SNS_TOPIC_ARN: snsTopic.topicArn,
      },
    });

    // Data Refresh Lambda
    const dataRefreshLambda = new lambda.Function(this, 'DataRefreshLambda', {
      runtime: lambda.Runtime.PYTHON_3_8,
      handler: 'data_refresh_handler.main',
      code: lambda.Code.fromAsset(path.join('lambda/data_refresh')),
      environment: {
        CUR_BUCKET_NAME: curBucket.bucketName,
        PROCESSED_BUCKET_NAME: processedDataBucket.bucketName,
        SNS_TOPIC_ARN: snsTopic.topicArn,
      },
    });

    // Define the Lambda function
    // const cloudhealth = new NodejsFunction(this, 'cloudHealthLambda', {
    //   entry: path.join(__dirname, '../lambda', '/cloudhealth/cldv3.ts'), // accepts .js, .jsx, .cjs, .mjs, .ts, .tsx, .cts and .mts files
    //   handler: 'main', // defaults to 'handler'
    //   bundling: {
    //     // Use esbuild to bundle the Lambda with axios
    //     minify: true,
    //     // externalModules: ['aws-sdk'], // aws-sdk is provided by the Lambda runtime
    //     esbuildArgs: {
    //       '--packages': 'bundle',
    //     },
    //   },
    //   memorySize: 128,
    //   timeout: cdk.Duration.seconds(30),
    // });

    // Create a custom policy to add HeadObject permission
    const headObjectPolicy = new iam.PolicyStatement({
      actions: ['s3:HeadObject'],
      resources: [curBucket.bucketArn + '/*'],
    });

    // Attach the custom policy to the Lambda function's role
    curProcessingLambda.addToRolePolicy(headObjectPolicy);
    curBucket.grantRead(curProcessingLambda);
    processedDataBucket.grantWrite(curProcessingLambda);

    dataRefreshLambda.addToRolePolicy(headObjectPolicy);
    curBucket.grantRead(dataRefreshLambda);
    processedDataBucket.grantWrite(dataRefreshLambda);

    snsTopic.grantPublish(curProcessingLambda);
    snsTopic.grantPublish(dataRefreshLambda);

    const glueRole = new iam.Role(this, 'GlueJobRole', {
      assumedBy: new iam.ServicePrincipal('glue.amazonaws.com'),
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSGlueServiceRole')],
    });
    glueRole.addToPolicy(headObjectPolicy);
    curBucket.grantRead(glueRole);

    // const curParsingJob = new glue.CfnJob(this, 'CURParsingJob', {
    //   role: glueRole.roleArn,
    //   command: {
    //     name: 'glueetl',
    //     scriptLocation: `s3://${scriptBucket.bucketName}/scripts/cur_parsing.py`,
    //     pythonVersion: '3',
    //   },
    //   defaultArguments: {
    //     '--additional-python-modules': 'pandas,polars',
    //     '--enable-metrics': '',
    //   },
    //   maxCapacity: 2.0,
    // });

    const dbName = 'cur-processed-data';
    const database = new glue.CfnDatabase(this, 'GlueDatabase', {
      catalogId: this.account,
      databaseInput: {
        name: dbName,
      },
    });
    const onceEvery12Hours = 'cron(0 0/12 * * ? *)';

    // s3://curprocessorstack-curbucket1acad2a6-josrlebznwwi/cur-data/CurProcessorExport/data/BILLING_PERIOD=2024-07/CurProcessorExport-00001.snappy.parquet
    const glueCrawler = new glue.CfnCrawler(this, 'ProcessedDataCrawler', {
      role: glueRole.roleArn,
      databaseName: database.ref,
      name: 'cur-crawler',
      targets: {
        s3Targets: [
          {
            path: `s3://${curBucket.bucketName}/${CUR_REPORT_FOLDER_DESTINATION}/CurProcessorExport/data/BILLING_PERIOD=2024-07/`,
          },
        ],
      },
      schedule: {
        scheduleExpression: onceEvery12Hours, // Runs every 12
      },
    });

    const workgroup = new athena.CfnWorkGroup(this, 'AthenaWorkgroup', {
      name: 'cur-workgroup',
      state: 'ENABLED',
      workGroupConfiguration: {
        enforceWorkGroupConfiguration: true,
        publishCloudWatchMetricsEnabled: true,
        requesterPaysEnabled: false,
      },
    });

    // Trigger Data Refresh Lambda Monthly
    const rule = new events.Rule(this, 'MonthlyDataRefreshRule', {
      schedule: events.Schedule.rate(cdk.Duration.days(30)),
    });

    rule.addTarget(new targets.LambdaFunction(dataRefreshLambda));

    // S3 Event Notification for CUR Processing
    curBucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3n.LambdaDestination(curProcessingLambda));

    const sagemakerRole = new iam.Role(this, 'SageMakerRole', {
      assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess')],
    });

    sagemakerRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['sts:AssumeRole'],
        resources: ['arn:aws:iam::309136773508:role/OllionDataExport', 'arn:aws:iam::070284094934:role/CUR-cross-account'],
      }),
    );

    const notebookInstance = new sagemaker.CfnNotebookInstance(this, 'NotebookInstance', {
      instanceType: 'ml.t2.medium',
      roleArn: sagemakerRole.roleArn,
      notebookInstanceName: 'CURProcessingNotebook',
      volumeSizeInGb: 10,
      directInternetAccess: 'Enabled',
      rootAccess: 'Enabled',
    });
  }
}
