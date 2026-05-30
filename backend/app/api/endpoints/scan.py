import logging
from typing import Any, Dict

import cv2
import numpy as np
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import NutritionCatalog
from app.schemas import ScanResponse, NutritionInfo
from app.services.ai_engine import detector

logger = logging.getLogger(__name__)
router = APIRouter()

def _decode_and_infer(image_bytes: bytes):
    """
    Synchronous function for CPU-bound OpenCV decoding and YOLO inference.
    To be run in a threadpool to prevent blocking the async event loop.
    """
    # 1. Decode via OpenCV
    np_buffer = np.frombuffer(image_bytes, dtype=np.uint8)
    image_matrix = cv2.imdecode(np_buffer, cv2.IMREAD_COLOR)

    if image_matrix is None:
        raise ValueError("Could not decode the image. Ensure it is a valid JPEG or PNG.")

    # 2. Run Inference
    if not detector.is_ready:
        return None, "The AI model is not currently loaded. Please contact the administrator."
        
    detection = detector.run_inference(image_matrix)
    return detection, None

@router.post("/scan", response_model=ScanResponse, tags=["Scanner"])
async def scan_food(
    file: UploadFile = File(..., description="Food image to analyze"),
    db: AsyncSession = Depends(get_db),
) -> ScanResponse:
    """
    Accept a food image, run YOLO11 inference, look up nutrition data,
    and return structured macro information.
    """
    # ── 1. Validate Content-Type ─────────────────────────────────────────
    content_type = file.content_type or ""
    if not content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail={"success": False, "message": f"Invalid file type '{content_type}'. Please upload an image."}
        )

    # ── 2. Read bytes into memory buffer ─────────────────────────────────
    try:
        image_bytes = await file.read()
        if len(image_bytes) == 0:
            raise HTTPException(status_code=400, detail={"success": False, "message": "Uploaded file is empty."})
        if len(image_bytes) > 20 * 1024 * 1024:
            raise HTTPException(status_code=413, detail={"success": False, "message": "Image too large. Max 20 MB."})
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to read uploaded file: %s", exc)
        raise HTTPException(status_code=400, detail={"success": False, "message": "Failed to read file."})

    # ── 3. Offload Decode & Inference to ThreadPool ──────────────────────
    try:
        detection, error_message = await run_in_threadpool(_decode_and_infer, image_bytes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail={"success": False, "message": str(e)})
    except Exception as exc:
        logger.error("Threadpool execution failed: %s", exc)
        raise HTTPException(status_code=500, detail={"success": False, "message": "Inference execution failed."})

    if error_message:
        return ScanResponse(success=False, message=error_message)

    if detection is None:
        return ScanResponse(
            success=False,
            message="No food item detected with sufficient confidence. Please try a clearer photo."
        )

    # ── 4. Query Nutrition Catalog ───────────────────────────────────────
    try:
        result = await db.execute(
            select(NutritionCatalog).where(NutritionCatalog.model_label == detection.label)
        )
        catalog_entry = result.scalars().first()
    except Exception as exc:
        logger.error("Database query failed: %s", exc)
        raise HTTPException(status_code=500, detail={"success": False, "message": "Database lookup failed."})

    if catalog_entry is None:
        return ScanResponse(
            success=True,
            food_item=detection.label.replace("_", " ").title(),
            confidence=round(detection.confidence, 3),
            message=f"Detected '{detection.label}' but no nutrition data is available."
        )

    # ── 5. Return Structured Response ────────────────────────────────────
    logger.info("Scan complete: %s (%.1f%% confidence)", detection.label, detection.confidence * 100)

    nutrition = NutritionInfo(
        calories_per_100g=catalog_entry.calories_per_100g,
        protein_per_100g=catalog_entry.protein_per_100g,
        carbs_per_100g=catalog_entry.carbs_per_100g,
        fat_per_100g=catalog_entry.fat_per_100g
    )

    return ScanResponse(
        success=True,
        food_item=catalog_entry.display_name,
        confidence=round(detection.confidence, 3),
        nutrition=nutrition
    )
