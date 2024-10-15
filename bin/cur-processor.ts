#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CurProcessorStack } from '../lib/stacks/cur-processor-stack';
import { MyCdkPipelineProjectStack } from '../lib/pipeline/cdk-pipeline';
import { ACCOUNTS } from '../lib/config/aws';
import { getDefaultStackSynthesizer } from './synth';

const app = new cdk.App();

new CurProcessorStack(app, 'CurProcessorStack', {
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */
  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  env: { account: ACCOUNTS.OLLION_SANDBOX, region: process.env.CDK_DEFAULT_REGION },
  /* Uncomment the next line if you know exactly what Account and Region you
   * want to deploy the stack to. */
  // env: { account: '123456789012', region: 'us-east-1' },
  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});

// const app = new cdk.App({ defaultStackSynthesizer: getDefaultStackSynthesizer() });

// new MyCdkPipelineProjectStack(app, 'MyCdkPipelineProjectStack', {
//   env: {
//     account: ACCOUNTS.CICD,
//     region: 'us-east-1',
//   },
// });
