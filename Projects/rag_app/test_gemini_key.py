import os
from dotenv import load_dotenv
import google.generativeai as genai

def test_gemini_key():
    load_dotenv()

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("❌ GEMINI_API_KEY not found in environment")
        return

    try:
        genai.configure(api_key=api_key)

        model = genai.GenerativeModel("gemini-flash-latest")
        response = model.generate_content("Say 'API key is working'")

        if response and response.text:
            print("✅ API key is working")
            print("Model response:", response.text.strip())
        else:
            print("⚠️ API key responded, but no text returned")

    except Exception as e:
        print("❌ API key test failed")
        print(type(e).__name__, ":", e)


if __name__ == "__main__":
    test_gemini_key()
