#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CurProcessorStack } from '../lib/stacks/cur-processor-stack';
import { MyCdkPipelineProjectStack } from '../lib/pipeline/cdk-pipeline';
import { ACCOUNTS } from '../lib/config/aws';
import { getDefaultStackSynthesizer } from './synth';

console.log('CDK DEFAULT ACCOUNT', process.env.CDK_DEFAULT_ACCOUNT);

if (process.env.CDK_DEFAULT_ACCOUNT === ACCOUNTS.OLLION_SANDBOX) {
  const app = new cdk.App();
  new CurProcessorStack(app, 'CurProcessorStack', {
    env: { account: ACCOUNTS.OLLION_SANDBOX, region: process.env.CDK_DEFAULT_REGION },
  });
} else {
  const app = new cdk.App({ defaultStackSynthesizer: getDefaultStackSynthesizer() });
  new MyCdkPipelineProjectStack(app, 'MyCdkPipelineProjectStack', {
    env: {
      account: ACCOUNTS.CICD,
      region: 'us-east-1',
    },
  });
}
