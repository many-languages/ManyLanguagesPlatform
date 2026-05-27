## ManyLanguages Platform

*A scalable infrastructure for managing research studies and open sharing of data*.


[![DOI](https://zenodo.org/badge/1057329403.svg)](https://doi.org/10.5281/zenodo.18615191)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Contributions Welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg)](https://github.com/many-languages/ManyLanguagesPlatform/tree/main?tab=contributing-ov-file)
[![Slack](https://img.shields.io/badge/chat-on%20Slack-purple.svg?logo=slack)]([https://your-slack-invite-link](https://join.slack.com/t/manylanguagesplatform/shared_invite/zt-3pxt160lg-7lFTX3Me1SVvo8i5QL7G~g))  

## Support

This work is supported by a grant from the National Science Foundation [2438627](https://www.nsf.gov/awardsearch/show-award?AWD_ID=2438627).

## Local Development

For complete setup and configuration details, see the [Getting Started](deploy/docs/getting-started.md) guide. Here's a quick start for running the app locally:

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```
2. Copy the `.env.example` file to `.env` and fill in the required values:
   ```bash
   cp .env.example .env
   ```
3. Start the application and database containers:
   ```bash
   make dev-host-app
   # or `make dev-fullstack` to run the app in Docker as well
   ```
4. Run the Next.js development server (if using `dev-host-app`):
   ```bash
   npm run dev
   ```

## Testing

Vitest uses the dedicated root [.env.test](./.env.test) instead of inheriting your normal dev `.env`.
For database-backed tests, start the isolated test Postgres first:

```bash
npm run test:db:up
npm run test
```

Stop it when you are done:

```bash
npm run test:db:down
```

### 📖 Documentation: 

👉 [Full installation and usage guide](https://many-languages.com/documentation)

### 📦 Citation

If you use the platform in your work, please cite it using the concept DOI or a release-specific DOI:
	
- Concept DOI: https://doi.org/10.5281/zenodo.18615191
- For specific releases, use the DOI associated with that release (badge above links to the latest).

### 🤝 Contributing

We welcome contributions of all kinds — code, documentation, testing, and feedback.
[See our contribution guidelines.](https://github.com/many-languages/ManyLanguagesPlatform/tree/main?tab=contributing-ov-file)
