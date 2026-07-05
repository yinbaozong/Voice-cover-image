export const COVER_WIDTH = 1920;
export const COVER_HEIGHT = 1080;

const FONT_FAMILY =
  '"HarmonyOS Sans SC Cover", "HarmonyOS Sans SC", "HarmonyOS Sans", "Noto Sans SC", "Microsoft YaHei UI", "Microsoft YaHei", system-ui, sans-serif';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const defaultSettings = {
  title: "打印过程缠料、打结\n处理方法",
  subtitle:
    "本期视频将为您演示，当打印过程中出现耗材缠线或打结时，如何在不结束当前打印的情况下解决故障。",
  titleSize: 92,
  subtitleSize: 36,
  titleBold: true,
  titleX: 116,
  titleY: 426,
  textMaxWidth: 760,
  lineThickness: 5,
  textGap: 28,
  logoSize: 154,
  logoX: 116,
  logoY: 88,
  maskPosition: 0.53,
  feather: 0.22,
  imageScale: 1,
  imageOffsetX: 0,
  imageOffsetY: 0,
  imageRotation: 0,
  imageBrightness: 100,
  imageShadows: 0,
  imageSaturation: 100,
  imageContrast: 100,
  imageOpacity: 1,
  background: "#ffffff",
  foreground: "#050505",
  muted: "#4f5662",
  accent: "#00ae42",
};

const makeLayer = () => {
  const layer = document.createElement("canvas");
  layer.width = COVER_WIDTH;
  layer.height = COVER_HEIGHT;
  return layer;
};

export const loadImageFromSrc = (src) =>
  new Promise((resolve, reject) => {
    if (!src) {
      resolve(null);
      return;
    }
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("图片加载失败"));
    image.src = src;
  });

export const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsDataURL(file);
  });

const splitForWrap = (text) => Array.from(text || "");
const leadingPunctuationPattern = /^[，。！？；：、,.!?;:)）】》」』]$/;

const wrapParagraph = (ctx, text, maxWidth) => {
  const raw = text || "";
  if (!raw) return [""];
  const lines = [];
  const sourceLines = raw.split("\n");

  sourceLines.forEach((sourceLine) => {
    let current = "";
    splitForWrap(sourceLine).forEach((char) => {
      const next = current + char;
      if (current && ctx.measureText(next).width > maxWidth) {
        if (leadingPunctuationPattern.test(char)) {
          lines.push(next);
          current = "";
          return;
        }
        lines.push(current);
        current = char;
      } else {
        current = next;
      }
    });
    lines.push(current);
  });

  return lines;
};

const manualLines = (text) => {
  const lines = String(text || "").split("\n");
  return lines.length ? lines : [""];
};

const drawFallbackLogo = (ctx, settings) => {
  const mark = settings.logoSize * 0.42;
  const x = settings.logoX;
  const y = settings.logoY;
  const gap = mark * 0.32;

  ctx.save();
  ctx.fillStyle = settings.foreground;
  ctx.beginPath();
  ctx.rect(x, y, mark * 0.46, mark);
  ctx.rect(x + mark * 0.54, y, mark * 0.46, mark * 0.48);
  ctx.rect(x + mark * 0.54, y + mark * 0.56, mark * 0.46, mark * 0.44);
  ctx.fill();
  ctx.strokeStyle = settings.background;
  ctx.lineWidth = Math.max(4, mark * 0.06);
  ctx.beginPath();
  ctx.moveTo(x + mark * 0.02, y + mark * 0.66);
  ctx.lineTo(x + mark * 0.98, y + mark * 0.28);
  ctx.stroke();

  ctx.fillStyle = settings.foreground;
  ctx.font = `900 ${Math.round(settings.logoSize * 0.25)}px ${FONT_FAMILY}`;
  ctx.textBaseline = "top";
  ctx.fillText("拓竹科技", x + mark + gap, y - settings.logoSize * 0.02);
  ctx.font = `800 ${Math.round(settings.logoSize * 0.2)}px ${FONT_FAMILY}`;
  ctx.fillText("Bambu Lab", x + mark + gap, y + settings.logoSize * 0.25);
  ctx.restore();
};

const drawLogo = (ctx, settings, logoImage) => {
  if (!logoImage) {
    drawFallbackLogo(ctx, settings);
    return;
  }

  const aspect = logoImage.width / logoImage.height || 1;
  const height = settings.logoSize;
  const width = height * aspect;
  ctx.drawImage(logoImage, settings.logoX, settings.logoY, width, height);
};

