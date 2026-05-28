"""
Antigravity Food Scanner — ORM Models
=======================================
SQLAlchemy ORM definitions for the nutrition_catalog table.
Maps YOLO model class labels to human-readable food names and macro data.
"""

from sqlalchemy import Index, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class NutritionCatalog(Base):
    """
    Stores per-food nutritional information keyed by the YOLO model's class label.

    Columns
    -------
    id              : Auto-increment primary key.
    model_label     : The exact string label emitted by the YOLO model (unique, indexed).
    display_name    : A clean, human-readable name shown to users.
    calories_per_100g : Kilocalories per 100 g serving.
    protein_per_100g  : Grams of protein per 100 g serving.
    carbs_per_100g    : Grams of carbohydrates per 100 g serving.
    fat_per_100g      : Grams of fat per 100 g serving.
    """

    __tablename__ = "nutrition_catalog"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    model_label: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=False
    )
    display_name: Mapped[str] = mapped_column(
        String(200), nullable=False
    )
    calories_per_100g: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    protein_per_100g: Mapped[float] = mapped_column(
        Numeric(5, 1), nullable=False, default=0.0
    )
    carbs_per_100g: Mapped[float] = mapped_column(
        Numeric(5, 1), nullable=False, default=0.0
    )
    fat_per_100g: Mapped[float] = mapped_column(
        Numeric(5, 1), nullable=False, default=0.0
    )

    # Explicit index on model_label for fast lookups during inference
    __table_args__ = (
        Index("ix_nutrition_catalog_model_label", "model_label"),
    )

    def __repr__(self) -> str:
        return (
            f"<NutritionCatalog("
            f"label='{self.model_label}', "
            f"name='{self.display_name}', "
            f"cal={self.calories_per_100g}"
            f")>"
        )

    def to_dict(self) -> dict:
        """Serialize the catalog entry to a plain dictionary for API responses."""
        return {
            "food_item": self.display_name,
            "nutrition": {
                "calories_per_100g": self.calories_per_100g,
                "protein_per_100g": float(self.protein_per_100g),
                "carbs_per_100g": float(self.carbs_per_100g),
                "fat_per_100g": float(self.fat_per_100g),
            },
        }
