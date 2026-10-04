Proposal: Move large media folders (`Brand/` videos+audio ~79MB, `Solutions/` ~62MB, `output/` ~20MB) out of git tracking to a separate asset store (e.g. S3 or LFS) to reduce repo size. No files were deleted in this commit. The `graphify-out/` directory is now ignored in git and will be generated locally instead.

Note: Plugin skills are user-level configurations outside this repo and must be disabled per project by the user.
