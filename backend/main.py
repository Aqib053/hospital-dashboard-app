from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pdfplumber
from pdf2image import convert_from_bytes
import pytesseract
from io import BytesIO
from datetime import datetime
import os
import re
from typing import Dict, Optional

# ----------------- GEMINI CLIENT (OPTIONAL) -----------------
try:
    import google.generativeai as genai
except ImportError:
    genai = None

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if genai is not None and GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
    except Exception as e:
        print("Error configuring Gemini:", e)
        genai = None
else:
    if genai is None:
        print("google-generativeai not installed; /chat and AI summary will use fallback.")
    if not GEMINI_API_KEY:
        print("GEMINI_API_KEY not set; /chat and AI summary will use fallback.")


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


# ----------------- MODELS -----------------
class HealthSummary(BaseModel):
    hospital_name: str
    filename: str
    extracted_text: str
    summary: str
    used_ocr: bool = False
    created_at: str
    # extra: structured lab values (optional, frontend can ignore if not needed)
    labs: Optional[Dict[str, float]] = None


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str


# ----------------- PDF → TEXT -----------------
def extract_text_from_pdf(file_bytes: bytes):
    """
    1) Try normal text extraction with pdfplumber
    2) If nothing, fall back to OCR using pdf2image + pytesseract
    """
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
        return text, False  # used_ocr = False

    # Fallback to OCR
    try:
        print("Falling back to OCR...")
        images = convert_from_bytes(file_bytes)
        ocr_parts = []
        for img in images:
            ocr_text = pytesseract.image_to_string(img)
            ocr_parts.append(ocr_text)
        full = "\n".join(ocr_parts).strip()
        return full, True  # used_ocr = True
    except Exception as e:
        print("OCR error:", e)
        raise HTTPException(status_code=500, detail="Failed to extract text from PDF.")


# ----------------- LAB VALUE EXTRACTION -----------------
def _search(pattern: str, text: str) -> Optional[float]:
    m = re.search(pattern, text, re.IGNORECASE)
    if not m:
        return None
    try:
        return float(m.group(1))
    except Exception:
        return None


def extract_structured_labs(text: str) -> Dict[str, float]:
    """
    Extract a bunch of common lab values from the report text.
    Names are simple keys for now; can be mapped to prettier labels in frontend later.
    """
    labs: Dict[str, float] = {}

    # Normalize text a bit for matching
    t = text.replace("\u00a0", " ")

    # --- Diabetes / Glucose ---
    # HbA1c
    val = _search(r"HbA1c[^0-9]*([\d.]+)", t) or _search(r"HbA1C[^0-9]*([\d.]+)", t)
    if val is not None:
        labs["hba1c"] = val

    # Fasting Plasma Glucose / FBG / FPG
    val = _search(r"(Fasting\s*(Plasma)?\s*Glucose|FPG|FBG)[^0-9]*([\d.]+)", t)
    if val is None:
        val = _search(r"Plasma\s*Glucose\s*-\s*F[^0-9]*([\d.]+)", t)
    if val is not None:
        labs["fasting_glucose"] = val

    # Post-prandial / PPG
    val = _search(r"(Post\s*Prandial\s*Glucose|PPG|PP\s*Glucose)[^0-9]*([\d.]+)", t)
    if val is None:
        val = _search(r"Plasma\s*Glucose\s*-\s*PP[^0-9]*([\d.]+)", t)
    if val is not None:
        labs["pp_glucose"] = val

    # --- CBC ---
    val = _search(r"(Haemoglobin|Hemoglobin|Hb)[^0-9]*([\d.]+)", t)
    if val is not None:
        labs["hemoglobin"] = val

    val = _search(r"(Total\s*Leucocyte\s*Count|TLC|WBC\s*Count|WBC)[^0-9]*([\d.]+)", t)
    if val is not None:
        labs["wbc"] = val

    val = _search(r"(Platelet\s*Count|Platelets|PLT)[^0-9]*([\d.]+)", t)
    if val is not None:
        labs["platelets"] = val

    # --- Renal / RFT ---
    val = _search(r"(Blood\s*Urea|Urea)[^0-9]*([\d.]+)", t)
    if val is not None:
        labs["urea"] = val

    val = _search(r"Creatinine[^0-9]*([\d.]+)", t)
    if val is not None:
        labs["creatinine"] = val

    val = _search(r"Sodium[^0-9]*([\d.]+)", t) or _search(r"Na\+?[^0-9]*([\d.]+)", t)
    if val is not None:
        labs["sodium"] = val

    val = _search(r"Potassium[^0-9]*([\d.]+)", t) or _search(r"K\+?[^0-9]*([\d.]+)", t)
    if val is not None:
        labs["potassium"] = val

    val = _search(r"Chloride[^0-9]*([\d.]+)", t) or _search(r"Cl-?[^0-9]*([\d.]+)", t)
    if val is not None:
        labs["chloride"] = val

    # --- Liver / LFT ---
    val = _search(r"(Total\s*Bilirubin|Bilirubin\s*-\s*Total)[^0-9]*([\d.]+)", t)
    if val is not None:
        labs["bilirubin_total"] = val

    val = _search(r"(Direct\s*Bilirubin|Bilirubin\s*-\s*Direct)[^0-9]*([\d.]+)", t)
    if val is not None:
        labs["bilirubin_direct"] = val

    val = _search(r"(SGOT|AST)[^0-9]*([\d.]+)", t)
    if val is not None:
        labs["ast_sgot"] = val

    val = _search(r"(SGPT|ALT)[^0-9]*([\d.]+)", t)
    if val is not None:
        labs["alt_sgpt"] = val

    val = _search(r"(Alkaline\s*Phosphatase|ALP)[^0-9]*([\d.]+)", t)
    if val is not None:
        labs["alp"] = val

    val = _search(r"Albumin[^0-9]*([\d.]+)", t)
    if val is not None:
        labs["albumin"] = val

    # --- Lipid Profile ---
    val = _search(r"(Total\s*Cholesterol|Cholesterol\s*-\s*Total)[^0-9]*([\d.]+)", t)
    if val is not None:
        labs["chol_total"] = val

    val = _search(r"Triglycerides?[^0-9]*([\d.]+)", t)
    if val is not None:
        labs["triglycerides"] = val

    val = _search(r"(HDL\s*Cholesterol|HDL-C|HDL)[^0-9]*([\d.]+)", t)
    if val is not None:
        labs["hdl"] = val

    val = _search(r"(LDL\s*Cholesterol|LDL-C|LDL)[^0-9]*([\d.]+)", t)
    if val is not None:
        labs["ldl"] = val

    val = _search(r"(VLDL\s*Cholesterol|VLDL-C|VLDL)[^0-9]*([\d.]+)", t)
    if val is not None:
        labs["vldl"] = val

    return labs


