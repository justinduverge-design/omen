# Omen Open-Agreements Provider Paragraph Packet

Date: 2026-06-28
Status: AI-drafted for Justin review. Not legal advice. Not publication-ready.
Scope: Custom clauses to adapt an open-agreements-style Omen Terms of Service and Privacy Policy draft for ESPN, Yahoo, and Sleeper fantasy-football integrations.

## Use With Open-Agreements

Justin confirmed Omen should prefer the open-agreements path, not Termly. The local `References/legal-templates/open-agreements/` checkout is not present in this workspace, so this packet does not generate DOCX or fill a formal template. It supplies the product-specific paragraphs that can be inserted into a later open-agreements-based ToS / Privacy Policy draft after template setup and counsel review.

## Editorial Rules

- Do not call Omen affiliated with, endorsed by, sponsored by, or approved by ESPN, Yahoo, Sleeper, Disney, or the NFL.
- Do not say ESPN cookie-based access is formally approved.
- Keep Yahoo and Sleeper attribution visible wherever platform-sourced data is explained to users.
- Keep mock/demo data clearly labeled.
- Never include ESPN cookie values, Yahoo tokens, Vault ids, raw provider responses, or reusable credentials in policy examples, screenshots, support tickets, analytics, or logs.

## Terms Of Service Paragraphs

### Third-Party Fantasy Platforms

Omen can connect with fantasy-football platforms such as Yahoo Fantasy Sports, Sleeper, and ESPN when you choose to connect a platform account or enter platform connection details. Those platforms are operated by third parties, not by Omen. Your use of each platform remains governed by that platform's own terms, privacy notices, and account rules. Omen is not affiliated with, sponsored by, endorsed by, or approved by Yahoo, Sleeper, ESPN, Disney, or the NFL, unless we separately say so in writing.

### User Authorization And Account Responsibility

You are responsible for making sure you have the right to connect a fantasy platform account, league, team, or roster to Omen. When you connect a platform, you authorize Omen to retrieve and process the fantasy-football information needed to provide Omen features such as recommendations, standings, history, draft assistance, and account connection status. You may disconnect a platform at any time where the product provides that control. If a platform changes, restricts, suspends, or terminates access, Omen may be unable to provide some or all platform-connected features.

### No Platform Endorsement Or Guarantee

Platform data may be delayed, unavailable, incomplete, or affected by provider outages, API limits, account settings, league privacy settings, season timing, or credential expiration. Omen does not guarantee that platform data will always be available or correct. Omen recommendations are informational fantasy-football tools, not guarantees of player performance, league results, prizes, winnings, or financial outcomes.

### ESPN Connection Risk

ESPN support may require you to provide ESPN session cookie values, including `espn_s2` and `SWID`, so Omen can attempt to read your ESPN fantasy league on your behalf. Omen treats those values as sensitive credentials. Disney's public terms restrict commercial, business-related, and automated extraction uses of Disney products without written permission. Because ESPN does not provide Omen with a standard public OAuth fantasy API, ESPN-connected features may be more fragile and may stop working if ESPN changes access rules, account behavior, league visibility, or response formats. Omen may disable or limit ESPN-connected features if continuing them creates security, privacy, operational, or platform-terms risk.

### Yahoo Fantasy Sports Attribution And Limits

When Omen uses Yahoo Fantasy Sports data, Omen will identify Yahoo as the source where appropriate and will follow applicable Yahoo attribution, application-identification, user-consent, rate-limit, retention, and privacy-disclosure requirements. Yahoo Fantasy Sports APIs are owned by Yahoo, and Omen receives no ownership rights in Yahoo APIs, Yahoo data, Yahoo trademarks, or Yahoo services. Yahoo may change, limit, suspend, or discontinue API access.

### Sleeper Attribution And Limits

When Omen uses Sleeper data, Omen will identify Sleeper as the source where appropriate. Omen uses documented, read-only Sleeper API endpoints and does not use a Sleeper user password, Sleeper write token, or private Sleeper session credential for current Sleeper integrations. Sleeper may change, limit, block, suspend, or discontinue access. Sleeper's public API documentation describes a free read-only API, while Sleeper's general service terms restrict commercial, business-purpose, and third-party-benefit use. Omen treats this as a founder/counsel review risk, not as platform permission.

### No Betting Or Gambling Advice

Omen is a fantasy-football decision support product. Omen does not provide betting, gambling, financial, legal, tax, or professional advice. Omen recommendations should not be used as the basis for wagering, paid contest entries, financial decisions, or any guaranteed-result claim.

## Privacy Policy Paragraphs

### Platform Data We Process

If you connect a fantasy platform, Omen may process platform identifiers, usernames or display names, league identifiers, team identifiers, roster information, standings, draft metadata, matchup information, player names, player positions, projected or actual fantasy points where available, and recommendation history. Omen uses this information to provide product features such as Omen of the Week, Trade Analyzer support, Draft Assistant support, League Standings, Move History, and platform connection status.

