@echo off
echo ========================================
echo  KB Document Uploader
echo ========================================
echo.
echo This will upload all existing documents to the department Pinecone index
echo.
pause

echo.
echo Starting upload process...
echo.

python upload_existing_docs.py

echo.
echo ========================================
echo  Upload Complete!
echo ========================================
echo.
pause
