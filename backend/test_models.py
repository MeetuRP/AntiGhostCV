import sys
import os

# Add current directory to path
sys.path.append(os.getcwd())

try:
    from app.models import UserModel, ExtractedData
    print("SUCCESS: app.models imported correctly.")
except NameError as e:
    print(f"ERROR: NameError: {e}")
    sys.exit(1)
except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)
