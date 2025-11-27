from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pdfplumber
from pdf2image import convert_from_bytes
import pytesseract
from io import BytesIO
from datetime import datetime
import os

# Gemini client (optional)
try:
    import google.generativeai as genai
except ImportError:
    genai = None

app = FastAPI()

# CORS: local dev + any *.vercel.app
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
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


def extract_text_from_pdf(file_bytes: bytes):
    text = ""
    try:
        with pdfplumber.open(BytesIO(file_bytes)) as pdf:
            pages = []
            for page in pdf.pages:
                t = page.extract_text() or ""
                pages.append(t)
            text = "\n".join(pages).strip()
    except Exception as e:
        print("pdfplumber error:", e)

    if text:
        return text, False

    try:
        print("Falling back to OCR...")
        images = convert_from_bytes(file_bytes)
        ocr_parts = []
        for img in images:
            ocr_text = pytesseract.image_to_string(img)
            ocr_parts.append(ocr_text)
        full = "\n".join(ocr_parts).strip()
        return full, True
    except Exception as e:
        print("OCR error:", e)
        raise HTTPException(status_code=500, detail="Failed to extract text from PDF.")


def build_simple_summary(text: str) -> str:
    if not text:
        return "No text could be extracted from this report."

    lower = text.lower()
    markers = [
        "abnormal result(s) summary",
        "abnormal results summary",
        "impression",
        "conclusion",
        "summary of report",
    ]

    for marker in markers:
        if marker in lower:
            start = lower.index(marker)
            end = min(len(text), start + 1200)
            return text[start:end].strip()

    return text[:1200].strip()


@app.get("/")
def root():
    using_gemini = bool(genai is not None and os.getenv("GEMINI_API_KEY"))
    return {"message": "Hospital summarizer backend OK", "using_gemini": using_gemini}


@app.post("/upload", response_model=HealthSummary)
async def upload_pdf(
    pdf: UploadFile = File(...),
    hospital_name: str = Form(...),
):
    if not pdf.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported right now.")

    file_bytes = await pdf.read()
    extracted_text, used_ocr = extract_text_from_pdf(file_bytes)
    summary = build_simple_summary(extracted_text)

    return HealthSummary(
        hospital_name=hospital_name,
        filename=pdf.filename,
        extracted_text=extracted_text,
        summary=summary,
        used_ocr=used_ocr,
        created_at=datetime.utcnow().isoformat(),
    )


# ----------------- AI CHAT -----------------
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if genai is not None and GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
else:
    if genai is None:
        print("google-generativeai not installed; /chat will use fallback.")
    if not GEMINI_API_KEY:
        print("GEMINI_API_KEY not set; /chat will use fallback.")


def fallback_reply(user_message: str) -> str:
    msg = (user_message or "").strip()
    lower = msg.lower()

    header = f'You asked: "{msg}"\n\n' if msg else ""
    disclaimer = (
        "I’m a demo medical information assistant, not a doctor.\n"
        "I can give general information only. For diagnosis or treatment, "
        "please consult a qualified clinician.\n\n"
    )

    if any(k in lower for k in ["hba1c", "hb a1c", "diabetes", "sugar", "glucose"]):
        body = (
            "• **HbA1c** shows average blood glucose over ~3 months.\n"
            "• Typical ranges (can vary by lab):\n"
            "  - < 5.7%: usually non-diabetic\n"
            "  - 5.7–6.4%: pre-diabetes range\n"
            "  - ≥ 6.5%: diabetes range\n"
            "• Targets depend on age, comorbidities and local protocols."
        )
    elif any(k in lower for k in ["hemoglobin", "haemoglobin", "hb "]):
        body = (
            "• **Haemoglobin (Hb)** is the oxygen-carrying protein in red blood cells.\n"
            "• Low Hb = anaemia (common causes: iron/B12/folate deficiency, blood loss, chronic disease).\n"
            "• Interpretation needs RBC indices (MCV, MCHC) + clinical context."
        )
    elif any(k in lower for k in ["blood", "cbc", "blood test"]):
        body = (
            "Blood carries oxygen, nutrients, hormones and waste products.\n"
            "Common blood tests:\n"
            "• CBC – counts cells (Hb, WBC, platelets).\n"
            "• LFT – liver enzymes and proteins.\n"
            "• RFT – kidney function (urea, creatinine, electrolytes).\n"
            "Exact meaning always depends on symptoms and exam."
        )
    else:
        body = (
            "Doctors usually combine:\n"
            "• History and physical examination\n"
            "• Lab reports and imaging\n"
            "before deciding diagnosis or treatment. Online tools are only for "
            "education and must not replace a doctor visit."
        )

    return header + disclaimer + body


def extract_gemini_text(response) -> str:
    """
    Safely extract text from Gemini response for different SDK versions.
    """
    if not response:
        return ""

    # Newer SDKs often expose .text
    text = getattr(response, "text", None)
    if isinstance(text, str) and text.strip():
        return text.strip()

    # Fallback: dig into candidates / parts
    candidates = getattr(response, "candidates", None) or []
    parts_text = []
    for cand in candidates:
        content = getattr(cand, "content", None)
        if not content:
            continue
        parts = getattr(content, "parts", []) or []
        for part in parts:
            part_text = getattr(part, "text", None)
            if isinstance(part_text, str) and part_text.strip():
                parts_text.append(part_text.strip())

    return "\n".join(parts_text).strip()


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    user_message = req.message or ""

    # If Gemini isn’t configured, always fallback
    if genai is None or not GEMINI_API_KEY:
        return ChatResponse(reply=fallback_reply(user_message))

    system_prompt = (
        "You are a cautious medical information assistant for doctors and patients.\n"
        "- Provide general, educational information only; no personal diagnosis or prescriptions.\n"
        "- Prefer bullet points and short paragraphs.\n"
        "- If user asks about lab values (HbA1c, glucose, creatinine, etc.), explain typical ranges and interpretation.\n"
        "- Always remind them to confirm with a clinician.\n"
    )

    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(
            [system_prompt, f"User question: {user_message}"]
        )
        text = extract_gemini_text(response)
        if not text:
            print("Gemini returned empty text; using fallback.")
            text = fallback_reply(user_message)
    except Exception as e:
        print("Gemini error:", e)
        text = fallback_reply(user_message)

    return ChatResponse(reply=text)
