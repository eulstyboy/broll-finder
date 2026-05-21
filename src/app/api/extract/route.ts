import { NextResponse } from "next/server";
import mammoth from "mammoth";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: "Pas de fichier" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let text = "";

    if (file.name.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (file.name.endsWith(".pdf")) {
      
      // Utilisation de pdf2json (100% JavaScript, aucun crash serveur)
      text = await new Promise((resolve, reject) => {
        const PDFParser = require("pdf2json");
        // Le paramètre "1" force le mode "Texte Brut" (sans chercher à lire les images)
        const pdfParser = new PDFParser(null, 1); 

        pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));
        
        pdfParser.on("pdfParser_dataReady", () => {
          // On récupère le texte et on nettoie les sauts de ligne étranges
          let rawText = pdfParser.getRawTextContent();
          rawText = rawText.replace(/\r\n/g, " ");
          resolve(rawText);
        });

        pdfParser.parseBuffer(buffer);
      });

    } else {
      // Pour le .txt
      text = buffer.toString("utf-8");
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error("Erreur d'extraction:", error);
    return NextResponse.json({ error: "Erreur lors de l'extraction du fichier" }, { status: 500 });
  }
}