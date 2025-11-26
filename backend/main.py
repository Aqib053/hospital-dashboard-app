from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pdfplumber
from pdf2image import convert_from_bytes
import pytesseract
from io import BytesIO
from datetime import datetime

app = FastAPI()

# Allow your React frontend (local + Vercel) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "https://hospital-dashboard-app.vercel.app",  # your live frontend
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HealthSummary(BaseModel):
    hospital_name: str
    filename: str
    extracted_text: str
    summary: str
    used_ocr: bool = False
    created_at: str


def extract_text_from_pdf(file_bytes: bytes):
    """
    1) Try to read as normal text PDF using pdfplumber.
    2) If that fails or text is empty, fall back to OCR on images.
    """
    text = ""

    # ----- Try normal text extraction -----
    try:
        with pdfplumber.open(BytesIO(file_bytes)) as pdf:
            parts = []
            for page in pdf.pages:
                page_text = page.extract_text() or ""
                parts.append(page_text)
            text = "\n".join(parts).strip()
    except Exception as e:
        print("pdfplumber error:", e)

    if text:
        return text, False  # used_ocr = False

    # ----- Fallback: OCR (for scanned PDFs) -----
    try:
        print("Falling back to OCR...")
        images = convert_from_bytes(file_bytes)
        ocr_parts = []
        for img in images:
            ocr_text = pytesseract.image_to_string(img)
            ocr_parts.append(ocr_text)
        ocr_text_full = "\n".join(ocr_parts).strip()
        return ocr_text_full, True
    except Exception as e:
        print("OCR error:", e)
        raise HTTPException(
            status_code=500, detail="Failed to extract text from PDF."
        )


def build_simple_summary(text: str) -> str:
    """
    Rule-based summary (no external AI):
    - Try to pick 'Abnormal Result(s) Summary', 'Impression', 'Conclusion', or 'Summary'
    - Otherwise, return the first ~1200 characters.
    """
    if not text:
        return "No text could be extracted from this report."

    lower = text.lower()

    # ordered list of markers to search for
    markers = [
        "abnormal result(s) summary",
        "impression",
        "conclusion",
        "summary",
    ]

    for marker in markers:
        if marker in lower:
            start_idx = lower.index(marker)
            # take ~1200 chars from there
            end_idx = min(len(text), start_idx + 1200)
            block = text[start_idx:end_idx]
            return block.strip()

    # fallback: first ~1200 characters
    return text[:1200].strip()


@app.get("/")
def root():
    return {"message": "Hospital summarizer backend OK"}


@app.post("/upload", response_model=HealthSummary)
async def upload_pdf(
    pdf: UploadFile = File(...),
    hospital_name: str = Form(...),
):
    if not pdf.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400, detail="Only PDF files are supported right now."
        )

    file_bytes = await pdf.read()

    # 1) Extract text (text or OCR)
    extracted_text, used_ocr = extract_text_from_pdf(file_bytes)

    # 2) Build summary
    summary = build_simple_summary(extracted_text)

    # 3) Build response object
    result = HealthSummary(
        hospital_name=hospital_name,
        filename=pdf.filename,
        extracted_text=extracted_text,
        summary=summary,
        used_ocr=used_ocr,
        created_at=datetime.utcnow().isoformat(),
    )

    return result
