from sqlalchemy import Column, Integer, String, BigInteger, DateTime
from sqlalchemy.sql import func
from database import Base


class CompressionHistory(Base):
    __tablename__ = "compression_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(255), nullable=False, index=True)
    username = Column(String(255), nullable=False)
    email = Column(String(255))
    filename = Column(String(500), nullable=False)
    original_size = Column(BigInteger, nullable=False)
    compressed_size = Column(BigInteger, nullable=False)
    compression_type = Column(String(10), nullable=False)  # 'pdf' or 'image'
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
