import React, { useEffect, useState } from "react";
import { Image, StyleProp, ViewStyle } from "react-native";
import { SvgUri, SvgXml } from "react-native-svg";

type Props = {
  source: number; // require("../assets/foo.svg")
  width: number;
  height: number;
  style?: StyleProp<ViewStyle>;
};

export default function LocalSvg({ source, width, height, style }: Props) {
  const [uri, setUri] = useState<string | null>(null);
  const [xml, setXml] = useState<string | null>(null);
  const [rawXml, setRawXml] = useState<string | null>(null);

  // Convert CSS classes in <style> to inline fill attributes for react-native-svg
  const inlineCssFills = (svg: string): string => {
    try {
      // 1) Collect class -> fill mappings from <style>
      const classFill: Record<string, string> = {};
      const styleBlockRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
      let styleContent = "";
      let m: RegExpExecArray | null;
      while ((m = styleBlockRegex.exec(svg))) {
        styleContent += m[1] + "\n";
      }
      const ruleRegex = /\.([a-zA-Z0-9_-]+)\s*\{[^}]*?fill\s*:\s*([^;\}]+)\s*;?[^}]*\}/g;
      let r: RegExpExecArray | null;
      while ((r = ruleRegex.exec(styleContent))) {
        const cls = r[1];
        const color = r[2].trim().replace(/['"]/g, "");
        classFill[cls] = color;
      }

      // 2) Remove style blocks
      let out = svg.replace(styleBlockRegex, "");

      // 3) For elements with class=..., inject a single fill attribute based on first matched class
      const tagWithClass = /<([a-zA-Z]+)([^>]*?\sclass=["']([^"']+)["'][^>]*?)(\/?)>/g;
      out = out.replace(tagWithClass, (full, tagName, attrStr, classVal, selfClose) => {
        const classes = classVal.split(/\s+/);
        let color: string | null = null;
        for (const c of classes) {
          if (classFill[c]) { color = classFill[c]; break; }
        }
        if (!color) return full;
        // Remove existing fill=... attr if present
        let newAttr = attrStr.replace(/\sfill=["'][^"']*["']/g, "");
        // Ensure a space before adding
        newAttr = newAttr.replace(/\s+$/, "");
        newAttr += ` fill="${color}"`;
        return `<${tagName}${newAttr}${selfClose}>`;
      });
      return out;
    } catch {
      return svg;
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Try expo-asset first for a stable localUri
        let resolvedUri: string | null = null;
        let httpUri: string | null = null;
        try {
          const { Asset } = require("expo-asset");
          const asset = Asset.fromModule(source);
          if (!asset.downloaded) {
            await asset.downloadAsync();
          }
          resolvedUri = asset.localUri || asset.uri || null;
          httpUri = asset.uri || null;
        } catch {
          // Fallback to RN's resolveAssetSource
          const src = Image.resolveAssetSource(source);
          resolvedUri = src?.uri ?? null;
        }
        if (!mounted) return;
        setUri(resolvedUri);

        // If URI is remote or file://, load XML for reliable rendering
        if (resolvedUri && resolvedUri.startsWith("file://")) {
          try {
            // Use legacy API path to silence Expo 54 deprecation warning
            const FileSystem = require("expo-file-system/legacy");
            const text = await FileSystem.readAsStringAsync(resolvedUri);
            if (!mounted) return;
            setRawXml(text);
            setXml(inlineCssFills(text));
          } catch {
            // Try remote http(s) fallback if available
            if (httpUri && /^https?:\/\//.test(httpUri)) {
              try {
                const resp = await fetch(httpUri);
                const text = await resp.text();
                if (!mounted) return;
                setRawXml(text);
                setXml(inlineCssFills(text));
              } catch {
                if (!mounted) return;
                setXml(null);
              }
            } else {
              if (!mounted) return;
              setXml(null);
            }
          }
        } else if (resolvedUri && /^https?:\/\//.test(resolvedUri)) {
          try {
            const resp = await fetch(resolvedUri);
            const text = await resp.text();
            if (!mounted) return;
            setRawXml(text);
            setXml(inlineCssFills(text));
          } catch {
            if (!mounted) return;
            setXml(null);
          }
        } else {
          setXml(null);
        }
      } catch {
        if (!mounted) return;
        setUri(null);
        setXml(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [source]);

  // Prefer SvgCss (supports <style> blocks) when available, else use inlined Xml
  if (rawXml) {
    try {
      const { SvgCss } = require("react-native-svg/css");
      if (SvgCss) return <SvgCss xml={rawXml} width={width} height={height} style={style} />;
    } catch {}
  }
  if (xml) return <SvgXml xml={xml} width={width} height={height} style={style} />;
  if (uri) return <SvgUri uri={uri} width={width} height={height} style={style} />;
  return null;
}
