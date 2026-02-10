# Configuration Guide

## Overview

This document provides comprehensive guidance on configuring the OSS Management System for your project. The system uses a configuration file to manage version comparison and SBOM (Software Bill of Materials) tracking.

## Configuration File

### File Location

The configuration file must be placed at the root of your repository:

```
your-repository/
├── oss-management-system.yml  ← Configuration file
├── .github/
│   └── workflows/
└── (your project files)
```

### File Format

The configuration file uses YAML format:

```yaml
# oss-management-system.yml

# Version to compare against when checking for OSS changes
pre-project-version: v1.0.0
```

## Configuration Options

### `pre-project-version`

**Type:** `string` (optional)

**Description:** Specifies the previous project version to use when comparing SBOMs. The system will retrieve the SBOM for this version from Dependency-Track and compare it against the current SBOM to identify added, removed, or updated OSS components.

**Valid Values:**
- Any version string that matches a version registered in Dependency-Track
- Typically follows your Git tag format (e.g., `v1.0.0`, `1.0.0`, `2023.12.1`)

**Special Cases:**
- **Not set or empty:** System treats current version as the first version
- **Version not found in Dependency-Track:** System treats current version as the first version

**Examples:**

```yaml
# Semantic versioning with 'v' prefix
pre-project-version: v1.0.0

# Semantic versioning without prefix
pre-project-version: 1.0.0

# Date-based versioning
pre-project-version: 2024.02.10

# Custom versioning scheme
pre-project-version: release-2024-q1
```

## Usage Scenarios

### Scenario 1: First Release (No Previous Version)

When releasing your project for the first time, you don't need a configuration file. The system will automatically detect this as the first version.

**Configuration:**
```yaml
# Option 1: No configuration file
# (file doesn't exist)

# Option 2: Empty pre-project-version
pre-project-version:

# Option 3: Omit the key entirely
# (empty file or file with other settings)
```

**Behavior:**
- All OSS components in current SBOM are marked as "added"
- No components are marked as "removed" or "updated"
- System uses an empty SBOM for comparison

### Scenario 2: Regular Release (With Previous Version)

For subsequent releases, specify the previous version to compare against.

**Configuration:**
```yaml
pre-project-version: v1.0.0
```

**Workflow:**
1. System reads `v1.0.0` from configuration
2. Retrieves SBOM for `v1.0.0` from Dependency-Track
3. Compares against current SBOM
4. Generates diff report showing added/removed/updated components

**When to Update:**
After each release, update the configuration file to point to the newly released version:

```yaml
# Before release v1.1.0
pre-project-version: v1.0.0

# After releasing v1.1.0, update for next development cycle
pre-project-version: v1.1.0
```

### Scenario 3: Skipping Versions

You can compare against any previous version, not just the immediately preceding one.

**Configuration:**
```yaml
# Compare against v1.0.0, skipping v1.1.0 and v1.2.0
pre-project-version: v1.0.0
```

**Use Cases:**
- Comparing against a major release baseline
- Analyzing cumulative changes over multiple versions
- Comparing against a known stable version

### Scenario 4: Branch-Specific Comparisons

Different branches can have different comparison targets.

**Main Branch:**
```yaml
pre-project-version: v2.0.0
```

**Feature Branch:**
```yaml
pre-project-version: v2.0.0
```

**Release Branch:**
```yaml
pre-project-version: v1.9.0
```

## Integration with GitHub Actions

### Pull Request Workflow

When a PR is created, the system:

1. Reads `oss-management-system.yml` from the PR branch
2. Resolves the previous version
3. Compares SBOMs
4. Posts a comment with the diff results

**Example Workflow:**
```yaml
name: SBOM Check on PR

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  sbom-check:
    uses: your-org/oss-management-system/.github/workflows/reusable-pr-sbom-check.yml@main
    secrets:
      DT_BASE_URL: ${{ secrets.DT_BASE_URL }}
      DT_API_KEY: ${{ secrets.DT_API_KEY }}
```

### Tag/Release Workflow

