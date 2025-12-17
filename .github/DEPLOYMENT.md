# CI/CD Deployment Guide

This document describes the automated CI/CD pipeline for the Math Pilot V2 NestJS service.

## Overview

The pipeline builds, tests, and deploys the API to AWS Elastic Beanstalk whenever code is pushed to the `production` branch. You can also run it manually via the GitHub Actions UI.

## Pipeline Flow

```
Push to production → GitHub Actions → Build & Test → Docker Image → ECR → Dockerrun → S3 → Elastic Beanstalk
```

## Required AWS Resources

Ensure these AWS resources exist before enabling the workflow:

1. **OIDC IAM Role**: `GitHubActions-ElasticBeanstalk-OIDC`
   - Needs permissions for ECR, S3, and Elastic Beanstalk.
2. **ECR Repository**: `math-pilot-v2`
3. **Elastic Beanstalk Application**: `math-pilot-v2`
4. **Elastic Beanstalk Environment**: `math-pilot-v2-env`
5. **S3 Bucket**: `elasticbeanstalk-eu-west-2-013419929011` (deployment artifacts)

Update the `env` block in `.github/workflows/deploy.yml` if your resource names differ.

## GitHub Actions Configuration

This workflow uses OIDC, so no long-lived AWS secrets are required. If you add notifications (Slack, etc.), store those in repository secrets.

## Application Runtime Configuration

Configure these environment variables in the Elastic Beanstalk environment:

```bash
NODE_ENV=production
PORT=3000
CLERK_SECRET_KEY=<your-clerk-secret>
```

## What the Workflow Does

1. Installs dependencies with `npm ci`.
2. Runs lint and tests (non-blocking on failure, consistent with the reference repo).
3. Builds the NestJS app.
4. Builds and pushes a Docker image to ECR.
5. Generates `Dockerrun.aws.json` and uploads it to S3.
6. Creates a new Elastic Beanstalk application version and updates the environment.

## Manual Verification

To verify locally:

```bash
docker build -t math-pilot-v2 .
docker run -p 3000:3000 math-pilot-v2
```

Then hit `http://localhost:3000` or your health endpoint (if added).

## Troubleshooting

- **ECR push fails**: check repo name and IAM role permissions.
- **Beanstalk deploy fails**: confirm app/env names and S3 bucket.
- **Runtime errors**: verify Elastic Beanstalk environment variables are set.
