#!/usr/bin/env python3
"""Package a scoped CloudFormation stack; load credentials from a private file."""
import json
import subprocess
import sys
from pathlib import Path
import boto3
from botocore.exceptions import ClientError

ROOT=Path(__file__).resolve().parents[1]
session=boto3.Session()
region=session.region_name or 'ca-central-1'
account=session.client('sts').get_caller_identity()['Account']
bucket=f'sam-cards-research-artifacts-{account}-{region}'
s3=session.client('s3')
try:
    s3.head_bucket(Bucket=bucket)
except ClientError as error:
    if error.response['Error']['Code'] not in ('404','NoSuchBucket','NotFound'):
        raise
    parameters={'Bucket':bucket}
    if region!='us-east-1':
        parameters['CreateBucketConfiguration']={'LocationConstraint':region}
    s3.create_bucket(**parameters)
s3.put_public_access_block(Bucket=bucket,PublicAccessBlockConfiguration={k:True for k in ('BlockPublicAcls','IgnorePublicAcls','BlockPublicPolicy','RestrictPublicBuckets')})
s3.put_bucket_encryption(Bucket=bucket,ServerSideEncryptionConfiguration={'Rules':[{'ApplyServerSideEncryptionByDefault':{'SSEAlgorithm':'AES256'}}]})
s3.put_bucket_tagging(Bucket=bucket,Tagging={'TagSet':[{'Key':'Application','Value':'sam-cards-research'}]})
secret_client=session.client('secretsmanager')
name='sam-cards/ai-core'
if len(sys.argv)>1:
    secret_data=json.loads(Path(sys.argv[1]).read_text())
    keys={'SAP_AUTH_URL','SAP_CLIENT_ID','SAP_CLIENT_SECRET','SAP_RESOURCE_GROUP','DEPLOYMENT_URL','MODEL'}
    if set(secret_data)!=keys:
        raise SystemExit('Unexpected credential file shape')
    try:
        secret=secret_client.create_secret(Name=name,SecretString=json.dumps(secret_data),Tags=[{'Key':'Application','Value':'sam-cards-research'}])
    except secret_client.exceptions.ResourceExistsException:
        secret=secret_client.put_secret_value(SecretId=name,SecretString=json.dumps(secret_data))
    arn=secret['ARN']
else:
    arn=secret_client.describe_secret(SecretId=name)['ARN']
output=ROOT/'.aws-sam';output.mkdir(exist_ok=True)
subprocess.run(['aws','cloudformation','package','--template-file',str(ROOT/'template.yaml'),'--s3-bucket',bucket,'--output-template-file',str(output/'packaged.yaml')],check=True,cwd=ROOT)
subprocess.run(['aws','cloudformation','deploy','--template-file',str(output/'packaged.yaml'),'--stack-name','sam-cards-research','--capabilities','CAPABILITY_IAM','--parameter-overrides',f'SecretArn={arn}','--tags','Application=sam-cards-research','--no-fail-on-empty-changeset'],check=True,cwd=ROOT)
outputs=session.client('cloudformation').describe_stacks(StackName='sam-cards-research')['Stacks'][0]['Outputs']
config={item['OutputKey']:item['OutputValue'] for item in outputs}
(ROOT/'config.js').write_text('window.SAM_CARDS_CONFIG = '+json.dumps({'apiUrl':config['ApiUrl']})+';\n')
(output/'deployment.json').write_text(json.dumps(config,indent=2))
print('Deployed research API; wrote the public URL to config.js.')
