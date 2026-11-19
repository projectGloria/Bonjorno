import { useEffect, useState } from 'react';
import { GRADIENT_PRESETS, SCENE_PRESETS } from '../constants/wallpapers';
import { getBackgroundBlob } from '../services/imageStore';
import type { AppearanceSettings } from '../types/settings';

interface BackgroundLayerProps {
  appearance: AppearanceSettings;
}

export function BackgroundLayer({ appearance }: BackgroundLayerProps) {
  const [customUrl, setCustomUrl] = useState<string | null>(null);

  useEffect(() => {
    if (appearance.backgroundMode !== 'custom' || !appearance.customImageId) {
      setCustomUrl(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    getBackgroundBlob(appearance.customImageId).then((blob) => {
      if (cancelled || !blob) {
        if (!cancelled) setCustomUrl(null);
        return;
      }
      objectUrl = URL.createObjectURL(blob);
      setCustomUrl(objectUrl);
    });

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [appearance.backgroundMode, appearance.customImageId]);

  const blurStyle =
    appearance.backgroundBlur > 0
      ? {
          filter: `blur(${appearance.backgroundBlur}px)`,
          transform: 'scale(1.06)',
        }
      : undefined;

  let mediaStyle: React.CSSProperties = {};

  if (appearance.backgroundMode === 'solid') {
    mediaStyle = { background: appearance.solidColor };
  } else if (appearance.backgroundMode === 'gradient') {
    const preset =
      GRADIENT_PRESETS.find((g) => g.id === appearance.gradientId) ??
      GRADIENT_PRESETS[0];
    mediaStyle = { background: preset.css };
  } else if (appearance.backgroundMode === 'scene') {
    const scene =
      SCENE_PRESETS.find((s) => s.id === appearance.sceneId) ??
      SCENE_PRESETS[0];
    mediaStyle = {
      backgroundImage: scene.css,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    };
  } else if (appearance.backgroundMode === 'custom' && customUrl) {
    mediaStyle = {
      backgroundImage: `url("${customUrl}")`,
      backgroundSize:
        appearance.backgroundFit === 'center' ? 'auto' : appearance.backgroundFit,
      backgroundPosition: appearance.backgroundPosition,
      backgroundRepeat: 'no-repeat',
      backgroundColor: appearance.solidColor,
    };
  } else {
    // Graceful fallback if custom image was deleted or unavailable
    const fallback = GRADIENT_PRESETS[0];
    mediaStyle = { background: fallback.css };
  }

  const showDim =
    appearance.backgroundMode === 'custom' ||
    appearance.backgroundMode === 'scene';

  return (
    <div className="bg-layer" aria-hidden="true">
      <div className="bg-media" style={{ ...mediaStyle, ...blurStyle }} />
      {showDim && appearance.backgroundDim > 0 && (
        <div
          className="bg-scrim"
          style={{ opacity: appearance.backgroundDim / 100 }}
        />
      )}
    </div>
  );
}
