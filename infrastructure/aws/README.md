# AWS infrastructure

Terraform module for Hedge Fund at Home cloud resources.

**Not financial advice.** Infrastructure code does not validate strategies or
protect capital.

## Resources created

| Resource | Purpose |
| -------- | ------- |
| `aws_secretsmanager_secret` | Store IBKR and related keys as JSON |
| `aws_iam_role` + policy | ECS task can read the secret |
| `aws_ecs_cluster` | Host for Fargate tasks |
| `aws_ecs_task_definition` | Runner container spec (defaults to simulated env vars) |
| `aws_cloudwatch_log_group` | Container logs |

## Usage

```bash
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
```

## Outputs

- `secrets_arn`: attach rotation policies as needed
- `ecs_cluster_name`: use when creating a service
- `ecs_task_definition_arn`: use when running tasks
- `runner_task_role_arn`: attach to other tasks if needed

## Before production

- Add VPC, subnets, and security groups
- Restrict Secrets Manager with least-privilege IAM
- Use separate secrets per environment (`dev`, `staging`, `prod`)
- Keep `ENABLE_LIVE_TRADING=false` unless you have formal approval processes
- Prefer **simulated** mode for CI and integration tests

Simulated trading in AWS is still simulated: no exchange connectivity is implied.
**Not financial advice.**
