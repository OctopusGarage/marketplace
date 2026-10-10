# Pack format 1

## Create a pack

Place `manifest.json` at the ZIP root and image files under `images/`. The ZIP must be at most 12 MiB, contain at most 256 entries, have at most 24 MiB of extracted content, and use images of at most 3 MiB each. Avatar and theme images must be PNG, JPEG, or WebP; sticker images may also be GIF. Animated WebP, APNG, and GIF stickers work in browsers that support those formats. SVG, CSS, JavaScript, remote image URLs, executables, and unrelated files are not accepted. `credits.json` is allowed for attribution. Names and IDs are plain text. Pack IDs must be 3–80 lowercase letters, digits, dots, underscores, or hyphens. Use a stable ID and increment `version` in `major.minor.patch` form when publishing an update; installing a pack with the same ID and library type replaces it. An avatar pack cannot replace a pack with the same ID in another avatar category.

Every image in the ZIP must be referenced by the manifest. The validator rejects hidden or unused image files, and optional theme image fields must contain valid image paths when present.

Create a source folder with this layout (replace the example images with your own):

```text
my-pack/
├── manifest.json
└── images/
    ├── first.webp
    └── second.png
```

The `format` value is always `1`. `id` must be unique across all pack types; avoid the reserved IDs `light`, `dark`, and `oled`. `name` and each image label may be at most 80 characters. Every referenced image must be inside `images/`, with no `.` or `..` path segments. A ZIP may contain up to 100 avatars or stickers, or 60 theme wallpapers. A ZIP created on macOS should exclude `.DS_Store` and `__MACOSX/`.

An avatar library:

```json
{
  "format": 1,
  "id": "example.portraits",
  "version": "1.0.0",
  "name": "Portraits",
  "kind": "avatar",
  "category": "personal",
  "fit": "cover",
  "avatars": [
    { "label": "Ada", "file": "images/ada.webp" }
  ]
}
```

Set `category` to `group` for channel avatars. Set `fit` to `contain` for logos or artwork that should remain fully visible.

A theme:

```json
{
  "format": 1,
  "id": "example.forest",
  "version": "1.0.0",
  "name": "Forest",
  "kind": "theme",
  "base": "light",
  "colors": {
    "background": "44 34% 96%",
    "foreground": "160 22% 16%",
    "primary": "154 42% 31%"
  },
  "wallpaper": "images/forest.webp"
}
```

`base` may be `light` or `dark`. `colors` overrides the named design tokens from `src/lib/pack.ts`; each value is an HSL triplet without `hsl(...)`. A theme may also provide a `crest` image, or a `wallpapers` array of `{ "id", "title", "file" }` entries instead of one `wallpaper`. Consumers may remember wallpaper selection for each installed theme. Keep text and controls legible against your colors; the app does not automatically correct contrast.

Theme colors must use token names from [`src/lib/pack.ts`](../src/lib/pack.ts) (for example `background`, `foreground`, `primary`, `card`, and `border`). At least one color is required. HSL hue must be 0–360; saturation and lightness must each be 0–100%. Wallpaper IDs must be unique within the pack and contain only lowercase letters, digits, and hyphens; wallpaper titles are at most 80 characters. A good workflow is to start with three colors, install the ZIP locally, and inspect both text and controls in the app before adding more overrides.

A sticker library:

```json
{
  "format": 1,
  "id": "example.reactions",
  "version": "1.0.0",
  "name": "Reactions",
  "kind": "sticker",
  "stickers": [
    { "id": "wave", "label": "Wave", "fallback": "👋", "file": "images/wave.webp" }
  ]
}
```

A sticker pack has 1–100 stickers. Each sticker ID is unique within its pack, uses lowercase letters, digits, underscores, or hyphens, and is at most 40 characters. `fallback` is required, at most eight Unicode code points, and appears when a recipient has not installed the same pack. Sticker images are stored locally; chat messages send only the pack/sticker ID and fallback, so recipients must install the pack to see its artwork. The catalog includes an optional Noto Favorites example pack. Each consumer decides which packs to bundle.


## Validation

Build with `npm run pack:build -- <source-folder> <output.zip>` and check with `npm run pack:check -- <output.zip>`. Pack Studio performs the same format checks plus image decode and pixel limits in the browser. A passing check cannot prove that artwork is licensed, safe from all decoder vulnerabilities, or appropriate. Only raster images and optional `credits.json` are accepted; no SVG, HTML, JavaScript, CSS, or executable code.