# ----------------- GEMINI HELPERS -----------------
def extract_gemini_text(response) -> str:
    """
    Safely extract text from Gemini response for different SDK versions.
    Used by both the upload summary and chat endpoint.
    """
    if not response:
        return ""

    text = getattr(response, "text", None)
    if isinstance(text, str) and text.strip():
        return text.strip()

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


def rule_based_summary(text: str) -> str:
    """
    Old simple summary logic, kept as fallback if Gemini is unavailable.
    """
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


def build_ai_summary(text: str, labs: Dict[str, float]) -> str:
    """
    Use Gemini (if available) to generate a structured medical-style summary.
    If Gemini is not available or errors, fall back to rule-based summary.
    """
    if not text:
        return "No text could be extracted from this report."

    base_summary = rule_based_summary(text)

    if genai is None or not GEMINI_API_KEY:
        return base_summary

    # Construct a prompt that uses both raw text + structured labs
    labs_str = "\n".join(f"- {k}: {v}" for k, v in labs.items()) if labs else "No numeric values parsed."

    system_prompt = (
        "You are a clinical documentation assistant for hospital lab reports.\n"
        "Generate a concise but medically useful summary using ONLY the data "
        "from the report text and the parsed lab values provided. Do not invent values.\n\n"
        "Write the summary in this structure:\n"
        "1. Summary of key findings\n"
        "2. Abnormal results and brief interpretation\n"
        "3. Possible clinical concerns (general, not personalised diagnosis)\n"
        "4. Suggested follow-up tests / review (general advice)\n"
        "5. Simple explanation for the patient in one short paragraph.\n\n"
        "Always mention that this is not a diagnosis and must be confirmed by a clinician."
    )

    user_content = (
        f"Raw lab report text:\n{text}\n\n"
        f"Parsed numeric lab values:\n{labs_str}\n"
    )

    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content([system_prompt, user_content])
        ai_text = extract_gemini_text(response)
        if ai_text:
            return ai_text.strip()
        else:
            print("Gemini returned empty summary; using rule-based summary.")
            return base_summary
    except Exception as e:
        print("Gemini error while summarizing:", e)
        return base_summary


# ----------------- ROOT -----------------
@app.get("/")
def root():
    using_gemini = bool(genai is not None and GEMINI_API_KEY)
    return {"message": "Hospital summarizer backend OK", "using_gemini": using_gemini}


# ----------------- UPLOAD ENDPOINT -----------------
@app.post("/upload", response_model=HealthSummary)
async def upload_pdf(
    pdf: UploadFile = File(...),
    hospital_name: str = Form(...),
):
    if not pdf.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported right now.")

    file_bytes = await pdf.read()
    extracted_text, used_ocr = extract_text_from_pdf(file_bytes)

    # New: extract structured labs for MedFlow-style reasoning
    labs = extract_structured_labs(extracted_text)

    # New: Gemini-based summary (with fallback)
    summary = build_ai_summary(extracted_text, labs)

    return HealthSummary(
        hospital_name=hospital_name,
        filename=pdf.filename,
        extracted_text=extracted_text,
        summary=summary,
        used_ocr=used_ocr,
        created_at=datetime.utcnow().isoformat(),
        labs=labs or None,
    )


# ----------------- CHAT FALLBACK REPLY -----------------
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


# ----------------- CHAT ENDPOINT -----------------
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
