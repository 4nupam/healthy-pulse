"""
Antigravity Food Scanner — AI Inference Engine
================================================
Loads a YOLO11 ONNX model once at process startup and keeps it resident
in memory for low-latency inference on every incoming scan request.
"""

import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import numpy as np

from app.config import settings

logger = logging.getLogger(__name__)


# ── Inference Result ─────────────────────────────────────────────────────────
@dataclass(frozen=True)
class DetectionResult:
    """Immutable container for a single food detection result."""
    label: str
    confidence: float


# ── Model Manager ────────────────────────────────────────────────────────────
class FoodDetector:
    """
    Singleton wrapper around the YOLO11 ONNX model.
    Loads the model once and provides a thread-safe inference method.
    """

    def __init__(self) -> None:
        self._model = None
        self._model_loaded = False

    def load_model(self) -> None:
        """
        Load the YOLO11 ONNX model into memory.
        Called once at application startup. If the model file is missing,
        the detector degrades gracefully — inference calls return None.
        """
        model_path = Path(settings.MODEL_PATH)

        if not model_path.exists():
            logger.warning(
                "YOLO model file not found at '%s'. "
                "The scanner will return 'model unavailable' until a valid "
                ".onnx model is placed at the configured MODEL_PATH.",
                model_path.resolve(),
            )
            return

        try:
            from ultralytics import YOLO

            self._model = YOLO(str(model_path), task="detect")
            self._model_loaded = True
            logger.info(
                "YOLO11 ONNX model loaded successfully from '%s'.",
                model_path.resolve(),
            )
        except Exception as exc:
            logger.error(
                "Failed to load YOLO model from '%s': %s",
                model_path.resolve(),
                exc,
                exc_info=True,
            )

    @property
    def is_ready(self) -> bool:
        """Check whether the model is loaded and ready for inference."""
        return self._model_loaded and self._model is not None

    def run_inference(
        self, image_matrix: np.ndarray
    ) -> Optional[DetectionResult]:
        """
        Run YOLO11 object detection on a raw OpenCV image matrix.

        Parameters
        ----------
        image_matrix : np.ndarray
            BGR image array as returned by ``cv2.imdecode``.

        Returns
        -------
        DetectionResult or None
            The highest-confidence detection above the configured threshold,
            or None if no qualifying detection was found.
        """
        if not self.is_ready:
            logger.warning("Inference requested but model is not loaded.")
            return None

        try:
            # Run prediction — returns a list of Results objects
            results = self._model.predict(
                source=image_matrix,
                conf=settings.CONFIDENCE_THRESHOLD,
                verbose=False,
            )

            if not results or len(results) == 0:
                logger.info("YOLO returned no results for the input image.")
                return None

            # Extract the first (and typically only) Results object
            result = results[0]
            boxes = result.boxes

            if boxes is None or len(boxes) == 0:
                logger.info("No bounding boxes detected above threshold.")
                return None

            # Find the detection with the highest confidence score
            confidences = boxes.conf.cpu().numpy()
            class_ids = boxes.cls.cpu().numpy().astype(int)

            best_idx = int(np.argmax(confidences))
            best_confidence = float(confidences[best_idx])
            best_class_id = class_ids[best_idx]

            # Enforce hard confidence floor
            if best_confidence < settings.CONFIDENCE_THRESHOLD:
                logger.info(
                    "Best detection confidence %.3f is below threshold %.2f.",
                    best_confidence,
                    settings.CONFIDENCE_THRESHOLD,
                )
                return None

            # Map class ID → label name via the model's names dict
            label = result.names.get(best_class_id, f"class_{best_class_id}")

            logger.info(
                "Detection: label='%s', confidence=%.3f",
                label,
                best_confidence,
            )

            return DetectionResult(label=label, confidence=best_confidence)

        except Exception as exc:
            logger.error(
                "Inference failed: %s", exc, exc_info=True
            )
            return None


# ── Global Singleton ─────────────────────────────────────────────────────────
# Instantiated at import time; `.load_model()` is called during app startup.
detector = FoodDetector()
