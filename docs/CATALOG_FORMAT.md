# Static catalog format 1

`https://octopusgarage.github.io/marketplace/catalog.json` is a JSON document with `schemaVersion: 1` and a `packs` array. Each entry has a stable pack `id`, semantic `version`, display `name` and `description`, `kind` (`avatar`, `theme`, or `sticker`), and an avatar `category` when relevant. `apps` lists compatible application IDs; the initial app ID is `mesh-talk`.

`file` is a relative, same-origin path in the form `packs/<id>/<version>/<sha256>.zip`. `bytes` is its exact byte length and `sha256` is the SHA-256 of the ZIP. Clients must enforce their own size limits, reject redirects to other origins, verify the ZIP hash, parse its manifest, and compare ID, name, version, kind and category to the catalog entry before installation. A matching hash proves consistency with this catalog, not that artwork or its creator is trustworthy.

`preview` is a relative image path under `previews/`, with its own `previewSha256`. `rightsStatus` is `pending` or `documented`. It reports whether source and permission records have been reviewed; it is not a license and does not assert content safety. Consumers can choose whether to show or filter pending packs. Unknown fields may be ignored within schema version 1; unknown schema versions must be rejected.

A publisher must never change bytes at an existing versioned artifact URL. Publish changed bytes under a new semantic version, update the catalog, and retain old URLs for clients that pinned them. Build output is checked for stale or orphan ZIPs.
