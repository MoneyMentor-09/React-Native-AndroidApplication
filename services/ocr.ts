type OcrSpaceResult = {
  ParsedText?: string;
};

declare const process: {
  env: {
    EXPO_PUBLIC_OCR_SPACE_API_KEY?: string;
  };
};

type OcrSpaceResponse = {
  IsErroredOnProcessing: boolean;
  ErrorMessage?: string[];
  ParsedResults?: OcrSpaceResult[];
};

const OCR_ENDPOINT = "https://api.ocr.space/parse/image";

export async function extractReceiptText(imageUri: string): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_OCR_SPACE_API_KEY || "helloworld";

  const formData = new FormData();
  formData.append("language", "eng");
  formData.append("isOverlayRequired", "false");
  formData.append("OCREngine", "2");
  formData.append("file", {
    uri: imageUri,
    name: "receipt.jpg",
    type: "image/jpeg"
  } as any);

  const response = await fetch(OCR_ENDPOINT, {
    method: "POST",
    headers: {
      apikey: apiKey
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error(`OCR API failed with status ${response.status}.`);
  }

  const data = (await response.json()) as OcrSpaceResponse;

  if (data.IsErroredOnProcessing) {
    const details = data.ErrorMessage?.join(", ") || "Unknown OCR error.";
    throw new Error(details);
  }

  const text = data.ParsedResults?.map((result) => result.ParsedText?.trim() || "")
    .filter(Boolean)
    .join("\n");

  return text || "";
}