import csv
import pathlib
import sys

from botocore.exceptions import ClientError
import boto3


def define_data_export(mpa, drop_columns=None, region_name='us-east-1'):
    with open('data_export_columns.txt', 'r') as f:
        sql_columns = [row[0] for row in csv.reader(f)]
    if drop_columns:
        sql_columns = [col for col in sql_columns if col not in drop_columns]
    sql_columns = ','.join(sql_columns)
    data_export = {
        'DataQuery': {
            'QueryStatement': f"SELECT {sql_columns} FROM COST_AND_USAGE_REPORT",
            'TableConfigurations': {
                'COST_AND_USAGE_REPORT': {
                    'INCLUDE_RESOURCES': 'TRUE',
                    'TIME_GRANULARITY': 'HOURLY',
                    'INCLUDE_SPLIT_COST_ALLOCATION_DATA': 'FALSE',
                    'INCLUDE_MANUAL_DISCOUNT_COMPATIBILITY': 'FALSE'
                }
            }
        },
        'DestinationConfigurations': {
            'S3Destination': {
                'S3Bucket': f'awsbilling-{mpa}',
                'S3OutputConfigurations': {
                    'Compression': 'PARQUET',
                    'Format': 'PARQUET',
                    'OutputType': 'CUSTOM',
                    'Overwrite': 'CREATE_NEW_REPORT'
                },
                'S3Prefix': 'ResourceHourlyDetail',
                'S3Region': region_name
            }
        },
        'Name': 'CostUsageReport',
        'RefreshCadence': {
            'Frequency': 'SYNCHRONOUS'
        }
    }
    return data_export


def put_export_definition(export_def, client):
    try:
        response = client.create_export(Export=export_def)
    except Exception as e:
        if e.response['Error']['Message'] == 'Cannot create duplicate export name.':
            print('Data export already exists, skipping creation.')
            response = e.response
        else:
            response = e.response
    finally:
        return response


def lambda_handler(event, context):
    de = define_data_export(event['mpa'])
    session = boto3.session.Session()
    client = session.client('bcm-data-exports')
    r = put_export_definition(de, client)
    return r