When a tag is created, the system:

1. Reads `oss-management-system.yml` from the tagged commit
2. Resolves the previous version
3. Generates and uploads current SBOM to Dependency-Track
4. Creates a review issue with the diff

**Example Workflow:**
```yaml
name: SBOM Review on Tag

on:
  push:
    tags:
      - 'v*'

jobs:
  sbom-review:
    uses: your-org/oss-management-system/.github/workflows/reusable-tag-sbom-review.yml@main
    secrets:
      DT_BASE_URL: ${{ secrets.DT_BASE_URL }}
      DT_API_KEY: ${{ secrets.DT_API_KEY }}
      GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Troubleshooting

### Problem: "Config file not found"

**Symptom:**
```
✗ Config file error: File not found
[INFO] Treating as first version (reason: config file not found)
```

**Cause:** The `oss-management-system.yml` file doesn't exist in the repository root.

**Solutions:**

1. **If this is your first release:** This is expected behavior. No action needed.

2. **If you have previous releases:** Create the configuration file:
   ```bash
   # Create the file in your repository root
   cat > oss-management-system.yml << EOF
   pre-project-version: v1.0.0
   EOF
   ```

3. **Verify file location:**
   ```bash
   # File must be at repository root, not in subdirectories
   ls -la oss-management-system.yml
   ```

### Problem: "Invalid YAML"

**Symptom:**
```
✗ Config file error: Invalid YAML: unexpected token at line 2
[ERROR] Failed to parse config file: /path/to/oss-management-system.yml
[ERROR] Expected format:
  pre-project-version: v1.0.0
```

**Cause:** The YAML file has syntax errors.

**Common Issues:**

1. **Incorrect indentation:**
   ```yaml
   # ❌ Wrong
     pre-project-version: v1.0.0
   
   # ✅ Correct
   pre-project-version: v1.0.0
   ```

2. **Missing colon:**
   ```yaml
   # ❌ Wrong
   pre-project-version v1.0.0
   
   # ✅ Correct
   pre-project-version: v1.0.0
   ```

3. **Special characters without quotes:**
   ```yaml
   # ❌ Wrong (if version contains special chars)
   pre-project-version: v1.0.0-beta+build.123
   
   # ✅ Correct
   pre-project-version: "v1.0.0-beta+build.123"
   ```

**Solution:**
Validate your YAML file:
```bash
# Using yamllint (if installed)
yamllint oss-management-system.yml

# Using online validator
# Copy content to https://www.yamllint.com/
```

### Problem: "SBOM not found in Dependency-Track"

**Symptom:**
```
[WARN] SBOM not found in DT for version v1.0.0
[INFO] Treating as first version (reason: DT SBOM not found)
```

**Cause:** The specified version doesn't exist in Dependency-Track.

**Solutions:**

1. **Verify the version exists in DT:**
   - Log into Dependency-Track UI
   - Navigate to your project
   - Check available versions

2. **Check version format:**
   ```yaml
   # Ensure format matches what's in DT
   # If DT has "1.0.0" but config has "v1.0.0", they won't match
   pre-project-version: 1.0.0  # Match DT format exactly
   ```

3. **If version should exist but doesn't:**
   - The previous release workflow may have failed
   - Manually upload the SBOM for that version to DT
   - Or update config to use a version that exists

4. **If this is intentional:**
   - System will treat as first version (safe fallback)
   - All components will be marked as "added"

### Problem: "Empty pre-project-version value"

**Symptom:**
```
[INFO] Treating as first version (reason: pre-project-version is empty)
```

**Cause:** The `pre-project-version` field is empty, null, or contains only whitespace.

**Examples of Empty Values:**
```yaml
# Empty string
pre-project-version:

# Null
pre-project-version: null

