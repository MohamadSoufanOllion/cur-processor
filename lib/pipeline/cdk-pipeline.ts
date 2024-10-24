import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CodePipeline, CodePipelineSource, ShellStep } from 'aws-cdk-lib/pipelines';
import { S3BucketStack } from '../stacks/primitive-stack';
import { ClientStack } from '../stacks/secondary-stack';
import { ACCOUNTS } from '../config/aws';

const sourceConnectionArn = 'arn:aws:codeconnections:us-east-1:382938011234:connection/d9d4bae1-f2e7-40dc-8691-188907a4d95d';
export class MyCdkPipelineProjectStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const pipeline = new CodePipeline(this, 'Pipeline', {
      pipelineName: 'MyCDKPipeline',
      crossAccountKeys: true, // Enable cross-account KMS encryption
      synth: new ShellStep('Synth', {
        input: CodePipelineSource.gitHub('MohamadSoufanOllion/cur-processor', 'main'),
        commands: ['npm ci', 'npm run build', 'npx cdk synth'],
      }),
    });

    // Add S3BucketStack for multiple regions and accounts
    this.addStageForMultipleRegions(pipeline, 'S3Deployment', S3BucketStack, [
      //   { account: ACCOUNTS.OLLION_SANDBOX, region: 'us-east-1' },
      { account: ACCOUNTS.QUICKSIGHT, region: 'us-east-1' },
      // Add other account/region combinations as needed
    ]);

    // Add ClientStack for multiple regions and accounts
    // this.addStageForMultipleRegions(pipeline, 'ClientStackDeployment', ClientStack, [
    // //   { account: ACCOUNTS.OLLION_SANDBOX, region: 'us-east-1' },
    //   { account: ACCOUNTS.QUICKSIGHT, region: 'us-east-1' },
    //   // Add other account/region combinations as needed
    // ]);
  }

  // Helper function to add stages for various account/region combos
  private addStageForMultipleRegions(
    pipeline: CodePipeline,
    stageName: string,
    stack: any,
    targets: { account: string; region: string }[],
  ) {
    for (const target of targets) {
      pipeline.addStage(
        new DeployStage(this, `${stageName}-${target.account}-${target.region}`, {
          env: target,
          stack,
        }),
      );
    }
  }
}

class DeployStage extends cdk.Stage {
  constructor(scope: Construct, id: string, props: { env: cdk.Environment; stack: any }) {
    super(scope, id, { env: props.env });

    new props.stack(this, `${props.stack.name}-${props.env.region}`);
  }
}
