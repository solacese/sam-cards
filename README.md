# Agent Mesh organization research

[Open the tool](https://solacese.github.io/sam-cards/). Enter an organization name to get three proposed business opportunities based on recent public news. Each case uses two or three agents, starts from operational events across business systems, and explains the risk, revenue opportunity, human approval and outcome feedback. Export PDF downloads three designed briefs locally: exactly one case per page, with clickable evidence links. The layout uses a serif headline, a business-value panel and two columns for workflow details. Oversized fields are condensed with a visible note pointing to the full workflow in the app.

Open **Tailor your use cases (Optional)** to select departments, a topic, desired outcomes and systems. The three multi-select menus support custom entries (Add or Enter); topic is free text. Any combination works. Selections survive generation and errors, and a summary above the cards shows the submitted brief. Each tailored card explains departmental/topic fit, uses the selected outcomes as its value statements, and labels assumptions. Expand its workflow details for proposed system roles. Those systems are user-provided context, not verified organization installations or available integrations. PDF exports include the brief and fit details.

The interface follows [JedAI Inspire](https://solacese.github.io/jedai/jedai-inspire.html): navy serif headings, a soft mint background, rounded controls and a compact layout. The three cases use wide, stacked cards with one green, blue or orange emoji marker each. The default overview fits a 1366×768 desktop viewport for the validated supplier-onboarding example. Each card explains its action, trigger and lead human reviewer in three short sentences on the left, alongside business value on the right; workflow, agents, departmental/topic fit, system roles, assumptions and pilot details expand on demand. Optional form fields close after generation without losing selections. Mobile keeps natural vertical scrolling and readable text.

Each card has just **Copy quick builder prompt**. The complete prompt includes the case, its cited news, the generated brief, exact two/three-agent roster, trigger, event/data contract requirements, proposed system roles, approvals, improvement loop, pilot metric and test scenarios. Paste it into **Builder > Quick Build** in your SAM instance. Prompts ask Quick Build to inspect available capabilities, propose a plan for review, build a synthetic-data demonstration and identify remaining integration/custom-code work. [Quick Build](https://docs.solace.com/Agent-Mesh/Framework/building/quick-build.htm) supports plan review and Test mode.

Prompts are assembled locally from the generated report, so both Quick and Best quality work with cached or new results without another model request. Later form edits do not change a prompt until regeneration. A successful copy changes the button to **Copied** and announces completion. There are no inline instructions or prompt previews. If both clipboard methods are blocked, a temporary dialog selects the complete prompt for manual copying. Building and activation happen in the user's SAM instance.

Tailoring guides research and opportunity selection as well as the event trigger, agents, actions, metrics and discovery questions. Broader organization news can motivate a proposed workflow when topic-specific evidence is unavailable; that connection must be labelled as an assumption. A target department can still collaborate with other teams. With all optional fields empty, the existing organization-only prompt and card layout remain in use.

The interface is static GitHub Pages. A small AWS API calls Perplexity Sonar Pro for research. Best quality then uses GPT-6 Astra at high reasoning through a server-side OpenAI-compatible endpoint to design and select the three cases. The writer receives only cited news, source excerpts when available, and the brief; it does not see first-pass opportunity ideas. It privately considers six candidates, rejects weak or repetitive matches, and returns three. News objects are frozen: changed headlines, dates or reference IDs are rejected. This is an application validation guard, not an independent fact-check of source contents. Credentials stay in AWS Secrets Manager; `config.js` contains only the public API URL. This research tool proposes workflows; it does not deploy agents or access organization systems. LangGraph and Azure can implement equivalent patterns with additional event and integration infrastructure. Agent Mesh's event entrypoints and broker fabric provide the integration advantage described in each case. Improvement requires measured outcomes, offline evaluation and human-approved changes.

**Best quality is the default** and typically takes about 1–3 minutes. A background Lambda researches, then designs the cases, while the browser polls a short-lived random session ID and shows progress. Its processing deadline is 165 seconds (180-second Lambda limit); the browser waits up to 255 seconds to allow a queue delay and polling; jobs waiting over 75 seconds return a busy/timeout error. **Quick** preserves the original Perplexity-only behavior with a 20-second client limit and 19-second provider deadline. Both return as soon as complete. Expert failure never silently falls back to a lower-quality report. Timeout, missing sources or insufficient news produce a clear error. There are no prepared organization answers or fabricated fallback reports. Valid reports require three distinct cases, two or three named agents each, news dates within 180 days, and relevant cited HTTPS evidence for every case. organization-only research retains its three-source minimum; tailored workflows may share a single relevant news development instead of padding the bibliography. Perplexity searches the last month. Source metadata comes from the provider and should be checked before making a organization claim.

The AWS stack `sam-cards-research` uses Lambda, API Gateway, DynamoDB and Secrets Manager. Reports cache for six hours per organization, normalized brief and quality mode; expert cache keys also include the model and expert prompt version; the date and saved-research status remain visible. Anonymous use is limited to five requests per source IP per hour, 100 fresh report requests globally per UTC day, three concurrent API executions, two concurrent expert jobs and API throttling. A Best quality report uses two model calls; a Quick report uses one. Polling does not consume research quota. Duplicate worker delivery cannot repeat a paid call. Job records expire after 15 minutes; late or failed jobs return a clear error. CORS restricts browser origins to the GitHub Pages host; it is not authentication. An organization name and any supplied brief are used to research public news with Perplexity. Best quality also sends that context and public evidence to the configured expert endpoint. No organization confidential data is needed. Cached reports expire after six hours, and CloudWatch retains operational logs for 14 days without names, report contents or credentials.

## Develop and test

Python 3 with `boto3` is needed for the deployment helper and backend tests. The frontend has no build step. jsPDF 4.2.1 is vendored under its MIT license.

```sh
python3 scripts/serve.py
# Open http://127.0.0.1:8920
python3 -m unittest discover -s tests -v
node --check app.js
node --check pdf-export.js
node --check tailoring.js
node --test tests/quick-build.test.js tests/pdf-export.test.js tests/report-content.test.js
```

The backend suite includes all 15 non-empty field combinations, custom names, invalid input, structured provider context, per-case fit coverage, cache separation and organization-only compatibility. `tests/ui_checks.js` is a Playwright check function that exercises the actual form with synthetic API responses (68 assertions): custom values, individual fields, the combined example, regeneration, error recovery, escaping, keyboard controls and mobile overflow. Start a static server on port 8921 (`python3 -m http.server 8921 --bind 127.0.0.1`), then run that file with Playwright's `browser_run_code_unsafe` filename option or evaluate the function with your Playwright Page. The suite also covers Best quality progress, throttled polling, completion, failure recovery, preservation of the brief, wide cards, one emoji per case, complete per-case copying, clipboard denial/fallback, keyboard copying and the mobile manual-copy dialog. Node's six Quick Build tests cover case/evidence isolation, all brief combinations, custom text, cached reports, regeneration and the two/three-agent limit. Four PDF tests verify exactly three pages, case/source isolation, clickable HTTPS evidence, tailored fields, minimum font sizes, margins and lack of text overlaps, including oversized inputs. Mock responses are confined to the local browser test; production uses live Perplexity research.

The API request remains `{"company":"Novo Nordisk"}` for organization-only Quick generation. The page sends `"quality":"best"` for Best quality. A cache hit returns 200 with the report; a new expert job returns 202 with `job_id` and `status`. Poll `GET /research/{job_id}` with the same allowed Origin: 202 means queued/researching/designing; 200 is the report; terminal errors retain their HTTP status. The 192-bit random job ID is a temporary bearer capability; do not share it. Optional structured context uses:

```json
{"company":"Novo Nordisk","tailoring":{"departments":["Finance","Procurement"],"topic":"Supplier onboarding","outcomes":["Reduce risk"],"systems":["Salesforce","SharePoint"]}}
```

Empty fields are omitted; the server accepts and normalizes empty arrays/strings. Each list accepts up to eight unique entries of 80 characters, and topic accepts 200 characters. All context is untrusted data in the research prompt. Tailored responses include the normalized `tailoring` brief and a `fit` object in every case with department roles, topic relevance, outcome impacts, proposed system roles and explicit assumptions. organization-only responses retain the existing fields.

The loopback development server forwards research to the deployed API. Requests still consume the public API quota. It substitutes a local proxy URL for `config.js` without weakening production CORS.

## Deploy

Use an authenticated AWS CLI profile with permission to manage this scoped stack and its secret. The helper uses your configured region (default ca-central-1). Configure the expert endpoint directly in Secrets Manager (the key is entered without echo and never written to a local file):

```sh
python3 scripts/configure_expert.py --base-url https://lite-llm.mymaas.net/v1
```

The dedicated `sam-cards/expert-model` secret holds `base_url` and `api_key`; only the expert worker can read it. `ExpertModel` in `template.yaml` selects the model. The adapter rejects a truncated response or a returned model name that differs from the requested route. These checks verify the endpoint response, not the vendor identity behind a proxy.

On first deployment, supply a private JSON file outside the repository containing `SAP_AUTH_URL`, `SAP_CLIENT_ID`, `SAP_CLIENT_SECRET`, `SAP_RESOURCE_GROUP`, `DEPLOYMENT_URL` and `MODEL`. `DEPLOYMENT_URL` is the Perplexity deployment URL without `/chat/completions`, and `MODEL` is `sonar-pro`.

```sh
python3 scripts/deploy.py /absolute/private/path/ai-core.json
# Subsequent deployments reuse the existing secret:
python3 scripts/deploy.py
```

The helper packages `template.yaml`, deploys the isolated stack and writes its public endpoint into `config.js`. Publish the frontend and updated `config.js` to `main`; GitHub Pages serves main's repository root. `_config.yml` excludes infrastructure and development source from Pages. Private files, outputs and package artifacts are ignored by Git. Keep credential files outside the checkout.

Frontend: `index.html`, `styles.css`, `app.js`, `tailoring.js`, `pdf-export.js`. Local Quick Build prompt assembly: `quick-build.js`. Shared organization terminology and card descriptions: `report-content.js`. Expert design and evidence binding: `backend/expert.py`. Research contract: `backend/prompt.py`; tailored responses use the stable JSON schema in `backend/schema.py` with server-side evidence and fit validation. Validation, time budget, caching and rate limits: `backend/app.py`. Deployment: `template.yaml`, `scripts/deploy.py`.

The API retains its existing `company` request/response key for compatibility. The interface, validation messages, proposed workflow text, PDF labels and Quick Builder context use organization wording. Cached proposals are normalized on presentation. Cited news, source URLs, legal organization names and custom user-entered criteria stay intact. Legacy suggestion labels map to Service & support and Improve experience. Five terminology tests cover those boundaries and the three-sentence explanation.
