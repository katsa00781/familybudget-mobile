// Receipt OCR típusdefiníciók
export interface ReceiptData {
  merchant: string;
  date: string;
  total: number;
  items: ReceiptItem[];
  category?: string;
  rawText?: string;
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category?: string;
}

export interface GoogleVisionResponse {
  responses: Array<{
    fullTextAnnotation?: {
      text: string;
      pages: Array<{
        property: any;
        width: number;
        height: number;
        blocks: any[];
      }>;
    };
    textAnnotations?: Array<{
      description: string;
      boundingPoly: {
        vertices: Array<{
          x: number;
          y: number;
        }>;
      };
    }>;
    error?: {
      code: number;
      message: string;
      status: string;
    };
  }>;
}

export interface OCRError extends Error {
  code?: string;
  status?: number;
}
