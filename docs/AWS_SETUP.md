# AWS setup

**Not financial advice.** Running in AWS does not make a strategy safe or
profitable. Cloud deployment only changes where the software runs.

## What the Terraform scaffold provides

Under `infrastructure/aws/`:

- **Secrets Manager** secret for JSON credentials (IBKR host/port, etc.)
- **IAM role** allowing the runner task to read that secret
- **ECS Fargate** cluster and task definition (placeholder container image)
- **CloudWatch** log group

This is a starting point. You must supply networking (VPC, subnets, security
groups) before running tasks in production. The included task definition is not
wired to a service or load balancer by default.

## Prerequisites

- AWS account and IAM user/role with permission to run Terraform
- Terraform 1.5+
- AWS CLI configured (`aws configure`)

## Deploy secrets infrastructure

```bash
cd infrastructure/aws
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars: set container_image after you push to ECR
terraform init
terraform plan
terraform apply
```

Note the `secrets_arn` output.

## Store credentials

Update the secret in the AWS console or CLI with JSON keys the app understands:

```json
{
  "IBKR_HOST": "127.0.0.1",
  "IBKR_PORT": "7497",
  "IBKR_CLIENT_ID": "1",
  "IBKR_USE_REAL": "false"
}
```

For ECS tasks reaching IBKR, you typically need a VPN or a host that can reach
your TWS instance. Running IB Gateway in the same VPC is an advanced setup not
covered here.

## Enable in the application

```bash
AWS_SECRETS_ENABLED=true
AWS_REGION=us-east-1
AWS_SECRETS_NAME=hedge-fund-at-home/dev
```

On startup, `hedgekit.cloud.aws.load_secrets_into_env()` merges secret keys into
the environment without overwriting variables already set.

## Recommended defaults in AWS

Keep these in the task environment:

```text
ENABLE_LIVE_TRADING=false
KILL_SWITCH=false
IBKR_USE_REAL=false
```

Use **simulated** mode in `config/config.yaml` until you have a documented
operational runbook. **Not financial advice.**

## Build and push container image

```bash
docker build -f docker/Dockerfile -t hedge-fund-at-home:local .
# Tag and push to your ECR repository, then update terraform.tfvars
```

See [infrastructure/aws/README.md](../infrastructure/aws/README.md).
