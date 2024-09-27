#!/usr/bin/env ruby
#
# Author:: Manikanta Krishna Reddy <manikanta.kondamadugula@hearst.com>
#
# Copyright 2022, Hearst, Inc.
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

require 'bundler'
Bundler.setup

['mail' ].each do |g|
  begin
    require "#{g}"
  rescue LoadError
    abort("Missing #{g} gem! Install with bundler before execution, view README.md for details!")
  end
end

def upload_into_s3(s3, bucket_name, key, object_name, date)
  File.open("/tmp/#{object_name}-#{date}.csv", 'rb') do |file|
    s3.put_object(
      body: file,
      bucket: bucket_name,
      key: "#{key}/#{object_name}-#{date}.csv",
      server_side_encryption: "AES256",
    )
  end
end

def get_object_from_s3(s3, bucket_name, key, object_name)
  resp = s3.get_object(
    response_target: "/tmp/#{object_name}",
    bucket: bucket_name,
    key: "#{key}/#{object_name}"
  )
end

def send_raw_message(ses, source, destinations, cc, file_name)
  raw_data = mail_raw_data(destinations, source, cc, file_name)
  pp raw_data.to_s
  resp = ses.send_raw_email({
    source: source,
    destinations: destinations,  ## Array 
    raw_message: { 
      data: raw_data.to_s,
    }
  })
  puts "Success!, Raw message was sent to recipient, here the message id:#{resp.message_id}"
end

def mail_raw_data(to, from, cc, file_name)
  report_name = file_name.split('-', 2)
  mail = Mail.new
  mail.to(to)
  mail.from(from)
  mail.cc(cc)
  mail.subject("ACloudGuru #{report_name.first} report")
  mail.body("Hi TEAM, \n\nOur automation generated the latest report for #{report_name.first}. Here is the attachment you wanted #{file_name}. \n\nThanks,\nCCOE.")
  mail.multipart?
  mail.add_file("/tmp/#{file_name}")
  mail.parts.first.attachment? #=> true
  mail.parts.first.content_transfer_encoding.to_s #=> 'base64'
  mail.attachments.first.mime_type
  mail.attachments.first.filename
  #mail.attachments.first.decoded == File.read("/tmp/#{file_name}")
  return mail
end