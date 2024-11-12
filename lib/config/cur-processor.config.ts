import { ACCOUNTS } from './aws';

export const CUR_PROCESSOR_STACK_CONFIG = {
  sourceReplicationRolesArns: [
    // `arn:aws:iam::${ACCOUNTS.INITIAL_CROSS_ACCOUNT}:role/CrossAccountStack-ReplicationRoleCE149CEC-uCXlV4L5GME2`,
    `arn:aws:iam::${ACCOUNTS.NON_PROD_APP}:role/alo-ClientStackDeployment-9-ReplicationRoleCE149CEC-bh6HwFBCAFbV`,
  ],
  clientsBcmCrossAccountRolesArns: [
    `arn:aws:iam::${ACCOUNTS.NON_PROD_APP}:role/alo-ClientStackDeployment-CURDataExportCrossAccount-CEgJgR0VmEGB`,
  ],
};
