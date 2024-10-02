import axios from 'axios';
import * as fs from 'fs';

export class CHTOrganization {
  id: string | undefined;
  name: string | undefined;
  description: string | undefined;
  idp_name: string | undefined;
  flex_org: string | undefined;
  default_organization: string | undefined;
  parent_organization_id: string | undefined;
  assigned_users_count: number | undefined;
  num_aws_accounts: number | undefined;
  num_azure_subscriptions: number | undefined;
  num_gcp_compute_projects: number | undefined;
  num_data_center_accounts: number | undefined;
  num_vmware_csp_organizations: number | undefined;
  aws_accounts: any[] | undefined;
  azure_subscriptions: any[] | undefined;
  gcp_compute_projects: any[] | undefined;
  data_center_accounts: any[] | undefined;
  vmware_csp_organizations: any[] | undefined;

  enrich_object(method_name: string, value: any): void {
    const validMethods = [
      'aws_accounts',
      'azure_subscriptions',
      'gcp_compute_projects',
      'data_center_accounts',
      'vmware_csp_organizations',
    ];
    if (validMethods.includes(method_name)) {
      (this as any)[method_name] = value;
    } else {
      throw new Error(`Invalid method to enrich, valid choices are only: ${validMethods.join(', ')}`);
    }
  }

  static parse_api(response: any): CHTOrganization {
    const org = new CHTOrganization();
    org.id = response['id'];
    org.name = response['name'];
    org.description = response['description'];
    org.idp_name = response['idp_name'];
    org.flex_org = response['flex_org'];
    org.default_organization = response['default_organization'];
    org.parent_organization_id = response['parent_organization_id'];
    org.assigned_users_count = response['assigned_users_count'];
    org.num_aws_accounts = response['num_aws_accounts'];
    org.num_azure_subscriptions = response['num_azure_subscriptions'];
    org.num_gcp_compute_projects = response['num_gcp_compute_projects'];
    org.num_data_center_accounts = response['num_data_center_accounts'];
    org.num_vmware_csp_organizations = response['num_vmware_csp_organizations'];
    org.aws_accounts = response['aws_accounts'];
    org.azure_subscriptions = response['azure_subscriptions'];
    org.gcp_compute_projects = response['gcp_compute_projects'];
    org.data_center_accounts = response['data_center_accounts'];
    org.vmware_csp_organizations = response['vmware_csp_organizations'];

    return org;
  }

  print_csv_header_to_file(csvout: string): void {
    const header = [
      'id',
      'name',
      'description',
      'idp_name',
      'flex_org',
      'default_organization',
      'parent_organization_id',
      'assigned_users_count',
      'num_aws_accounts',
      'num_azure_subscriptions',
      'num_gcp_compute_projects',
      'num_data_center_accounts',
      'num_vmware_csp_organizations',
      'aws_accounts',
      'azure_subscriptions',
      'gcp_compute_projects',
      'data_center_accounts',
      'vmware_csp_organizations',
    ];

    fs.appendFileSync(csvout, header.join(',') + '\n');
  }

  print_csv_record_to_file(csvout: string): void {
    const record = [
      this.id,
      this.name,
      this.description,
      this.idp_name,
      this.flex_org,
      this.default_organization,
      this.parent_organization_id,
      this.assigned_users_count,
      this.num_aws_accounts,
      this.num_azure_subscriptions,
      this.num_gcp_compute_projects,
      this.num_data_center_accounts,
      this.num_vmware_csp_organizations,
      this.aws_accounts,
      this.azure_subscriptions,
      this.gcp_compute_projects,
      this.data_center_accounts,
      this.vmware_csp_organizations,
    ];

    fs.appendFileSync(csvout, record.join(',') + '\n');
  }

  toMap(): { [key: string]: any } {
    const map: { [key: string]: any } = {};
    Object.keys(this).forEach((key) => {
      map[key] = (this as any)[key];
    });
    return map;
  }

