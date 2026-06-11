output "secrets_arn" {
  description = "ARN of the trading credentials secret."
  value       = aws_secretsmanager_secret.trading_credentials.arn
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "ecs_task_definition_arn" {
  value = aws_ecs_task_definition.runner.arn
}

output "runner_task_role_arn" {
  value = aws_iam_role.runner_task.arn
}
