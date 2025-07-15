# Release Process

This package uses GitHub Actions for automated releases with two separate workflows:

## 🚀 Automatic GitHub Packages Release

### Automatic Publishing (Main Branch)

Every push/merge to the `main` branch automatically:

- ✅ **Generates version**: `{package.json.version}-{git-hash}` (e.g., `1.0.0-abc1234`)
- ✅ **Builds package**: Runs build process
- ✅ **Creates GitHub release**: Marked as prerelease
- ✅ **Publishes to GitHub Packages**: Available immediately

**No manual intervention required!** Just push your code to main.

### Version Format

- **Base version**: From `package.json` (e.g., `1.0.0`)
- **Git hash**: Last 7 characters of commit hash (e.g., `abc1234`)
- **Final version**: `1.0.0-abc1234`

### Installation from GitHub Packages

```bash
# Latest from main branch
npm install @tailriskai/passage-web-react@latest

# Specific version
npm install @tailriskai/passage-web-react@1.0.0-abc1234
```

## 📦 Manual NPM Publishing

### When to Use NPM Publishing

- ✅ **Stable releases**: Ready for production
- ✅ **Public distribution**: Make package publicly available
- ✅ **Semantic versioning**: Follow proper version numbers

### How to Publish to NPM

1. **Ensure GitHub release exists**:

   ```bash
   # Create a proper semantic version tag
   git tag v1.0.1
   git push origin v1.0.1
   ```

2. **Run NPM Publish Workflow**:
   - Go to Actions tab in GitHub
   - Select "Publish to NPM" workflow
   - Click "Run workflow"
   - Fill in the inputs:
     - **Version**: `1.0.1` (must match existing tag)
     - **NPM Organization**: `@getpassage` (or leave empty)
     - **Dry Run**: `true` (for testing first)

3. **Verify and Publish**:
   - First run with `dry_run: true` to test
   - Then run with `dry_run: false` to actually publish

### NPM Installation

```bash
# From NPM registry
npm install @getpassage/web-react@1.0.1

# Latest stable from NPM
npm install @getpassage/web-react@latest
```

## 🔄 Complete Release Flow

### Development Workflow

1. **Push to main** → Automatic GitHub Packages release
2. **Test integration** → Use `@latest` from GitHub Packages
3. **Ready for production** → Manual NPM publish

### Production Release Process

1. **Update `package.json` version** (if needed for base version)
2. **Create version tag**:
   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```
3. **Manual NPM publish** via GitHub Actions
4. **Update release notes** in GitHub release

## 📋 Pre-release Checklist

### Before Pushing to Main

- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Documentation updated
- [ ] Example app tested (if applicable)
- [ ] TypeScript types verified

### Before NPM Publishing

- [ ] GitHub Packages version tested
- [ ] Integration tests with consuming applications
- [ ] Release notes prepared
- [ ] Version number follows semantic versioning
- [ ] Breaking changes documented

## 🛠️ Manual Release (Fallback)

If GitHub Actions are unavailable:

### GitHub Packages

1. **Build and prepare**:

   ```bash
   npm ci
   npm run build
   npm pkg set name="@tailriskai/passage-web-react"
   npm pkg set publishConfig.registry="https://npm.pkg.github.com"
   ```

2. **Publish**:
   ```bash
   npm publish
   ```

### NPM Registry

1. **Prepare for NPM**:

   ```bash
   npm pkg set name="@getpassage/web-react"
   cp README.npm.md README.md
   ```

2. **Publish**:
   ```bash
   npm publish --access public
   ```

## 📚 Using the Package

### From GitHub Packages

1. **Create `.npmrc` in your project**:

   ```
   @tailriskai:registry=https://npm.pkg.github.com
   //npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
   ```

2. **Set authentication**:

   ```bash
   export NODE_AUTH_TOKEN=your_github_token_with_read_packages
   ```

3. **Install**:
   ```bash
   npm install @tailriskai/passage-web-react@latest
   ```

### From NPM Registry

```bash
# No special configuration needed
npm install @getpassage/web-react@latest
```

## 🏷️ Version Numbering

### Automatic Versions (GitHub Packages)

- **Format**: `{base}-{hash}` (e.g., `1.0.0-abc1234`)
- **Purpose**: Development builds, testing, CI/CD

### Manual Versions (NPM)

- **Patch** (1.0.x): Bug fixes, small updates
- **Minor** (1.x.0): New features, backwards compatible
- **Major** (x.0.0): Breaking changes

## 🎯 Best Practices

### Development

- Use GitHub Packages for development and testing
- Automatic versioning ensures unique versions per commit
- No version conflicts in development

### Production

- Use NPM for stable, production releases
- Follow semantic versioning strictly
- Test thoroughly before NPM publishing

### CI/CD Integration

- GitHub Packages: Perfect for automated deployments
- NPM: Use for public distribution and stable releases

## 🔧 Troubleshooting

### Common Issues

- **Version already exists**: Use dry run first, check existing versions
- **Authentication failed**: Verify `NPM_TOKEN` secret is set
- **Tag doesn't exist**: Create proper git tag before NPM publishing

### Workflow Failures

- Check GitHub Actions logs for detailed error messages
- Verify all required secrets are configured
- Ensure package.json format is valid

## 📖 Additional Resources

- [GitHub Packages Documentation](https://docs.github.com/en/packages)
- [NPM Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [Semantic Versioning](https://semver.org/)

## Browser Support Notes

This package supports modern browsers with React 16.8+ (Hooks support). When releasing:

- Test in major browsers (Chrome, Firefox, Safari, Edge)
- Note any browser-specific changes in release notes
- Ensure peer dependencies are compatible
