import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bold,
  Download,
  ImageIcon,
  Move,
  RefreshCw,
  Type,
  Upload,
} from "lucide-react";
import {
  COVER_HEIGHT,
  COVER_WIDTH,
  defaultSettings,
  fileToDataUrl,
  fontWeightOptions,
  getFontFamily,
  getMaskGuides,
  getPhotoFrame,
  loadImageFromSrc,
  normalizeSettings,
  renderCover,
} from "./coverRenderer.js";
import logoCnSrc from "./assets/bambu-logo-cn.png";
import logoEnSrc from "./assets/bambu-logo-en.png";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const STORAGE_KEY = "voice-cover-image/v3";

const measureWrappedLines = (ctx, text, maxWidth) => {
  const sourceLines = String(text || "").split("\n");
  const wrapped = [];

  sourceLines.forEach((sourceLine) => {
    if (!sourceLine) {
      wrapped.push("");
      return;
    }

    let current = "";
    Array.from(sourceLine).forEach((char) => {
      const next = `${current}${char}`;
      if (current && ctx.measureText(next).width > maxWidth) {
        wrapped.push(current);
        current = char;
      } else {
        current = next;
      }
    });
    wrapped.push(current);
  });

  return wrapped;
};

const controlGroups = {
  content: "内容",
  layout: "版式",
  photo: "照片",
};

const logoPresets = [
  { id: "cn", label: "中文 Logo", src: logoCnSrc },
  { id: "en", label: "英文 Logo", src: logoEnSrc },
];

const defaultLogoSrc = logoPresets[0].src;

