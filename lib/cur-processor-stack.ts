import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
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

const EMAIL_ADDRESS_FOR_NOTIFICATIONS = 'mohamad.soufan@ollion.com';

export class CurProcessorStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'CurProcessorQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)

    const curBucket = new s3.Bucket(this, 'CURBucket', {
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
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
    // Create SNS Topic
    const snsTopic = new sns.Topic(this, 'DataProcessingSNSTopic', {
      displayName: 'Data Processing Notifications',
    });

    // Optionally, add subscriptions to the topic
    snsTopic.addSubscription(new snsSubscriptions.EmailSubscription(EMAIL_ADDRESS_FOR_NOTIFICATIONS));

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

    processedDataBucket.grantWrite(curProcessingLambda);
    curBucket.grantRead(curProcessingLambda);

    processedDataBucket.grantWrite(dataRefreshLambda);
    curBucket.grantRead(dataRefreshLambda);

    snsTopic.grantPublish(curProcessingLambda);
    snsTopic.grantPublish(dataRefreshLambda);

    const glueRole = new iam.Role(this, 'GlueJobRole', {
      assumedBy: new iam.ServicePrincipal('glue.amazonaws.com'),
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSGlueServiceRole')],
    });

    const curParsingJob = new glue.CfnJob(this, 'CURParsingJob', {
      role: glueRole.roleArn,
      command: {
        name: 'glueetl',
        scriptLocation: `s3://${scriptBucket.bucketName}/scripts/cur_parsing.py`,
        pythonVersion: '3',
      },
      defaultArguments: {
        '--additional-python-modules': 'pandas,polars',
        '--enable-metrics': '',
      },
      maxCapacity: 2.0,
    });

    const glueCrawler = new glue.CfnCrawler(this, 'ProcessedDataCrawler', {
      role: glueRole.roleArn,
      databaseName: 'cur_processed_data',
      targets: {
        s3Targets: [
          {
            path: `s3://${processedDataBucket.bucketName}/`,
          },
        ],
      },
      schedule: {
        scheduleExpression: 'cron(0 0 1 * ? *)', // Runs monthly
      },
    });

    const database = new glue.CfnDatabase(this, 'AthenaDatabase', {
      catalogId: this.account,
      databaseInput: {
        name: 'cur_processed_data',
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
