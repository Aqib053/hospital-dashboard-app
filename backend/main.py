from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pdfplumber
from pdf2image import convert_from_bytes
import pytesseract
from io import BytesIO
from datetime import datetime
import os

# --- Optional: Gemini client ---
try:
    import google.generativeai as genai
except ImportError:
    genai = None

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


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str


# ---- PDF TEXT + SUMMARY LOGIC ------------------------------------------------
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

    markers = [
        "abnormal result(s) summary",
        "impression",
        "conclusion",
        "summary",
    ]

    for marker in markers:
        if marker in lower:
            start_idx = lower.index(marker)
            end_idx = min(len(text), start_idx + 1200)
            block = text[start_idx:end_idx]
            return block.strip()

    return text[:1200].strip()


# ---- ROOT + UPLOAD ENDPOINTS -------------------------------------------------
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


# ---- ASK-AI CHAT ENDPOINT ----------------------------------------------------
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if genai is not None and GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
else:
    if genai is None:
        print("google-generativeai not installed; /chat will use fallback replies.")
    if not GEMINI_API_KEY:
        print("GEMINI_API_KEY not set; /chat will use fallback replies.")


def _fallback_chat_reply(user_message: str) -> str:
    """Safe, rule-based answer if Gemini/DeepSeek is not available."""
    text = (user_message or "").lower()

    base = (
        "I’m a demo medical information assistant, not a doctor. "
        "I can explain general concepts but I cannot diagnose, treat, or replace a clinician.\n\n"
    )

    if any(k in text for k in ["diabetes", "sugar", "hba1c"]):
        detail = (
            "In diabetes care, clinicians usually focus on blood sugar control, lifestyle "
            "changes, regular lab monitoring (like HbA1c, fasting and post-meal sugars) and "
            "screening for complications (eyes, kidneys, nerves, heart). Exact decisions "
            "depend on the individual patient and local guidelines."
        )
    elif any(k in text for k in ["blood pressure", "bp", "hypertension"]):
        detail = (
            "For high blood pressure, typical management includes regular BP checks, salt "
            "restriction, exercise, weight control and medications when prescribed. Targets "
            "and medicines depend on age, comorbidities and overall risk profile."
        )
    else:
        detail = (
            "In general, doctors combine symptoms, examination, labs and imaging to decide "
            "diagnosis and treatment. Any online answer is only general information and "
            "must be confirmed with a qualified clinician who knows the full case."
        )

    return base + detail


@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest):
    """
    Demo medical info chatbot.

    • If GEMINI_API_KEY is set and google-generativeai is installed:
        → uses Gemini model for the reply.
    • Otherwise:
        → uses safe, rule-based fallback text.
    """
    user_message = req.message or ""

    # --- If Gemini not available, use fallback ------------------------------
    if genai is None or not GEMINI_API_KEY:
        reply = _fallback_chat_reply(user_message)
        return ChatResponse(reply=reply)

    # --- Gemini call --------------------------------------------------------
    system_prompt = (
        "You are a cautious medical information assistant for doctors and patients.\n"
        "- You ONLY provide general medical information and education.\n"
        "- You NEVER give personal diagnosis, prescriptions, or emergency advice.\n"
        "- Always remind users to consult a qualified clinician for decisions.\n"
        "- If the question is about emergencies (chest pain, stroke, suicide, etc.), "
        "tell them to seek urgent in-person care immediately.\n"
    )

    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(
            [
                system_prompt,
                f"User message: {user_message}",
            ]
        )
        answer_text = (response.text or "").strip()
        if not answer_text:
            answer_text = _fallback_chat_reply(user_message)
    except Exception as e:
        print("Gemini error:", e)
        answer_text = _fallback_chat_reply(user_message)

    return ChatResponse(reply=answer_text)
