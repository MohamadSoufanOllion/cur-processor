#!/usr/bin/env node

/**
 * Author: Manikanta Krishna Reddy <manikanta.kondamadugula@hearst.com>
 *
 * Copyright 2022, Hearst, Inc.
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

import { S3Client, PutObjectCommand, GetObjectCommand, PutObjectCommandInput } from '@aws-sdk/client-s3';
import { SESClient, SendRawEmailCommand, SendRawEmailCommandInput } from '@aws-sdk/client-ses';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';

// Initialize AWS SDK clients
const s3Client = new S3Client({ region: 'us-east-1' });
const sesClient = new SESClient({ region: 'us-east-1' });

// Upload into S3
async function uploadIntoS3(bucketName: string, key: string, objectName: string, date: string) {
  const filePath = `/tmp/${objectName}-${date}.csv`;
  const fileStream = fs.createReadStream(filePath);

  const params: PutObjectCommandInput = {
    Bucket: bucketName,
    Key: `${key}/${objectName}-${date}.csv`,
    Body: fileStream,
    ServerSideEncryption: 'AES256',
  };

  try {
    const command = new PutObjectCommand(params);
    await s3Client.send(command);
    console.log(`File uploaded successfully to ${bucketName}/${key}/${objectName}-${date}.csv`);
  } catch (error) {
    console.error(`Failed to upload file: ${error}`);
  }
}

// Get object from S3
async function getObjectFromS3(bucketName: string, key: string, objectName: string) {
  const params = {
    Bucket: bucketName,
    Key: `${key}/${objectName}`,
  };

  const filePath = `/tmp/${objectName}`;

  try {
    const command = new GetObjectCommand(params);
    const data = await s3Client.send(command);
    const fileStream = fs.createWriteStream(filePath);
    (data.Body as NodeJS.ReadableStream).pipe(fileStream);

    console.log(`File downloaded successfully to ${filePath}`);
  } catch (error) {
    console.error(`Failed to download file: ${error}`);
  }
}

// Send raw message via SES
async function sendRawMessage(source: string, destinations: string[], cc: string[], fileName: string) {
  const rawData = await mailRawData(destinations, source, cc, fileName);

  const params: SendRawEmailCommandInput = {
    Source: source,
    Destinations: destinations,
    RawMessage: {
      Data: Uint8Array.from(rawData),
    },
  };

  try {
    const command = new SendRawEmailCommand(params);
    const response = await sesClient.send(command);
    console.log(`Success! Raw message sent. Message ID: ${response.MessageId}`);
  } catch (error) {
    console.error(`Failed to send raw message: ${error}`);
  }
}

// Create raw mail data using nodemailer
async function mailRawData(to: string[], from: string, cc: string[], fileName: string): Promise<any> {
  const reportName = fileName.split('-', 2);
  const mail = nodemailer.createTransport({ jsonTransport: true });

  const mailOptions = {
    from,
    to,
    cc,
    subject: `ACloudGuru ${reportName[0]} report`,
    text: `Hi TEAM,\n\nOur automation generated the latest report for ${reportName[0]}. Here is the attachment you wanted: ${fileName}.\n\nThanks,\nCCOE.`,
    attachments: [
      {
        filename: fileName,
        path: `/tmp/${fileName}`,
      },
    ],
  };

  const rawMessage = await mail.sendMail(mailOptions);
  return rawMessage.message;
}

// // Example usage
// (async function main() {
//   const bucketName = 'your-bucket-name';
//   const key = 'your-key';
//   const objectName = 'your-object-name';
//   const date = new Date().toISOString().split('T')[0];
//   const source = 'sender@example.com';
//   const destinations = ['recipient@example.com'];
//   const cc = ['cc@example.com'];
//   const fileName = 'your-file-name.csv';

//   // Upload file into S3
//   await uploadIntoS3(bucketName, key, objectName, date);

//   // Download file from S3
//   await getObjectFromS3(bucketName, key, fileName);

//   // Send raw email via SES
//   await sendRawMessage(source, destinations, cc, fileName);
// })();
