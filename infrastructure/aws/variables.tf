variable "aws_region" {
  type        = string
  description = "AWS region for Secrets Manager, ECS, and logs."
  default     = "us-east-1"
}

variable "project_name" {
  type        = string
  description = "Prefix for AWS resource names."
  default     = "hedge-fund-at-home"
}

variable "secrets_name" {
  type        = string
  description = "Secrets Manager secret name (also set AWS_SECRETS_NAME in the app)."
  default     = "hedge-fund-at-home/dev"
}

variable "initial_secret_payload" {
  type        = map(string)
  description = "Initial JSON secret values. Replace placeholders before apply."
  default = {
    IBKR_HOST      = "127.0.0.1"
    IBKR_PORT      = "7497"
    IBKR_CLIENT_ID = "1"
    IBKR_USE_REAL  = "false"
  }
  sensitive = true
}

variable "container_image" {
  type        = string
  description = "ECR image URI for the runner container."
  default     = "public.ecr.aws/docker/library/python:3.11-slim"
}

variable "task_cpu" {
  type    = string
  default = "256"
}

variable "task_memory" {
  type    = string
  default = "512"
}
