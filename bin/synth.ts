import { DefaultStackSynthesizer } from 'aws-cdk-lib';
import { QUALIFIER } from '../lib/config/aws';

export function getDefaultStackSynthesizer(appName: string = QUALIFIER) {
  return new DefaultStackSynthesizer({
    bootstrapStackVersionSsmParameter: '/${Qualifier}/cdk-bootstrap/version',
    qualifier: appName,
    cloudFormationExecutionRole: 'arn:aws:iam::${AWS::AccountId}:role/${Qualifier}-cdk-cfn-exec-role-${AWS::AccountId}-${AWS::Region}',
    deployRoleArn: 'arn:aws:iam::${AWS::AccountId}:role/${Qualifier}-cdk-deploy-role-${AWS::AccountId}-${AWS::Region}',
    lookupRoleArn: 'arn:aws:iam::${AWS::AccountId}:role/${Qualifier}-cdk-lookup-role-${AWS::AccountId}-${AWS::Region}',
    fileAssetsBucketName: '${Qualifier}-cdk-assets-${AWS::AccountId}-${AWS::Region}',
    fileAssetPublishingRoleArn:
      'arn:aws:iam::${AWS::AccountId}:role/${Qualifier}-cdk-file-publishing-role-${AWS::AccountId}-${AWS::Region}',
    bucketPrefix: appName,
  });
}
