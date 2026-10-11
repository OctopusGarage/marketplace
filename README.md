# OctopusGarage Marketplace

A static, reusable catalog for image-only customization packs. The first consumer is [Mesh Talk](https://github.com/OctopusGarage/mesh-talk); other apps can use the format without taking a dependency on Mesh Talk's UI or release cycle.

- [Browse and download packs](https://octopusgarage.github.io/marketplace/)
- [Create and verify a pack in Pack Studio](https://octopusgarage.github.io/marketplace/studio/)
- [Pack format](docs/PACK_FORMAT.md), [catalog format](docs/CATALOG_FORMAT.md), and [publishing process](docs/PUBLISHING.md)
- Build locally: `npm ci`, `npm run pack:check -- site/packs/<id>/<version>/<sha256>.zip`, `npm run check:catalog`, `npm run test:studio`
- Tool checks: `npm run test:pack` for CLI integration tests and `npm run eval:pack-tools` for the [browser task evals](evals/README.md).

`assets/` holds source artwork and explicit theme colors. `assets/preview-covers.json` selects catalog cover images without changing pack contents. `scripts/build-market.py` generates the 15 catalog ZIPs at immutable, versioned paths under `site/packs/`. `site/catalog.json` gives their IDs, versions, sizes, SHA-256 hashes, supported apps, and artwork rights review state. `src/lib/pack.ts` is the format 1 validator; the browser Studio and CLI use the same rules. The catalog is public data, not a code plugin registry: ZIPs contain a manifest and raster images only.

Current migrated packs have `rightsStatus: "pending"` while source and reuse permissions are reviewed. The status does not assert ownership or a license. See [the rights queue](docs/RIGHTS_REVIEW.md) before reusing any artwork outside its original context.

Publication happens after a reviewed PR merges into this repository's default branch and Pages deploys. A proposal issue or draft PR does not publish a pack. Mesh Talk keeps its own pinned default bundle; optional downloads come from this catalog.

## License and artwork

The format documentation and software tools are available under the [MIT code license](LICENSE-CODE), retaining the original Kingson Wu copyright notice from Mesh Talk. Pack artwork, source images, rendered previews, and generated ZIPs are **not** covered by that code license. Their source and reuse permissions are tracked separately in [the rights review queue](docs/RIGHTS_REVIEW.md), and all migrated packs currently remain pending.
