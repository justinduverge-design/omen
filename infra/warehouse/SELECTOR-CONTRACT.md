# Warehouse release selector contract

`select_release_root.py` is independently trusted and excluded from release bundles. It accepts one exact
published commit and its separately approved inner manifest SHA-256, re-authenticates the complete published
tree, and atomically replaces `/opt/omen/warehouse/current` with a relative symlink to that release.

Use the same command for forward selection and rollback; rollback names the previously approved commit and
manifest. The selector never executes release contents, invokes Docker, changes services, reads secrets,
contacts a network, mutates the database, or removes a release or PostgreSQL volume.

```sh
sudo install -o root -g root -m 0500 -- <reviewed-selector-candidate> /run/omen-warehouse-publish/selector.py
printf '%s  %s\n' '<approved-selector-sha256>' '/run/omen-warehouse-publish/selector.py' \
  | sudo sha256sum --check --strict -
sudo env -i PATH=/usr/bin:/bin /usr/bin/python3 -I /run/omen-warehouse-publish/selector.py \
  select --commit <approved-commit> --approved-manifest-sha256 <approved-inner-manifest-sha256>
```

An existing `current` entry must already be a root-owned symlink. Any ordinary file or directory at that path
fails closed. Selection changes only the symlink and leaves every release, container, secret, and volume intact.
