# Publishing packs

1. Make a source folder using [format 1](PACK_FORMAT.md), and retain the editable artwork source and permission records.
2. Run the local CLI and [Pack Studio](https://octopusgarage.github.io/marketplace/studio/) checks. Preview every image and test it in the consuming app.
3. Open a [pack proposal](https://github.com/OctopusGarage/marketplace/issues/new?template=pack_submission.yml) with ID, version, intended apps, previews, source links, license, permission evidence, and validation output. A proposal does not publish anything.
4. Submit a PR adding source files, attribution, and an entry in the builder. CI checks structure, hashes, catalog consistency, and reproducibility. Maintainers review content and rights before merging.
5. Bump a pack's version when changing its bytes. A published `packs/<id>/<version>/<sha256>.zip` URL is immutable. Consumer apps pin a hash for offline bundles and may update separately.

The catalog's `rightsStatus` reports documentation state, not a safety certification. Current migrated artwork is marked `pending` until rights records are complete. A maintainer should not change that field to `documented` without source and reuse evidence in the repository.

The site is static GitHub Pages, and all URLs in the catalog are relative to the marketplace site. No server, account, or user upload service is involved. ZIP submissions are reviewed in GitHub before publication.
