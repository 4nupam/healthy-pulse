# Antigravity Food Scanner: Comprehensive Architecture & Research Report

## 1. Executive Summary
The **Antigravity Food Scanner** is a real-time, zero-authentication mobile application designed to instantly identify food items via a smartphone camera and provide immediate nutritional feedback (calories, protein, carbs, fats). 

It utilizes a high-performance **React Native (Expo)** frontend styled with **Tailwind CSS (NativeWind v4)**, communicating with a blazing fast **Python FastAPI** backend. The backend leverages an in-memory **YOLO11 ONNX** computer vision model for millisecond-latency object detection, coupled with an asynchronous **PostgreSQL** database for nutritional lookups.

---

## 2. Frontend Architecture Report

### Core Technologies
- **Framework:** React Native via Expo SDK 52
- **Styling:** NativeWind v4 (Tailwind CSS configuration)
- **Camera Handling:** `expo-camera`
- **Networking:** Axios with custom interceptors

### System Design & Flow
1. **Permission State Machine:** The `App.jsx` cleanly routes the user through a permission lifecycle. It displays an animated skeleton loader while checking hardware permissions, and a highly polished Call-To-Action (CTA) screen if permissions are denied.
2. **Hardware Interaction (`CameraView.jsx`):** We use a full-screen camera viewport. Images are captured with a `0.6` quality compression modifier, stripping EXIF data, and avoiding unnecessary local storage by pushing the bytes directly to a `FormData` object.
3. **Network Resilience (`api.js`):** Axios is configured with a strict 10-second timeout. Custom response interceptors automatically parse network drops, HTTP 413 (Payload Too Large), and HTTP 500s into user-friendly UI alerts, preventing silent app failures.
4. **Presentation (`MacroSheet.jsx`):** A custom-built bottom sheet utilizes glassmorphism (translucent backdrops). Nutritional data is rendered in a 2x2 grid using specific color psychology (Emerald for Calories, Rose for Protein, Amber for Carbs, Sky Blue for Fats) to make the data instantly digestible.

---

## 3. Backend Architecture Report

### Core Technologies
- **Framework:** FastAPI (Python 3.12+)
- **Computer Vision:** YOLO11 (Ultralytics) exported to `.onnx` & OpenCV Headless
- **Database:** PostgreSQL via SQLAlchemy 2.0 (Async)
- **Containerization:** Multi-stage Docker build

### System Design & Flow
1. **Memory-Resident AI (`ai_engine.py`):** The YOLO11 ONNX model is loaded into memory as a Singleton on application startup. This avoids the severe latency penalty of loading the model from disk on every API call. 
2. **Zero Disk I/O Pipeline (`main.py`):** When the `POST /api/v1/scan` endpoint receives a multipart image upload, the bytes are read directly into RAM and decoded using `cv2.imdecode`. The file is never written to the server's hard drive, allowing the API to handle massive concurrent throughput.
3. **Async Database Layer (`database.py` & `models.py`):** The system uses `asyncpg` to query the PostgreSQL `nutrition_catalog` table without blocking the Python event loop. A connection pool (size=20, max_overflow=10) ensures connections are reused efficiently.
4. **Graceful Degradation:** If the `.onnx` model file is missing from the server, the application still boots up. The API simply returns a clean `503 Service Unavailable` JSON response to the mobile client rather than crashing the Docker container.

---

## 4. Deep Research: Future Roadmap & Expansion

Based on a deep analysis of current HealthTech trends and the existing architecture, here is a research-backed roadmap of features that can be added to elevate the application from a utility to a comprehensive platform.

### Phase 1: Advanced AI & Computer Vision
* **Instance Segmentation (YOLO11-seg):** Instead of standard bounding boxes, upgrade the model to instance segmentation. This allows the app to draw an exact pixel-perfect mask around the food item.
* **Volume & Weight Estimation:** By utilizing the smartphone's LiDAR sensor (via Expo's ARKit integration) or referencing a known object (like a coin) in the frame, the backend can calculate the 3D volume of the food mask to estimate the exact gram weight, providing dynamic calorie counts rather than static "per 100g" estimates.
* **Multi-Item Detection:** Update the frontend UI to handle arrays of detections. If the user scans a plate with chicken, rice, and broccoli, the `MacroSheet` should render an aggregate total of macros, with expandable accordions for individual items.

### Phase 2: Frontend & UX Enhancements
* **Local Offline Caching (WatermelonDB / SQLite):** Integrate `expo-sqlite` to store the user's scan history locally. This allows users to view their daily macros even without an internet connection.
* **Augmented Reality (AR) Overlays:** Use `react-native-skia` or ARKit to render floating nutritional tags *live* on the camera viewfinder in real-time, before the user even presses the capture button.
* **Haptic Feedback:** Integrate `expo-haptics` to provide tactile feedback when the shutter is pressed, when the AI successfully detects an item, and when the MacroSheet slides up.

### Phase 3: Backend & Infrastructure Scale
* **User Accounts & Auth (Supabase / Firebase):** Transition from zero-auth to optional authenticated accounts, allowing users to track their daily macro goals, streaks, and dietary preferences across devices.
* **Edamam / USDA API Integration:** Instead of relying entirely on a static seed database, configure the backend to use the YOLO model to get the string label (e.g., "Apple"), and then hit a live USDA API to fetch highly granular macro and micro-nutrient profiles.
* **MLOps Pipeline:** Implement a feedback loop. Add a "Report Incorrect Scan" button on the frontend. When flagged, the backend saves the image matrix to an S3 bucket, creating a raw dataset that can be used to automatically retrain and improve the YOLO model every month.
* **Redis Caching:** Introduce a Redis layer. If "Apple" is scanned 10,000 times a day, the database shouldn't be queried 10,000 times. Cache the nutritional profile of common items in Redis for single-digit millisecond retrieval.
