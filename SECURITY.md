# Security Policy

## Supported version

Security fixes are applied to the latest code on `main`. The legacy v16 fallback is transitional and should not be treated as a separately supported release.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability or include secrets, private estimate data, or exploit details in a public discussion.

Use GitHub's private vulnerability reporting for this repository when it is enabled. If it is unavailable, contact the repository owner privately through their GitHub profile and share only the minimum information needed to establish a secure reporting channel.

Include:

- Affected version or commit
- Reproduction steps
- Expected and observed behavior
- Potential impact
- A suggested mitigation, if known

Do not access data that is not yours, degrade service, or perform destructive testing. Acknowledgement and remediation timing will depend on severity and maintainer availability.

## Frontend security expectations

- Never commit API tokens, OAuth client secrets, credentials, or customer data.
- Treat imported files and browser storage as untrusted input.
- Keep file-size limits and schema validation in place.
- Avoid rendering imported text as unsanitized HTML.
- Review dependency updates and generated lockfile changes before merge.
