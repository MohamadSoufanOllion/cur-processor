# AWS CDK Bootstrapping Guide in an Organizational Structure

## Prerequisites
- These instructions apply to CDK V2.
- CDK code examples and recommendations are for CDK C# development, but works also for other languages

## A. Bootstrapping an Account for CDK

1. **Traditional Bootstrapping Challenges**:
   - Vanilla `cdk bootstrap` creates roles with Administrator-level policies.
   - Default roles lack cross-account trusted permissions.
   - Roles are improperly named without a qualifier prefix.

2. **Using Custom CloudFormation Template**:
   - Run the following command to generate the default template and output it to a file:
     ```bash
     cdk bootstrap --show-template > bootstrap-template.yaml --profile {{ aws-cli-profile }}
     ```
   - Save and modify the template:
     - Update resource naming throughout the template:
       - Replace all instances of `cdk-${Qualifier}` with `${Qualifier}-cdk`.
     - Parameter Store naming special case:
       - Before: `Fn::Sub: /cdk-bootstrap/${Qualifier}/version`
       - After: `Fn::Sub: /${Qualifier}/cdk-bootstrap/version`
   - Modify the default value for the qualifier:
     ```yaml
     Qualifier:
       Description: An identifier to distinguish multiple bootstrap stacks in the same environment
       Default: alo  # Previously was 'hnb659fds'
     ```
   - Ensure the "Qualifier" prefix is consistently applied.

3. **Bootstrap Source and Target Accounts**:
   - Use the following command to bootstrap accounts using the modified template:
     ```bash
     cdk bootstrap --template bootstrap-template.yaml --qualifier {{ company-qualifier }} --profile {{ aws-cli-profile }}
     ```
   - Example: For a company qualifier `alo`.
   - Source: where the pipeline runs.
   - Target: application environment (dev, qm, staging, prod).

## B. Create KMS Key

- Ensure the alias matches the project qualifier.
- Configure key policy appropriately.

## C. Create Pipeline Artifacts Bucket

- Define and apply a bucket policy.

## D. Parameter Store Configuration

- Create parameters per environment for VPC, subnets, etc.
- Avoid hardcoding VPC, subnet IDs, and security group IDs.

## E. Cross-Account Parameter Store Patterns

- Use a Custom Resource Lambda and STS for cross-account parameter writing.

## F. Modify the CDK Bootstrap Default Synthesizer

- Customize synthesizer settings in your code.

## G. Limit or Eliminate the Use of `ContextHelper.cs`

- Replace with Template Output-Input pattern or Parameter store values.
- Limit `StringParameter.Lookup` to minimize hardcoded values.

## H. Eliminate Secondary Stacks Not Tied to Pipelines

- Avoid confusion by ensuring code changes are auto-deployed.
- Each GitHub repository should have at least one pipeline.
- Limit the number of pipelines per repo unless necessary.

## I. Override the Default Synthesizer

- Customizing the synthesizer settings can optimize deployments.
- Refer to your specific CDK requirements for implementation.