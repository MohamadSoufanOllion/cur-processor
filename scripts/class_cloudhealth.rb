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

# this is bullsh!t
# https://jatindhankhar.in/blog/custom-http-header-and-ruby-standard-library/
# and
# https://stackoverflow.com/questions/2710373/preserving-case-in-http-headers-with-rubys-nethttp


=begin
name
region
created_at
updated_at
account_type
status
authentication_type
tags
=end

class CHTOrganization <

    Struct.new( :id, :name, :description, :idp_name, :flex_org, :default_organization, :parent_organization_id, :assigned_users_count, :num_aws_accounts, :num_azure_subscriptions, :num_gcp_compute_projects, :num_data_center_accounts, :num_vmware_csp_organizations, :aws_accounts, :azure_subscriptions, :gcp_compute_projects, :data_center_accounts, :vmware_csp_organizations )
  
    def enrich_object(method_name, value)
      if %w(aws_accounts azure_subscriptions gcp_compute_projects data_center_accounts vmware_csp_organizations).include?(method_name)
        self[method_name] = value
      else
        abort("Invalid method to enrich, valid choices are only: aws_accounts, azure_subscriptions, gcp_compute_projects, data_center_accounts, vmware_csp_organizations")
      end
    end
  
    def parse_api(response)
        org = CHTOrganization.new
        org.id = response['id']
        org.name = response['name']
        org.description = response['description']
        org.idp_name = response['idp_name']
        org.flex_org = response['flex_org']
        org.default_organization = response['default_organization']
        org.parent_organization_id = response['parent_organization_id']
        org.assigned_users_count = response['assigned_users_count']
        org.num_aws_accounts = response['num_aws_accounts']
        org.num_azure_subscriptions = response['num_azure_subscriptions']
        org.num_gcp_compute_projects = response['num_gcp_compute_projects']
        org.num_data_center_accounts = response['num_data_center_accounts']
        org.num_vmware_csp_organizations = response['num_vmware_csp_organizations']
        org.aws_accounts = response['aws_accounts']
        org.azure_subscriptions = response['azure_subscriptions']
        org.gcp_compute_projects = response['gcp_compute_projects']
        org.data_center_accounts = response['data_center_accounts']
        org.vmware_csp_organizations = response['vmware_csp_organizations']
  
  =begin
        org.aws_accounts = Array.new
        #org.aws_accounts = response['aws_accounts'].each { |a| b = CHTAccount.new(a) } if response['aws_accounts']
        if response['aws_accounts']
          response['aws_accounts'].each do |a|
            account = CHTAccount.new(a)
            org.aws_accounts << account
          end
        end
        org.azure_subscriptions = response['azure_subscriptions']
        org.gcp_compute_projects = response['gcp_compute_projects']
        org.data_center_accounts = response['data_center_accounts']
        org.vmware_csp_organizations = response['vmware_csp_organizations']
  =end
  
        %w(aws_accounts azure_subscriptions gcp_compute_projects data_center_accounts vmware_csp_organizations).each do |account_type|
          account_list = Array.new
          if org["num_#{account_type}"] > 0
            case
            when org["#{account_type}"]
              accounts = org["#{account_type}"]
            else
              # TODO: this is the dirtiest thing i've done in a long, long time
              # this API KEY needs to be removed ASAP
              # the issue here is that I tried to make the `parse_api` method compatible with reading input from disk or via the network
              # but they need to be split into two different methods
              accounts = get_organization_accounts('bf456471-dbe1-4bc7-aeee-a96c90723825', org.id, account_type)
            end
            accounts.each do |a|
              account = CHTAccount.new.parse_api(a)
              account.enrich_object('cloud_account', account_type)
              account_list << account
            end
            org.enrich_object(account_type, account_list)
  #          pp org
          end
        end
  
        org
    end
  
    def print_csv_header_to_file(csvout)
      CSV.open(csvout, 'a') do |csv|
        csv << ['id', 'name', 'description', 'idp_name', 'flex_org', 'default_organization', 'parent_organization_id', 'assigned_users_count', 'num_aws_accounts', 'num_azure_subscriptions', 'num_gcp_compute_projects', 'num_data_center_accounts', 'num_vmware_csp_organizations', 'aws_accounts', 'azure_subscriptions', 'gcp_compute_projects', 'data_center_accounts', 'vmware_csp_organizations']
      end
    end
  
    def print_csv_record_to_file(csvout)
      CSV.open(csvout, 'a') do |csv|
        csv << [id, name, description, idp_name, flex_org, default_organization, parent_organization_id, assigned_users_count, num_aws_accounts, num_azure_subscriptions, num_gcp_compute_projects, num_data_center_accounts, num_vmware_csp_organizations, aws_accounts, azure_subscriptions, gcp_compute_projects, data_center_accounts, vmware_csp_organizations]
      end
    end
  
    def to_map
      map = Hash.new
      self.members.each { |m| map[m] = self[m] }
      map
    end
  
    def to_json(*a)
      to_map.to_json(*a)
    end
  
  end
  
  class CHTAccount <
  
    Struct.new( :id, :owner_id, :name, :amazon_name, :payer_account, :payer_account_id, :cloud_account, :region, :created_at, :updated_at, :account_type, :cluster_name, :status, :state, :authentication_type, :tags )
  
    def enrich_object(method_name, value)
      if %w(aws_accounts azure_subscriptions gcp_compute_projects data_center_accounts vmware_csp_organizations).include?(value)
        if %w(cloud_account).include?(method_name)
          self[method_name] = value
        else
          abort("Invalid method to enrich, valid choices are only: cloud_account")
        end
      else
        abort("Invalid value to enrich, valid choices are only: aws_accounts, azure_subscriptions, gcp_compute_projects, data_center_accounts, vmware_csp_organizations")
      end
    end
  
    def assign_account_type!(account_type)
      self.account_type = account_type
    end
  
    def check_health
      case
      when (self.check_status && self.check_state)
        true
      when (self.check_status || self.check_state)
        true
      else
        false
      end
    end
  
    def check_status
      healthy_status_list = [
        'Not-Configured',
        'Critical',
        'Pending',
        'Healthy',
        'Warning'
      ]
  
      # this is not great because not every account actually has a status
      # so how can we use it to make decisions?
      unhealthy_status_list = [
        'null',
        'nil',
        'Deleted',
        'Pending Deletion',
      ]
  
      if healthy_status_list.include?(self.status)
        true
      else
        false
      end
    end
  
    def check_state
      healthy_state_list = [
        'Enabled'
      ]
  
      unhealthy_state_list = [
        'Disabled'
      ]
  
      case
      when healthy_state_list.include?(self.state)
        true
      when unhealthy_state_list.include?(self.state)
        false
      else
        # many accounts have null state and so we should just ignore it in that case
        true
      end
  
    end
  
    def parse_api(response)
      account = CHTAccount.new
      account.id = response['id']
      account.owner_id = response['owner_id']
      account.name = response['name']
      account.amazon_name = response['amazon_name']
      account.payer_account = response['payer_account']
      account.payer_account_id = response['payer_account_id']
      account.region = response['region']
      account.created_at = response['created_at']
      account.updated_at = response['updated_at']
      account.account_type = response['account_type']
      account.cluster_name = response['cluster_name']
      account.status = response['status']
      account.state = response['state']
      account.authentication_type = response['authentication_type']
      account.tags = response['tags']
      account
    end
  
    def print_csv_header_to_file(csvout)
      CSV.open(csvout, 'a') do |csv|
        csv << [ 'id', 'owner_id', 'name', 'amazon_name', 'payer_account', 'payer_account_id', 'cloud_account', 'region', 'created_at', 'updated_at', 'account_type', 'cluster_name', 'status', 'state', 'authentication_type', 'tags' ]
      end
    end
  
    def print_csv_record_to_file(csvout)
      CSV.open(csvout, 'a') do |csv|
        csv << [ id, owner_id, name, amazon_name, payer_account, payer_account_id, cloud_account, region, created_at, updated_at, account_type, cluster_name, status, state, authentication_type, tags ]
      end
    end
  
    def to_map
      map = Hash.new
      self.members.each { |m| map[m] = self[m] }
      map
    end
  
    def to_json(*a)
      to_map.to_json(*a)
    end
  
  end
  
  class ImmutableKey < String 
    def capitalize 
      self 
    end 
  
    def to_s
      self 
    end 
  
    alias_method :to_str, :to_s
  end
  
  def assign_role_doc_to_user_group(graphql_client, user_group_id, role_doc_id, org_id)
  
    assignRoleDocToUserGroup = GQLi::DSL.mutation {
      updateUserGroupRoleBindings(
        input: {
          creates: [
            {
              userGroup: {
                id: user_group_id
              },
              roleDocument: {
                id: role_doc_id
              },
              organizations: [
                {
                  id: org_id
                }
              ]
            }
          ]
        }
      ){
        creates {
          userGroup {
            id
          }
          roleDocument {
            id
          }
          organizationIds
        }
      }
    }
  
    response = graphql_client.execute(assignRoleDocToUserGroup)
  
  end
  
  def user_group_exists?(graphql_client, name)
    user_group_query = GQLi::DSL.query {
      userGroups(
         filterRules: [
              {
              field: "name",
              filterType: :MATCHES,
              filterValues: [
                name
                ]
              }
        ],
        sortRules: [
          {
            field: "name",
            direction: :ASC,
          }
        ],
        first: 1,
      ) {
        edges {
          node {
            id
            name
          }
        }
      }
    }
  
    response = graphql_client.execute(user_group_query)
  
    if response.data['userGroups']['edges'].length > 0
      response.data['userGroups']['edges'].first['node']['id']
    else
      false
    end
  
  end
  
  def organization_exists?(graphql_client, name)
    organization_query = GQLi::DSL.query {
      organizations(
         filterRules: [
              {
              field: "name",
              filterType: :MATCHES,
              filterValues: [
                name
                ]
              }
        ],
        sortRules: [
          {
            field: "name",
            direction: :ASC,
          }
        ],
        first: 1,
      ) {
        edges {
          node {
            id
            name
          }
        }
      }
    }
  
    response = graphql_client.execute(organization_query)
  
    if response.data['organizations']['edges'].length > 0
      response.data['organizations']['edges'].first['node']['id']
    else
      false
    end
  
  end
  
  def create_user_group(graphql_client, name, description, identityAttributeRules)
    # TODO: this mutation is not idempotent so need to first check to see if the role doc already exists first, and only create it if necessary
  
    createUserGroup = GQLi::DSL.mutation {
      addUserGroup(
        input: {
          name: "#{name}",
          description: "#{description}",
          identityAttributeRules: identityAttributeRules
        }
      ){
        userGroup {
          id
          name
        }
      }
    }
  
    response = graphql_client.execute(createUserGroup)
    
    if response.errors == nil
      response.data['addUserGroup']['userGroup']['id']
    else
      false
    end
  
  end
  
  def create_role_document_via_graphql(graphql_client)
    # TODO: this mutation is not idempotent so need to first check to see if the role doc already exists first, and only create it if necessary
  
    action = 'write'
  
    createRoleDoc = GQLi::DSL.mutation {
      createRoleDocument(
        input: {
          name: "Customer Access Role",
          description: "STEVEN CRAIG CREATED THIS (#{action}) Role that provides read access to a customer.",
          permissions: [
            {
              action: "#{action}",
              subject: "customer"
            }
          ]
        }
      ) {
        id
        name
        description
        permissions {
          id
          action
          subject
        }
      }
    }
  
    response = graphql_client.execute(createRoleDoc)
  end
  
  def map_cht_org_to_wiz_project(name,map_info)
    map_info[name]
  end
  
  # this should be deleted and the mapping should standalone inside a json file
  def cht_org_to_wiz_project(name)
    map = {
      'Hearst Health' => 'Hearst Health',
      'Hearst Transportation' => 'Hearst Transportation',
      'Hearst Magazines' => 'Hearst Magazines',
      'Hearst Newspapers' => 'Hearst Newspapers',
      'Hearst Television' => 'Hearst TV',
      'Hearst Corp' => 'Hearst Corporate',
      'Autos' => 'automobiles-all',
      'Blackbook' => 'blackbook-all',
      'Camp Systems' => 'campsystems-all',
      'CDS' => 'cds-all',
      'CellTrak' => 'hchb-celltrak',
      'First Data Bank UK' => 'fdbuk-all',
      'First Data Bank US' => 'fdbusa-all',
      'Hearst Real Estate' => 'realestate-all',
      'HNP IT2' => 'hnp-it',
      'Home Care Home Base' => 'hchb-all',
      'HTV-Broadcasting' => 'htv-all',
      'HTV-Digital' => 'htvdigital-all',
      'iCrossing' => 'icrossing-all',
      'Jumpstart' => 'jumpstart-all',
      'Kings Features' => 'kingfeatures-all',
      'Kubra' => 'kubra-all',
      'Local Edge' => 'localedge-all',
      'Magazines International' => 'hmi-all',
      'Magazines UK' => 'maguk-all',
      'Magazines US' => 'magusa-all',
      'MCG' => 'mcg-all',
      'Media OS' => 'mediaos-all',
      'MHK' => 'mhk-all',
      'Motor' => 'motor-all',
      'Newspaper Digital' => 'hnp-digital',
      'Zynx' => 'zynx-all'
    }
  
  =begin
      'Fitch Org' => 'not_exist',
      'Automation' => 'not_exist',
      'Canadian Blackbook' => 'not_exist',
      'CCOE' => 'not_exist',
      'Corporation' => 'not_exist',
      'Cybersecurity' => 'not_exist',
      'Ecommerce' => 'not_exist',
      'Enterprise Applications' => 'not_exist',
      'Fitch Chief Data Officer' => 'not_exist',
      'Fitch Credit Sights' => 'not_exist',
      'Fitch GeoQuant' => 'not_exist',
      'FItch Learning' => 'not_exist',
      'Fitch Ratings / Group' => 'not_exist',
      'Fitch Solutions' => 'not_exist',
      'Home Office' => 'not_exist',
      'Identity' => 'not_exist',
      'Magazines Data Science' => 'not_exist',
      'Service Center' => 'not_exist',
      'Service Desk' => 'not_exist',
  =end
  
    map[name]
  end
  
  def delete_user_group(graphql_client, user_group_id)
    deleteUserGroup = GQLi::DSL.mutation {
      deleteUserGroup(
        input: {
          id: user_group_id
        }
      ){
        id
      }
    }
  
    response = graphql_client.execute(deleteUserGroup)
  
    if response.errors == nil
      response.data['deleteUserGroup']['id']
    else
      false
    end
  
  end
  
  def get_access_token(api_key)
  
  token_url = 'https://apps.cloudhealthtech.com/graphql'
  
  query = <<-GRAPHQL
  mutation Login($apiKey: String!) {
    loginAPI(apiKey: $apiKey) {
      accessToken
      refreshToken
    }
  }
  GRAPHQL
  
    url = token_url
  
    payload = {
      'query' => query,
      'variables' => {
        'apiKey' => api_key,
      }
    }
  
    begin
      response = HTTParty.post(url,
        {
          :body => payload.to_json,
          :headers => { 'content-type' => 'application/json' }
        }
      )
  
      #puts response.inspect
      #puts response.parsed_response
      #puts response.code
  
      if response.success?
        puts "Success! Retrieved Access Token for OAUTH client API key #{api_key[0,4]}xxxxxx"
        token = {
          'accessToken' => response.parsed_response['data']['loginAPI']['accessToken'],
          'refreshToken' => response.parsed_response['data']['loginAPI']['refreshToken'],
        }
      else
        abort("Failure! Access Token request did not succeed for OATH client API key #{api_key[0,4]}xxxxxx")
      end
    rescue HTTParty::Error => e
      puts "Error from HTTParty.post(#{url}) #{e}"
    rescue Net::OpenTimeout => te
      puts "Failed With Exception TimeOut: #{te}"
      sleep (4*retries)
      retry if (retries += 1) < 5
    rescue Net::ReadTimeout => re
      puts "Failed With Read Exception TimeOut: #{re}"
      sleep (4*retries)
      retry if (retries += 1) < 5
    rescue SocketError => se
      puts "Failed With Exception Socket: #{se}"
      sleep (4*retries)
      retry if (retries += 1) < 5
    rescue OpenSSL::SSL::SSLError => ssl
      puts "Failed With Exception OpenSSL: #{ssl}"
      sleep (4*retries)
      retry if (retries += 1) < 5
    rescue EOFError => eo
      puts "Failed With Exception EOF: #{eo}"
      sleep (4*retries)
      retry if (retries += 1) < 5
    end
  
  end
  
  def get_sub_org_access_token(token, organization_id)
  
  token_url = 'https://apps.cloudhealthtech.com/graphql'
  
  query = <<-GRAPHQL
  mutation LoginSubOrg($refreshToken: String!, $organization: CRN, $justification: String){
  getAccessToken( input: {
    refreshToken: $refreshToken
    organization: $organization
    justification: $justification
    }){
      accessToken
      refreshToken
    }
  }
  GRAPHQL
  
    url = token_url
  
    payload = {
      'query' => query,
      'variables' => {
        'refreshToken' => token['refreshToken'],
        'organization' => organization_id,
        'justification' => 'CCOE scripted automation',
      }
    }
  
    begin
      response = HTTParty.post(url,
        {
          :body => payload.to_json,
          :headers => {
            'Authorization' => 'Bearer ' + token['accessToken'],
            'content-type' => 'application/json'
            
          }
        }
      )
  
      #puts response.inspect
      #puts response.parsed_response
      #puts response.code
  
      if response.success?
  #      puts "Success! Retrieved Sub Org #{organization_id} Access Token"
        token = {
          'accessToken' => response.parsed_response['data']['getAccessToken']['accessToken'],
          'refreshToken' => response.parsed_response['data']['getAccessToken']['refreshToken'],
        }
      else
        abort("Failure! Access Token request did not succeed! #{response.inspect}")
      end
    rescue HTTParty::Error => e
      puts "Error from HTTParty.post(#{url}) #{e}"
    rescue Net::OpenTimeout => te
      puts "Failed With Exception TimeOut: #{te}"
      sleep (4*retries)
      retry if (retries += 1) < 5
    rescue Net::ReadTimeout => re
      puts "Failed With Read Exception TimeOut: #{re}"
      sleep (4*retries)
      retry if (retries += 1) < 5
    rescue SocketError => se
      puts "Failed With Exception Socket: #{se}"
      sleep (4*retries)
      retry if (retries += 1) < 5
    rescue OpenSSL::SSL::SSLError => ssl
      puts "Failed With Exception OpenSSL: #{ssl}"
      sleep (4*retries)
      retry if (retries += 1) < 5
    rescue EOFError => eo
      puts "Failed With Exception EOF: #{eo}"
      sleep (4*retries)
      retry if (retries += 1) < 5
    end
  
  end
  
  def do_something(url_base,vs_name,vs_name_suffix)
  
    auth = {:username => USERNAME, :password => PASSWORD}
    url_path = "/mgmt/tm/ltm/virtual"
    url = "#{url_base}#{url_path}"
    #puts url
  
    payload = {
      "command" => "mv",
      "name" => vs_name,
      "target" => "#{vs_name}#{vs_name_suffix}",
    }
  
    puts url
    puts payload
  
    begin
      retries ||= 0
      response = HTTParty.post(url,
        {
          :verify => false,
          :body => payload.to_json,
          :headers => { "Content-Type" => 'application/json' }
        }
      )
  
      puts response.parsed_response
  
      if response.success?
        puts "Success!"
        true
      else
        puts "Failure!"
        nil
      end
    rescue HTTParty::Error => e
      puts "Error from HTTParty.post(#{url}) #{e}"
      nil
    rescue Net::OpenTimeout => te
      puts "Failed With Exception TimeOut: #{te}"
      sleep (4*retries)
      retry if (retries += 1) < 5
    rescue Net::ReadTimeout => re
      puts "Failed With Read Exception TimeOut: #{re}"
      sleep (4*retries)
      retry if (retries += 1) < 5
    rescue SocketError => se
      puts "Failed With Exception of Socket: #{se}"
      sleep (4*retries)
      retry if (retries += 1) < 5
    rescue OpenSSL::SSL::SSLError => ssl
      puts "Failed With Exception OpenSSL: #{ssl}"
      sleep (4*retries)
      retry if (retries += 1) < 5
    rescue EOFError => eo
      puts "Failed With Exception EOF: #{eo}"
      sleep (4*retries)
      retry if (retries += 1) < 5
    end
  
  end
  
  def get_something(url, api_key, parameters)
  
    #puts url, api_key
  
    options = {
  #    :verify => true,
  #    debug_output: STDOUT,
      :headers => {
        "Content-Type" => 'application/json',
        'Accept-Encoding' => 'gzip',
        'Authorization' => 'Bearer ' + api_key
      },
      :query => parameters
    }
  
    #pp options
  
    begin
      retries ||= 0
      #response = HTTParty.get(url,options)
      #puts response.parsed_response
      
      response = HTTParty.get(url,options)
  
      if response.success?
  #      puts "Success from #{url}"
        #puts response.parsed_response
        response.parsed_response
      else
  #      puts "Failure! #{response.inspect}"
        puts "Failure! #{response.parsed_response['error']['errorMessage']}"
        nil
      end
    rescue HTTParty::Error => e
      puts "Error from HTTParty.get(#{url}) #{e}"
      nil
    rescue Net::OpenTimeout => te
      puts "Failed With Exception TimeOut: #{te}"
      sleep (4*retries)
      retry if (retries += 1) < 5
    rescue Net::ReadTimeout => re
      puts "Failed With Read Exception TimeOut: #{re}"
      sleep (4*retries)
      retry if (retries += 1) < 5
    rescue SocketError => se
      puts "Failed With Exception of Socket: #{se}"
      sleep (4*retries)
      retry if (retries += 1) < 5
    rescue OpenSSL::SSL::SSLError => ssl
      puts "Failed With Exception OpenSSL: #{ssl}"
      sleep (4*retries)
      retry if (retries += 1) < 5
    rescue EOFError => eo
      puts "Failed With Exception EOF: #{eo}"
      sleep (4*retries)
      retry if (retries += 1) < 5
    end
  
  end
  
  def post_something(url, api_key, parameters)
  
    #puts url, api_key
  
    options = {
  #    :verify => true,
  #    debug_output: STDOUT,
      :headers => {
        "Content-Type" => 'application/json',
        'Accept-Encoding' => 'gzip',
        'Authorization' => 'Bearer ' + api_key
      },
      :query => parameters
    }
  
    #pp options
  
    begin
      retries ||= 0
      #response = HTTParty.get(url,options)
      #puts response.parsed_response
      
      response = HTTParty.post(url,options)
  
      if response.success?
  #      puts "Success from #{url}"
        #puts response.parsed_response
        response.parsed_response
      else
        puts "Failure! #{response.inspect}"
  #      puts "Failure! #{response.parsed_response['error']['errorMessage']}"
        nil
      end
    rescue HTTParty::Error => e
      puts "Error from HTTParty.get(#{url}) #{e}"
      nil
    rescue Net::OpenTimeout => te
      puts "Failed With Exception TimeOut: #{te}"
      sleep (4*retries)
      retry if (retries += 1) < 5
    rescue Net::ReadTimeout => re
      puts "Failed With Read Exception TimeOut: #{re}"
      sleep (4*retries)
      retry if (retries += 1) < 5
    rescue SocketError => se
      puts "Failed With Exception of Socket: #{se}"
      sleep (4*retries)
      retry if (retries += 1) < 5
    rescue OpenSSL::SSL::SSLError => ssl
      puts "Failed With Exception OpenSSL: #{ssl}"
      sleep (4*retries)
      retry if (retries += 1) < 5
    rescue EOFError => eo
      puts "Failed With Exception EOF: #{eo}"
      sleep (4*retries)
      retry if (retries += 1) < 5
    end
  
  end
  
  def put_something(url, api_key, parameters)
  
    #puts url, api_key
  
    options = {
  #    :verify => true,
  #    debug_output: STDOUT,
      :headers => {
        "Content-Type" => 'application/json',
        'Accept-Encoding' => 'gzip',
        'Authorization' => 'Bearer ' + api_key
      },
      :query => parameters
    }
  
    #pp options
  
    begin
      retries ||= 0
      #response = HTTParty.get(url,options)
      #puts response.parsed_response
      
      response = HTTParty.put(url,options)
  
      if response.success?
  #      puts "Success from #{url}"
        #puts response.parsed_response
        response.parsed_response
      else
        puts "Failure! #{response.inspect}"
  #      puts "Failure! #{response.parsed_response['error']['errorMessage']}"
        nil
      end
    rescue HTTParty::Error => e
      puts "Error from HTTParty.get(#{url}) #{e}"
      nil
    rescue Net::OpenTimeout => te
      puts "Failed With Exception TimeOut: #{te}"
      sleep (4*retries)
      retry if (retries += 1) < 5
    rescue Net::ReadTimeout => re
      puts "Failed With Read Exception TimeOut: #{re}"
      sleep (4*retries)
      retry if (retries += 1) < 5
    rescue SocketError => se
      puts "Failed With Exception of Socket: #{se}"
      sleep (4*retries)
      retry if (retries += 1) < 5
    rescue OpenSSL::SSL::SSLError => ssl
      puts "Failed With Exception OpenSSL: #{ssl}"
      sleep (4*retries)
      retry if (retries += 1) < 5
    rescue EOFError => eo
      puts "Failed With Exception EOF: #{eo}"
      sleep (4*retries)
      retry if (retries += 1) < 5
    end
  
  end
  
  def enable_aws_account(api_key, account_id, parameters)
  
    url = 'https://chapi.cloudhealthtech.com/v1/aws_accounts/' + account_id
  
    puts "enable account #{parameters['name']}"
    response = put_something(url, api_key, parameters)
    #puts "Found _links is #{response['_links']}"
    pp response
  
  end
  
  def get_organization_by_id(api_key, org_id)
    # get all the orgs
    # this needs to be paginated
    # https://apidocs.cloudhealthtech.com/#organization_get-all-organizations
  
    total_org_list = Array.new
    # the maximum number of orgs we can ask for per page is 100
    # the default number is 30
    per_page = 100
  
    parameters = {
      'per_page' => per_page,
    }
  
    url = 'https://chapi.cloudhealthtech.com/v2/organizations' + "?org_id=#{org_id}"
  
  #  puts "Get the first batch of #{per_page} Organization results"
    response = get_something(url, api_key, parameters)
    #puts "Found _links is #{response['_links']}"
    #pp response
    #exit
    
    total_org_list = total_org_list + response['organizations']
    # pages begin with 1, so if we need more then start with page 2
    i = 2
    
  #  pp total_org_list
  
    case
    when response['_links'] == {}
      get_more = false
    when response['_links'].has_key?('next')
      get_more = true
    else
      get_more = false
    end
    
    while get_more do
  
  #    puts "Get the #{i} batch of #{per_page} results"
  
      response = get_something( url, api_key, 
        {
        'per_page' => per_page,
        'page' => i
        }
      )
  
      puts "Found _links is #{response['_links']}"
  
      # pp org_list
  
      if response['organizations'].length > 0
        total_org_list = total_org_list + response['organizations']
        i += 1
      end
      
      case
      when response['_links'] == {}
        get_more = false
      when response['_links'].has_key?('next')
        get_more = true
      else
        get_more = false
      end
  
    end
  
    # puts "Total number of orgs is #{total_org_list.length}"
  
    total_org_list
  
  end
  
  def get_organizations(api_key)
    # get all the orgs
    # this needs to be paginated
    # https://apidocs.cloudhealthtech.com/#organization_get-all-organizations
  
    total_org_list = Array.new
    # the maximum number of orgs we can ask for per page is 100
    # the default number is 30
    per_page = 100
  
    parameters = {
      'per_page' => per_page,
    }
  
    url = 'https://chapi.cloudhealthtech.com/v2/organizations'
  
  #  puts "Get the first batch of #{per_page} Organization results"
    response = get_something(url, api_key, parameters)
    #puts "Found _links is #{response['_links']}"
    #pp response
    #exit
    
    total_org_list = total_org_list + response['organizations']
    # pages begin with 1, so if we need more then start with page 2
    i = 2
    
  #  pp total_org_list
  
    case
    when response['_links'] == {}
      get_more = false
    when response['_links'].has_key?('next')
      get_more = true
    else
      get_more = false
    end
    
    while get_more do
  
  #    puts "Get the #{i} batch of #{per_page} results"
  
      response = get_something( url, api_key, 
        {
        'per_page' => per_page,
        'page' => i
        }
      )
  
      puts "Found _links is #{response['_links']}"
  
      # pp org_list
  
      if response['organizations'].length > 0
        total_org_list = total_org_list + response['organizations']
        i += 1
      end
      
      case
      when response['_links'] == {}
        get_more = false
      when response['_links'].has_key?('next')
        get_more = true
      else
        get_more = false
      end
  
    end
  
    # puts "Total number of orgs is #{total_org_list.length}"
  
    total_org_list
  
  end
  
  def get_organization_accounts(api_key, org_id, cloud_account)
    # get all the accounts
    # this needs to be paginated
    # https://apidocs.cloudhealthtech.com/#organization_get-all-organizations
  
    total_account_list = Array.new
    # the maximum number of orgs we can ask for per page is 100
    # the default number is 30
    per_page = 100
  
    parameters = {
      'per_page' => per_page,
    }
  
    url = 'https://chapi.cloudhealthtech.com/v2/organizations/' + org_id + '/' + cloud_account
  
  #  puts "Get the first batch of #{per_page} Account results"
    response = get_something(url, api_key, parameters)
    #puts "Found _links is #{response['_links']}"
    #pp response
    #exit
    
    total_account_list = total_account_list + response['accounts']
    # pages begin with 1, so if we need more then start with page 2
    i = 2
    
  #  pp total_org_list
  
    case
    when response['_links'] == {}
      get_more = false
    when response['_links'].has_key?('next')
      get_more = true
    else
      get_more = false
    end
    
    while get_more do
  
  #    puts "Get the #{i} batch of #{per_page} results"
  
      response = get_something( url, api_key, 
        {
        'per_page' => per_page,
        'page' => i
        }
      )
  
      #puts "Found _links is #{response['_links']}"
  
      # pp org_list
  
      if response['accounts'].length > 0
        total_account_list = total_account_list + response['accounts']
        i += 1
      end
      
      case
      when response['_links'] == {}
        get_more = false
      when response['_links'].has_key?('next')
        get_more = true
      else
        get_more = false
      end
  
    end
  
    # puts "Total number of orgs is #{total_org_list.length}"
  
    total_account_list
  
  end