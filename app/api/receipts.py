from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import text
from uuid import UUID
import base64
from app.core.database import get_db
from app.models.models import Expense

router = APIRouter(prefix="/receipts", tags=["Receipts"])

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

ALLOWED_TYPES = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'application/pdf': 'pdf',
}

@router.post("/{expense_id}")
async def upload_receipt(
    expense_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    # Check expense exists
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    # Validate file type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed: {', '.join(ALLOWED_TYPES.keys())}"
        )

    # Read file
    contents = await file.read()

    # Check file size
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Max 5MB")

    # Convert to base64
    base64_data = base64.b64encode(contents).decode('utf-8')
    data_url = f"data:{file.content_type};base64,{base64_data}"

    # Update expense
    db.execute(
        text("UPDATE expenses SET receipt_data = :data, receipt_filename = :filename, receipt_url = :url WHERE id = :id"),
        {
            'data': data_url,
            'filename': file.filename,
            'url': f"/api/v1/receipts/{expense_id}/download",
            'id': expense_id
        }
    )
    db.commit()

    return {
        "message": "Receipt uploaded successfully",
        "filename": file.filename,
        "size": len(contents)
    }

@router.get("/{expense_id}/download")
def download_receipt(expense_id: UUID, db: Session = Depends(get_db)):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    if not expense.receipt_data:
        raise HTTPException(status_code=404, detail="No receipt attached")

    # Parse data URL
    try:
        header, base64_data = expense.receipt_data.split(',', 1)
        content_type = header.split(':')[1].split(';')[0]
        file_data = base64.b64decode(base64_data)
    except Exception:
        raise HTTPException(status_code=500, detail="Invalid receipt data")

    return Response(
        content=file_data,
        media_type=content_type,
        headers={
            "Content-Disposition": f"inline; filename={expense.receipt_filename or 'receipt'}"
        }
    )

@router.delete("/{expense_id}")
def delete_receipt(expense_id: UUID, db: Session = Depends(get_db)):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    db.execute(
        text("UPDATE expenses SET receipt_data = NULL, receipt_filename = NULL, receipt_url = NULL WHERE id = :id"),
        {'id': expense_id}
    )
    db.commit()

    return {"message": "Receipt deleted"}
