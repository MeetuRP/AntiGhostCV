import sys
import os

try:
    from fastapi import FastAPI
    from starlette.middleware.sessions import SessionMiddleware
    from authlib.integrations.starlette_client import OAuth
    from jose import jwt
    import pdfplumber
    import motor.motor_asyncio
    print("SUCCESS: All core dependencies imported correctly.")
except ImportError as e:
    print(f"ERROR: Missing dependency: {e}")
    sys.exit(1)
except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)
