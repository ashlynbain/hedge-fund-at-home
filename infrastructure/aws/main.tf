terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

resource "aws_secretsmanager_secret" "trading_credentials" {
  name        = var.secrets_name
  description = "Hedge Fund at Home: IBKR and related credentials (JSON key/value)."
}

resource "aws_secretsmanager_secret_version" "trading_credentials" {
  secret_id     = aws_secretsmanager_secret.trading_credentials.id
  secret_string = jsonencode(var.initial_secret_payload)
}

resource "aws_iam_role" "runner_task" {
  name = "${var.project_name}-runner-task"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "runner_secrets" {
  name = "${var.project_name}-secrets-read"
  role = aws_iam_role.runner_task.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue"]
      Resource = [aws_secretsmanager_secret.trading_credentials.arn]
    }]
  })
}

resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"
}

resource "aws_cloudwatch_log_group" "runner" {
  name              = "/ecs/${var.project_name}-runner"
  retention_in_days = 14
}

resource "aws_ecs_task_definition" "runner" {
  family                   = "${var.project_name}-runner"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = aws_iam_role.runner_task.arn
  task_role_arn            = aws_iam_role.runner_task.arn

  container_definitions = jsonencode([{
    name  = "runner"
    image = var.container_image
    essential = true
    environment = [
      { name = "AWS_SECRETS_ENABLED", value = "true" },
      { name = "AWS_REGION", value = var.aws_region },
      { name = "AWS_SECRETS_NAME", value = var.secrets_name },
      { name = "ENABLE_LIVE_TRADING", value = "false" },
      { name = "KILL_SWITCH", value = "false" },
      { name = "IBKR_USE_REAL", value = "false" },
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.runner.name
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "runner"
      }
    }
  }])
}
