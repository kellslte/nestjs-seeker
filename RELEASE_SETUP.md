# Release Workflow Setup Guide

This guide explains how to set up the required secrets and configuration for the automated release workflow.

## Required Secrets

The release workflow requires the following secrets to be configured in your GitHub repository:

### 1. NPM_TOKEN (Required)

This token is used to publish packages to npm. You need to create an npm access token and add it as a secret.

#### Creating an npm Access Token

1. **Log in to npm**:
   ```bash
   npm login
   ```

2. **Create an Access Token**:
   - Go to [npmjs.com](https://www.npmjs.com/)
   - Click on your profile picture → **Access Tokens**
   - Click **Generate New Token**
   - Select **Automation** token type (for CI/CD)
   - Give it a descriptive name (e.g., "GitHub Actions Release")
   - Click **Generate Token**
   - **Copy the token immediately** (you won't be able to see it again)

3. **Add Token to GitHub Secrets**:
   - Go to your GitHub repository
   - Navigate to **Settings** → **Secrets and variables** → **Actions**
   - Click **New repository secret**
   - Name: `NPM_TOKEN`
   - Value: Paste your npm access token
   - Click **Add secret**

#### Alternative: Using npm Automation Tokens

For better security, you can use npm's automation tokens:

```bash
# Create an automation token via CLI
npm token create --type=automation
```

### 2. GITHUB_TOKEN (Automatic)

The `GITHUB_TOKEN` is automatically provided by GitHub Actions and doesn't need to be manually configured. It's used for:
- Creating GitHub releases
- Pushing commits and tags
- Accessing repository contents

**Note**: The workflow explicitly references `GITHUB_TOKEN` for clarity, but it's automatically available in all GitHub Actions workflows.

## Workflow Permissions

The release workflow requires the following permissions (already configured in the workflow):

```yaml
permissions:
  contents: write  # For creating releases and pushing tags
  id-token: write  # For npm publishing (if using OpenID Connect)
```

## Setup Steps Summary

1. ✅ Create npm access token
2. ✅ Add `NPM_TOKEN` secret to GitHub repository
3. ✅ Verify workflow file is in `.github/workflows/release.yml`
4. ✅ Ensure you have publish access to the npm package

## Verifying Setup

### Test the Workflow

1. **Manual Dispatch Test**:
   - Go to **Actions** tab in your GitHub repository
   - Select **Release** workflow
   - Click **Run workflow**
   - Choose version type (patch/minor/major)
   - Click **Run workflow**

2. **Tag Push Test**:
   ```bash
   # Create and push a tag
   git tag v1.0.0
   git push origin v1.0.0
   ```

### Check Workflow Logs

After running the workflow:
- Go to **Actions** tab
- Click on the workflow run
- Check each step for errors
- Verify the package was published to npm
- Verify the GitHub release was created

## Troubleshooting

### Common Issues

#### 1. "NPM_TOKEN not found"
- **Solution**: Ensure the secret is named exactly `NPM_TOKEN` (case-sensitive)
- **Check**: Go to Settings → Secrets and variables → Actions

#### 2. "npm ERR! 403 Forbidden"
- **Solution**: Your npm token may not have publish permissions
- **Fix**: Create a new token with automation permissions
- **Check**: Ensure you're logged in to the correct npm account

#### 3. "Package name already exists"
- **Solution**: Ensure the package name in `package.json` matches your npm organization/username
- **Check**: Verify `package.json` has the correct `name` field

#### 4. "Git push failed"
- **Solution**: The workflow needs write access to the repository
- **Fix**: Ensure the repository allows GitHub Actions to write
- **Check**: Settings → Actions → General → Workflow permissions

#### 5. "Tag already exists"
- **Solution**: Delete the existing tag or use a different version
- **Fix**: The workflow will skip tag creation if it already exists

## Package Name Configuration

Ensure your `package.json` has the correct package name:

```json
{
  "name": "@scwar/nestjs-seeker",
  "version": "1.0.0",
  "publishConfig": {
    "access": "public"
  }
}
```

For scoped packages (starting with `@`), you need to:
1. Be a member of the npm organization
2. Have publish permissions
3. Set `"access": "public"` in `publishConfig` (or use `--access public` flag)

## Security Best Practices

1. **Use Automation Tokens**: Always use automation-type tokens for CI/CD
2. **Rotate Tokens Regularly**: Update tokens periodically
3. **Limit Token Scope**: Only grant necessary permissions
4. **Use Environment Secrets**: For multiple environments, use environment-specific secrets
5. **Monitor Token Usage**: Regularly check npm access token activity

## Alternative: OpenID Connect (OIDC)

For enhanced security, you can use OpenID Connect instead of static tokens:

1. Configure npm to trust GitHub Actions
2. Update the workflow to use OIDC
3. Remove the need for `NPM_TOKEN` secret

See [npm's OIDC documentation](https://docs.npmjs.com/using-github-actions-with-oidc-to-publish-packages) for details.

## Next Steps

After setting up secrets:

1. **Test the workflow** with a patch version bump
2. **Verify** the package appears on npm
3. **Check** the GitHub release was created
4. **Review** the changelog was updated correctly

## Additional Resources

- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [npm Access Tokens](https://docs.npmjs.com/about-access-tokens)
- [npm Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [GitHub Actions Permissions](https://docs.github.com/en/actions/security-guides/automatic-token-authentication)