const drawDemoPhoto = (ctx) => {
  const x = COVER_WIDTH * 0.42;
  const gradient = ctx.createLinearGradient(x, 0, COVER_WIDTH, COVER_HEIGHT);
  gradient.addColorStop(0, "#eff3f5");
  gradient.addColorStop(0.42, "#cfd8de");
  gradient.addColorStop(1, "#f0c400");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, COVER_WIDTH, COVER_HEIGHT);

  const drawSpool = (cx, cy, r, color, shade) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.55, r, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f4f6f7";
    ctx.beginPath();
    ctx.ellipse(-r * 0.42, 0, r * 0.18, r * 0.95, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    for (let i = -18; i < 18; i += 1) {
      const px = i * (r / 34);
      ctx.beginPath();
      ctx.ellipse(px, 0, r * 0.025, r * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(0,0,0,.16)";
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.restore();
  };

  drawSpool(1180, 540, 430, "#e4221b", "#e8edf0");
  drawSpool(1690, 540, 410, "#f7d20f", "#d5dde2");
};

export const getPhotoFrame = (settings, photoImage) => {
  if (!photoImage) return null;
  const baseScale = Math.max(COVER_WIDTH / photoImage.width, COVER_HEIGHT / photoImage.height);
  const scale = baseScale * settings.imageScale;
  const width = photoImage.width * scale;
  const height = photoImage.height * scale;
  const cx = COVER_WIDTH / 2 + settings.imageOffsetX;
  const cy = COVER_HEIGHT / 2 + settings.imageOffsetY;
  return {
    x: cx - width / 2,
    y: cy - height / 2,
    cx,
    cy,
    width,
    height,
    rotation: settings.imageRotation,
  };
};

const applyShadowAdjustment = (ctx, amount) => {
  if (!amount) return;
  const imageData = ctx.getImageData(0, 0, COVER_WIDTH, COVER_HEIGHT);
  const data = imageData.data;
  const strength = amount * 1.35;

  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] === 0) continue;
    const luminance = data[index] * 0.2126 + data[index + 1] * 0.7152 + data[index + 2] * 0.0722;
    const shadowWeight = clamp((150 - luminance) / 150, 0, 1);
    const delta = strength * shadowWeight;
    data[index] = clamp(data[index] + delta, 0, 255);
    data[index + 1] = clamp(data[index + 1] + delta, 0, 255);
    data[index + 2] = clamp(data[index + 2] + delta, 0, 255);
  }

  ctx.putImageData(imageData, 0, 0);
};

const drawMaskedImage = (ctx, settings, photoImage) => {
  const imageLayer = makeLayer();
  const layerCtx = imageLayer.getContext("2d");

  if (photoImage) {
    const frame = getPhotoFrame(settings, photoImage);
    layerCtx.globalAlpha = settings.imageOpacity;
    layerCtx.filter = [
      `brightness(${settings.imageBrightness}%)`,
      `contrast(${settings.imageContrast}%)`,
      `saturate(${settings.imageSaturation}%)`,
    ].join(" ");
    layerCtx.save();
    layerCtx.translate(frame.cx, frame.cy);
    layerCtx.rotate((settings.imageRotation * Math.PI) / 180);
    layerCtx.drawImage(photoImage, -frame.width / 2, -frame.height / 2, frame.width, frame.height);
    layerCtx.restore();
    layerCtx.filter = "none";
    applyShadowAdjustment(layerCtx, settings.imageShadows);
  } else {
    drawDemoPhoto(layerCtx);
  }

  const center = settings.maskPosition * COVER_WIDTH;
  const featherPx = settings.feather * COVER_WIDTH;
  const start = clamp(center - featherPx / 2, 0, COVER_WIDTH);
  const end = clamp(center + featherPx / 2, 0, COVER_WIDTH);
  const mask = layerCtx.createLinearGradient(start, 0, Math.max(start + 1, end), 0);
  mask.addColorStop(0, "rgba(0,0,0,0)");
  mask.addColorStop(0.35, "rgba(0,0,0,0.18)");
  mask.addColorStop(1, "rgba(0,0,0,1)");

  layerCtx.globalCompositeOperation = "destination-in";
  layerCtx.fillStyle = mask;
  layerCtx.fillRect(0, 0, COVER_WIDTH, COVER_HEIGHT);
  layerCtx.globalCompositeOperation = "source-over";

  ctx.drawImage(imageLayer, 0, 0);
};

