# Warehouse root publisher contract

`publish-release-root.js` is independently trusted and is never included in a warehouse release bundle.
Before production execution, copy it to root-private storage and compare that copy with the separately
approved publisher SHA-256. Only then execute it with the exact release bundle path and separately approved
bundle SHA-256.

Production execution uses a sanitized environment and the absolute trusted runtime:
`sudo env -i PATH=/usr/bin:/bin /usr/bin/node <root-private-publisher> ...`. Do not execute through
`env node`, inherit `NODE_OPTIONS`, or locate the runtime through an inherited `PATH`.

Before an approved change window, read-only preflight must prove `/usr/bin/node` is a root-owned regular
file in a root-owned, non-writable parent and record its version. Publication uses literal, independently
approved values in this sequence:

```sh
sudo install -d -o root -g root -m 0700 /run/omen-warehouse-publish
sudo install -o root -g root -m 0500 -- <reviewed-publisher-candidate> /run/omen-warehouse-publish/publisher.js
printf '%s  %s\n' '<approved-publisher-sha256>' '/run/omen-warehouse-publish/publisher.js' \
  | sudo sha256sum --check --strict -
sudo env -i PATH=/usr/bin:/bin /usr/bin/node /run/omen-warehouse-publish/publisher.js \
  publish --bundle <absolute-release-tar> --approved-bundle-sha256 <approved-bundle-sha256>
```

The candidate `.tar.sha256` emitted by the builder is evidence for review, not approval by itself. Both
approved hashes must arrive through the separately authenticated change record. The publisher's reported
self-hash is a receipt, never a substitute for the pre-execution comparison.

The publisher copies the untrusted bundle into root-private storage before hashing or parsing it. It accepts
only the deterministic USTAR contract emitted by `build-release.sh`, independently verifies the inner release
contract and checksums, and publishes by same-filesystem rename to
`/opt/omen/warehouse/releases/<commit>`.

It never executes bundle contents, invokes Docker or services, reads or provisions secrets, contacts a
network, changes `current`, or mutates a database. Any unknown state fails before publication.

Concurrent publishers use separate root-private staging directories. The fixed commit destination and
same-filesystem rename are the serialization boundary: one publisher wins and an exact loser observes
`already_published`; divergent state fails without overwrite. No persistent lock exists to become stale
after a crash.
