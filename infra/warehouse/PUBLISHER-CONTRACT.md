# Warehouse root publisher contract

`publish_release_root.py` is independently trusted and is never included in a warehouse release bundle.
Before production execution, copy it to root-private storage and compare that copy with a separately approved
publisher SHA-256. Only then execute it with the exact release bundle path and separately approved bundle SHA-256.

Production execution uses a sanitized environment and the absolute Python 3.12 runtime verified during read-only
preflight:

```sh
sudo install -d -o root -g root -m 0700 /run/omen-warehouse-publish
sudo install -o root -g root -m 0500 -- <reviewed-publisher-candidate> /run/omen-warehouse-publish/publisher.py
printf '%s  %s\n' '<approved-publisher-sha256>' '/run/omen-warehouse-publish/publisher.py' \
  | sudo sha256sum --check --strict -
sudo env -i PATH=/usr/bin:/bin /usr/bin/python3 -I /run/omen-warehouse-publish/publisher.py \
  publish --bundle <absolute-release-tar> --approved-bundle-sha256 <approved-bundle-sha256>
```

The candidate `.tar.sha256` emitted by the builder is evidence for review, not approval by itself. Both approved
hashes must arrive through the separately authenticated change record. The publisher copies the untrusted bundle
into root-private storage before parsing, admits only the exact release inventory and metadata, independently
checks the inner manifest, and publishes by same-filesystem rename to `/opt/omen/warehouse/releases/<commit>`.

It never executes bundle contents, invokes Docker or services, reads or provisions secrets, contacts a network,
changes `current`, or mutates a database. Existing exact releases are idempotent; divergent state fails closed.