  toJSON(): string {
    return JSON.stringify(this.toMap());
  }
}

export class CHTAccount {
  id: string | undefined;
  owner_id: string | undefined;
  name: string | undefined;
  amazon_name: string | undefined;
  payer_account: string | undefined;
  payer_account_id: string | undefined;
  cloud_account: string | undefined;
  region: string | undefined;
  created_at: string | undefined;
  updated_at: string | undefined;
  account_type: string | undefined;
  cluster_name: string | undefined;
  status: string | undefined;
  state: string | undefined;
  authentication_type: string | undefined;
  tags: any[] | undefined;

  enrich_object(method_name: string, value: string): void {
    const validValues = ['aws_accounts', 'azure_subscriptions', 'gcp_compute_projects', 'data_center_accounts', 'vmware_csp_organizations'];
    if (validValues.includes(value)) {
      if (method_name === 'cloud_account') {
        (this as any)[method_name] = value;
      } else {
        throw new Error('Invalid method to enrich, valid choices are only: cloud_account');
      }
    } else {
      throw new Error(`Invalid value to enrich, valid choices are only: ${validValues.join(', ')}`);
    }
  }

  static parse_api(response: any): CHTAccount {
    const account = new CHTAccount();
    account.id = response['id'];
    account.owner_id = response['owner_id'];
    account.name = response['name'];
    account.amazon_name = response['amazon_name'];
    account.payer_account = response['payer_account'];
    account.payer_account_id = response['payer_account_id'];
    account.region = response['region'];
    account.created_at = response['created_at'];
    account.updated_at = response['updated_at'];
    account.account_type = response['account_type'];
    account.cluster_name = response['cluster_name'];
    account.status = response['status'];
    account.state = response['state'];
    account.authentication_type = response['authentication_type'];
    account.tags = response['tags'];
    return account;
  }

  print_csv_header_to_file(csvout: string): void {
    const header = [
      'id',
      'owner_id',
      'name',
      'amazon_name',
      'payer_account',
      'payer_account_id',
      'cloud_account',
      'region',
      'created_at',
      'updated_at',
      'account_type',
      'cluster_name',
      'status',
      'state',
      'authentication_type',
      'tags',
    ];

    fs.appendFileSync(csvout, header.join(',') + '\n');
  }

  print_csv_record_to_file(csvout: string): void {
    const record = [
      this.id,
      this.owner_id,
      this.name,
      this.amazon_name,
      this.payer_account,
      this.payer_account_id,
      this.cloud_account,
      this.region,
      this.created_at,
      this.updated_at,
      this.account_type,
      this.cluster_name,
      this.status,
      this.state,
      this.authentication_type,
      this.tags,
    ];

    fs.appendFileSync(csvout, record.join(',') + '\n');
  }

  toMap(): { [key: string]: any } {
    const map: { [key: string]: any } = {};
    Object.keys(this).forEach((key) => {
      map[key] = (this as any)[key];
    });
    return map;
  }

  toJSON(): string {
    return JSON.stringify(this.toMap());
  }
}

