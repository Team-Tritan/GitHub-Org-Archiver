# GitHub Org Archiver

A tool to automatically clone and backup GitHub repositories to SMB network shares. This project fetches repositories from specified GitHub users or organizations and stores them both locally and on remote SMB shares for archival purposes.

## Features

- 🔄 Fetch repositories from GitHub users or organizations
- 📦 Clone repositories locally for processing
- 🌐 Upload to SMB network shares for remote storage
- ⚡ Concurrent processing with configurable limits
- 🎨 Colored console output for better visibility
- 🔧 Configurable via TypeScript configuration file

## Prerequisites

- [Bun](https://bun.sh/) runtime
- Git installed on your system
- Access to SMB network share (if using remote backup)
- GitHub token for API access (recommended for higher rate limits)

## Installation

1.  Clone this repository:
    git clone <repository-url>
    cd github-archive

2.  Install dependencies:
    bun install

3.  Configure your settings in config.ts:

```
export const config = {
    githubUser: 'your-github-username',
    githubToken: 'your-github-token', // Optional but recommended
    orgName: 'your-organization-name', // Optional

    smbUser: 'smb-username',
    smbPass: 'smb-password',
    smbServer: '192.168.1.100',
    smbShare: 'backup',
    smbRemotePath: 'github-repos/2025',

    tmpDir: '/tmp/github_repos',
    concurrency: 5, // Number of concurrent operations
};
```

## Configuration

The config.ts file contains all necessary configuration options:

| Option        | Description                                    | Required           |
| ------------- | ---------------------------------------------- | ------------------ |
| githubUser    | GitHub username to fetch repositories from     | Yes                |
| githubToken   | GitHub personal access token                   | Recommended        |
| orgName       | GitHub organization name (alternative to user) | Optional           |
| smbUser       | SMB share username                             | Yes (if using SMB) |
| smbPass       | SMB share password                             | Yes (if using SMB) |
| smbServer     | SMB server IP address                          | Yes (if using SMB) |
| smbShare      | SMB share name                                 | Yes (if using SMB) |
| smbRemotePath | Remote path within SMB share                   | Yes (if using SMB) |
| tmpDir        | Temporary directory for cloning                | Yes                |
| concurrency   | Number of concurrent operations                | Yes                |

## Usage

Run the archive process:
bun run index.ts

The tool will:

1. Fetch all repositories from the specified GitHub user/organization
2. Clone each repository to the temporary directory
3. Upload the repositories to the configured SMB share
4. Clean up temporary files

## Project Structure

- index.ts - Main application entry point
- config.ts - Configuration file
- package.json - Project dependencies and scripts
- README.md - This documentation file

## Dependencies

- colors - For colored console output
- @types/bun - TypeScript types for Bun runtime

## Error Handling

The application includes comprehensive error handling for:

- GitHub API failures
- Git clone operations
- SMB connection and upload issues
- File system operations

All errors are logged with colored output for easy identification.

## Security Notes

- Store your GitHub token securely and never commit it to version control
- Use environment variables or secure configuration management for sensitive data
- Ensure SMB credentials are properly secured
- The temporary directory is cleaned up after each run

## License

This project is provided as-is for archival purposes.

## Contributing

Feel free to submit issues
