from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import text
from uuid import UUID, uuid4
from typing import List
import base64
from app.core.database import get_db
from app.models.models import Expense

router = APIRouter(prefix="/receipts", tags=["Receipts"])

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB per file
MAX_FILES = 10  # Max 10 receipts per expense

ALLOWED_TYPES = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'application/pdf': 'pdf',
}

@router.get("/{expense_id}")
def get_receipts(expense_id: UUID, db: Session = Depends(get_db)):
    """Get all receipts for an expense"""
    result = db.execute(
        text("SELECT id, filename, content_type, file_size, created_at FROM expense_receipts WHERE expense_id = :expense_id ORDER BY created_at"),
        {'expense_id': expense_id}
    )
    receipts = []
    for row in result:
        receipts.append({
            'id': str(row.id),
            'filename': row.filename,
            'content_type': row.content_type,
            'file_size': row.file_size,
            'created_at': row.created_at.isoformat() if row.created_at else None
        })
    return receipts

@router.post("/{expense_id}")
async def upload_receipt(
    expense_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload a single receipt"""
    # Check expense exists
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    # Check receipt count
    count_result = db.execute(
        text("SELECT COUNT(*) as cnt FROM expense_receipts WHERE expense_id = :expense_id"),
        {'expense_id': expense_id}
    )
    count = count_result.fetchone().cnt
    if count >= MAX_FILES:
        raise HTTPException(status_code=400, detail=f"Maximum {MAX_FILES} receipts per expense")

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
        raise HTTPException(status_code=400, detail="File too large. Max 5MB per file")

    # Convert to base64
    base64_data = base64.b64encode(contents).decode('utf-8')
    data_url = f"data:{file.content_type};base64,{base64_data}"

    # Insert receipt
    receipt_id = uuid4()
    db.execute(
        text("""
            INSERT INTO expense_receipts (id, expense_id, filename, content_type, file_data, file_size)
            VALUES (:id, :expense_id, :filename, :content_type, :file_data, :file_size)
        """),
        {
            'id': receipt_id,
            'expense_id': expense_id,
            'filename': file.filename,
            'content_type': file.content_type,
            'file_data': data_url,
            'file_size': len(contents)
        }
    )

    # Update expense to indicate it has receipts
    db.execute(
        text("UPDATE expenses SET receipt_filename = 'multiple', receipt_url = :url WHERE id = :id"),
        {'url': f"/api/v1/receipts/{expense_id}", 'id': expense_id}
    )

    db.commit()

    return {
        "id": str(receipt_id),
        "message": "Receipt uploaded successfully",
        "filename": file.filename,
        "size": len(contents)
    }

@router.post("/{expense_id}/multiple")
async def upload_multiple_receipts(
    expense_id: UUID,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    """Upload multiple receipts at once"""
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    # Check current count
    count_result = db.execute(
        text("SELECT COUNT(*) as cnt FROM expense_receipts WHERE expense_id = :expense_id"),
        {'expense_id': expense_id}
    )
    current_count = count_result.fetchone().cnt

    if current_count + len(files) > MAX_FILES:
        raise HTTPException(
            status_code=400,
            detail=f"Too many files. Max {MAX_FILES} receipts per expense. Current: {current_count}"
        )

    uploaded = []
    for file in files:
        if file.content_type not in ALLOWED_TYPES:
            continue

        contents = await file.read()
        if len(contents) > MAX_FILE_SIZE:
            continue

        base64_data = base64.b64encode(contents).decode('utf-8')
        data_url = f"data:{file.content_type};base64,{base64_data}"

        receipt_id = uuid4()
        db.execute(
            text("""
                INSERT INTO expense_receipts (id, expense_id, filename, content_type, file_data, file_size)
                VALUES (:id, :expense_id, :filename, :content_type, :file_data, :file_size)
            """),
            {
                'id': receipt_id,
                'expense_id': expense_id,
                'filename': file.filename,
                'content_type': file.content_type,
                'file_data': data_url,
                'file_size': len(contents)
            }
        )
        uploaded.append({'id': str(receipt_id), 'filename': file.filename})

    # Update expense
    db.execute(
        text("UPDATE expenses SET receipt_filename = 'multiple', receipt_url = :url WHERE id = :id"),
        {'url': f"/api/v1/receipts/{expense_id}", 'id': expense_id}
    )

    db.commit()

    return {"uploaded": uploaded, "count": len(uploaded)}

@router.get("/{expense_id}/{receipt_id}/download")
def download_receipt(expense_id: UUID, receipt_id: UUID, db: Session = Depends(get_db)):
    """Download a specific receipt"""
    result = db.execute(
        text("SELECT filename, content_type, file_data FROM expense_receipts WHERE id = :id AND expense_id = :expense_id"),
        {'id': receipt_id, 'expense_id': expense_id}
    )
    row = result.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Receipt not found")

    try:
        header, base64_data = row.file_data.split(',', 1)
        file_data = base64.b64decode(base64_data)
    except Exception:
        raise HTTPException(status_code=500, detail="Invalid receipt data")

    return Response(
        content=file_data,
        media_type=row.content_type,
        headers={"Content-Disposition": f"inline; filename={row.filename}"}
    )

@router.delete("/{expense_id}/{receipt_id}")
def delete_receipt(expense_id: UUID, receipt_id: UUID, db: Session = Depends(get_db)):
    """Delete a specific receipt"""
    result = db.execute(
        text("DELETE FROM expense_receipts WHERE id = :id AND expense_id = :expense_id RETURNING id"),
        {'id': receipt_id, 'expense_id': expense_id}
    )

    if not result.fetchone():
        raise HTTPException(status_code=404, detail="Receipt not found")

    # Check if any receipts remain
    count_result = db.execute(
        text("SELECT COUNT(*) as cnt FROM expense_receipts WHERE expense_id = :expense_id"),
        {'expense_id': expense_id}
    )
    count = count_result.fetchone().cnt

    if count == 0:
        db.execute(
            text("UPDATE expenses SET receipt_filename = NULL, receipt_url = NULL WHERE id = :id"),
            {'id': expense_id}
        )

    db.commit()

    return {"message": "Receipt deleted"}

@router.delete("/{expense_id}")
def delete_all_receipts(expense_id: UUID, db: Session = Depends(get_db)):
    """Delete all receipts for an expense"""
    db.execute(
        text("DELETE FROM expense_receipts WHERE expense_id = :expense_id"),
        {'expense_id': expense_id}
    )
    db.execute(
        text("UPDATE expenses SET receipt_filename = NULL, receipt_url = NULL WHERE id = :id"),
        {'id': expense_id}
    )
    db.commit()

    return {"message": "All receipts deleted"}
