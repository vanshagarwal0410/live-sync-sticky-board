# AWS Cleanup Guide

Every AWS resource created for the Live-Sync Sticky Board deployment,
with the exact command to delete each one. Run these after the recruitment
window closes to stop paying.

**Region**: `ap-south-1` (Mumbai)
**Account**: `283008306370`

## Order of deletion

Delete in this order to avoid dependency errors.

### 1. Terminate EC2 Instance

```bash
aws ec2 terminate-instances --instance-ids i-0c67de9371796eef3 --region ap-south-1
```

### 2. Release Elastic IP

Wait for the instance to terminate first (otherwise the EIP is still associated).

```bash
# Wait for termination
aws ec2 wait instance-terminated --instance-ids i-0c67de9371796eef3 --region ap-south-1

# Release the Elastic IP
aws ec2 release-address --allocation-id eipalloc-04083ce38745ead90 --region ap-south-1
```

### 3. Delete Security Group

```bash
aws ec2 delete-security-group --group-id sg-0f3d08eab43857354 --region ap-south-1
```

### 4. Empty and Delete S3 Bucket

```bash
aws s3 rm s3://live-sync-sticky-board-vanshagarwal0410 --recursive
aws s3api delete-bucket --bucket live-sync-sticky-board-vanshagarwal0410 --region ap-south-1
```

### 5. Delete IAM Instance Profile and Role

```bash
aws iam remove-role-from-instance-profile --instance-profile-name StickyBoardProfile --role-name StickyBoardEC2Role
aws iam delete-instance-profile --instance-profile-name StickyBoardProfile
aws iam detach-role-policy --role-name StickyBoardEC2Role --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore
aws iam delete-role --role-name StickyBoardEC2Role
```

## Resource Summary

| Resource | Identifier | Est. Monthly Cost |
|----------|-----------|-------------------|
| EC2 Instance (t3.micro) | `i-0c67de9371796eef3` | ~$8.50 |
| Elastic IP | `eipalloc-04083ce38745ead90` / `15.252.93.200` | Free (while attached) |
| Security Group | `sg-0f3d08eab43857354` | Free |
| S3 Bucket | `live-sync-sticky-board-vanshagarwal0410` | ~$0.02 |
| IAM Role | `StickyBoardEC2Role` | Free |
| IAM Instance Profile | `StickyBoardProfile` | Free |

**Total: ~$9/month**
