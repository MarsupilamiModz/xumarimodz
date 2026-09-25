"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { getMediaUrl, getMediaProxyFallback } from "@/lib/media-url";

type SafeImageProps = {
  src: string | null | undefined;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
  sizes?: string;
  priority?: boolean;
  loading?: "lazy" | "eager";
  fallbackLabel?: string;
};

function isLocalPreview(url: string) {
  return url.startsWith("blob:") || url.startsWith("data:");
}

function shouldUseUnoptimized(url: string): boolean {
  if (isLocalPreview(url)) return true;
  // External/CDN URLs — bypass Next Image optimizer (avoids remotePatterns 403 loops).
  return url.startsWith("http://") || url.startsWith("https://");
}

export function SafeImage({
  src,
  alt,
  fill,
  width,
  height,
  className,
  style,
  sizes,
  priority,
  loading = "lazy",
  fallbackLabel,
}: SafeImageProps) {
  const t = useTranslations("common");
  // Kleine Bilder (Logo, Avatare, Thumbnails) zeigen im Fehlerfall nur das Symbol, keinen gequetschten Text.
  const sizePx = Number(/^(\d+)px$/.exec(sizes ?? "")?.[1] ?? NaN);
  const small = (width !== undefined && width < 96) || (!Number.isNaN(sizePx) && sizePx < 96);
  const [failed, setFailed] = useState(false);
  const [useProxy, setUseProxy] = useState(false);

  useEffect(() => {
    setFailed(false);
    setUseProxy(false);
  }, [src]);

  const primary = getMediaUrl(src);
  // Proxy immer relativ (gleiche Herkunft): funktioniert lokal, in Vorschauen und live gleich.
  const proxyAbsolute = useProxy ? getMediaProxyFallback(src) : null;
  const proxy = proxyAbsolute ? proxyAbsolute.replace(/^https?:\/\/[^/]+/, "") : null;
  const resolved = proxy ?? primary;

  if (!resolved || failed) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-1 bg-elevated text-ink-faint",
          fill && "absolute inset-0",
          className
        )}
        style={!fill && width && height ? { width, height } : undefined}
        aria-hidden={!alt}
      >
        <ImageOff className="h-8 w-8" aria-hidden />
        {fallbackLabel !== "" && !small && (
          <span className="px-2 text-center text-xs">{fallbackLabel ?? t("noImage")}</span>
        )}
      </div>
    );
  }

  const unoptimized = shouldUseUnoptimized(resolved);

  const handleError = () => {
    if (!useProxy && getMediaProxyFallback(src)) {
      setUseProxy(true);
      return;
    }
    setFailed(true);
    if (process.env.NODE_ENV === "development") {
      console.warn("[SafeImage] failed to load", { src, resolved });
    }
  };

  if (fill) {
    return (
      <Image
        src={resolved}
        alt={alt}
        fill
        className={className}
        style={style}
        sizes={sizes ?? "100vw"}
        priority={priority}
        loading={priority ? undefined : loading}
        placeholder="empty"
        unoptimized={unoptimized}
        onError={handleError}
      />
    );
  }

  return (
    <Image
      src={resolved}
      alt={alt}
      width={width ?? 400}
      height={height ?? 300}
      className={className}
      sizes={sizes}
      priority={priority}
      loading={priority ? undefined : loading}
      placeholder="empty"
      unoptimized={unoptimized}
      onError={handleError}
    />
  );
}
