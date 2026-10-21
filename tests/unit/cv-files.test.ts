import { mkdtemp, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildSamplePdf } from "../../prisma/sample-pdf";
import { MAX_CV_BYTES } from "@/lib/constants";
import { LocalCvStorage } from "@/server/storage/cv-storage";
import { attachmentContentDisposition, sanitizeCvFilename } from "@/server/storage/filenames";
import { inspectPdf } from "@/server/storage/pdf";

const bytes = (text: string) => new Uint8Array(Buffer.from(text, "latin1"));

describe("inspectPdf", () => {
  it("accepts a real PDF", () => {
    expect(inspectPdf(buildSamplePdf(["Jane Doe"]))).toBeNull();
  });

  it("rejects empty files", () => {
    expect(inspectPdf(new Uint8Array())).toBe("EMPTY");
  });

  it("rejects files over 5 MB, even if they start like a PDF", () => {
    const oversized = new Uint8Array(MAX_CV_BYTES + 1);
    oversized.set(bytes("%PDF-1.7\n"));
    expect(inspectPdf(oversized)).toBe("TOO_LARGE");
  });

  it("rejects files without the PDF signature, whatever their name", () => {
    expect(inspectPdf(bytes("This is a text file renamed to cv.pdf\n%%EOF"))).toBe("NOT_PDF");
    expect(inspectPdf(bytes("PK\u0003\u0004 a docx/zip file"))).toBe("NOT_PDF");
    expect(inspectPdf(bytes("<html><script>alert(1)</script></html>"))).toBe("NOT_PDF");
  });

  it("rejects truncated PDFs that have no end-of-file marker", () => {
    expect(inspectPdf(bytes("%PDF-1.4\n1 0 obj << >> endobj\n"))).toBe("NOT_PDF");
  });
});

describe("LocalCvStorage", () => {
  let root: string;
  let storage: LocalCvStorage;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "brightcore-storage-"));
    storage = new LocalCvStorage(root);
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("saves under a random key, owner-readable only, and reads it back", async () => {
    const pdf = buildSamplePdf(["CV"]);
    const key = await storage.save(pdf);

    expect(key).toMatch(/^[0-9a-f-]{36}\.pdf$/);
    expect(new Uint8Array((await storage.read(key))!)).toEqual(pdf);
    expect((await stat(path.join(root, key))).mode & 0o777).toBe(0o600);
  });

  it("returns null for a missing file and removes files", async () => {
    const key = await storage.save(buildSamplePdf(["CV"]));
    await storage.remove(key);
    expect(await storage.read(key)).toBeNull();
    expect(await readdir(root)).toEqual([]);
  });

  it("refuses keys that could escape the storage directory", async () => {
    for (const key of ["../../etc/passwd", "/etc/passwd", "..%2Fsecret.pdf", "nested/file.pdf", ""]) {
      await expect(storage.read(key)).rejects.toThrow("Invalid CV storage key");
      await expect(storage.remove(key)).rejects.toThrow("Invalid CV storage key");
    }
  });
});

describe("CV file names", () => {
  it("strips directories and unsafe characters and always ends in .pdf", () => {
    expect(sanitizeCvFilename("../../etc/passwd")).toBe("passwd.pdf");
    expect(sanitizeCvFilename("C:\\Users\\jane\\My CV.PDF")).toBe("My CV.pdf");
    expect(sanitizeCvFilename('cv"; rm -rf.pdf')).toBe("cv__ rm -rf.pdf");
    expect(sanitizeCvFilename("Résumé Ingabire.pdf")).toBe("Résumé Ingabire.pdf");
    expect(sanitizeCvFilename("...")).toBe("cv.pdf");
  });

  it("builds an attachment header that cannot be broken out of", () => {
    const header = attachmentContentDisposition("Résumé (final).pdf");
    expect(header).toBe(
      `attachment; filename="R_sum_ (final).pdf"; filename*=UTF-8''R%C3%A9sum%C3%A9%20%28final%29.pdf`,
    );
    expect(attachmentContentDisposition('a"b\r\nc.pdf')).not.toMatch(/[\r\n]|a"b/);
  });
});
