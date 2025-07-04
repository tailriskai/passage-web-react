# Release Process

This package uses GitHub Actions for automated releases. Here's how to create a new release:

## Automated Release (Recommended)

### Option 1: Tag-based Release

1. Create and push a version tag:
   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```
2. The GitHub Action will automatically:
   - Build the package
   - Create a GitHub release
   - Publish to GitHub Packages

### Option 2: Manual Workflow Dispatch

1. Go to Actions tab in GitHub
2. Select "Release and Publish" workflow
3. Click "Run workflow"
4. Fill in the inputs:
   - **Version**: Enter the version number (e.g., "1.0.1")
   - **Release notes**: Enter custom release notes (optional, markdown supported)

     ```markdown
     ### Features

     - Added new TypeScript types
     - Improved WebSocket performance

     ### Bug Fixes

     - Fixed status tracking issues
     - Fixed modal z-index stacking

     ### Breaking Changes

     - None
     ```

5. Click "Run workflow"

**Note**: If you don't provide release notes, a default template will be used.

## Manual Release (Fallback)

If you need to publish manually:

1. **Update version**:

   ```bash
   npm version patch # or minor/major
   ```

2. **Build the package**:

   ```bash
   npm run build
   ```

3. **Login to GitHub registry**:

   ```bash
   npm login --registry=https://npm.pkg.github.com --scope=@tailriskai
   # Username: YOUR_GITHUB_USERNAME
   # Password: YOUR_GITHUB_TOKEN (with packages:write permission)
   ```

4. **Publish**:

   ```bash
   npm publish
   ```

5. **Create GitHub release**:
   - Go to Releases page
   - Click "Create a new release"
   - Tag version: v{VERSION}
   - Release title: Release v{VERSION}
   - Describe the changes
   - Attach the `.tgz` file from `npm pack`

## Using the Package

Once published, the package can be installed from GitHub Packages:

1. **Create `.npmrc` in your project**:

   ```
   @tailriskai:registry=https://npm.pkg.github.com
   //npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
   ```

2. **Set NODE_AUTH_TOKEN environment variable**:

   ```bash
   export NODE_AUTH_TOKEN=your_github_token_with_read_packages
   ```

   **Note**: We use `NODE_AUTH_TOKEN` instead of `GITHUB_TOKEN` because:
   - It's the standard npm authentication variable
   - GitHub Actions' `setup-node` action expects this variable name
   - It maintains consistency with our CI/CD workflows

3. **Install the package**:
   ```bash
   npm install @tailriskai/passage-web-react
   # or
   yarn add @tailriskai/passage-web-react
   ```

## Version Numbering

Follow semantic versioning:

- **Patch** (1.0.x): Bug fixes, small updates
- **Minor** (1.x.0): New features, backwards compatible
- **Major** (x.0.0): Breaking changes

## Pre-release Checklist

- [ ] All tests passing
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] Example app tested (if applicable)
- [ ] TypeScript types verified
- [ ] Version bumped appropriately

## Browser Support Notes

This package supports modern browsers with React 16.8+ (Hooks support). When releasing:

- Test in major browsers (Chrome, Firefox, Safari, Edge)
- Note any browser-specific changes in release notes
- Ensure peer dependencies are compatible
