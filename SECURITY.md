# Security Policy

## Reporting a security issue

Please do **not** disclose exploitable vulnerabilities, credentials, tokens, or personal data in public issues or pull requests.

If private vulnerability reporting is enabled, use the repository's **Security → Report a vulnerability** option. Otherwise, contact the repository maintainer privately before sharing technical details publicly.

A useful report includes:
- Affected application, file, and commit or deployment version
- Clear reproduction steps and the potential impact
- A minimal proof of concept **without real secrets or personal data**

## Handling secrets

Never commit real `.env` files, API tokens, private keys, service-account files, or user data. Store production credentials in GitHub Actions secrets or the relevant deployment provider's secret manager. If a credential is exposed, revoke and rotate it; merely deleting it from a later commit is not sufficient.

## Dependencies and updates

Review and test dependency-update pull requests before merging. Security updates should be prioritized, but this repository does not automatically merge dependency changes.