# Whitespace only
pre-project-version: "   "
```

**Solution:**
Provide a valid version string:
```yaml
pre-project-version: v1.0.0
```

### Problem: "Dependency-Track connection error"

**Symptom:**
```
[ERROR] DT API connection error: ECONNREFUSED
[INFO] Treating as first version (reason: DT retrieval failure)
```

**Cause:** Cannot connect to Dependency-Track API.

**Solutions:**

1. **Verify DT_BASE_URL secret:**
   ```yaml
   # In your workflow file
   env:
     DT_BASE_URL: ${{ secrets.DT_BASE_URL }}  # Must be set
   ```

2. **Check DT_API_KEY secret:**
   ```yaml
   env:
     DT_API_KEY: ${{ secrets.DT_API_KEY }}  # Must be valid
   ```

3. **Verify network connectivity:**
   - Ensure GitHub Actions runner can reach DT instance
   - Check firewall rules
   - Verify DT instance is running

4. **Test DT connection manually:**
   ```bash
   curl -H "X-Api-Key: YOUR_API_KEY" \
        https://your-dt-instance/api/v1/project
   ```

### Problem: "Wrong version being compared"

**Symptom:** The diff shows unexpected changes because it's comparing against the wrong version.

**Diagnosis:**
Check the workflow logs for version resolution:
```
[INFO] Config file found: /path/to/oss-management-system.yml
[INFO] pre-project-version: v1.0.0
[INFO] Previous version resolved: v1.0.0 (source: config-file)
```

**Solutions:**

1. **Update configuration file:**
   ```yaml
   # Change to correct version
   pre-project-version: v1.2.0
   ```

2. **Verify file is committed:**
   ```bash
   git status
   git add oss-management-system.yml
   git commit -m "Update comparison version"
   ```

3. **Check branch:**
   Ensure you're updating the correct branch's configuration file.

### Problem: "Configuration not taking effect"

**Symptom:** Changes to configuration file don't seem to apply.

**Solutions:**

1. **Ensure file is committed and pushed:**
   ```bash
   git add oss-management-system.yml
   git commit -m "Update OSS management config"
   git push
   ```

2. **Verify workflow is using latest code:**
   - Check that workflow runs after your commit
   - Look for the config file read step in workflow logs

3. **Check file name and location:**
   ```bash
   # Must be exactly this name at repository root
   ls -la oss-management-system.yml
   ```

4. **Clear any caches:**
   - Re-run the workflow
   - Create a new PR to trigger fresh execution

## Best Practices

### 1. Update Configuration After Each Release

Create a checklist for your release process:

```markdown
## Release Checklist

- [ ] Create release tag (e.g., v1.1.0)
- [ ] Verify SBOM uploaded to Dependency-Track
- [ ] Update oss-management-system.yml
      ```yaml
      pre-project-version: v1.1.0
      ```
- [ ] Commit and push configuration update
- [ ] Verify next PR uses correct comparison version
```

### 2. Keep Configuration in Version Control

Always commit the configuration file:

```bash
git add oss-management-system.yml
git commit -m "chore: update OSS comparison baseline to v1.1.0"
git push
```

### 3. Document Version Strategy

Add a comment in your configuration file:

```yaml
# OSS Management System Configuration
#
# This file specifies the baseline version for OSS component comparison.
# Update this after each release to track changes from the latest stable version.
#
# Last updated: 2024-02-10
# Current baseline: v1.1.0 (released 2024-02-01)

pre-project-version: v1.1.0
```

### 4. Use Consistent Version Format

Choose a format and stick with it:

```yaml
# ✅ Good: Consistent with Git tags
# Git tags: v1.0.0, v1.1.0, v1.2.0
pre-project-version: v1.1.0

# ❌ Avoid: Mixing formats
# Git tags: v1.0.0, v1.1.0
# Config: 1.1.0  (missing 'v' prefix)
```

### 5. Automate Configuration Updates

Consider automating the update process:

```bash
#!/bin/bash
# update-oss-config.sh

NEW_VERSION=$1

if [ -z "$NEW_VERSION" ]; then
  echo "Usage: $0 <version>"
  exit 1
fi

cat > oss-management-system.yml << EOF
# Updated: $(date +%Y-%m-%d)
pre-project-version: $NEW_VERSION
EOF

