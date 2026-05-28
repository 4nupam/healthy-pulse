"""
Antigravity Food Scanner — FastAPI Application Entry Point
============================================================
Central API server with CORS, exception handling, seed data,
and the /api/v1/scan inference endpoint.
"""

import logging
from contextlib import asynccontextmanager
from typing import Any, Dict

import cv2
import numpy as np
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import dispose_engine, get_db, init_db, async_session_factory
from app.models import NutritionCatalog
from app.services.ai_engine import detector

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


# ── Seed Data ────────────────────────────────────────────────────────────────
SEED_DATA: list[dict[str, Any]] = [
    {"model_label": "apple", "display_name": "Apple", "calories_per_100g": 52, "protein_per_100g": 0.3, "carbs_per_100g": 13.8, "fat_per_100g": 0.2},
    {"model_label": "banana", "display_name": "Banana", "calories_per_100g": 89, "protein_per_100g": 1.1, "carbs_per_100g": 22.8, "fat_per_100g": 0.3},
    {"model_label": "orange", "display_name": "Orange", "calories_per_100g": 47, "protein_per_100g": 0.9, "carbs_per_100g": 11.8, "fat_per_100g": 0.1},
    {"model_label": "pizza", "display_name": "Pizza", "calories_per_100g": 266, "protein_per_100g": 11.0, "carbs_per_100g": 33.0, "fat_per_100g": 10.0},
    {"model_label": "burger", "display_name": "Burger", "calories_per_100g": 295, "protein_per_100g": 17.0, "carbs_per_100g": 24.0, "fat_per_100g": 14.0},
    {"model_label": "salad", "display_name": "Salad", "calories_per_100g": 20, "protein_per_100g": 1.5, "carbs_per_100g": 3.6, "fat_per_100g": 0.2},
    {"model_label": "rice", "display_name": "Rice", "calories_per_100g": 130, "protein_per_100g": 2.7, "carbs_per_100g": 28.2, "fat_per_100g": 0.3},
    {"model_label": "chicken", "display_name": "Chicken", "calories_per_100g": 239, "protein_per_100g": 27.3, "carbs_per_100g": 0.0, "fat_per_100g": 13.6},
    {"model_label": "egg", "display_name": "Egg", "calories_per_100g": 155, "protein_per_100g": 13.0, "carbs_per_100g": 1.1, "fat_per_100g": 11.0},
    {"model_label": "bread", "display_name": "Bread", "calories_per_100g": 265, "protein_per_100g": 9.0, "carbs_per_100g": 49.0, "fat_per_100g": 3.2},
    {"model_label": "pasta", "display_name": "Pasta", "calories_per_100g": 131, "protein_per_100g": 5.0, "carbs_per_100g": 25.0, "fat_per_100g": 1.1},
    {"model_label": "steak", "display_name": "Steak", "calories_per_100g": 271, "protein_per_100g": 26.0, "carbs_per_100g": 0.0, "fat_per_100g": 18.0},
    {"model_label": "fish", "display_name": "Fish", "calories_per_100g": 206, "protein_per_100g": 22.0, "carbs_per_100g": 0.0, "fat_per_100g": 12.0},
    {"model_label": "sushi", "display_name": "Sushi", "calories_per_100g": 143, "protein_per_100g": 5.8, "carbs_per_100g": 20.5, "fat_per_100g": 3.6},
    {"model_label": "fries", "display_name": "French Fries", "calories_per_100g": 312, "protein_per_100g": 3.4, "carbs_per_100g": 41.0, "fat_per_100g": 15.0},
    {"model_label": "sandwich", "display_name": "Sandwich", "calories_per_100g": 250, "protein_per_100g": 12.0, "carbs_per_100g": 28.0, "fat_per_100g": 10.0},
    {"model_label": "donut", "display_name": "Donut", "calories_per_100g": 452, "protein_per_100g": 5.0, "carbs_per_100g": 51.0, "fat_per_100g": 25.0},
    {"model_label": "ice_cream", "display_name": "Ice Cream", "calories_per_100g": 207, "protein_per_100g": 3.5, "carbs_per_100g": 24.0, "fat_per_100g": 11.0},
    {"model_label": "cake", "display_name": "Cake", "calories_per_100g": 347, "protein_per_100g": 5.0, "carbs_per_100g": 50.0, "fat_per_100g": 15.0},
    {"model_label": "watermelon", "display_name": "Watermelon", "calories_per_100g": 30, "protein_per_100g": 0.6, "carbs_per_100g": 7.6, "fat_per_100g": 0.2},
    {"model_label": "grape", "display_name": "Grapes", "calories_per_100g": 69, "protein_per_100g": 0.7, "carbs_per_100g": 18.1, "fat_per_100g": 0.2},
    {"model_label": "strawberry", "display_name": "Strawberry", "calories_per_100g": 32, "protein_per_100g": 0.7, "carbs_per_100g": 7.7, "fat_per_100g": 0.3},
    {"model_label": "mango", "display_name": "Mango", "calories_per_100g": 60, "protein_per_100g": 0.8, "carbs_per_100g": 15.0, "fat_per_100g": 0.4},
    {"model_label": "avocado", "display_name": "Avocado", "calories_per_100g": 160, "protein_per_100g": 2.0, "carbs_per_100g": 8.5, "fat_per_100g": 14.7},
    {"model_label": "broccoli", "display_name": "Broccoli", "calories_per_100g": 34, "protein_per_100g": 2.8, "carbs_per_100g": 6.6, "fat_per_100g": 0.4},
    {"model_label": "carrot", "display_name": "Carrot", "calories_per_100g": 41, "protein_per_100g": 0.9, "carbs_per_100g": 9.6, "fat_per_100g": 0.2},
    {"model_label": "tomato", "display_name": "Tomato", "calories_per_100g": 18, "protein_per_100g": 0.9, "carbs_per_100g": 3.9, "fat_per_100g": 0.2},
    {"model_label": "potato", "display_name": "Potato", "calories_per_100g": 77, "protein_per_100g": 2.0, "carbs_per_100g": 17.0, "fat_per_100g": 0.1},
    {"model_label": "milk", "display_name": "Milk", "calories_per_100g": 42, "protein_per_100g": 3.4, "carbs_per_100g": 5.0, "fat_per_100g": 1.0},
    {"model_label": "cheese", "display_name": "Cheese", "calories_per_100g": 402, "protein_per_100g": 25.0, "carbs_per_100g": 1.3, "fat_per_100g": 33.0},
]


