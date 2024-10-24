import * as iam from 'aws-cdk-lib/aws-iam';

export const bcmInlinePolicy = {
  policyName: 'bcm-cross-account-data-export',
  statements: [
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['bcm-data-exports:ListExports', 'cur:PutReportDefinition', 'cur:DescribeReportDefinitions', 'cur:ListTagsForResource'],
      resources: ['*'],
    }),
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['bcm-data-exports:CreateExport', 'bcm-data-exports:ListTagsForResource', 'bcm-data-exports:TagResource'],
      resources: ['*'],
      conditions: {
        StringEquals: {
          'aws:RequestTag/ManagedBy': 'OLLION',
        },
      },
    }),
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['bcm-data-exports:GetExport', 'bcm-data-exports:DeleteExport', 'cur:DeleteReportDefinition'],
      resources: ['*'],
      conditions: {
        StringEquals: {
          'aws:ResourceTag/ManagedBy': 'OLLION',
        },
      },
    }),
  ],
};

export const BCM_CROSS_ACCOUNT_ARNS = [
  'arn:aws:iam::187940856853:user/msoufan',
  'arn:aws:iam::187940856853:role/CurProcessorStack-SageMakerRoleD4FCFA3F-P4VcmS7fyBai',
];
