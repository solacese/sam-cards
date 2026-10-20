# Agent Mesh company research

[Open the tool](https://solacese.github.io/sam-cards/). Enter a company name to get three proposed business opportunities based on recent public news. Each case uses two or three agents, starts from operational events across business systems, and explains the risk, revenue opportunity, human approval and outcome feedback. Export PDF downloads the full report and linked sources locally.

Open **Tailor your use cases (Optional)** to select departments, a topic, desired outcomes and systems. The three multi-select menus support custom entries (Add or Enter); topic is free text. Any combination works. Selections survive generation and errors, and a summary above the cards shows the submitted brief. Each tailored card explains departmental/topic fit, uses the selected outcomes as its value statements, and labels assumptions. Expand its workflow details for proposed system roles. Those systems are user-provided context, not verified company installations or available integrations. PDF exports include the brief and fit details.

Tailoring guides research and opportunity selection as well as the event trigger, agents, actions, metrics and discovery questions. Broader company news can motivate a proposed workflow when topic-specific evidence is unavailable; that connection must be labelled as an assumption. A target department can still collaborate with other teams. With all optional fields empty, the existing company-only prompt and card layout remain in use.

The interface is static GitHub Pages. A small AWS API calls Perplexity Sonar Pro. Credentials stay in AWS Secrets Manager; `config.js` contains only the public API URL. This research tool proposes workflows; it does not deploy agents or access customer systems. LangGraph and Azure can implement equivalent patterns with additional event and integration infrastructure. Agent Mesh's event entrypoints and broker fabric provide the integration advantage described in each case. Improvement requires measured outcomes, offline evaluation and human-approved changes.

Research has a 20-second client limit and a 19-second provider deadline; it returns sooner when complete. Timeout, missing sources or insufficient news produce a clear error. There are no prepared company answers or fabricated fallback reports. Valid reports require three distinct cases, two or three named agents each, news dates within 180 days, and relevant cited HTTPS evidence for every case. Company-only research retains its three-source minimum; tailored workflows may share a single relevant news development instead of padding the bibliography. Perplexity searches the last month. Source metadata comes from the provider and should be checked before making a customer claim.

The AWS stack `sam-cards-research` uses Lambda, API Gateway, DynamoDB and Secrets Manager. Reports cache for six hours per company and normalized brief; the date and saved-research status remain visible. Anonymous use is limited to five requests per source IP per hour, 100 fresh research calls globally per UTC day, three concurrent executions and API throttling. CORS restricts browser origins to the GitHub Pages host; it is not authentication. A company name is used to research public news with Perplexity. No customer confidential data is needed. Cached reports expire after six hours, and CloudWatch retains operational logs for 14 days without names, report contents or credentials.

## Develop and test

Python 3 with `boto3` is needed for the deployment helper and backend tests. The frontend has no build step. jsPDF 4.2.1 is vendored under its MIT license.

```sh
python3 scripts/serve.py
# Open http://127.0.0.1:8920
python3 -m unittest discover -s tests -v
node --check app.js
node --check pdf-export.js
node --check tailoring.js
```

The backend suite includes all 15 non-empty field combinations, custom names, invalid input, structured provider context, per-case fit coverage, cache separation and company-only compatibility. `tests/ui_checks.js` is a Playwright check function that exercises the actual form with synthetic API responses (32 assertions): custom values, individual fields, the combined example, regeneration, error recovery, escaping, keyboard controls and mobile overflow. Start a static server on port 8921 (`python3 -m http.server 8921 --bind 127.0.0.1`), then run that file with Playwright's `browser_run_code_unsafe` filename option or evaluate the function with your Playwright Page. Mock responses are confined to the local browser test; production uses live Perplexity research.

The request remains `{"company":"Novo Nordisk"}` for company-only generation. Optional structured context uses:

```json
{"company":"Novo Nordisk","tailoring":{"departments":["Finance","Procurement"],"topic":"Supplier onboarding","outcomes":["Reduce risk"],"systems":["Salesforce","SharePoint"]}}
```

Empty fields are omitted; the server accepts and normalizes empty arrays/strings. Each list accepts up to eight unique entries of 80 characters, and topic accepts 200 characters. All context is untrusted data in the research prompt. Tailored responses include the normalized `tailoring` brief and a `fit` object in every case with department roles, topic relevance, outcome impacts, proposed system roles and explicit assumptions. Company-only responses retain the existing fields.

The loopback development server forwards research to the deployed API. Requests still consume the public API quota. It substitutes a local proxy URL for `config.js` without weakening production CORS.

## Deploy

Use an authenticated AWS CLI profile with permission to manage this scoped stack and its secret. The helper uses your configured region (default ca-central-1). On first deployment, supply a private JSON file outside the repository containing `SAP_AUTH_URL`, `SAP_CLIENT_ID`, `SAP_CLIENT_SECRET`, `SAP_RESOURCE_GROUP`, `DEPLOYMENT_URL` and `MODEL`. `DEPLOYMENT_URL` is the Perplexity deployment URL without `/chat/completions`, and `MODEL` is `sonar-pro`.

```sh
python3 scripts/deploy.py /absolute/private/path/ai-core.json
# Subsequent deployments reuse the existing secret:
python3 scripts/deploy.py
```

The helper packages `template.yaml`, deploys the isolated stack and writes its public endpoint into `config.js`. Publish the frontend and updated `config.js` to `main`; GitHub Pages serves main's repository root. `_config.yml` excludes infrastructure and development source from Pages. Private files, outputs and package artifacts are ignored by Git. Keep credential files outside the checkout.

Frontend: `index.html`, `styles.css`, `app.js`, `tailoring.js`, `pdf-export.js`. Research contract: `backend/prompt.py`. Validation, time budget, caching and rate limits: `backend/app.py`. Deployment: `template.yaml`, `scripts/deploy.py`.