### Yahoo OAuth Tokens

If you connect Yahoo, Omen uses Yahoo OAuth to request access you authorize. Omen stores Yahoo access and refresh tokens through Supabase Vault references rather than plaintext application columns. Omen uses those tokens only to retrieve Yahoo fantasy data needed for Omen features, refresh access when permitted, and maintain your connected Yahoo experience. Disconnecting Yahoo should remove the platform connection and associated stored secrets according to Omen's deletion and disconnect flows.

### Sleeper Data

If you connect Sleeper, Omen stores the Sleeper username, Sleeper user id, selected league id, and related league/team identifiers needed to retrieve read-only Sleeper fantasy data. Current Sleeper integrations do not require a Sleeper password or private Sleeper token. Omen may cache limited Sleeper responses for reliability and rate-limit protection, and uses Sleeper data only for Omen product features.

### ESPN Cookies

If you connect ESPN, Omen may ask you to provide `espn_s2` and `SWID` cookie values from your own ESPN browser session. These values can provide access to your ESPN fantasy account and are treated as sensitive credentials. Omen stores ESPN cookie values through Supabase Vault references rather than plaintext application columns, does not display them back to you, and must not log them, include them in analytics, or send them to other users. Omen uses ESPN cookies only to attempt to retrieve the ESPN fantasy league and team information needed for Omen features.

### Provider Data Retention

Omen keeps platform connection records and related fantasy-football data only for product purposes, account support, recommendation history, security, compliance, and deletion/audit needs. Some platform data may be short-lived or refreshed because provider terms, rate limits, data freshness, and product accuracy require current data. You can disconnect supported platforms, and account deletion is intended to remove platform connections, stored provider secrets, Omen move history, and related user records except for limited non-PII audit records that may be retained for compliance accountability.

### Data Sharing And Third Parties

Omen does not sell your fantasy platform data. Omen does not share your ESPN cookie values, Yahoo OAuth tokens, Vault secret ids, or reusable platform credentials with other users. Omen may use service providers needed to operate the product, such as hosting, database, storage, logging, analytics, payment, and security providers, subject to Omen's privacy and security controls. Provider data may also be sent to the relevant platform when Omen calls that platform on your behalf.

### AI Processing

Omen may use AI systems to generate or improve plain-English explanations for fantasy-football recommendations. Omen should not send ESPN cookie values, Yahoo OAuth tokens, Vault ids, auth headers, or raw reusable provider credentials to AI systems. If Omen uses local or cloud AI providers, the Privacy Policy should identify the provider category, the data sent, whether prompts are retained, and any opt-out or fallback behavior available to users.

## Platform Attribution Snippets

Use short, factual labels. Do not style them like sponsorship badges.

- Yahoo: "Fantasy data from Yahoo Fantasy Sports where connected."
- Sleeper: "Fantasy data from Sleeper where connected."
- ESPN: "Fantasy data from ESPN where connected. ESPN access may require user-provided session cookies."
- General: "Platform trademarks belong to their respective owners. Omen is not endorsed by or affiliated with those platforms."

## Open Questions For Justin / Counsel

- Whether Omen should continue ESPN cookie-based access publicly before counsel review, given Disney's restrictions on commercial/business-related use and automated extraction.
- Whether Yahoo usage requires written authorization if any Omen surface is considered commercial activity, even while Omen is free.
- Whether Sleeper usage is acceptable under founder risk acceptance while Omen remains free, and what traffic ceiling should trigger outreach or rollback.
- Whether Omen should publish a separate `/privacy` and `/terms` before account-delete UI ships, or ship both together.
- Whether any AI narration provider besides local KVM2 Gemma will receive user/platform data; cloud use requires a separate privacy and cost-cap review.

## Sources

- Yahoo Fantasy Sports APIs Terms of Use: https://legal.yahoo.com/us/en/yahoo/terms/product-atos/fantasysportsapi/index.html
- Yahoo Developer API Terms of Use: https://legal.yahoo.com/us/en/yahoo/terms/product-atos/apiforydn/index.html
- Yahoo Sports Developer Portal: https://sports.yahoo.com/developer/
- Sleeper API documentation: https://docs.sleeper.com/
- Sleeper General Terms of Use: https://support.sleeper.com/en/articles/5486620-general-terms-of-use
- Sleeper Privacy Notice: https://support.sleeper.com/en/articles/5486618-privacy-notice
- Disney Terms of Use: https://disneytermsofuse.com/english/
- Disney Privacy Policy: https://privacy.thewaltdisneycompany.com/en/current-privacy-policy/
- Disney Cookies Policy: https://privacy.thewaltdisneycompany.com/en/current-privacy-policy/cookies-policy/
- Omen security/privacy tracker: `Blueprints/security-privacy.md`
- Omen ESPN recovery playbook: `Blueprints/playbooks/espn-recovery.md`
- Omen GDPR module: `src/omen_gdpr.js`
- Omen platform routes: `src/routes/platforms.js`
