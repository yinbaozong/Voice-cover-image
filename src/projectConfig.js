import { normalizeSettings } from "./coverRenderer.js";

export const PROJECT_FILE_FORMAT = "voice-cover-image-project";
export const PROJECT_FILE_VERSION = 1;

const isImageDataUrl = (value) =>
  typeof value === "string" && value.startsWith("data:image/");

export const createProjectConfig = ({ settings, photoSrc, logoSrc, logoPresets }) => {
  const selectedPreset = logoPresets.find((preset) => preset.src === logoSrc);

  return {
    format: PROJECT_FILE_FORMAT,
    version: PROJECT_FILE_VERSION,
    savedAt: new Date().toISOString(),
    settings: normalizeSettings(settings),
    photoSrc: isImageDataUrl(photoSrc) ? photoSrc : "",
    logo: selectedPreset
      ? { type: "preset", id: selectedPreset.id }
      : { type: "embedded", src: isImageDataUrl(logoSrc) ? logoSrc : "" },
  };
};

export const parseProjectConfig = (text, { logoPresets, defaultLogoSrc }) => {
  const project = JSON.parse(text);
  if (
    project?.format !== PROJECT_FILE_FORMAT ||
    project?.version !== PROJECT_FILE_VERSION ||
    !project.settings ||
    typeof project.settings !== "object"
  ) {
    throw new Error("Unsupported project configuration");
  }

  const photoSrc = project.photoSrc === "" ? "" : project.photoSrc;
  if (photoSrc && !isImageDataUrl(photoSrc)) {
    throw new Error("Invalid embedded photo");
  }

  let logoSrc = defaultLogoSrc;
  if (project.logo?.type === "preset") {
    logoSrc = logoPresets.find((preset) => preset.id === project.logo.id)?.src || defaultLogoSrc;
  } else if (project.logo?.type === "embedded") {
    if (!isImageDataUrl(project.logo.src)) {
      throw new Error("Invalid embedded logo");
    }
    logoSrc = project.logo.src;
  } else {
    throw new Error("Invalid logo configuration");
  }

  return {
    settings: normalizeSettings(project.settings),
    photoSrc,
    logoSrc,
  };
};
