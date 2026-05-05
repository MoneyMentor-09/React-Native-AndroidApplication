type OcrSpaceResult = {
  ParsedText?: string;
};

// Expo exposes runtime environment variables through process.env when they
// use the EXPO_PUBLIC_ prefix. This declaration keeps TypeScript aware of the
// OCR key without pulling in Node's full process typings.
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

/**
 * Sends a local receipt image URI to OCR.Space and returns the extracted text.
 *
 * The receipt capture screen keeps this service focused on OCR only:
 * parsing vendor/date/amount happens separately in receiptParser.ts so the
 * OCR provider can be changed without rewriting parsing heuristics.
 */
export async function extractReceiptText(imageUri: string): Promise<string> {
  // OCR.Space provides a low-throughput demo key. A real app environment
  // should set EXPO_PUBLIC_OCR_SPACE_API_KEY for more reliable processing.
  const apiKey = process.env.EXPO_PUBLIC_OCR_SPACE_API_KEY || "helloworld";

  // React Native fetch supports multipart FormData with a file-like object
  // containing uri/name/type. The cast is needed because the DOM FormData
  // typings do not fully describe React Native's file shape.
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

  // HTTP errors mean the request did not complete successfully before OCR
  // processing began, such as auth, quota, or server failures.
  if (!response.ok) {
    throw new Error(`OCR API failed with status ${response.status}.`);
  }

  const data = (await response.json()) as OcrSpaceResponse;

  // OCR.Space can return a 200 response while still reporting extraction
  // errors in the JSON payload.
  if (data.IsErroredOnProcessing) {
    const details = data.ErrorMessage?.join(", ") || "Unknown OCR error.";
    throw new Error(details);
  }

  // Some responses contain multiple parsed result blocks. Join them with
  // line breaks so downstream receipt parsing sees a single text document.
  const text = data.ParsedResults?.map((result) => result.ParsedText?.trim() || "")
    .filter(Boolean)
    .join("\n");

  return text || "";
}
