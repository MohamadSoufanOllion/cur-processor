import { IAspect, Stack, CfnResource } from 'aws-cdk-lib';
import { IConstruct } from 'constructs';
import { QUALIFIER } from '../config/aws';

export class NameQualifierAspect implements IAspect {
  private readonly qualifier: string;

  constructor(qualifier: string = `${QUALIFIER}-`) {
    this.qualifier = qualifier;
  }

  public visit(node: IConstruct): void {
    if (node instanceof Stack && !node.stackName.startsWith(this.qualifier)) {
      throw new Error(`Stack name "${node.stackName}" must start with prefix "${this.qualifier}".`);
    }

    // if (node instanceof CfnResource) {
    //   const resource = node as CfnResource;

    //   if (resource.cfnProperties && resource.cfnProperties.Name) {
    //     resource.addOverride('Properties.Name', this.prefix + resource.cfnProperties.Name);
    //   }
    //   const logicalId = resource.node.path.split('/').pop();

    //   if (!!logicalId && !logicalId.startsWith(this.qualifier)) {
    //     const newName = this.qualifier + logicalId;

    //     // Check if the name property is available and rename
    //     if (resource.cfnOptions?.metadata?.aws_cdk_resources_name) {
    //       resource.cfnOptions.metadata.aws_cdk_resources_name = newName;
    //     }

    //     // In some cases you may directly modify NAMED resources
    //     try {
    //       // Override the logical ID
    //       resource.overrideLogicalId(newName);
    //     } catch (err) {
    //       console.warn(`Unable to update logical ID for resource ${logicalId}: ${err}`);
    //     }
    //   }
    // }
  }
}