function SliderControl({ label, value, min, max, step = 1, unit = "", disabled = false, onChange }) {
  return (
    <label className={`control ${disabled ? "is-disabled" : ""}`}>
      <span>
        {label}
        <strong>
          {value}
          {unit}
        </strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function NumberControl({ label, value, min, max, step = 1, unit = "", onChange }) {
  return (
    <label className="number-control">
      <span>{label}</span>
      <div className="number-input-wrap">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => {
            const nextValue = Number(event.target.value);
            if (Number.isFinite(nextValue)) onChange(nextValue);
          }}
        />
        {unit && <em>{unit}</em>}
      </div>
    </label>
  );
}

function UploadButton({ id, icon: Icon, label, accept = "image/*", onFile }) {
  return (
    <label className="upload-button" htmlFor={id}>
      <Icon size={18} aria-hidden="true" />
      <span>{label}</span>
      <input
        id={id}
        type="file"
        accept={accept}
        onClick={(event) => {
          event.currentTarget.value = "";
        }}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) onFile(file);
        }}
      />
    </label>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <section className="panel-section">
      <div className="section-title">
        <Icon size={17} aria-hidden="true" />
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function CanvasStage({
  canvasRef,
  settings,
  setSettings,
  onPhotoDrop,
  hasPhoto,
  photoImage,
  status,
}) {
  const stageRef = useRef(null);
  const dragRef = useRef(null);
  const [photoSelected, setPhotoSelected] = useState(false);
  const guides = useMemo(() => getMaskGuides(settings), [settings]);
  const photoFrame = useMemo(() => getPhotoFrame(settings, photoImage), [settings, photoImage]);

  const updateByPointer = useCallback(
    (event) => {
      const drag = dragRef.current;
      const stage = stageRef.current;
      if (!drag || !stage) return;

      const rect = stage.getBoundingClientRect();
      const xRatio = clamp((event.clientX - rect.left) / rect.width, 0.02, 0.98);

      if (drag.type === "mask") {
        setSettings((current) => normalizeSettings({ ...current, maskPosition: xRatio }));
        return;
      }

      if (drag.type === "feather") {
        setSettings((current) => {
          const distance = Math.abs(xRatio - current.maskPosition) * 2;
          return normalizeSettings({ ...current, feather: clamp(distance, 0.02, 0.75) });
        });
        return;
      }

      if (drag.type === "image") {
        const dx = ((event.clientX - drag.startX) / rect.width) * COVER_WIDTH;
        const dy = ((event.clientY - drag.startY) / rect.height) * COVER_HEIGHT;
        setSettings((current) =>
          normalizeSettings({
            ...current,
            imageOffsetX: Math.round(drag.startOffsetX + dx),
            imageOffsetY: Math.round(drag.startOffsetY + dy),
          }),
        );
      }
    },
    [setSettings],
  );

  useEffect(() => {
    const handleMove = (event) => updateByPointer(event);
    const stopDrag = () => {
      dragRef.current = null;
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", stopDrag);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", stopDrag);
    };
  }, [updateByPointer]);

  const startImageDrag = (event) => {
    if (!hasPhoto) return;
    if (event.target.closest("[data-guide]")) return;
    setPhotoSelected(true);
    dragRef.current = {
      type: "image",
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: settings.imageOffsetX,
      startOffsetY: settings.imageOffsetY,
    };
  };

  return (
    <main className="stage-shell">
      <div className="stage-toolbar">
        <div>
          <p>画布</p>
          <strong>
            {COVER_WIDTH} × {COVER_HEIGHT}
          </strong>
        </div>
        <div className="status-pill">{status}</div>
      </div>
      <div
        ref={stageRef}
        className="canvas-stage"
        onPointerDown={startImageDrag}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        }}
        onDrop={(event) => {
          event.preventDefault();
          const file = event.dataTransfer.files?.[0];
          if (file?.type.startsWith("image/")) onPhotoDrop(file);
        }}
        onWheel={(event) => {
          if (!hasPhoto) return;
          event.preventDefault();
          const direction = event.deltaY > 0 ? -0.04 : 0.04;
          setSettings((current) =>
            normalizeSettings({
              ...current,
              imageScale: Number(clamp(current.imageScale + direction, 0.3, 3).toFixed(2)),
            }),
          );
        }}
      >
        <canvas ref={canvasRef} aria-label="视频封面预览" />
        <div className="guide-layer" aria-hidden="true">
          <button
            className="guide guide-feather"
            data-guide="feather-left"
            style={{ left: `${guides.left * 100}%` }}
            title="拖动调整羽化宽度"
            onPointerDown={(event) => {
              event.stopPropagation();
              dragRef.current = { type: "feather" };
            }}
          />
          <button
            className="guide guide-mask"
            data-guide="mask"
            style={{ left: `${guides.center * 100}%` }}
            title="拖动调整蒙版位置"
            onPointerDown={(event) => {
              event.stopPropagation();
              dragRef.current = { type: "mask" };
            }}
          />
          <button
            className="guide guide-feather"
            data-guide="feather-right"
            style={{ left: `${guides.right * 100}%` }}
            title="拖动调整羽化宽度"
            onPointerDown={(event) => {
              event.stopPropagation();
              dragRef.current = { type: "feather" };
            }}
          />
        </div>
        {photoSelected && photoFrame && (
          <div
            className="photo-selection-frame"
            style={{
              left: `${(photoFrame.cx / COVER_WIDTH) * 100}%`,
              top: `${(photoFrame.cy / COVER_HEIGHT) * 100}%`,
              width: `${(photoFrame.width / COVER_WIDTH) * 100}%`,
              height: `${(photoFrame.height / COVER_HEIGHT) * 100}%`,
              transform: `translate(-50%, -50%) rotate(${photoFrame.rotation}deg)`,
            }}
            aria-hidden="true"
          >
            <span />
            <span />
            <span />
            <span />
          </div>
        )}
      </div>
      <div className="stage-hint">
        <div className="stage-help">
          <Move size={16} aria-hidden="true" />
          <span>拖动照片移动，滚轮缩放；拖中间点调蒙版，拖两侧线调羽化。</span>
        </div>
        <div className="stage-values">
          <span>蒙版 {Math.round(settings.maskPosition * 100)}%</span>
          <span>羽化 {Math.round(settings.feather * 100)}%</span>
          <span>照片 X {settings.imageOffsetX}px</span>
          <span>照片 Y {settings.imageOffsetY}px</span>
          <span>旋转 {settings.imageRotation}°</span>
        </div>
      </div>
    </main>
  );
}

