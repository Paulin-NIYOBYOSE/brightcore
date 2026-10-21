/**
 * Cleans a candidate-supplied file name for display and for download headers.
 * Directory parts and unusual characters are removed, and the name always ends
 * in ".pdf". It is never used to build a file system path.
 */
export function sanitizeCvFilename(rawName: string): string {
  const baseName = rawName.split(/[\\/]/).pop() ?? "";
  const cleaned = baseName
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N} ._()-]/gu, "_")
    .replace(/\s+/g, " ")
    .replace(/^[\s._]+/, "")
    .trim()
    .slice(0, 150);
  const stem = cleaned.replace(/\.pdf$/i, "").trim();
  return `${stem || "cv"}.pdf`;
}

/**
 * `Content-Disposition: attachment` with an ASCII fallback name and an RFC 5987
 * UTF-8 name, so browsers download (never render inline) with a safe name.
 */
export function attachmentContentDisposition(filename: string): string {
  const asciiFallback = filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  const encoded = encodeURIComponent(filename).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}
