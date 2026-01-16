# Prep Release

Create a new project-level skill based on the provided intent.

## User Input

$ARGUMENTS <version>

## Guideliones

1. Make sure you are on develop.
2. Make sure it is up-to-date.
3. Checkout the master branch
4. Merge develop into master
5. Open CHANGELOG.md and update the unreleased section with the new version (if not specified, use your tool to ask the user for the version).
6. Create a new Unreleased section with all sub-sections for a changelog entry: Breaking Change, Fixed, Added, Changed.
7. Commit the changes with the message "chore: prepare release <version>".
8. Push the changes to the remote repository.
