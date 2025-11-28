import os
import google.generativeai as genai
from django.conf import settings

class GeminiChatService:
    def __init__(self):
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
        
        genai.configure(api_key=api_key)
        
        # Use the models that are actually available from your list
        # From your debug output, you have gemini-2.0-flash and gemini-2.0-flash-lite
        try:
            self.model = genai.GenerativeModel('gemini-2.0-flash')
            print("✅ Using gemini-2.0-flash")
        except Exception as e:
            print(f"❌ gemini-2.0-flash failed: {e}")
            try:
                # Fallback to gemini-2.0-flash-lite
                self.model = genai.GenerativeModel('gemini-2.0-flash-lite')
                print("✅ Using gemini-2.0-flash-lite")
            except Exception as e:
                print(f"❌ gemini-2.0-flash-lite failed: {e}")
                try:
                    # Try the latest flash model
                    self.model = genai.GenerativeModel('gemini-flash-latest')
                    print("✅ Using gemini-flash-latest")
                except Exception as e:
                    print(f"❌ gemini-flash-latest failed: {e}")
                    try:
                        # Try the latest pro model
                        self.model = genai.GenerativeModel('gemini-pro-latest')
                        print("✅ Using gemini-pro-latest")
                    except Exception as e:
                        print(f"❌ All models failed: {e}")
                        raise Exception("No working Gemini models found")
    
    def get_response(self, session, user_message):
        try:
            print(f"🤖 Sending message to Gemini: {user_message}")
            
            # Generate response
            response = self.model.generate_content(user_message)
            
            if response.text:
                print(f"✅ Received response: {response.text[:100]}...")
                return response.text
            else:
                return "I received your message but didn't get a text response."
            
        except Exception as e:
            print(f"❌ Gemini API error: {e}")
            return f"I apologize, but I encountered an error: {str(e)}. Please try again."