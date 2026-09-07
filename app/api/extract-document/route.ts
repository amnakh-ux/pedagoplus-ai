import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";
import { Buffer } from "node:buffer";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_PDF_PAGES = 100;

function extensionOf(filename: string) {
  return filename.toLowerCase().split(".").pop() ?? "";
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const entry = formData.get("file");

    if (!(entry instanceof File)) {
      return Response.json(
        { error: "Aucun fichier n’a été envoyé." },
        { status: 400 }
      );
    }

    if (entry.size === 0) {
      return Response.json({ error: "Le fichier est vide." }, { status: 400 });
    }

    if (entry.size > MAX_FILE_SIZE) {
      return Response.json(
        { error: "Le fichier dépasse la taille maximale de 10 Mo." },
        { status: 413 }
      );
    }

    const extension = extensionOf(entry.name);
    const arrayBuffer = await entry.arrayBuffer();
    let text = "";

    if (extension === "docx") {
      const result = await mammoth.extractRawText({
        buffer: Buffer.from(arrayBuffer),
      });
      text = result.value;
    } else if (extension === "pdf") {
      const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer), {
        maxImageSize: 16_777_216,
      });
      if (pdf.numPages > MAX_PDF_PAGES) {
        return Response.json(
          { error: `Le PDF dépasse la limite de ${MAX_PDF_PAGES} pages.` },
          { status: 413 }
        );
      }

      const result = await extractText(pdf, { mergePages: true });
      text = result.text;

      if (!text.trim()) {
        return Response.json(
          {
            requiresOcr: true,
            pageCount: pdf.numPages,
            error: "PDF numérisé détecté. Lecture OCR dans votre navigateur…",
          },
          { status: 422 },
        );
      }
    } else {
      return Response.json(
        { error: "Format non pris en charge. Utilisez un fichier PDF ou DOCX." },
        { status: 415 }
      );
    }

    const cleanedText = text.replace(/\r\n/g, "\n").trim();

    if (!cleanedText) {
      return Response.json(
        {
          error:
            "Aucun texte n’a été détecté. Le document est peut-être une image numérisée.",
        },
        { status: 422 }
      );
    }

    return Response.json({
      text: cleanedText,
    });
  } catch (error) {
    console.error("Échec de l’extraction du document", error);
    return Response.json(
      { error: "Impossible de lire ce document. Vérifiez qu’il n’est pas endommagé." },
      { status: 500 }
    );
  }
}