const drawTextBlock = (ctx, settings) => {
  ctx.save();
  ctx.fillStyle = settings.foreground;
  ctx.textBaseline = "top";
  ctx.font = `${settings.titleBold ? 900 : 500} ${settings.titleSize}px ${FONT_FAMILY}`;

  const titleLines = manualLines(settings.title);
  const titleLineHeight = settings.titleSize * 1.23;
  let widestTitle = 0;

  titleLines.forEach((line, index) => {
    const y = settings.titleY + index * titleLineHeight;
    ctx.fillText(line, settings.titleX, y);
    widestTitle = Math.max(widestTitle, ctx.measureText(line).width);
  });

  const titleBottom = settings.titleY + (titleLines.length - 1) * titleLineHeight + settings.titleSize;
  const lineY = titleBottom + settings.textGap;
  const lineEnd = settings.titleX + clamp(widestTitle, 280, COVER_WIDTH - settings.titleX - 80);
  ctx.strokeStyle = settings.foreground;
  ctx.lineWidth = settings.lineThickness;
  ctx.lineCap = "butt";
  ctx.beginPath();
  ctx.moveTo(settings.titleX, lineY);
  ctx.lineTo(lineEnd, lineY);
  ctx.stroke();

  ctx.font = `600 ${settings.subtitleSize}px ${FONT_FAMILY}`;
  ctx.fillStyle = settings.muted;
  const subtitleLines = wrapParagraph(ctx, settings.subtitle, lineEnd - settings.titleX);
  const subtitleLineHeight = settings.subtitleSize * 1.55;
  const subtitleY = lineY + settings.textGap;

  subtitleLines.slice(0, 4).forEach((line, index) => {
    ctx.fillText(line, settings.titleX, subtitleY + index * subtitleLineHeight);
  });
  ctx.restore();
};

export const renderCover = ({ canvas, settings, photoImage, logoImage }) => {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  canvas.width = COVER_WIDTH;
  canvas.height = COVER_HEIGHT;
  ctx.clearRect(0, 0, COVER_WIDTH, COVER_HEIGHT);
  ctx.fillStyle = settings.background;
  ctx.fillRect(0, 0, COVER_WIDTH, COVER_HEIGHT);
  drawMaskedImage(ctx, settings, photoImage);
  drawLogo(ctx, settings, logoImage);
  drawTextBlock(ctx, settings);
};

export const getMaskGuides = (settings) => {
  const center = clamp(settings.maskPosition, 0.05, 0.95);
  const half = clamp(settings.feather / 2, 0.005, 0.45);
  return {
    center,
    left: clamp(center - half, 0, 1),
    right: clamp(center + half, 0, 1),
  };
};

export const normalizeSettings = (settings) => ({
  ...defaultSettings,
  ...settings,
  titleBold: settings.titleBold ?? defaultSettings.titleBold,
  titleY: clamp(settings.titleY ?? defaultSettings.titleY, 120, 760),
  logoX: clamp(settings.logoX ?? defaultSettings.logoX, 20, 760),
  logoY: clamp(settings.logoY ?? defaultSettings.logoY, 20, 320),
  lineThickness: clamp(settings.lineThickness ?? defaultSettings.lineThickness, 1, 16),
  textGap: clamp(settings.textGap ?? defaultSettings.textGap, 8, 80),
  maskPosition: clamp(settings.maskPosition ?? defaultSettings.maskPosition, 0.05, 0.95),
  feather: clamp(settings.feather ?? defaultSettings.feather, 0.02, 0.75),
  imageScale: clamp(settings.imageScale ?? defaultSettings.imageScale, 0.3, 3),
  imageRotation: clamp(settings.imageRotation ?? defaultSettings.imageRotation, -180, 180),
  imageBrightness: clamp(settings.imageBrightness ?? defaultSettings.imageBrightness, 0, 200),
  imageShadows: clamp(settings.imageShadows ?? defaultSettings.imageShadows, -100, 100),
  imageSaturation: clamp(settings.imageSaturation ?? defaultSettings.imageSaturation, 0, 200),
  imageContrast: clamp(settings.imageContrast ?? defaultSettings.imageContrast, 0, 200),
});
