import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

import { CodeBuildStep, CodePipeline, CodePipelineSource, ShellStep } from 'aws-cdk-lib/pipelines';
import { S3BucketStack } from '../stacks/primitive-stack';
import { ClientStack } from '../stacks/client-stack';
import { ACCOUNTS, QUALIFIER } from '../config/aws';
import { getEnvVar } from '../utils/env';
import { CODE_BUILD_ENV_VARS, ENVIRONMENT } from '../config/environment';

const sourceConnectionArn = getEnvVar('GITHUB_SOURCE_CONNECTION_ARN');
const githubRepoName = getEnvVar('GITHUB_REPO_NAME');
export class MyCdkPipelineProjectStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Assuming the secret is stored as 'my-github-token' in Secrets Manager
    // const oauthToken = secretsmanager.Secret.fromSecretNameV2(this, 'GithubToken', GITHUB_TOKEN_SECRET_NAME);

    const pipeline = new CodePipeline(this, 'Pipeline', {
      pipelineName: `${QUALIFIER}-CurProcessorCDKPipeline`,
      crossAccountKeys: true, // Enable cross-account KMS encryption
      synth: new CodeBuildStep('Synth', {
        input: CodePipelineSource.connection(githubRepoName, 'ci-cd', { connectionArn: sourceConnectionArn }),
        commands: ['npm ci', 'npm run build', 'npx cdk synth'],
        projectName: `${QUALIFIER}-CDK-Synth-CodeBuild-Project`,
        env: ENVIRONMENT,
      }),
      selfMutationCodeBuildDefaults: { buildEnvironment: { environmentVariables: CODE_BUILD_ENV_VARS } },
    });

    // new cdk.CfnOutput(this, 'sdfa', { value: 'sdf' });

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
    stack: typeof cdk.Stack,
    targets: { account: string; region: string }[],
  ) {
    for (const target of targets) {
      pipeline.addStage(
        new DeployStage(this, `${QUALIFIER}-${stageName}-${target.account}-${target.region}`, {
          env: target,
          stack,
        }),
      );
    }
  }
}

class DeployStage extends cdk.Stage {
  constructor(scope: Construct, id: string, props: { env: cdk.Environment; stack: typeof cdk.Stack }) {
    super(scope, id, { env: props.env });

    new props.stack(this, `${QUALIFIER}-${props.stack.name}-${props.env.region}`, { env: props.env });
  }
}
