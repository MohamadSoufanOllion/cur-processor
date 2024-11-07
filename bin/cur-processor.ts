#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as dotenv from 'dotenv';
dotenv.config();

import { CurProcessorStack } from '../lib/stacks/cur-processor-stack';
import { PipelineProjectStack } from '../lib/pipeline/cdk-pipeline';
import { ACCOUNTS, QUALIFIER } from '../lib/config/aws';
import { getDefaultStackSynthesizer } from './synth';
import { ClientStack } from '../lib/stacks/client-stack';
import { NameQualifierAspect } from '../lib/aspects/qualifier.aspect';
import { CLIENT_STACK_CONFIG } from '../lib/config/clients.config';
import { CUR_PROCESSOR_STACK_CONFIG } from '../lib/config/cur-processor.config';
import { getEnvVar } from '../lib/utils/env';
console.log('CDK DEFAULT ACCOUNT', process.env.CDK_DEFAULT_ACCOUNT);

const currentAccount = process.env.CDK_DEFAULT_ACCOUNT;

const defaultSourceBucketName = 'temp-cur-source-bucket';

let stack, app;
switch (currentAccount) {
  case ACCOUNTS.INITIAL_SANDBOX: {
    app = new cdk.App();
    stack = new CurProcessorStack(app, `CurProcessorStack/${QUALIFIER}`, {
      stackName: `${QUALIFIER}-CurProcessorStack/`,
      env: { account: ACCOUNTS.INITIAL_SANDBOX, region: process.env.CDK_DEFAULT_REGION },
      ...CUR_PROCESSOR_STACK_CONFIG,
    });
    break;
  }

  case ACCOUNTS.INITIAL_CROSS_ACCOUNT: {
    app = new cdk.App();
    // Create a different stack or configuration for OLLION_CROSS_ACCOUNT
    stack = new ClientStack(app, `CrossAccountStack/${QUALIFIER}`, {
      stackName: `${QUALIFIER}-CrossAccountStack`,
      env: { account: ACCOUNTS.INITIAL_CROSS_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
      // Adjust the region or any other configuration specific to this account
      ...CLIENT_STACK_CONFIG,
      curBucketName: defaultSourceBucketName,
    });
    break;
  }

  default: {
    console.log('CICD ', process.env.CDK_DEFAULT_ACCOUNT);

    app = new cdk.App({ defaultStackSynthesizer: getDefaultStackSynthesizer() });
    stack = new PipelineProjectStack(app, `${QUALIFIER}-CdkPipelineProjectStack`, {
      stackName: `${QUALIFIER}-CdkPipelineProjectStack`,
      env: {
        account: ACCOUNTS.CICD,
        region: 'us-east-1',
      },
      sourceConnectionArn: getEnvVar('GITHUB_SOURCE_CONNECTION_ARN'),
      githubRepoName: getEnvVar('GITHUB_REPO_NAME'),
    });
    break;
  }
}

// Apply the aspect
cdk.Aspects.of(stack).add(new NameQualifierAspect());
app.synth();
