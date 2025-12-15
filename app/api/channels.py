from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.core.database import get_db
from app.models.models import Channel
from app.schemas.schemas import ChannelCreate, ChannelUpdate, ChannelResponse

router = APIRouter(prefix="/channels", tags=["Channels"])

@router.get("", response_model=List[ChannelResponse])
def get_channels(
    is_active: bool = True,
    db: Session = Depends(get_db)
):
    query = db.query(Channel)
    if is_active is not None:
        query = query.filter(Channel.is_active == is_active)
    channels = query.order_by(Channel.name).all()
    return channels

@router.post("", response_model=ChannelResponse, status_code=status.HTTP_201_CREATED)
def create_channel(channel_data: ChannelCreate, db: Session = Depends(get_db)):
    # Check if code exists
    existing = db.query(Channel).filter(Channel.code == channel_data.code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Channel code already exists"
        )

    channel = Channel(**channel_data.model_dump())
    db.add(channel)
    db.commit()
    db.refresh(channel)
    return channel

@router.get("/{channel_id}", response_model=ChannelResponse)
def get_channel(channel_id: UUID, db: Session = Depends(get_db)):
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not channel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found"
        )
    return channel

@router.put("/{channel_id}", response_model=ChannelResponse)
def update_channel(
    channel_id: UUID,
    channel_data: ChannelUpdate,
    db: Session = Depends(get_db)
):
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not channel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found"
        )

    update_data = channel_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(channel, field, value)

    db.commit()
    db.refresh(channel)
    return channel