function App() {
  const canvasRef = useRef(null);
  const [fontReadyTick, setFontReadyTick] = useState(0);
  const [settings, setSettings] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return normalizeSettings(cached.settings || defaultSettings);
    } catch {
      return defaultSettings;
    }
  });
  const [photoSrc, setPhotoSrc] = useState(() => {
    return "";
  });
  const [logoSrc, setLogoSrc] = useState(() => {
    return defaultLogoSrc;
  });
  const [photoImage, setPhotoImage] = useState(null);
  const [logoImage, setLogoImage] = useState(null);
  const [status, setStatus] = useState("已自动保存");

  const setSetting = useCallback((patch) => {
    setSettings((current) => normalizeSettings({ ...current, ...patch }));
  }, []);

  const centerTextGroup = useCallback(() => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const titleLines = String(settings.title || "").split("\n");
    const titleLineHeight = settings.titleSize * 1.23;
    const titleHeight = (Math.max(titleLines.length, 1) - 1) * titleLineHeight + settings.titleSize;

    if (!settings.subtitleEnabled) {
      setSetting({ titleY: Math.round((COVER_HEIGHT - titleHeight) / 2) });
      setStatus("文字已居中");
      return;
    }

    const fontFamily = getFontFamily();
    const titleWeight = settings.titleBold
      ? Math.max(settings.fontWeight, 700)
      : settings.fontWeight;
    ctx.font = `${titleWeight} ${settings.titleSize}px ${fontFamily}`;
    const widestTitle = titleLines.reduce((max, line) => Math.max(max, ctx.measureText(line).width), 0);
    const lineWidth = clamp(widestTitle, 280, COVER_WIDTH - settings.titleX - 80);

    ctx.font = `${settings.fontWeight} ${settings.subtitleSize}px ${fontFamily}`;
    const subtitleLines = measureWrappedLines(ctx, settings.subtitle, lineWidth).slice(0, 4);
    const subtitleLineHeight = settings.subtitleSize * 1.55;
    const subtitleHeight =
      (Math.max(subtitleLines.length, 1) - 1) * subtitleLineHeight + settings.subtitleSize;

    const totalHeight = titleHeight + settings.textGap + settings.lineThickness + settings.textGap + subtitleHeight;
    setSetting({ titleY: Math.round((COVER_HEIGHT - totalHeight) / 2) });
    setStatus("文字已居中");
  }, [settings, setSetting]);

  useEffect(() => {
    let ignore = false;
    loadImageFromSrc(photoSrc)
      .then((image) => {
        if (!ignore) setPhotoImage(image);
      })
      .catch(() => {
        if (!ignore) setPhotoImage(null);
      });
    return () => {
      ignore = true;
    };
  }, [photoSrc]);

  useEffect(() => {
    let ignore = false;
    loadImageFromSrc(logoSrc)
      .then((image) => {
        if (!ignore) setLogoImage(image);
      })
      .catch(() => {
        if (!ignore) setLogoImage(null);
      });
    return () => {
      ignore = true;
    };
  }, [logoSrc]);

  useEffect(() => {
    if (!document.fonts?.ready) return;
    let ignore = false;
    document.fonts.ready.then(() => {
      if (!ignore) setFontReadyTick((value) => value + 1);
    });
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!document.fonts?.load) return;
    let ignore = false;
    const fontFamily = getFontFamily();
    Promise.all([
      document.fonts.load(`${settings.fontWeight} 32px ${fontFamily}`),
      document.fonts.load(`${Math.max(settings.fontWeight, 700)} 32px ${fontFamily}`),
    ]).then(() => {
      if (!ignore) setFontReadyTick((value) => value + 1);
    });
    return () => {
      ignore = true;
    };
  }, [settings.fontWeight]);

  useEffect(() => {
    renderCover({ canvas: canvasRef.current, settings, photoImage, logoImage });
  }, [settings, photoImage, logoImage, fontReadyTick]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ settings }));
        setStatus("设置已自动保存");
      } catch {
        setStatus("本地保存空间不足");
      }
    }, 250);
    return () => window.clearTimeout(id);
  }, [settings, photoSrc, logoSrc]);

  const loadPhotoFile = async (file) => {
    setStatus("正在读取照片");
    const dataUrl = await fileToDataUrl(file);
    setPhotoSrc(dataUrl);
    setStatus("照片已载入");
  };

  const loadLogoFile = async (file) => {
    setStatus("正在读取 Logo");
    const dataUrl = await fileToDataUrl(file);
    setLogoSrc(dataUrl);
    setStatus("自定义 Logo 已载入");
  };

  const selectLogoPreset = useCallback((preset) => {
    setLogoSrc(preset.src);
    setStatus(`${preset.label} 已选中`);
  }, []);

  const exportPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderCover({ canvas, settings, photoImage, logoImage });
    canvas.toBlob((blob) => {
      if (!blob) return;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `video-cover-${Date.now()}.png`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      setStatus("PNG 已导出");
    }, "image/png");
  };

  const resetAll = () => {
    setSettings(defaultSettings);
    setPhotoSrc("");
    setLogoSrc(defaultLogoSrc);
    setPhotoImage(null);
    setStatus("已重置");
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">VC</div>
          <div>
            <h1>视频封面生成器</h1>
            <p>16:9 白底标题 + 右侧照片线性羽化</p>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="primary-button" type="button" onClick={exportPng}>
            <Download size={18} aria-hidden="true" />
            导出 PNG
          </button>
        </div>
      </header>

      <div className="workspace">
        <aside className="side-panel left-panel">
          <Section title={controlGroups.content} icon={Type}>
            <div className="button-grid">
              <UploadButton id="photo-upload" icon={ImageIcon} label="上传照片" onFile={loadPhotoFile} />
              <UploadButton id="logo-upload" icon={Upload} label="上传 Logo" onFile={loadLogoFile} />
            </div>
            <div className="preset-row" aria-label="内置 Logo">
              {logoPresets.map((preset) => (
                <button
                  key={preset.id}
                  className={`preset-button ${logoSrc === preset.src ? "is-active" : ""}`}
                  type="button"
                  aria-pressed={logoSrc === preset.src}
                  onClick={() => selectLogoPreset(preset)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <label className="font-control">
              <span>鸿蒙字重</span>
              <select
                value={settings.fontWeight}
                onChange={(event) => setSetting({ fontWeight: Number(event.target.value) })}
              >
                {fontWeightOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-control">
              <span className="field-heading">
                <span>主标题</span>
                <button
                  className={`mini-toggle ${settings.titleBold ? "is-active" : ""}`}
                  type="button"
                  aria-pressed={settings.titleBold}
                  onClick={() => setSetting({ titleBold: !settings.titleBold })}
                >
                  <Bold size={14} aria-hidden="true" />
                  加粗
                </button>
              </span>
              <textarea
                value={settings.title}
                rows={3}
                onChange={(event) => setSetting({ title: event.target.value })}
              />
            </label>
            <label className={`text-control ${settings.subtitleEnabled ? "" : "is-disabled"}`}>
              <span className="field-heading">
                <span>副标题</span>
                <label className="checkbox-toggle">
                  <input
                    type="checkbox"
                    checked={settings.subtitleEnabled}
                    onChange={(event) => setSetting({ subtitleEnabled: event.target.checked })}
                  />
                  启用副标题
                </label>
              </span>
              <textarea
                value={settings.subtitle}
                rows={4}
                disabled={!settings.subtitleEnabled}
                onChange={(event) => setSetting({ subtitle: event.target.value })}
              />
            </label>
            <SliderControl
              label="主标题字号"
              value={settings.titleSize}
              min={56}
              max={120}
              onChange={(value) => setSetting({ titleSize: value })}
            />
            <SliderControl
              label="副标题字号"
              value={settings.subtitleSize}
              min={30}
              max={90}
              disabled={!settings.subtitleEnabled}
              onChange={(value) => setSetting({ subtitleSize: value })}
            />
            <div className="control-group-heading">
              <span>Logo 大小</span>
              <label className="checkbox-toggle">
                <input
                  type="checkbox"
                  checked={settings.logoSizeUnlocked}
                  onChange={(event) => setSetting({ logoSizeUnlocked: event.target.checked })}
                />
                允许调整
              </label>
            </div>
            <SliderControl
              label="大小"
              value={settings.logoSize}
              min={60}
              max={240}
              disabled={!settings.logoSizeUnlocked}
              onChange={(value) => setSetting({ logoSize: value })}
            />
            <div className="control-group-heading">
              <span>Logo 位置</span>
              <label className="checkbox-toggle">
                <input
                  type="checkbox"
                  checked={settings.logoPositionUnlocked}
                  onChange={(event) =>
                    setSetting({ logoPositionUnlocked: event.target.checked })
                  }
                />
                允许调整
              </label>
            </div>
            <SliderControl
              label="Logo 水平"
              value={settings.logoX}
              min={40}
              max={520}
              unit="px"
              disabled={!settings.logoPositionUnlocked}
              onChange={(value) => setSetting({ logoX: value })}
            />
            <SliderControl
              label="Logo 垂直"
              value={settings.logoY}
              min={30}
              max={260}
              unit="px"
              disabled={!settings.logoPositionUnlocked}
              onChange={(value) => setSetting({ logoY: value })}
            />
          </Section>
        </aside>

        <CanvasStage
          canvasRef={canvasRef}
          settings={settings}
          setSettings={setSettings}
          onPhotoDrop={loadPhotoFile}
          hasPhoto={Boolean(photoImage)}
          photoImage={photoImage}
          status={status}
        />

        <aside className="side-panel right-panel">
          <Section title={controlGroups.layout} icon={Type}>
            <SliderControl
              label="文字组垂直"
              value={settings.titleY}
              min={220}
              max={620}
              unit="px"
              onChange={(value) => setSetting({ titleY: value })}
            />
            <div className="control-group-heading">
              <span>横线参数</span>
              <label className="checkbox-toggle">
                <input
                  type="checkbox"
                  checked={settings.lineControlsUnlocked}
                  onChange={(event) =>
                    setSetting({ lineControlsUnlocked: event.target.checked })
                  }
                />
                允许调整
              </label>
            </div>
            <SliderControl
              label="标题/横线间距"
              value={settings.textGap}
              min={8}
              max={70}
              unit="px"
              disabled={!settings.lineControlsUnlocked}
              onChange={(value) => setSetting({ textGap: value })}
            />
            <SliderControl
              label="横线粗细"
              value={settings.lineThickness}
              min={1}
              max={14}
              unit="px"
              disabled={!settings.lineControlsUnlocked}
              onChange={(value) => setSetting({ lineThickness: value })}
            />
            <button className="ghost-button compact-button" type="button" onClick={centerTextGroup}>
              文字居中
            </button>
            <p className="control-note">主标题、横线、副标题会一起上下移动；标题到横线、副标题到横线使用同一个间距。</p>
          </Section>
          <Section title={controlGroups.photo} icon={ImageIcon}>
            <div className="number-grid">
              <NumberControl
                label="旋转角度"
                value={settings.imageRotation}
                min={-180}
                max={180}
                step={0.1}
                unit="°"
                onChange={(value) => setSetting({ imageRotation: value })}
              />
              <NumberControl
                label="亮度"
                value={settings.imageBrightness}
                min={0}
                max={200}
                unit="%"
                onChange={(value) => setSetting({ imageBrightness: value })}
              />
              <NumberControl
                label="阴影"
                value={settings.imageShadows}
                min={-100}
                max={100}
                unit=""
                onChange={(value) => setSetting({ imageShadows: value })}
              />
              <NumberControl
                label="饱和度"
                value={settings.imageSaturation}
                min={0}
                max={200}
                unit="%"
                onChange={(value) => setSetting({ imageSaturation: value })}
              />
              <NumberControl
                label="对比度"
                value={settings.imageContrast}
                min={0}
                max={200}
                unit="%"
                onChange={(value) => setSetting({ imageContrast: value })}
              />
            </div>
            <button
              className="ghost-button full"
              type="button"
              onClick={() =>
                setSetting({
                  imageRotation: 0,
                  imageBrightness: 100,
                  imageShadows: 0,
                  imageSaturation: 100,
                  imageContrast: 100,
                })
              }
            >
              <RefreshCw size={17} aria-hidden="true" />
              重置照片调色
            </button>
          </Section>

          <button className="ghost-button full reset-all-button" type="button" onClick={resetAll}>
            <RefreshCw size={17} aria-hidden="true" />
            全部重置
          </button>
        </aside>
      </div>
    </div>
  );
}

export default App;
