import assert from "node:assert/strict";
import test from "node:test";
import { defaultSettings } from "./coverRenderer.js";
import { createProjectConfig, parseProjectConfig } from "./projectConfig.js";

const presets = [
  { id: "cn", src: "/assets/logo-cn-v1.png" },
  { id: "en", src: "/assets/logo-en-v1.png" },
];

test("keeps the photo, custom logo, and settings in a round trip", () => {
  const photoSrc = "data:image/png;base64,photo-data";
  const logoSrc = "data:image/png;base64,logo-data";
  const project = createProjectConfig({
    settings: { ...defaultSettings, title: "保存后的标题", imageRotation: 12.5 },
    photoSrc,
    logoSrc,
    logoPresets: presets,
  });
  const restored = parseProjectConfig(JSON.stringify(project), {
    logoPresets: presets,
    defaultLogoSrc: presets[0].src,
  });

  assert.equal(restored.settings.title, "保存后的标题");
  assert.equal(restored.settings.imageRotation, 12.5);
  assert.equal(restored.photoSrc, photoSrc);
  assert.equal(restored.logoSrc, logoSrc);
});

test("restores a built-in logo by id when asset URLs change", () => {
  const project = createProjectConfig({
    settings: defaultSettings,
    photoSrc: "",
    logoSrc: presets[1].src,
    logoPresets: presets,
  });
  const nextPresets = [
    { id: "cn", src: "/assets/logo-cn-v2.png" },
    { id: "en", src: "/assets/logo-en-v2.png" },
  ];
  const restored = parseProjectConfig(JSON.stringify(project), {
    logoPresets: nextPresets,
    defaultLogoSrc: nextPresets[0].src,
  });

  assert.equal(restored.logoSrc, nextPresets[1].src);
});

test("rejects invalid or incomplete project files", () => {
  assert.throws(() =>
    parseProjectConfig('{"format":"unknown"}', {
      logoPresets: presets,
      defaultLogoSrc: presets[0].src,
    }),
  );
});
