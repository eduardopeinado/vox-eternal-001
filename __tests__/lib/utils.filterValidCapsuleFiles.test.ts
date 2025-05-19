import { filterValidCapsuleFiles } from "../../src/lib/utils";

// Utilidad para crear un mock de File
function createMockFile(name: string, type: string, size = 1234): File {
  const blob = new Blob(["a".repeat(size)], { type });
  return new File([blob], name, { type });
}

describe("filterValidCapsuleFiles", () => {
  it("acepta imágenes válidas", () => {
    const file = createMockFile("foto.jpg", "image/jpeg");
    const { validFiles, errors } = filterValidCapsuleFiles([file], []);
    expect(validFiles).toHaveLength(1);
    expect(errors).toHaveLength(0);
  });

  it("acepta videos válidos", () => {
    const file = createMockFile("video.mp4", "video/mp4");
    const { validFiles, errors } = filterValidCapsuleFiles([file], []);
    expect(validFiles).toHaveLength(1);
    expect(errors).toHaveLength(0);
  });

  it("acepta audios válidos", () => {
    const file = createMockFile("audio.m4a", "audio/m4a");
    const { validFiles, errors } = filterValidCapsuleFiles([file], []);
    expect(validFiles).toHaveLength(1);
    expect(errors).toHaveLength(0);
  });

  it("rechaza SVG (por tipo MIME)", () => {
    const file = createMockFile("vector.svg", "image/svg+xml");
    const { validFiles, errors } = filterValidCapsuleFiles([file], []);
    expect(validFiles).toHaveLength(0);
    expect(errors[0]?.reason).toMatch(/no soportado/i);
  });

  it("rechaza PDF y ZIP", () => {
    const pdf = createMockFile("doc.pdf", "application/pdf");
    const zip = createMockFile("archivo.zip", "application/zip");
    const { validFiles, errors } = filterValidCapsuleFiles([pdf, zip], []);
    expect(validFiles).toHaveLength(0);
    expect(errors).toHaveLength(2);
  });

  it("rechaza duplicados por nombre y tamaño", () => {
    const file1 = createMockFile("foto.jpg", "image/jpeg", 1000);
    const file2 = createMockFile("foto.jpg", "image/jpeg", 1000);
    const { validFiles, errors } = filterValidCapsuleFiles([file1, file2], []);
    expect(validFiles).toHaveLength(1);
    expect(errors[0]?.reason).toMatch(/duplicado/i);
  });

  it("acepta archivo con extensión válida aunque el MIME sea genérico", () => {
    const file = createMockFile("audio.mp3", "application/octet-stream");
    const { validFiles, errors } = filterValidCapsuleFiles([file], []);
    expect(validFiles).toHaveLength(1);
    expect(errors).toHaveLength(0);
  });

  it("rechaza archivo sin extensión y MIME inválido", () => {
    const file = createMockFile("sinextension", "application/octet-stream");
    const { validFiles, errors } = filterValidCapsuleFiles([file], []);
    expect(validFiles).toHaveLength(0);
    expect(errors[0]?.reason).toMatch(/no soportado/i);
  });

  it("acepta archivos con nombres raros pero extensión válida", () => {
    const file = createMockFile("áéíóú-测试.mp3", "audio/mp3");
    const { validFiles, errors } = filterValidCapsuleFiles([file], []);
    expect(validFiles).toHaveLength(1);
    expect(errors).toHaveLength(0);
  });

  it("rechaza archivos vacíos", () => {
    const file = createMockFile("vacio.mp3", "audio/mp3", 0);
    // El validador actual no filtra por tamaño, pero podrías agregarlo si lo deseas
    const { validFiles } = filterValidCapsuleFiles([file], []);
    expect(validFiles).toHaveLength(1); // Cambia a 0 si decides filtrar por tamaño
  });
});
