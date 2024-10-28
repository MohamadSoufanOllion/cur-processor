#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CurProcessorStack } from '../lib/stacks/cur-processor-stack';
import { MyCdkPipelineProjectStack } from '../lib/pipeline/cdk-pipeline';
import { ACCOUNTS } from '../lib/config/aws';
import { getDefaultStackSynthesizer } from './synth';
import { ClientStack } from '../lib/stacks/client-stack';
import * as dotenv from 'dotenv';

dotenv.config();

console.log('CDK DEFAULT ACCOUNT', process.env.CDK_DEFAULT_ACCOUNT);

const currentAccount = process.env.CDK_DEFAULT_ACCOUNT;

switch (currentAccount) {
  case ACCOUNTS.INITIAL_SANDBOX: {
    const app = new cdk.App();
    new CurProcessorStack(app, 'CurProcessorStack', {
      env: { account: ACCOUNTS.INITIAL_SANDBOX, region: process.env.CDK_DEFAULT_REGION },
    });
    break;
  }

  case ACCOUNTS.INITIAL_CROSS_ACCOUNT: {
    const app = new cdk.App();
    // Create a different stack or configuration for OLLION_CROSS_ACCOUNT
    new ClientStack(app, 'CrossAccountStack', {
      env: { account: ACCOUNTS.INITIAL_CROSS_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
      // Adjust the region or any other configuration specific to this account
    });
    break;
  }

  default: {
    const app = new cdk.App({ defaultStackSynthesizer: getDefaultStackSynthesizer() });
    new MyCdkPipelineProjectStack(app, 'MyCdkPipelineProjectStack', {
      env: {
        account: ACCOUNTS.CICD,
        region: 'us-east-1',
      },
    });
    break;
  }
}
