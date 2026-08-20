import uuid
from datetime import datetime, date

from sqlalchemy import String, Integer, DateTime, ForeignKey, Text, Numeric, Date, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.session import Base
from app.models.core import uuid_pk


class BuyerRequirement(Base):
    __tablename__ = "buyer_requirements"
    id: Mapped[uuid.UUID] = uuid_pk()
    buyer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("buyer_profiles.id"), nullable=False)
    product_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=True)
    product_name: Mapped[str] = mapped_column(String(150), nullable=False)
    quantity: Mapped[float] = mapped_column(Numeric(14, 3), nullable=False)
    unit: Mapped[str] = mapped_column(String(30), nullable=False)
    target_price: Mapped[float | None] = mapped_column(Numeric(14, 2))
    delivery_location: Mapped[str | None] = mapped_column(Text)
    delivery_from: Mapped[date | None] = mapped_column(Date)
    delivery_to: Mapped[date | None] = mapped_column(Date)
    quality_requirement: Mapped[dict | None] = mapped_column(JSONB)
    notes: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(30), default="OPEN")  # OPEN, QUOTES_RECEIVED, NEGOTIATING, CLOSED
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    buyer = relationship("BuyerProfile")
    quotes = relationship("Quote", back_populates="requirement")


class Quote(Base):
    __tablename__ = "quotes"
    id: Mapped[uuid.UUID] = uuid_pk()
    requirement_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("buyer_requirements.id"), nullable=False)
    seller_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("seller_profiles.id"), nullable=False)
    quantity: Mapped[float] = mapped_column(Numeric(14, 3), nullable=False)
    unit_price: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    delivery_terms: Mapped[str | None] = mapped_column(Text)
    payment_terms: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(30), default="SUBMITTED")
    # SUBMITTED, COUNTERED, ACCEPTED, REJECTED, WITHDRAWN
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    requirement = relationship("BuyerRequirement", back_populates="quotes")
    seller = relationship("SellerProfile")
    versions = relationship("QuoteVersion", back_populates="quote", order_by="QuoteVersion.version_no")


class QuoteVersion(Base):
    __tablename__ = "quote_versions"
    __table_args__ = (UniqueConstraint("quote_id", "version_no"),)
    id: Mapped[uuid.UUID] = uuid_pk()
    quote_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("quotes.id"), nullable=False)
    version_no: Mapped[int] = mapped_column(Integer, nullable=False)
    terms_json: Mapped[dict] = mapped_column(JSONB, nullable=False)
    proposed_by_role: Mapped[str] = mapped_column(String(20), nullable=False)  # BUYER or SELLER
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    quote = relationship("Quote", back_populates="versions")
