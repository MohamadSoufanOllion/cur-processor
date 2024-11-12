import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import { QUALIFIER } from '../config/aws';

// Custom stack class with automatic naming enforcement
export class QualifiedHearstStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps, prefix: string = QUALIFIER) {
    super(scope, id.startsWith(prefix) ? id : `${prefix}${id}`, props);
  }
}
