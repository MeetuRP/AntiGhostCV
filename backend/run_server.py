import uvicorn
import sys
import os

def main():
    """
    Standard launcher for the AntiGhost backend.
    """
    print("Starting AntiGhost CV Backend...")
    uvicorn.run(
        "app.main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True
    )

if __name__ == "__main__":
    main()