git add oss-management-system.yml
git commit -m "chore: update OSS baseline to $NEW_VERSION"

echo "Configuration updated to $NEW_VERSION"
```

Usage:
```bash
./update-oss-config.sh v1.2.0
```

### 6. Monitor First Version Scenarios

If you see "first version" treatment unexpectedly, investigate:

```bash
# Check configuration file
cat oss-management-system.yml

# Verify version in Dependency-Track
# (via UI or API)

# Review workflow logs for details
```

## Migration from Environment Variables

If you're migrating from the old `PREVIOUS_VERSION` environment variable approach:

### Step 1: Identify Current Comparison Version

Check your existing workflow:

```yaml
# Old approach
env:
  PREVIOUS_VERSION: v1.0.0
```

### Step 2: Create Configuration File

```bash
cat > oss-management-system.yml << EOF
pre-project-version: v1.0.0
EOF
```

### Step 3: Remove Environment Variable

Update your workflow file:

```yaml
# Remove this section
env:
  PREVIOUS_VERSION: v1.0.0  # ← Delete
```

### Step 4: Commit Changes

```bash
git add oss-management-system.yml
git add .github/workflows/your-workflow.yml
git commit -m "migrate: switch to config-based version management"
git push
```

### Step 5: Verify

Create a test PR and verify the workflow:
- Reads configuration file successfully
- Uses correct comparison version
- Generates expected diff report

## Advanced Configuration

### Multiple Environments

For projects with multiple environments, you can use branch-specific configurations:

**Production Branch (main):**
```yaml
pre-project-version: v2.0.0
```

**Staging Branch (staging):**
```yaml
pre-project-version: v2.0.0-rc.1
```

**Development Branch (develop):**
```yaml
pre-project-version: v1.9.0
```

### Monorepo Support

For monorepos, place the configuration at the repository root:

```
monorepo/
├── oss-management-system.yml  ← Single config for entire repo
├── service-a/
├── service-b/
└── shared-lib/
```

The system will use the same baseline version for all services in the monorepo.

## FAQ

### Q: What happens if I don't create a configuration file?

**A:** The system treats your current version as the first version. All OSS components will be marked as "added" in the diff report. This is safe and allows the workflow to complete successfully.

### Q: Can I use different versions for PR checks vs. tag reviews?

**A:** Yes, the configuration file is read from the specific branch/commit being processed. You can have different values in different branches.

### Q: How often should I update the configuration?

**A:** Update after each release. This ensures the next development cycle compares against the latest stable version.

### Q: What if the previous version has a different set of OSS components?

**A:** That's the point! The system will show:
- **Added:** Components in current version but not in previous
- **Removed:** Components in previous version but not in current
- **Updated:** Components with version changes

### Q: Can I compare against a very old version?

**A:** Yes, you can specify any version that exists in Dependency-Track. However, comparing against distant versions may produce large diffs that are harder to review.

### Q: What's the difference between "first version" and "version not found"?

**A:** Both result in the same behavior (using empty SBOM for comparison), but the reason is different:
- **First version:** Intentional - no previous version exists or is configured
- **Version not found:** Potential issue - configured version doesn't exist in DT

### Q: Do I need to update the configuration for every commit?

**A:** No, only after releases. During development, all PRs in a release cycle compare against the same baseline version.

## Support

For additional help:

1. **Check workflow logs:** Detailed information about version resolution is logged
2. **Review Dependency-Track:** Verify versions and SBOMs are correctly registered
3. **Consult README.md:** General usage information and examples
4. **Consult DESIGN.md:** Technical architecture and implementation details

## Summary

The configuration file provides explicit control over version comparison in the OSS Management System. Key points:

- **File:** `oss-management-system.yml` at repository root
- **Format:** YAML with `pre-project-version` key
- **Update:** After each release
- **Fallback:** System safely handles missing or invalid configurations
- **Logging:** Detailed logs help troubleshoot issues

By following this guide, you can effectively manage OSS component tracking across your project's lifecycle.
