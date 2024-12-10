import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { CodeBuildStep, CodePipeline, CodePipelineSource } from 'aws-cdk-lib/pipelines';
import { S3BucketStack } from '../stacks/primitive-stack';
import { ClientStack, ClientStackProps } from '../stacks/client-stack';
import { ACCOUNTS, QUALIFIER } from '../config/aws';
import { CODE_BUILD_ENV_VARS, ENVIRONMENT } from '../config/environment';
import { CurProcessorStack, CurProcessorStackProps } from '../stacks/cur-processor-stack';
import { CUR_PROCESSOR_STACK_CONFIG } from '../config/cur-processor.config';
import { CLIENT_STACK_CONFIG } from '../config/clients.config';

export interface PipelineStackProps extends cdk.StackProps {
  githubRepoName: string;
  sourceConnectionArn: string; // Replace with actual destination bucket ARN
}

export class PipelineProjectStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    const pipeline = new CodePipeline(this, 'Pipeline', {
      pipelineName: `${QUALIFIER}-CurProcessorCDKPipeline`,
      crossAccountKeys: true, // Enable cross-account KMS encryption
      synth: new CodeBuildStep('Synth', {
        input: CodePipelineSource.connection(props.githubRepoName, 'ci-cd', { connectionArn: props.sourceConnectionArn }),
        commands: ['npm ci', 'npm run build', 'npx cdk synth'],
        projectName: `${QUALIFIER}-CDK-Synth-CodeBuild-Project`,
        env: ENVIRONMENT,
      }),
      selfMutation: false,
      selfMutationCodeBuildDefaults: { buildEnvironment: { environmentVariables: CODE_BUILD_ENV_VARS } },
    });

    // this.addStageForMultipleRegions(pipeline, 'S3Deployment', S3BucketStack, [
    //   //   { account: ACCOUNTS.OLLION_SANDBOX, region: 'us-east-1' },
    //   { account: ACCOUNTS.QUICKSIGHT, region: 'us-east-1' },
    //   { account: ACCOUNTS.NON_PROD_APP, region: 'us-east-1' },
    // ]);

    this.addStageForMultipleRegions(
      pipeline,
      'CurProcessor',
      CurProcessorStack,
      [
        //   { account: ACCOUNTS.OLLION_SANDBOX, region: 'us-east-1' },
        { account: ACCOUNTS.QUICKSIGHT, region: 'us-east-1' },
      ],
      { ...CUR_PROCESSOR_STACK_CONFIG } as CurProcessorStackProps,
    );

    // Add ClientStack for multiple regions and accounts
    this.addStageForMultipleRegions(
      pipeline,
      'ClientStackDeployment',
      ClientStack,
      [
        //   { account: ACCOUNTS.OLLION_SANDBOX, region: 'us-east-1' },
        { account: ACCOUNTS.NON_PROD_APP, region: 'us-east-1' },
      ],
      { ...CLIENT_STACK_CONFIG, curBucketName: `cur-data-export-bucket` } as ClientStackProps,
    );
    
  }

  // Helper function to add stages for various account/region combos
  private addStageForMultipleRegions(
    pipeline: CodePipeline,
    stageName: string,
    stack: typeof cdk.Stack,
    targets: { account: string; region: string }[],
    stackProps?: cdk.StackProps,
  ) {
    for (const target of targets) {
      pipeline.addStage(
        new DeployStage(this, `${QUALIFIER}-${stageName}-${target.account}-${target.region}`, stack, {
          ...stackProps,
          env: target,
        }),
      );
    }
  }
}

class DeployStage extends cdk.Stage {
  constructor(scope: Construct, id: string, stack: typeof cdk.Stack, props: cdk.StackProps) {
    super(scope, id, { env: props.env });

    new stack(this, `${QUALIFIER}-${stack.name}-${props.env!.region}`, props);
  }
}
