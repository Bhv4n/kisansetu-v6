import uuid
from datetime import datetime

from sqlalchemy import String, Integer, DateTime, ForeignKey, Text, Numeric, UniqueConstraint, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.session import Base
from app.models.core import uuid_pk

CONTRACT_STATUSES = (
    "DRAFT", "NEGOTIATING", "ACCEPTED", "GROWING", "AT_RISK", "READY",
    "PICKED_UP", "INSPECTED", "DELIVERED", "PAID", "COMPLETED",
    "DISPUTED", "ESCALATED", "CANCELLED",
)

MILESTONE_SEQUENCE = [
    "CONTRACT_ACCEPTED", "PRODUCTION_STARTED", "READY_FOR_PICKUP",
    "PICKUP", "QUALITY_INSPECTION", "DELIVERY", "PAYMENT",
]


class Contract(Base):
    __tablename__ = "contracts"
    id: Mapped[uuid.UUID] = uuid_pk()
    contract_no: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    buyer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("buyer_profiles.id"), nullable=False)
    seller_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("seller_profiles.id"), nullable=False)
    requirement_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("buyer_requirements.id"), nullable=True)
    quote_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("quotes.id"), nullable=True)
    product_name: Mapped[str] = mapped_column(String(150), nullable=False)
    quantity: Mapped[float] = mapped_column(Numeric(14, 3), nullable=False)
    unit: Mapped[str] = mapped_column(String(30), nullable=False)
    unit_price: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    total_value: Mapped[float] = mapped_column(Numeric(16, 2), nullable=False)
    quality_grade: Mapped[str | None] = mapped_column(String(30))
    delivery_terms: Mapped[str | None] = mapped_column(Text)
    payment_terms: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(30), default="DRAFT")
    current_version_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    buyer = relationship("BuyerProfile")
    seller = relationship("SellerProfile")
    milestones = relationship("ContractMilestone", back_populates="contract", order_by="ContractMilestone.id")
    versions = relationship("ContractVersion", back_populates="contract", order_by="ContractVersion.version_no")
    lots = relationship("Lot", back_populates="contract")


class ContractVersion(Base):
    __tablename__ = "contract_versions"
    __table_args__ = (UniqueConstraint("contract_id", "version_no"),)
    id: Mapped[uuid.UUID] = uuid_pk()
    contract_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False)
    version_no: Mapped[int] = mapped_column(Integer, nullable=False)
    terms_json: Mapped[dict] = mapped_column(JSONB, nullable=False)
    content_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    accepted_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    contract = relationship("Contract", back_populates="versions")


class ContractMilestone(Base):
    __tablename__ = "contract_milestones"
    id: Mapped[uuid.UUID] = uuid_pk()
    contract_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False)
    milestone_type: Mapped[str] = mapped_column(String(50), nullable=False)
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(30), default="PENDING")  # PENDING, IN_PROGRESS, DONE
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    contract = relationship("Contract", back_populates="milestones")


class Lot(Base):
    __tablename__ = "lots"
    id: Mapped[uuid.UUID] = uuid_pk()
    contract_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False)
    product_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=True)
    lot_code: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    quantity: Mapped[float] = mapped_column(Numeric(14, 3), nullable=False)
    unit: Mapped[str] = mapped_column(String(30), nullable=False)
    qr_token: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    contract = relationship("Contract", back_populates="lots")
    inspections = relationship("Inspection", back_populates="lot")


class Inspection(Base):
    __tablename__ = "inspections"
    id: Mapped[uuid.UUID] = uuid_pk()
    lot_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("lots.id"), nullable=False)
    contract_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False)
    assigned_to: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="PENDING")  # PENDING, PASS, FAIL
    inspected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    lot = relationship("Lot", back_populates="inspections")
    results = relationship("InspectionResult", back_populates="inspection")


class InspectionResult(Base):
    __tablename__ = "inspection_results"
    id: Mapped[uuid.UUID] = uuid_pk()
    inspection_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("inspections.id"), nullable=False)
    parameter: Mapped[str] = mapped_column(String(100), nullable=False)
    measured_value: Mapped[str | None] = mapped_column(String(100))
    result: Mapped[str] = mapped_column(String(20), nullable=False)  # PASS / FAIL

    inspection = relationship("Inspection", back_populates="results")


class Delivery(Base):
    __tablename__ = "deliveries"
    id: Mapped[uuid.UUID] = uuid_pk()
    contract_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False)
    lot_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("lots.id"), nullable=True)
    quantity: Mapped[float] = mapped_column(Numeric(14, 3), nullable=False)
    unit: Mapped[str] = mapped_column(String(30), nullable=False)
    origin: Mapped[str | None] = mapped_column(String(150))
    destination: Mapped[str | None] = mapped_column(String(150))
    dispatch_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    expected_delivery_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    actual_delivery_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(30), default="PENDING")  # PENDING, DISPATCHED, IN_TRANSIT, DELIVERED, DELAYED
    delay_reason: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    contract = relationship("Contract")
    lot = relationship("Lot")


class Evidence(Base):
    __tablename__ = "evidence"
    id: Mapped[uuid.UUID] = uuid_pk()
    inspection_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("inspections.id"), nullable=True)
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    file_type: Mapped[str | None] = mapped_column(String(50))
    uploaded_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
