# Cloud & deployment (placeholders)

The trading **runner** is a Python process (`hedgekit.cli.run`). Deploy it on
whatever infrastructure you use. This folder holds **scaffolds**, not a full prod stack.

## Included

| Path | Provider | Status |
| ---- | -------- | ------ |
| `aws/` | Amazon Web Services | Terraform: Secrets Manager, ECS Fargate, CloudWatch |

See [docs/AWS_SETUP.md](../docs/AWS_SETUP.md).

## Placeholders (bring your own)

| Provider | Suggested pattern |
| -------- | ----------------- |
| **GCP** | Secret Manager → env vars on Cloud Run or GCE VM |
| **Azure** | Key Vault → Container Apps or VM |
| **VPS** | `.env` file + systemd timer or cron |
| **Kubernetes** | Secret → Deployment env; same container as `docker/Dockerfile` |

Use the same keys as `.env.example` (IBKR host/port, kill switch, etc.).

## You still design

- Network path from cloud to IBKR TWS/Gateway (VPN or bridge host)
- Production hardening (VPC, autoscaling, monitoring beyond CloudWatch defaults)

**Not financial advice.**