# ── Lifespan ─────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle handler."""
    # ── Startup ──────────────────────────────────────────────────────────
    logger.info("Starting %s v%s", settings.APP_NAME, settings.APP_VERSION)

    # Initialize database tables
    await init_db()

    # Seed nutrition catalog if empty
    await _seed_nutrition_data()

    # Load the YOLO model into GPU/CPU memory
    detector.load_model()

    logger.info("Application startup complete.")
    yield

    # ── Shutdown ─────────────────────────────────────────────────────────
    await dispose_engine()
    logger.info("Application shutdown complete.")


async def _seed_nutrition_data() -> None:
    """Insert seed nutrition records if the catalog table is empty."""
    async with async_session_factory() as session:
        result = await session.execute(
            select(NutritionCatalog).limit(1)
        )
        if result.scalars().first() is not None:
            logger.info("Nutrition catalog already seeded — skipping.")
            return

        for item in SEED_DATA:
            session.add(NutritionCatalog(**item))

        await session.commit()
        logger.info(
            "Seeded %d items into nutrition_catalog.", len(SEED_DATA)
        )


# ── FastAPI App ──────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Real-time food macro & calorie scanner powered by YOLO11.",
    lifespan=lifespan,
)

# ── CORS Middleware ──────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Global Exception Handler ────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request, exc: Exception):
    """Catch-all handler that returns structured JSON for unhandled errors."""
    logger.error("Unhandled exception: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "An internal server error occurred. Please try again.",
            "error_type": type(exc).__name__,
        },
    )


