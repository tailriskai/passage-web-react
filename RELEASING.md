# Release Process

This package uses a single, unified GitHub Actions workflow for streamlined releases that handles version bumping, tagging, GitHub releases, and NPM publishing all in one place.

## 🚀 Unified Release & Publish Workflow

### How to Release

1. **Go to Actions tab** in your GitHub repository
2. **Select "Release and Publish"** workflow
3. **Click "Run workflow"**
4. **Configure the release**:
   - **Version bump type**: Choose `patch`, `minor`, or `major`
   - **Release notes**: Write your changelog in markdown format

### What the Workflow Does

The unified workflow automatically handles everything:

- ✅ **Reads current version** from `package.json`
- ✅ **Bumps version** according to semantic versioning
- ✅ **Commits version change** to main branch
- ✅ **Creates git tag** (e.g., `v1.0.1`)
- ✅ **Pushes changes and tags** to repository
- ✅ **Creates GitHub release** with your release notes
- ✅ **Builds the package** using your build scripts
- ✅ **Publishes to NPM** as `@getpassage/react-js`
- ✅ **Attaches release assets** (tarball) to GitHub release

### Version Bumping

The workflow uses semantic versioning:

- **Patch** (0.0.7 → 0.0.8): Bug fixes, small updates
- **Minor** (0.0.7 → 0.1.0): New features, backwards compatible
- **Major** (0.0.7 → 1.0.0): Breaking changes

## 📦 Installation

After release, your package is available on NPM:

```bash
# Install latest version
npm install @getpassage/react-js

# Install specific version
npm install @getpassage/react-js@1.0.1

# Using pnpm
pnpm add @getpassage/react-js

# Using yarn
yarn add @getpassage/react-js
```

## 🔧 Setup Requirements

### GitHub Repository Secrets

You need to configure one secret in your repository settings:

- **`NPM_TOKEN`**: Your NPM authentication token for publishing
  - Go to Settings → Secrets and variables → Actions
  - Add `NPM_TOKEN` with your NPM publish token

### Permissions

The workflow uses built-in `GITHUB_TOKEN` with these permissions:

- `contents: write` (for pushing commits and tags)
- `packages: write` (for potential GitHub Packages support)

## 📋 Pre-release Checklist

### Before Running the Workflow

- [ ] All tests passing locally
- [ ] Code reviewed and approved
- [ ] Documentation updated
- [ ] Breaking changes documented (if any)
- [ ] Example app tested (if applicable)
- [ ] Ready for production release

### Release Notes Guidelines

When writing release notes, include:

- **New features** added
- **Bug fixes** implemented
- **Breaking changes** (if any)
- **Deprecation notices** (if any)
- **Migration instructions** (for breaking changes)

Example release notes:

```markdown
### What's Changed

#### 🚀 New Features

- Added dark mode support for PassageModal
- New `onSuccess` callback option

#### 🐛 Bug Fixes

- Fixed authentication state not persisting
- Resolved TypeScript type issues

#### ⚠️ Breaking Changes

- Renamed `config.apiKey` to `config.appId`
- Removed deprecated `useAuth` hook

#### 📚 Documentation

- Updated example app with new features
- Added migration guide for v1.0.0
```

## 🔄 Complete Release Flow

### Development to Production

1. **Develop and test** your changes
2. **Merge to main branch** via pull request
3. **Run release workflow** when ready for production
4. **Verify release** on NPM and GitHub
5. **Update dependent projects** as needed

### Post-Release Tasks

- [ ] Verify package appears on [NPM](https://www.npmjs.com/package/@getpassage/react-js)
- [ ] Test installation in a fresh project
- [ ] Update dependent applications/examples
- [ ] Announce release (if significant)
- [ ] Monitor for any issues

## 🛠️ Manual Release (Emergency Fallback)

If GitHub Actions are unavailable, you can release manually:

```bash
# 1. Bump version
npm version patch # or minor/major

# 2. Build package
npm run build

# 3. Prepare README for NPM
cp README.npm.md README.md

# 4. Publish to NPM
npm publish --access public

# 5. Restore repo README
cp README.repo.md README.md

# 6. Push version tag
git push origin main --tags
```

## 🎯 Best Practices

### Version Strategy

- **Patch releases**: Bug fixes, security updates, small improvements
- **Minor releases**: New features, enhancements, non-breaking changes
- **Major releases**: Breaking changes, major rewrites, API changes

### Release Frequency

- **Bug fixes**: Release quickly (within days)
- **Features**: Bundle related features together
- **Breaking changes**: Plan carefully, provide migration guides

### Quality Assurance

- Always test the package installation after release
- Verify examples and documentation work with new version
- Monitor GitHub issues for post-release problems

## 📚 Workflow Details

### File Changes During Release

The workflow temporarily modifies files during the release process:

1. **`package.json`**: Version number updated
2. **`README.md`**: Switched to NPM version during publish
3. **Git history**: New commit and tag created

### README Management

The package has multiple README files:

- **`README.repo.md`**: Repository documentation (default)
- **`README.npm.md`**: NPM package documentation
- **`README.md`**: Active README (switches during release)

### Build Process

The workflow runs your existing build scripts:

- `pnpm install --frozen-lockfile`
- `pnpm build`
- Handles `prepack`/`postpack` scripts automatically

## 🔧 Troubleshooting

### Common Issues

**"Version already exists"**

- Check if the version is already published on NPM
- Verify the current version in `package.json`

**"NPM_TOKEN authentication failed"**

- Verify the token is valid and has publish permissions
- Check the token is correctly set in repository secrets

**"Git push failed"**

- Ensure repository has write permissions
- Check for branch protection rules

**"Build failed"**

- Verify all dependencies are in `package.json`
- Test build process locally first

### Getting Help

- Check GitHub Actions logs for detailed error messages
- Verify all secrets are properly configured
- Test the build process locally before releasing

## 📖 Additional Resources

- [Semantic Versioning](https://semver.org/)
- [NPM Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

## Browser Support

This package supports modern browsers with React 16.8+ (Hooks support). When releasing:

- Test in major browsers (Chrome, Firefox, Safari, Edge)
- Note any browser-specific changes in release notes
- Ensure peer dependencies are compatible with target environments