// HTTP Request functions using Axios
async function getSomething(url: string, api_key: string, parameters: any): Promise<any> {
  try {
    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${api_key}`,
        'Accept-Encoding': 'gzip',
      },
      params: parameters,
    });
    if (response.status === 200) {
      return response.data;
    } else {
      console.log(`Failure: ${response.data.error.errorMessage}`);
      return null;
    }
  } catch (error) {
    console.error(`Error from axios.get(${url}): ${error}`);
    return null;
  }
}

// Example function for enabling AWS account
async function enableAwsAccount(api_key: string, account_id: string, parameters: any): Promise<void> {
  const url = `https://chapi.cloudhealthtech.com/v1/aws_accounts/${account_id}`;
  console.log(`Enabling account ${parameters['name']}`);
  const response = await putSomething(url, api_key, parameters);
  console.log(response);
}

// PUT request function
async function putSomething(url: string, api_key: string, parameters: any): Promise<any> {
  try {
    const response = await axios.put(url, parameters, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${api_key}`,
        'Accept-Encoding': 'gzip',
      },
    });
    if (response.status === 200) {
      return response.data;
    } else {
      console.log(`Failure: ${response.data.error.errorMessage}`);
      return null;
    }
  } catch (error) {
    console.error(`Error from axios.put(${url}): ${error}`);
    return null;
  }
}

// Example usage of CHTOrganization class and the related functions

export async function getOrganizations(api_key: string): Promise<CHTOrganization[]> {
  const total_org_list: CHTOrganization[] = [];
  const per_page = 100;

  const parameters = {
    per_page,
  };

  const url = 'https://chapi.cloudhealthtech.com/v2/organizations';

  console.log(`Getting the first batch of ${per_page} organization results`);
  const response = await getSomething(url, api_key, parameters);

  if (response && response.organizations) {
    total_org_list.push(...response.organizations.map((org: any) => CHTOrganization.parse_api(org)));
  }

  let i = 2;
  let get_more = response && response._links && response._links.next ? true : false;

  while (get_more) {
    console.log(`Getting the ${i} batch of ${per_page} organization results`);

    const nextResponse = await getSomething(url, api_key, { per_page, page: i });
    if (nextResponse && nextResponse.organizations.length > 0) {
      total_org_list.push(...nextResponse.organizations.map((org: any) => CHTOrganization.parse_api(org)));
      i += 1;
    }

    get_more = nextResponse && nextResponse._links && nextResponse._links.next ? true : false;
  }

  console.log(`Total number of organizations: ${total_org_list.length}`);
  return total_org_list;
}

// Getting accounts from an organization
export async function getOrganizationAccounts(api_key: string, org_id: string, cloud_account: string): Promise<CHTAccount[]> {
  const total_account_list: CHTAccount[] = [];
  const per_page = 100;

  const parameters = {
    per_page,
  };

  const url = `https://chapi.cloudhealthtech.com/v2/organizations/${org_id}/${cloud_account}`;

  console.log(`Getting the first batch of ${per_page} account results`);
  const response = await getSomething(url, api_key, parameters);

  if (response && response.accounts) {
    total_account_list.push(...response.accounts.map((acc: any) => CHTAccount.parse_api(acc)));
  }

  let i = 2;
  let get_more = response && response._links && response._links.next ? true : false;

  while (get_more) {
    console.log(`Getting the ${i} batch of ${per_page} account results`);

    const nextResponse = await getSomething(url, api_key, { per_page, page: i });
    if (nextResponse && nextResponse.accounts.length > 0) {
      total_account_list.push(...nextResponse.accounts.map((acc: any) => CHTAccount.parse_api(acc)));
      i += 1;
    }

    get_more = nextResponse && nextResponse._links && nextResponse._links.next ? true : false;
  }

  console.log(`Total number of accounts: ${total_account_list.length}`);
  return total_account_list;
}

// Example usage of organization and accounts fetching
// async function main() {
//   const api_key = process.env.API_KEY || 'your_api_key_here';

//   // Fetch all organizations
//   const organizations = await getOrganizations(api_key);

//   // Fetch accounts for each organization
//   for (const org of organizations) {
//     if (org.id) {
//       const aws_accounts = await getOrganizationAccounts(api_key, org.id, 'aws_accounts');
//       org.enrich_object('aws_accounts', aws_accounts);
//     }
//   }

//   // Example saving to CSV
//   const csvout = './organizations.csv';
//   organizations[0].print_csv_header_to_file(csvout);
//   organizations.forEach((org) => org.print_csv_record_to_file(csvout));

//   console.log(`Organization and account details saved to ${csvout}`);
// }

// main().catch((error) => console.error(error));