# ── Health Check ─────────────────────────────────────────────────────────────
@app.get("/health", tags=["System"])
async def health_check() -> Dict[str, Any]:
    """Return server health status and model readiness."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "model_loaded": detector.is_ready,
    }


# ── Scan Endpoint ────────────────────────────────────────────────────────────
@app.post("/api/v1/scan", tags=["Scanner"])
async def scan_food(
    file: UploadFile = File(..., description="Food image to analyze"),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Accept a food image, run YOLO11 inference, look up nutrition data,
    and return structured macro information.

    Pipeline
    --------
    1. Validate uploaded file is an image.
    2. Read bytes into memory (no disk I/O).
    3. Decode via OpenCV.
    4. Run YOLO11 inference.
    5. Query nutrition catalog.
    6. Return structured JSON response.
    """

    # ── 1. Validate Content-Type ─────────────────────────────────────────
    content_type = file.content_type or ""
    if not content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail={
                "success": False,
                "message": f"Invalid file type '{content_type}'. Please upload an image (JPEG, PNG, etc.).",
            },
        )

    # ── 2. Read bytes into memory buffer ─────────────────────────────────
    try:
        image_bytes = await file.read()
        if len(image_bytes) == 0:
            raise HTTPException(
                status_code=400,
                detail={"success": False, "message": "Uploaded file is empty."},
            )

        # Cap file size at 20 MB
        if len(image_bytes) > 20 * 1024 * 1024:
            raise HTTPException(
                status_code=413,
                detail={
                    "success": False,
                    "message": "Image too large. Maximum size is 20 MB.",
                },
            )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to read uploaded file: %s", exc)
        raise HTTPException(
            status_code=400,
            detail={"success": False, "message": "Failed to read the uploaded file."},
        )

    # ── 3. Decode via OpenCV ─────────────────────────────────────────────
    try:
        np_buffer = np.frombuffer(image_bytes, dtype=np.uint8)
        image_matrix = cv2.imdecode(np_buffer, cv2.IMREAD_COLOR)

        if image_matrix is None:
            raise HTTPException(
                status_code=400,
                detail={
                    "success": False,
                    "message": "Could not decode the image. Ensure it is a valid JPEG or PNG.",
                },
            )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("OpenCV decode failure: %s", exc)
        raise HTTPException(
            status_code=400,
            detail={"success": False, "message": "Image decoding failed."},
        )

    # ── 4. Run YOLO11 Inference ──────────────────────────────────────────
    if not detector.is_ready:
        return {
            "success": False,
            "message": "The AI model is not currently loaded. Please contact the administrator.",
        }

    detection = detector.run_inference(image_matrix)

    if detection is None:
        return {
            "success": False,
            "message": "No food item detected with sufficient confidence. Please try a clearer photo.",
        }

    # ── 5. Query Nutrition Catalog ───────────────────────────────────────
    try:
        result = await db.execute(
            select(NutritionCatalog).where(
                NutritionCatalog.model_label == detection.label
            )
        )
        catalog_entry = result.scalars().first()
    except Exception as exc:
        logger.error("Database query failed: %s", exc)
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "message": "Database lookup failed. Please try again.",
            },
        )

    if catalog_entry is None:
        return {
            "success": True,
            "food_item": detection.label.replace("_", " ").title(),
            "confidence": round(detection.confidence, 3),
            "nutrition": None,
            "message": f"Detected '{detection.label}' but no nutrition data is available in the catalog.",
        }

    # ── 6. Return Structured Response ────────────────────────────────────
    response_data = catalog_entry.to_dict()
    response_data["success"] = True
    response_data["confidence"] = round(detection.confidence, 3)

    logger.info(
        "Scan complete: %s (%.1f%% confidence)",
        detection.label,
        detection.confidence * 100,
    )

    return response_data
