# iOS upload runbook — no Apple password, no Xcode GUI

**Established 2026-08-30.** Before this, every build went up through the Xcode Organizer by hand,
and that is how Build 2 was exported as **TestFlight Internal Only** — a setting that by
definition can never reach external testers. Five separate theories were chased before the real
cause was found. A scripted upload removes the dialog that caused it.

## One-time setup (done)

App Store Connect → **Users and Access → Integrations → App Store Connect API**.

The page is **gated on first use**: it shows "Permission is required to access the App Store
Connect API" with a **Request Access** button, and no key UI at all until that is clicked. That
click is an authorization on behalf of the organization and belongs to the founder, not an agent.
This is the step that looks like a missing page rather than a locked one.

Then **+** → name the key → role **App Manager** (the least that can upload; Admin also works and
is what the current key has) → **Generate** → download the `.p8`. **Apple allows exactly one
download.**

```bash
mkdir -p ~/.appstoreconnect/private_keys && mv ~/Downloads/AuthKey_*.p8 ~/.appstoreconnect/private_keys/
```

`altool` finds the key by convention at
`~/.appstoreconnect/private_keys/AuthKey_<KEY_ID>.p8`, so the path is never passed and the file
is never read by anything but Apple's own tool.

The **Key ID** and **Issuer ID** are printed on that same page. They are identifiers, not
secrets — the `.p8` is the secret and it stays on disk. They are deliberately not written into
this repo; read them off the console when needed.

## Cutting a build

```bash
# 1. bump CURRENT_PROJECT_VERSION on the two APP target configs only
#    (they are the ones carrying INFOPLIST_FILE = OmenIOS/Info.plist;
#     the test targets stay at 1 and must not be bumped)

# 2. archive
xcodebuild archive -project mobile/ios/OmenIOS/OmenIOS.xcodeproj -scheme OmenIOS \
  -configuration Release -destination 'generic/platform=iOS' \
  -archivePath <scratch>/archive.xcarchive -allowProvisioningUpdates

# 3. confirm the build number actually landed — do not trust the bump
/usr/libexec/PlistBuddy -c "Print :ApplicationProperties:CFBundleVersion" <scratch>/archive.xcarchive/Info.plist

# 4. export. method MUST be app-store-connect.
#    "release-testing" is the Internal Only trap that cost Build 2.
xcodebuild -exportArchive -archivePath <scratch>/archive.xcarchive \
  -exportOptionsPlist <scratch>/ExportOptions.plist -exportPath <scratch>/export \
  -allowProvisioningUpdates

# 5. validate BEFORE uploading — catches signing and entitlement faults
#    without burning a build number
xcrun altool --validate-app -f <scratch>/export/Omen.ipa -t ios \
  --apiKey <KEY_ID> --apiIssuer <ISSUER_ID>

# 6. upload
xcrun altool --upload-app -f <scratch>/export/Omen.ipa -t ios \
  --apiKey <KEY_ID> --apiIssuer <ISSUER_ID>
```

`ExportOptions.plist`:

```xml
<key>method</key><string>app-store-connect</string>
<key>teamID</key><string>6RWR5G9894</string>
<key>uploadSymbols</key><true/>
<key>manageAppVersionAndBuildNumber</key><false/>
```

`manageAppVersionAndBuildNumber` is `false` on purpose: left true, Xcode silently renumbers the
build and the number verified in step 3 is not the number that ships.

## After the upload

Uploading is not distributing. A build lands in **Processing**, and reaching testers is a
separate act:

1. wait for Processing → Complete
2. add the build to the **External** group (internal-only builds reach nobody outside the team)
3. external builds need **Beta App Review**; subsequent builds of an already-approved version are
   usually cleared quickly
4. **Notify Testers** is the last step and is the founder's call, never an agent's

## What must not change in App Store Connect

**App Review Information keeps the "tap Try Demo" instruction.** Apple's reviewer has no Sleeper
or ESPN account and "Sign-in required" is unchecked, so demo is the only way in. An earlier plan
to remove the Try Demo button would have failed Beta App Review for exactly this reason. Tester
copy is a different field — see `testflight-copy-build-4.md`.
