"""
Antigravity Food Scanner — Pydantic Schemas
=============================================
Type definitions for API requests and responses.
"""

from typing import Optional
from pydantic import BaseModel, Field


class NutritionInfo(BaseModel):
    """Nutritional breakdown per 100g serving."""
    calories_per_100g: int = Field(..., description="Calories (kcal)")
    protein_per_100g: float = Field(..., description="Protein in grams")
    carbs_per_100g: float = Field(..., description="Carbohydrates in grams")
    fat_per_100g: float = Field(..., description="Fat in grams")

class ScanResponse(BaseModel):
    """Standardized response from the scan endpoint."""
    success: bool = Field(..., description="Whether the scan was successful")
    message: Optional[str] = Field(None, description="Error or informational message")
    food_item: Optional[str] = Field(None, description="The detected food label (human-readable)")
    confidence: Optional[float] = Field(None, description="Confidence score from 0.0 to 1.0")
    nutrition: Optional[NutritionInfo] = Field(None, description="Nutritional breakdown if available")
