# 🚀 AI Resume Screening System

## 📌 Overview

This project is an AI-powered candidate evaluation system designed to automate resume screening and shortlisting. It analyzes multiple resumes against a given job description using a large language model and generates structured insights including match scores, strengths, gaps, and hiring recommendations.

The system is built to simulate real-world hiring workflows with a focus on simplicity, usability, and scalability.

## 📸 Demo Screenshot

![App Screenshot](screenshot.png)

## ⚙️ How It Works

1. User uploads multiple resumes (PDF)
2. Inputs a job description
3. System extracts text from resumes
4. AI model analyzes each resume against the job description
5. Generates:
   - Match score
   - Strengths
   - Gaps
   - Recommendation
6. Results are ranked and displayed in a table
7. CSV report can be downloaded

## 📁 Project Structure

```text
.
├── app.py
├── requirements.txt
├── README.md
└── screenshot.png
```

## ⚙️ Features

- Upload multiple resumes (PDF)
- AI-based candidate evaluation
- Match score (0–100)
- Strengths & gaps analysis
- Final recommendation
- Candidate ranking
- CSV export

## 🧠 Tech Stack

- Python
- Streamlit
- Gemini API
- PyPDF2
- Pandas

## ▶️ How to Run

1. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

2. Open the app and provide your Gemini API key strictly within the hidden `.env` file configuration.

3. Run the Streamlit app:
   ```bash
   streamlit run app.py
   ```

## � Note

Add your Gemini API key in the `.env` file code before running the application. Do not share your API key publicly.

## 🎯 Future Improvements

- Multi-job comparison
- ATS integration
- Resume parsing enhancements
