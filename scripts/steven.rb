#!/usr/bin/env ruby
#
# Author:: Steven Craig <steven.craig@hearst.com>
#
# Copyright 2021, Hearst, Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
require 'bundler'
Bundler.setup

['httparty', 'aws-sdk-s3', 'aws-sdk-ses', 'json', './class_cloudhealth.rb', './aws_functions'].each do |g|
  begin
    require "#{g}"
  rescue LoadError
    abort("Missing #{g} gem! Install with bundler before execution, view README.md for details!")
  end
end

api_key = ENV.fetch("CHT_API_KEY", 'no_valid_defaul_value')

response = get_organizations(api_key)
# pp response
puts "Found #{response.length} Organizations"

org_list = Array.new

response.each do |org|
  organization = CHTOrganization.new.parse_api(org)
  org_list << organization
end

all_hearst_org_list = Array.new
all_hearst_org_filename = 'cht-only-hearst-org-output.json'

all_child_org_list = Array.new
all_child_org_filename = 'cht-all-child-org-output.json'

total_org_list = Array.new
total_org_filename = 'cht-all-hearst-org-output.json'

org_list.each_with_index do |org, i|
  %w(aws_accounts azure_subscriptions gcp_compute_projects data_center_accounts vmware_csp_organizations).each do |account_type|
    account_list = Array.new
    if org["num_#{account_type}"] > 0
      accounts = get_organization_accounts(api_key, org.id, account_type)
      accounts.each do |a|
        account = CHTAccount.new.parse_api(a)
        account.enrich_object('cloud_account', account_type)

        if account.owner_id == nil
          account.owner_id = account.id
        end

        account_list << account
      end
      org.enrich_object(account_type, account_list)
    end
  end
  puts "Enriched Org ##{i} with cloud Account details"
  case
  when i < 1
    all_hearst_org_list << org
  when i > 0
    all_child_org_list << org
  end
end
puts "Saving the initial all-account-Org separately as /tmp/#{all_hearst_org_filename}"
puts "Saving subsequent child orgs separately as /tmp/#{all_child_org_filename}"
puts "Saving everything together as /tmp/#{total_org_filename}"
total_org_list = all_hearst_org_list + all_child_org_list

File.write("/tmp/#{all_hearst_org_filename}", JSON.pretty_generate(all_hearst_org_list))
File.write("/tmp/#{all_child_org_filename}", JSON.pretty_generate(all_child_org_list))
File.write("/tmp/#{total_org_filename}", JSON.pretty_generate(total_org_list))