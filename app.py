import streamlit as st
import PyPDF2
import google.generativeai as genai
import pandas as pd
import json
import os
from dotenv import load_dotenv

load_dotenv()
DEFAULT_API_KEY = os.getenv("GEMINI_API_KEY", "")

st.set_page_config(page_title="AI Resume Screener", page_icon="📄", layout="wide")

st.title("🚀 AI Hiring Assistant")
st.markdown("Automate candidate evaluation by comparing resumes with a given job description.")

api_key = DEFAULT_API_KEY
if not api_key:
    st.sidebar.header("🔑 Configuration")
    api_key = st.sidebar.text_input("Gemini API Key", type="password")
    if not api_key:
        st.sidebar.warning("Please enter your Gemini API Key to proceed.")

if api_key:
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.5-flash")
else:
    model = None

def extract_text(pdf_file):
    try:
        reader = PyPDF2.PdfReader(pdf_file)
        text = ""
        for page in reader.pages:
            extracted = page.extract_text()
            if extracted:
                text += extracted
        return text
    except Exception as e:
        return ""

def analyze_resume(jd, resume_text):
    prompt = f"""
    You are an AI recruiter.

    Compare the resume with the job description.

    Job Description:
    {jd}

    Resume:
    {resume_text}

    Return STRICT JSON format:
    {{
      "score": number,
      "strengths": ["point1", "point2"],
      "gaps": ["point1", "point2"],
      "recommendation": "Strong Fit / Moderate Fit / Not Fit"
    }}
    """
    try:
        response = model.generate_content(prompt)
        try:
            return response.text
        except ValueError:
            return '{"score": 0, "strengths": ["Blocked by Safety Settings or No Output"], "gaps": ["API Error"], "recommendation": "Error"}'
    except Exception as e:
        error_msg = str(e).replace('"', "'")
        return f'{{"score": 0, "strengths": ["API Error: {error_msg}"], "gaps": ["API Error"], "recommendation": "Error"}}'

def parse_response(text):
    import json
    try:
        json_start = text.find("{")
        json_end = text.rfind("}") + 1
        raw_json_str = text[json_start:json_end]
        json_data = json.loads(raw_json_str)
        
        # Lowercase all keys to avoid issues when the model capitalizes JSON keys
        return {k.lower(): v for k, v in json_data.items()}
    except Exception as e:
        error_msg = str(e).replace('"', "'")
        return {
            "score": 0,
            "strengths": [f"Parsing error: {error_msg}", f"Raw text: {text}"],
            "gaps": ["Parsing error"],
            "recommendation": "Not Fit"
        }

jd = st.text_area("📌 Paste Job Description", height=200, placeholder="e.g. We are looking for a Data Analyst with 3+ years of experience in Python, SQL...")

uploaded_files = st.file_uploader(
    "📂 Upload Resumes", type=["pdf"], accept_multiple_files=True
)

if st.button("🔍 Analyze Candidates", type="primary"):
    if not api_key:
        st.error("❌ Gemini API Key is missing. Please enter it in the sidebar.")
    elif jd and uploaded_files:
        data = []

        with st.spinner("Analyzing resumes..."):
            for file in uploaded_files:
                text = extract_text(file)
                if not text:
                    continue
                    
                raw_output = analyze_resume(jd, text)
                result = parse_response(raw_output)

                def ensure_list(item):
                    if isinstance(item, list):
                        return item
                    elif isinstance(item, str):
                        return [item]
                    return [str(item)]

                data.append({
                    "Candidate": file.name.replace(".pdf", ""),
                    "Score": result.get("score", 0),
                    "Strengths": "\n".join(f"- {s}" for s in ensure_list(result.get("strengths", []))),
                    "Gaps": "\n".join(f"- {g}" for g in ensure_list(result.get("gaps", []))),
                    "Recommendation": str(result.get("recommendation", "Not Fit"))
                })

        if data:
            df = pd.DataFrame(data)

            # Sort by score
            df = df.sort_values(by="Score", ascending=False)

            st.subheader("📊 Candidate Ranking")
            st.metric("Total Candidates Processed", len(df))
            st.dataframe(df, use_container_width=True, hide_index=True)

            # Top candidate
            top = df.iloc[0]
            st.success(f"🏆 Top Candidate: **{top['Candidate']}** (Score: {top['Score']}%)")

            # Detailed Expanders
            st.subheader("📝 Detailed Feedback")
            for index, row in df.iterrows():
                is_zero = row['Score'] == 0
                if is_zero:
                    st.error(f"⚠️ {row['Candidate']} scored 0%. This usually means Gemini encountered an error (check below).")
                
                with st.expander(f"🧑 {row['Candidate']} - Score: {row['Score']}%", expanded=is_zero):
                    st.markdown("**Strengths:**")
                    st.markdown(row["Strengths"])
                    st.markdown("**Gaps:**")
                    st.markdown(row["Gaps"])
                    st.markdown(f"**Recommendation:** {row['Recommendation']}")

            # Download CSV
            csv = df.to_csv(index=False).encode("utf-8")
            st.download_button(
                "📥 Download Results as CSV",
                csv,
                "resume_analysis.csv",
                "text/csv"
            )
        else:
            st.error("Could not extract text from the provided PDFs.")
    else:
        st.warning("Please upload resumes and enter a Job Description.")
