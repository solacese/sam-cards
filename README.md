# Solace Agent Mesh conversation cards

A small, static sales guide: six industries, 18 illustrative scenarios and five common customer questions. Each example has a short summary, an intended benefit, a question to ask and visible workflow and approval details.

Live site: https://solacese.github.io/sam-cards/

Run locally with `python3 -m http.server 8917 --bind 127.0.0.1`, then open http://127.0.0.1:8917. No build or dependencies are required.

Choose an industry or open the common questions. All three examples and their approval steps are visible without expanding anything. Common questions use compact rows with an icon, a short response and a follow-up question; all five fit a typical desktop screen and stack on phones. The header returns to all industries. Links such as `#finance` and `#logistics/2` still open an industry or a specific example and work with browser back/forward. Typography uses Plus Jakarta Sans throughout: 18px body copy, 20px card titles, 16px labels and shared responsive page headings. Dark text, tinted card backgrounds, strong borders and clear keyboard focus support readability.

Content is in `app.js`, layout in `index.html`, and styles in `styles.css`. Benefits are illustrative estimates from the working playbook, not measured results or customer commitments. Validate the inputs, integrations and approval steps for each proposed deployment.
