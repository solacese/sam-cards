#!/usr/bin/env python3
"""Store an expert endpoint key directly in Secrets Manager, without a local key file."""
import argparse
import getpass
import json
from urllib.parse import urlsplit
import boto3


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url',required=True)
    args=parser.parse_args()
    url=urlsplit(args.base_url)
    if url.scheme!='https' or not url.hostname or url.username or url.password or url.query or url.fragment:
        parser.error('Use an HTTPS API base URL without credentials or query parameters.')
    key=getpass.getpass('Endpoint key (not echoed or saved locally): ').strip()
    if not key:
        parser.error('An endpoint key is required.')
    client=boto3.client('secretsmanager')
    payload=json.dumps({'base_url':args.base_url.rstrip('/'),'api_key':key})
    name='sam-cards/expert-model'
    try:
        client.create_secret(Name=name,SecretString=payload,Tags=[{'Key':'Application','Value':'sam-cards-research'}])
    except client.exceptions.ResourceExistsException:
        client.put_secret_value(SecretId=name,SecretString=payload)
    print('Expert endpoint stored in AWS Secrets Manager. No local credential file was created.')


if __name__=='__main__':
    main()
