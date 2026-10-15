import type { ImageProps } from "next/image";

// The fixture server supplies actual assets, without Next's optimizer endpoint.
export default function Image({ src, alt, fill, width, height, sizes, loading, className, style }: ImageProps) {
  const image = typeof src === "string" ? src : "default" in src ? src.default.src : src.src;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={image} alt={alt} width={width} height={height} sizes={sizes} loading={loading} className={className} style={fill ? { position: "absolute", inset: 0, width: "100%", height: "100%", ...style } : style} />;
}
