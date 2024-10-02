#!/usr/bin/env node

/**
 * Author: Steven Craig <steven.craig@hearst.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import axios from 'axios';
import * as fs from 'fs';
import { CHTOrganization, CHTAccount, getOrganizations, getOrganizationAccounts } from './class_cloudhealth'; // Import your local modules
import {} from './aws_functions';
import { BLACKBOOK_ACCOUNTS } from './blackbook-accounts';

// Initialize AWS SDK clients
const s3Client = new S3Client({ region: 'us-east-1' });

// Load environment variables
const apiKey: string = process.env.CHT_API_KEY || 'no_valid_default_value';

// Main function to handle the process
async function main() {
  try {
    const response = BLACKBOOK_ACCOUNTS || (await getOrganizations(apiKey));
    console.log(`Found ${response.length} Organizations`);

    let orgList: CHTOrganization[] = [];

    // Process each organization
    // response.forEach((org: any) => {
    //   const organization = new CHTOrganization().parse_api(org);
    //   orgList.push(organization);
    // });

    orgList = response.map((org: any) => CHTOrganization.parse_api(org));

    // Prepare lists for organizations
    let allHearstOrgList: CHTOrganization[] = [];
    let allChildOrgList: CHTOrganization[] = [];
    let totalOrgList: CHTOrganization[] = [];

    const allHearstOrgFilename = 'cht-only-hearst-org-output.json';
    const allChildOrgFilename = 'cht-all-child-org-output.json';
    const totalOrgFilename = 'cht-all-hearst-org-output.json';

    // Enrich organizations with cloud account details
    for (let i = 0; i < orgList.length; i++) {
      const org = orgList[i];

      const accountTypes = [
        'aws_accounts',
        // 'azure_subscriptions',
        // 'gcp_compute_projects',
        // 'data_center_accounts',
        // 'vmware_csp_organizations',
      ];

      for (const accountType of accountTypes) {
        let accountList: CHTAccount[] = [];
        // if (org[`num_${accountType}`] > 0) {
        const accounts = BLACKBOOK_ACCOUNTS || (await getOrganizationAccounts(apiKey, org.id!, accountType));
        accounts.forEach((a: any) => {
          const account = CHTAccount.parse_api(a);
          account.enrich_object('cloud_account', accountType);

          if (!account.owner_id) {
            account.owner_id = account.id;
          }

          accountList.push(account);
        });
        org.enrich_object(accountType, accountList);
        // }
      }

      console.log(`Enriched Org #${i} with cloud account details`);

      if (i < 1) {
        allHearstOrgList.push(org);
      } else {
        allChildOrgList.push(org);
      }
    }

    // Save the enriched organization lists
    console.log(`Saving the initial all-account Org separately as /tmp/${allHearstOrgFilename}`);
    console.log(`Saving subsequent child orgs separately as /tmp/${allChildOrgFilename}`);
    console.log(`Saving everything together as /tmp/${totalOrgFilename}`);

    totalOrgList = [...allHearstOrgList, ...allChildOrgList];

    // Write files locally
    fs.writeFileSync(`/tmp/${allHearstOrgFilename}`, JSON.stringify(allHearstOrgList, null, 2));
    fs.writeFileSync(`/tmp/${allChildOrgFilename}`, JSON.stringify(allChildOrgList, null, 2));
    fs.writeFileSync(`/tmp/${totalOrgFilename}`, JSON.stringify(totalOrgList, null, 2));

    // Upload the files to S3 (optional)
    await uploadToS3(allHearstOrgFilename, `/tmp/${allHearstOrgFilename}`);
    await uploadToS3(allChildOrgFilename, `/tmp/${allChildOrgFilename}`);
    await uploadToS3(totalOrgFilename, `/tmp/${totalOrgFilename}`);
  } catch (error) {
    console.error(`Error occurred: ${error}`);
    process.exit(1);
  }
}

// Upload files to S3
async function uploadToS3(key: string, filePath: string) {
  const fileContent = fs.readFileSync(filePath);
  const params = {
    Bucket: 'your-bucket-name',
    Key: key,
    Body: fileContent,
  };
  try {
    const command = new PutObjectCommand(params);
    await s3Client.send(command);
    console.log(`Successfully uploaded ${key} to S3.`);
  } catch (error) {
    console.error(`Failed to upload ${key} to S3: ${error}`);
  }
}

// Execute main function
main();
