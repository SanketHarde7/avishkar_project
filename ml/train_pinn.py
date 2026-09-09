#!/usr/bin/env python3
"""
AIR POLLUTION DETECTOR — Physics-ML Scientist Engine (Role B)
Trains a Physics-Informed Neural Network (PINN) enforcing the 2D Advection-Diffusion PDE:
  ∂C/∂t + u·(∂C/∂x) + v·(∂C/∂y) = D·(∂²C/∂x² + ∂²C/∂y²) - k·C

Executes a Synthetic Sensor-Drop Experiment withholding 2 validation stations (Pashan & Bhosari)
and benchmarks against Spatial XGBoost and Global Mean baseline.

Exports:
  1. weights/benchmark_metrics.json
  2. weights/pinn_model.onnx (or weights/pinn_model.pt)
"""

import os
import sys
import json
import logging
import math
from typing import Tuple, Dict, Any, List

import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, r2_score

# Setup Logging with UTF-8 support
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [Physics-ML] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("PhysicsML")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(BASE_DIR, "data", "pune_training_dataset.csv")
WEIGHTS_DIR = os.path.join(BASE_DIR, "weights")
BENCHMARK_JSON_PATH = os.path.join(WEIGHTS_DIR, "benchmark_metrics.json")
ONNX_MODEL_PATH = os.path.join(WEIGHTS_DIR, "pinn_model.onnx")
PYTORCH_MODEL_PATH = os.path.join(WEIGHTS_DIR, "pinn_model.pt")

# Atmospheric & PDE Regularization Constants
DIFFUSION_D = 0.15   # Atmospheric eddy diffusion coefficient
DECAY_K = 0.02       # Deposition and chemical transformation decay rate
LAMBDA_PHYS = 0.008  # Physics residual loss penalty factor (reduced ~1/10th for tight data fit)

# PINN Direct Neural Network Input Features (Spatiotemporal + Diurnal + Real Weather + CAMS Background)
PINN_FEATURE_COLS = [
    "x_norm", "y_norm", "t_norm",        # Spatial (lon, lat) + linear time
    "sin_hour", "cos_hour",              # Diurnal cyclic time-of-day encoding
    "u_norm", "v_norm",                  # Real wind velocity vectors
    "temp_norm", "rh_norm",              # Real temperature and relative humidity
    "cams_pm25_norm", "cams_no2_norm",   # Satellite-informed atmospheric background (CAMS)
]

# Spatial XGBoost Baseline Input Features
XGB_FEATURE_COLS = [
    "lat", "lon",
    "u_wind", "v_wind",
    "temp_2m", "rel_humidity_2m",
    "cams_pm25_bg", "cams_no2_bg",
]

# Fallback substring markers if 'status' column is completely absent
FALLBACK_WITHHELD_SUBSTRINGS = ["pashan", "bhosari"]


# ---------------------------------------------------------
# Step 1: Data Preparation & Synthetic Sensor-Drop Split
# ---------------------------------------------------------
def prepare_data(data_path: str):
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Training dataset not found at {data_path}. Run pipeline/fetch_data.py first.")

    df = pd.read_csv(data_path)
    logger.info(f"Loaded raw dataset with {len(df)} rows across {df['station_name'].nunique()} stations.")

    # Spatial bounds
    lat_min, lat_max = 18.44, 18.65
    lon_min, lon_max = 73.75, 73.98
    pm25_min, pm25_max = 0.0, 250.0

    # Sort and normalize timestamps to [0, 1]
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    min_time = df["timestamp"].min()
    max_time = df["timestamp"].max()
    time_range = max(1.0, (max_time - min_time).total_seconds())

    # Spatial & linear time
    df["t_norm"] = (df["timestamp"] - min_time).dt.total_seconds() / time_range
    df["x_norm"] = ((df["lon"] - lon_min) / (lon_max - lon_min)).clip(0, 1)
    df["y_norm"] = ((df["lat"] - lat_min) / (lat_max - lat_min)).clip(0, 1)

    # Cyclic time-of-day encoding: sin(2*pi*hour/24) and cos(2*pi*hour/24)
    hours = df["timestamp"].dt.hour + df["timestamp"].dt.minute / 60.0
    df["sin_hour"] = np.sin(2.0 * np.pi * hours / 24.0)
    df["cos_hour"] = np.cos(2.0 * np.pi * hours / 24.0)

    # Synthetic Sensor-Drop Partition:
    # Use 'status' column directly ("active" vs "hidden_for_validation")
    if "status" in df.columns:
        is_withheld = df["status"] == "hidden_for_validation"
    else:
        logger.warning(
            "[WARNING] 'status' column missing from dataset! "
            "Falling back to case-insensitive matching for 'pashan' and 'bhosari'."
        )
        is_withheld = df["station_name"].astype(str).str.lower().str.contains("pashan|bhosari", na=False)

    train_df = df[~is_withheld].copy()
    test_df = df[is_withheld].copy()

    # Hard Assertion Guards: Never proceed if test set has 0 rows
    if len(test_df) == 0:
        raise ValueError(
            f"[CRITICAL ERROR] Withheld test set is EMPTY (0 rows)! "
            f"Found 0 rows with status == 'hidden_for_validation' out of {len(df)} total rows in {data_path}. "
            f"Cannot evaluate PINN generalization on empty test set. Script execution stopped."
        )

    if len(train_df) == 0:
        raise ValueError(
            f"[CRITICAL ERROR] Training set is EMPTY (0 rows)! "
            f"Found 0 active stations out of {len(df)} total rows. Script execution stopped."
        )

    # Standard Z-Score Normalization for PM2.5 using VISIBLE/TRAINING STATIONS ONLY
    train_mean = float(train_df["pm25"].mean())
    train_std = float(train_df["pm25"].std())
    if train_std < 1e-5:
        train_std = 1.0

    train_df["c_norm"] = (train_df["pm25"] - train_mean) / train_std
    test_df["c_norm"] = (test_df["pm25"] - train_mean) / train_std

    # Normalize meteorological & CAMS features using TRAINING DATA STATISTICS ONLY
    u_min, u_max = float(train_df["u_wind"].min()), float(train_df["u_wind"].max())
    v_min, v_max = float(train_df["v_wind"].min()), float(train_df["v_wind"].max())
    temp_min, temp_max = float(train_df["temp_2m"].min()), float(train_df["temp_2m"].max())
    rh_min, rh_max = float(train_df["rel_humidity_2m"].min()), float(train_df["rel_humidity_2m"].max())
    cams_pm25_min, cams_pm25_max = float(train_df["cams_pm25_bg"].min()), float(train_df["cams_pm25_bg"].max())
    cams_no2_min, cams_no2_max = float(train_df["cams_no2_bg"].min()), float(train_df["cams_no2_bg"].max())

    for d in [train_df, test_df]:
        d["u_norm"] = ((d["u_wind"] - u_min) / max(1e-5, u_max - u_min)).clip(0, 1)
        d["v_norm"] = ((d["v_wind"] - v_min) / max(1e-5, v_max - v_min)).clip(0, 1)
        d["temp_norm"] = ((d["temp_2m"] - temp_min) / max(1e-5, temp_max - temp_min)).clip(0, 1)
        d["rh_norm"] = ((d["rel_humidity_2m"] - rh_min) / max(1e-5, rh_max - rh_min)).clip(0, 1)
        d["cams_pm25_norm"] = ((d["cams_pm25_bg"] - cams_pm25_min) / max(1e-5, cams_pm25_max - cams_pm25_min)).clip(0, 1)
        d["cams_no2_norm"] = ((d["cams_no2_bg"] - cams_no2_min) / max(1e-5, cams_no2_max - cams_no2_min)).clip(0, 1)

    withheld_stations = sorted(list(test_df["station_name"].unique()))
    visible_stations = sorted(list(train_df["station_name"].unique()))

    logger.info(
        f"Synthetic Sensor-Drop: {len(visible_stations)} Visible Stations ({len(train_df)} training points), "
        f"{len(withheld_stations)} Withheld Stations ({len(test_df)} test points)."
    )
    logger.info(f"Target Z-Score Stats (Training Only): mean={train_mean:.4f}, std={train_std:.4f}")
    logger.info(f"Withheld Validation Stations ({len(withheld_stations)}): {withheld_stations}")
    logger.info(f"Withheld Test Rows Count: {len(test_df)} rows verified for generalization evaluation.")
    logger.info(f"PINN Input Features ({len(PINN_FEATURE_COLS)}): {PINN_FEATURE_COLS}")

    normalization_params = {
        "lat_min": lat_min, "lat_max": lat_max,
        "lon_min": lon_min, "lon_max": lon_max,
        "pm25_min": pm25_min, "pm25_max": pm25_max,
        "train_mean": train_mean,
        "train_std": train_std,
        "u_min": u_min, "u_max": u_max,
        "v_min": v_min, "v_max": v_max,
        "temp_min": temp_min, "temp_max": temp_max,
        "rh_min": rh_min, "rh_max": rh_max,
        "cams_pm25_min": cams_pm25_min, "cams_pm25_max": cams_pm25_max,
        "cams_no2_min": cams_no2_min, "cams_no2_max": cams_no2_max,
        "withheld_stations": withheld_stations,
        "feature_cols": PINN_FEATURE_COLS,
    }
    return train_df, test_df, normalization_params


# ---------------------------------------------------------
# Step 2: PyTorch PINN Definition
# ---------------------------------------------------------
def train_pinn_model(train_df: pd.DataFrame, test_df: pd.DataFrame, norm_params: dict):
    try:
        import torch
        import torch.nn as nn
        import torch.optim as optim
    except ImportError:
        logger.error("PyTorch not installed. Please install dependencies from ml/requirements.txt.")
        raise

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"Using compute device: {device} ({torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU'})")

    feature_cols = norm_params["feature_cols"]
    in_features = len(feature_cols)

    class PINN(nn.Module):
        def __init__(self, in_features=in_features, hidden_dim=64):
            super().__init__()
            # nn.Tanh() provides continuous C2 smoothness for 2nd order PDE derivatives
            self.network = nn.Sequential(
                nn.Linear(in_features, hidden_dim),
                nn.Tanh(),
                nn.Linear(hidden_dim, hidden_dim),
                nn.Tanh(),
                nn.Linear(hidden_dim, hidden_dim),
                nn.Tanh(),
                nn.Linear(hidden_dim, hidden_dim),
                nn.Tanh(),
                nn.Linear(hidden_dim, 1),
            )

        def forward(self, x):
            return self.network(x)

    model = PINN(in_features=in_features, hidden_dim=64).to(device)

    # Training tensors (visible stations)
    X_train = torch.tensor(
        train_df[feature_cols].values, dtype=torch.float32, device=device
    )
    Y_train = torch.tensor(
        train_df[["c_norm"]].values, dtype=torch.float32, device=device
    )

    # Test tensors (unseen withheld stations)
    X_test = torch.tensor(
        test_df[feature_cols].values, dtype=torch.float32, device=device
    )
    y_test_pm25 = test_df["pm25"].values

    if len(y_test_pm25) == 0:
        raise ValueError("[CRITICAL ERROR] Cannot train or evaluate PINN: y_test_pm25 has 0 rows.")

    n_collocation = 1500
    optimizer = optim.Adam(model.parameters(), lr=2e-3)
    scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=250, gamma=0.7)
    mse_criterion = nn.MSELoss()

    logger.info(f"Initiating PINN physics training loop (500 epochs, in_features={in_features})...")
    epochs = 500
    for epoch in range(1, epochs + 1):
        model.train()
        optimizer.zero_grad()

        # 1. Data Fidelity Loss (MSE on visible stations)
        c_pred = model(X_train)
        loss_data = mse_criterion(c_pred, Y_train)

        # 2. Physics Residual Loss via Automatic Differentiation
        # Collocation points: uniform random spatial coordinates across domain paired with sampled real temporal-weather states
        rand_x = torch.rand((n_collocation, 1), device=device)
        rand_y = torch.rand((n_collocation, 1), device=device)
        rand_idx = torch.randint(0, len(X_train), (n_collocation,), device=device)
        sampled_temporal_weather = X_train[rand_idx, 2:]  # columns: t_norm, sin, cos, u, v, temp, rh
        colloc_in = torch.cat([rand_x, rand_y, sampled_temporal_weather], dim=1).clone().detach().requires_grad_(True)

        c_colloc = model(colloc_in)

        # 1st-order gradients (dC/dx, dC/dy, dC/dt)
        grad_c = torch.autograd.grad(
            c_colloc, colloc_in,
            grad_outputs=torch.ones_like(c_colloc),
            create_graph=True,
            retain_graph=True
        )[0]
        dC_dx = grad_c[:, 0:1]  # index 0: x_norm
        dC_dy = grad_c[:, 1:2]  # index 1: y_norm
        dC_dt = grad_c[:, 2:3]  # index 2: t_norm

        # 2nd-order spatial gradients (d2C/dx2, d2C/dy2)
        d2C_dx2 = torch.autograd.grad(
            dC_dx, colloc_in,
            grad_outputs=torch.ones_like(dC_dx),
            create_graph=True,
            retain_graph=True
        )[0][:, 0:1]

        d2C_dy2 = torch.autograd.grad(
            dC_dy, colloc_in,
            grad_outputs=torch.ones_like(dC_dy),
            create_graph=True,
            retain_graph=True
        )[0][:, 1:2]

        # Mean wind velocities across domain
        u_mean = float(train_df["u_norm"].mean())
        v_mean = float(train_df["v_norm"].mean())

        # 2D Advection-Diffusion PDE Residual:
        # Residual = (dC/dt + u*dC/dx + v*dC/dy) - D*(d2C/dx2 + d2C/dy2) + k*C
        pde_residual = (dC_dt + u_mean * dC_dx + v_mean * dC_dy) - \
                       DIFFUSION_D * (d2C_dx2 + d2C_dy2) + DECAY_K * c_colloc

        loss_physics = torch.mean(pde_residual ** 2)

        # Total Loss
        total_loss = loss_data + LAMBDA_PHYS * loss_physics
        total_loss.backward()
        optimizer.step()
        scheduler.step()

        if epoch % 100 == 0 or epoch == 1:
            logger.info(
                f"Epoch [{epoch:03d}/{epochs}] - Total Loss: {total_loss.item():.5f} "
                f"| Data Loss: {loss_data.item():.5f} | Phys Residual: {loss_physics.item():.5f}"
            )

    # Evaluate PINN on unseen withheld stations
    model.eval()
    with torch.no_grad():
        c_pred_norm = model(X_test).cpu().numpy().flatten()
        pinn_preds = c_pred_norm * norm_params["train_std"] + norm_params["train_mean"]
        pinn_preds = np.clip(pinn_preds, 0.0, 500.0)

    pinn_mae = round(float(mean_absolute_error(y_test_pm25, pinn_preds)), 1)

    logger.info(
        f"[Evaluation Stats - PINN] y_true (first 10): {np.round(y_test_pm25[:10], 2).tolist()}, "
        f"var: {np.var(y_test_pm25):.4f}, std: {np.std(y_test_pm25):.4f}"
    )
    logger.info(
        f"[Evaluation Stats - PINN] y_pred (first 10): {np.round(pinn_preds[:10], 2).tolist()}, "
        f"var: {np.var(pinn_preds):.4f}, std: {np.std(pinn_preds):.4f}"
    )

    # Standard sklearn r2_score with full signed precision (3 decimals, unclamped)
    pinn_r2 = round(float(r2_score(y_test_pm25, pinn_preds)), 3)

    logger.info(
        f"[Evaluation] PINN Withheld Stations ({len(y_test_pm25)} test points across {test_df['station_name'].nunique()} stations) - "
        f"MAE: {pinn_mae} ug/m3, R2: {pinn_r2:.3f}"
    )

    # Temporal PM2.5 Std Comparison across 14-day window for Visible & Withheld stations
    def predict_station_series(st_df):
        X_st = torch.tensor(st_df[feature_cols].values, dtype=torch.float32, device=device)
        with torch.no_grad():
            c_norm = model(X_st).cpu().numpy().flatten()
            return np.clip(c_norm * norm_params["train_std"] + norm_params["train_mean"], 0.0, 500.0)

    stations_to_compare = [
        ("Revenue Colony-Shivajinagar, Pune - IITM", train_df),
        ("Hadapsar, Pune - IITM", train_df),
        ("Katraj Dairy, Pune - MPCB", train_df),
        ("Park Street Wakad, Pimpri Chinchwad - MPCB", train_df),
        ("Bhosari, Pune - IITM", test_df),
        ("Panchawati_Pashan, Pune - IITM", test_df),
    ]

    logger.info("=== PM2.5 Temporal Variance Comparison across 14-Day Window (Pred Std vs Actual Std) ===")
    under_60_pct_flags = []
    for name, source_df in stations_to_compare:
        st_df = source_df[source_df["station_name"] == name].sort_values("timestamp")
        preds = predict_station_series(st_df)
        act = st_df["pm25"].values
        act_std = float(np.std(act))
        pred_std = float(np.std(preds))
        ratio = (pred_std / act_std * 100.0) if act_std > 0 else 0.0
        status_flag = "[UNDER 60%]" if ratio < 60.0 else "[OK]"
        if ratio < 60.0:
            under_60_pct_flags.append((name, pred_std, act_std, ratio))
        logger.info(
            f"  Station: {name:<44} | Actual Std: {act_std:6.4f} | Pred Std: {pred_std:6.4f} | Ratio: {ratio:5.1f}% {status_flag}"
        )

    if under_60_pct_flags:
        logger.warning(
            f"[VARIANCE ALERT] {len(under_60_pct_flags)} of 6 monitored stations have predicted std under 60% of actual std. "
            "Reporting numbers as-is for user evaluation."
        )

    return model, pinn_mae, pinn_r2


# ---------------------------------------------------------
# Step 3: Spatial XGBoost & Global Mean Baselines
# ---------------------------------------------------------
def train_baselines(train_df: pd.DataFrame, test_df: pd.DataFrame) -> Tuple[float, float, float, float]:
    if len(test_df) == 0:
        raise ValueError("[CRITICAL ERROR] Cannot train baselines: test_df has 0 samples.")
    if len(train_df) == 0:
        raise ValueError("[CRITICAL ERROR] Cannot train baselines: train_df has 0 samples.")

    feature_cols = XGB_FEATURE_COLS
    X_train = train_df[feature_cols].values
    y_train = train_df["pm25"].values

    X_test = test_df[feature_cols].values
    y_test = test_df["pm25"].values

    # 1. Spatial XGBoost / GradientBoosting
    try:
        from xgboost import XGBRegressor
        xgb = XGBRegressor(n_estimators=100, max_depth=5, learning_rate=0.08, random_state=42)
        xgb.fit(X_train, y_train)
        xgb_preds = xgb.predict(X_test)
    except Exception as e:
        logger.warning(f"XGBoost library not found ({e}). Using GradientBoostingRegressor baseline.")
        from sklearn.ensemble import GradientBoostingRegressor
        gbr = GradientBoostingRegressor(n_estimators=100, max_depth=4, random_state=42)
        gbr.fit(X_train, y_train)
        xgb_preds = gbr.predict(X_test)

    xgb_mae = round(float(mean_absolute_error(y_test, xgb_preds)), 1)
    logger.info(
        f"[Evaluation Stats - XGBoost] y_true (first 10): {np.round(y_test[:10], 2).tolist()}, "
        f"var: {np.var(y_test):.4f}, std: {np.std(y_test):.4f}"
    )
    logger.info(
        f"[Evaluation Stats - XGBoost] y_pred (first 10): {np.round(xgb_preds[:10], 2).tolist()}, "
        f"var: {np.var(xgb_preds):.4f}, std: {np.std(xgb_preds):.4f}"
    )
    # Standard sklearn r2_score with full signed precision (3 decimals, unclamped)
    xgb_r2 = round(float(r2_score(y_test, xgb_preds)), 3)

    # 2. Global Mean Baseline (Predicting visible stations average)
    global_mean_preds = np.full_like(y_test, float(y_train.mean()))
    global_mean_mae = round(float(mean_absolute_error(y_test, global_mean_preds)), 1)
    logger.info(
        f"[Evaluation Stats - Global Mean] y_true (first 10): {np.round(y_test[:10], 2).tolist()}, "
        f"var: {np.var(y_test):.4f}, std: {np.std(y_test):.4f}"
    )
    logger.info(
        f"[Evaluation Stats - Global Mean] y_pred (first 10): {np.round(global_mean_preds[:10], 2).tolist()}, "
        f"var: {np.var(global_mean_preds):.4f}, std: {np.std(global_mean_preds):.4f}"
    )
    # Standard sklearn r2_score with full signed precision (3 decimals, unclamped)
    global_mean_r2 = round(float(r2_score(y_test, global_mean_preds)), 3)

    logger.info(f"[Evaluation] Spatial XGBoost Withheld ({len(y_test)} test points) - MAE: {xgb_mae} ug/m3, R2: {xgb_r2:.3f}")
    logger.info(f"[Evaluation] Global Mean Baseline Withheld ({len(y_test)} test points) - MAE: {global_mean_mae} ug/m3, R2: {global_mean_r2:.3f}")

    return xgb_mae, xgb_r2, global_mean_mae, global_mean_r2


# ---------------------------------------------------------
# Step 4: Model Export (ONNX & JSON Contract)
# ---------------------------------------------------------
def export_artifacts(
    model,
    withheld_stations: List[str],
    pinn_mae: float,
    pinn_r2: float,
    xgb_mae: float,
    xgb_r2: float,
    global_mean_mae: float,
    global_mean_r2: float,
    norm_params: dict = None,
):
    import torch
    os.makedirs(WEIGHTS_DIR, exist_ok=True)

    # 1. Export benchmark metrics strictly complying with AGENTS.md Section 5.3
    benchmark_payload = {
        "withheld_stations": withheld_stations,
        "metrics": [
            {"model": "Global Mean Baseline", "mae": global_mean_mae, "r2": global_mean_r2},
            {"model": "Spatial XGBoost", "mae": xgb_mae, "r2": xgb_r2},
            {"model": "PINN (Ours)", "mae": pinn_mae, "r2": pinn_r2},
        ],
    }

    with open(BENCHMARK_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(benchmark_payload, f, indent=2)
    logger.info(f"Saved benchmark metrics contract -> {BENCHMARK_JSON_PATH}")

    # 2. Export normalization parameters JSON (including train_mean, train_std for inverse transform)
    if norm_params:
        norm_params_path = os.path.join(WEIGHTS_DIR, "norm_params.json")
        with open(norm_params_path, "w", encoding="utf-8") as f:
            json.dump(norm_params, f, indent=2)
        logger.info(f"Saved normalization parameters -> {norm_params_path}")

    # 3. Export PyTorch state dict
    torch.save(model.state_dict(), PYTORCH_MODEL_PATH)
    logger.info(f"Saved PyTorch weights -> {PYTORCH_MODEL_PATH}")

    # 4. Export ONNX for CPU fast inference in FastAPI
    try:
        import onnx
        model.eval()
        dummy_input = torch.randn(1, len(PINN_FEATURE_COLS), dtype=torch.float32)
        torch.onnx.export(
            model.to("cpu"),
            dummy_input,
            ONNX_MODEL_PATH,
            export_params=True,
            opset_version=14,
            do_constant_folding=True,
            input_names=["features_input"],
            output_names=["predicted_pm25_norm"],
            dynamic_axes={"features_input": {0: "batch_size"}, "predicted_pm25_norm": {0: "batch_size"}},
        )
        if norm_params:
            onnx_model = onnx.load(ONNX_MODEL_PATH)
            onnx.helper.set_model_props(onnx_model, {
                "train_mean": str(norm_params.get("train_mean", 0.0)),
                "train_std": str(norm_params.get("train_std", 1.0)),
            })
            onnx.save(onnx_model, ONNX_MODEL_PATH)
            logger.info(f"Exported ONNX model with z-score metadata -> {ONNX_MODEL_PATH}")
        else:
            logger.info(f"Exported ONNX model -> {ONNX_MODEL_PATH}")
    except Exception as exc:
        logger.warning(f"ONNX export encountered an issue ({exc}). PyTorch weights are saved and ready.")


# ---------------------------------------------------------
# Step 5: Leave-One-Out Cross-Validation (LOOCV) Across All 12 Stations
# ---------------------------------------------------------
def run_leave_one_out_cv(raw_df: pd.DataFrame, epochs_per_fold: int = 100):
    """
    Leave-One-Out Cross-Validation across all 12 stations.
    In each iteration, holds out exactly 1 station as the test set and trains on the other 11.
    Evaluates PINN, Spatial XGBoost, and Global Mean Baseline.
    """
    import torch
    import torch.nn as nn
    import torch.optim as optim

    logger.info(f"\n{'='*88}\nStarting 12-Fold Leave-One-Out Cross-Validation (LOOCV)...\n{'='*88}")
    stations = sorted(raw_df["station_name"].unique())
    logger.info(f"Total stations to evaluate: {len(stations)} ({epochs_per_fold} epochs per fold for PINN)")

    results = []
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    for fold_idx, held_out_station in enumerate(stations, 1):
        train_df = raw_df[raw_df["station_name"] != held_out_station].copy()
        test_df = raw_df[raw_df["station_name"] == held_out_station].copy()

        # Normalization using TRAINING STATION STATISTICS ONLY
        u_min, u_max = float(train_df["u_wind"].min()), float(train_df["u_wind"].max())
        v_min, v_max = float(train_df["v_wind"].min()), float(train_df["v_wind"].max())
        temp_min, temp_max = float(train_df["temp_2m"].min()), float(train_df["temp_2m"].max())
        rh_min, rh_max = float(train_df["rel_humidity_2m"].min()), float(train_df["rel_humidity_2m"].max())
        cams_pm25_min, cams_pm25_max = float(train_df["cams_pm25_bg"].min()), float(train_df["cams_pm25_bg"].max())
        cams_no2_min, cams_no2_max = float(train_df["cams_no2_bg"].min()), float(train_df["cams_no2_bg"].max())

        for d in [train_df, test_df]:
            d["u_norm"] = ((d["u_wind"] - u_min) / max(1e-5, u_max - u_min)).clip(0, 1)
            d["v_norm"] = ((d["v_wind"] - v_min) / max(1e-5, v_max - v_min)).clip(0, 1)
            d["temp_norm"] = ((d["temp_2m"] - temp_min) / max(1e-5, temp_max - temp_min)).clip(0, 1)
            d["rh_norm"] = ((d["rel_humidity_2m"] - rh_min) / max(1e-5, rh_max - rh_min)).clip(0, 1)
            d["cams_pm25_norm"] = ((d["cams_pm25_bg"] - cams_pm25_min) / max(1e-5, cams_pm25_max - cams_pm25_min)).clip(0, 1)
            d["cams_no2_norm"] = ((d["cams_no2_bg"] - cams_no2_min) / max(1e-5, cams_no2_max - cams_no2_min)).clip(0, 1)

        train_mean = float(train_df["pm25"].mean())
        train_std = float(train_df["pm25"].std())
        if train_std < 1e-5:
            train_std = 1.0

        train_df["c_norm"] = (train_df["pm25"] - train_mean) / train_std
        test_df["c_norm"] = (test_df["pm25"] - train_mean) / train_std

        y_test = test_df["pm25"].values

        # 1. Global Mean Baseline
        gm_preds = np.full_like(y_test, train_mean)
        gm_mae = round(float(mean_absolute_error(y_test, gm_preds)), 2)
        gm_r2 = round(float(r2_score(y_test, gm_preds)), 3)

        # 2. Spatial XGBoost
        try:
            from xgboost import XGBRegressor
            xgb = XGBRegressor(n_estimators=100, max_depth=5, learning_rate=0.08, random_state=42)
            xgb.fit(train_df[XGB_FEATURE_COLS].values, train_df["pm25"].values)
            xgb_preds = xgb.predict(test_df[XGB_FEATURE_COLS].values)
        except Exception:
            from sklearn.ensemble import GradientBoostingRegressor
            gbr = GradientBoostingRegressor(n_estimators=100, max_depth=4, random_state=42)
            gbr.fit(train_df[XGB_FEATURE_COLS].values, train_df["pm25"].values)
            xgb_preds = gbr.predict(test_df[XGB_FEATURE_COLS].values)

        xgb_mae = round(float(mean_absolute_error(y_test, xgb_preds)), 2)
        xgb_r2 = round(float(r2_score(y_test, xgb_preds)), 3)

        # 3. PINN Model
        class Swish(nn.Module):
            def forward(self, x):
                return x * torch.sigmoid(x)

        pinn = nn.Sequential(
            nn.Linear(len(PINN_FEATURE_COLS), 64), Swish(),
            nn.Linear(64, 64), Swish(),
            nn.Linear(64, 64), Swish(),
            nn.Linear(64, 1),
        ).to(device)

        optimizer = optim.Adam(pinn.parameters(), lr=2e-3)
        scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=50, gamma=0.7)
        mse = nn.MSELoss()

        X_train_t = torch.tensor(train_df[PINN_FEATURE_COLS].values, dtype=torch.float32, device=device)
        Y_train_t = torch.tensor(train_df[["c_norm"]].values, dtype=torch.float32, device=device)
        X_test_t = torch.tensor(test_df[PINN_FEATURE_COLS].values, dtype=torch.float32, device=device)

        u_mean = float(train_df["u_norm"].mean())
        v_mean = float(train_df["v_norm"].mean())

        for epoch in range(epochs_per_fold):
            pinn.train()
            optimizer.zero_grad()
            c_pred = pinn(X_train_t)
            loss_data = mse(c_pred, Y_train_t)

            n_colloc = 1000
            rand_x = torch.rand((n_colloc, 1), device=device)
            rand_y = torch.rand((n_colloc, 1), device=device)
            rand_idx = torch.randint(0, len(X_train_t), (n_colloc,), device=device)
            sampled_temporal_weather = X_train_t[rand_idx, 2:]
            colloc_in = torch.cat([rand_x, rand_y, sampled_temporal_weather], dim=1).clone().detach().requires_grad_(True)
            c_colloc = pinn(colloc_in)

            grad_c = torch.autograd.grad(c_colloc, colloc_in, grad_outputs=torch.ones_like(c_colloc), create_graph=True, retain_graph=True)[0]
            dC_dx = grad_c[:, 0:1]
            dC_dy = grad_c[:, 1:2]
            dC_dt = grad_c[:, 2:3]

            d2C_dx2 = torch.autograd.grad(dC_dx, colloc_in, grad_outputs=torch.ones_like(dC_dx), create_graph=True, retain_graph=True)[0][:, 0:1]
            d2C_dy2 = torch.autograd.grad(dC_dy, colloc_in, grad_outputs=torch.ones_like(dC_dy), create_graph=True, retain_graph=True)[0][:, 1:2]

            pde_res = (dC_dt + u_mean * dC_dx + v_mean * dC_dy) - DIFFUSION_D * (d2C_dx2 + d2C_dy2) + DECAY_K * c_colloc
            loss_phys = torch.mean(pde_res ** 2)

            total_loss = loss_data + LAMBDA_PHYS * loss_phys
            total_loss.backward()
            optimizer.step()
            scheduler.step()

        pinn.eval()
        with torch.no_grad():
            c_pinn_norm = pinn(X_test_t).cpu().numpy().flatten()
            pinn_preds = np.clip(c_pinn_norm * train_std + train_mean, 0.0, 500.0)

        pinn_mae = round(float(mean_absolute_error(y_test, pinn_preds)), 2)
        pinn_r2 = round(float(r2_score(y_test, pinn_preds)), 3)

        results.append({
            "station": held_out_station,
            "n_samples": len(test_df),
            "gm_mae": gm_mae, "gm_r2": gm_r2,
            "xgb_mae": xgb_mae, "xgb_r2": xgb_r2,
            "pinn_mae": pinn_mae, "pinn_r2": pinn_r2,
        })
        logger.info(
            f"  [{fold_idx:02d}/{len(stations):02d}] {held_out_station:<44} | "
            f"GM MAE: {gm_mae:4.2f} R2: {gm_r2:6.3f} | "
            f"XGB MAE: {xgb_mae:4.2f} R2: {xgb_r2:6.3f} | "
            f"PINN MAE: {pinn_mae:4.2f} R2: {pinn_r2:6.3f}"
        )

    res_df = pd.DataFrame(results)
    avg_gm_mae = round(float(res_df["gm_mae"].mean()), 2)
    avg_gm_r2 = round(float(res_df["gm_r2"].mean()), 3)
    avg_xgb_mae = round(float(res_df["xgb_mae"].mean()), 2)
    avg_xgb_r2 = round(float(res_df["xgb_r2"].mean()), 3)
    avg_pinn_mae = round(float(res_df["pinn_mae"].mean()), 2)
    avg_pinn_r2 = round(float(res_df["pinn_r2"].mean()), 3)

    logger.info(f"\n{'='*88}\n12-FOLD LEAVE-ONE-OUT CROSS-VALIDATION SUMMARY TABLE\n{'='*88}")
    logger.info(f"{'Held-Out Station Name':<45} | {'Samples':<7} | {'GM MAE':<7} {'GM R2':<7} | {'XGB MAE':<7} {'XGB R2':<7} | {'PINN MAE':<8} {'PINN R2':<7}")
    logger.info(f"{'-'*45}-+-{'-'*7}-+-{'-'*7}-{'-'*7}-+-{'-'*7}-{'-'*7}-+-{'-'*8}-{'-'*7}")
    for _, row in res_df.iterrows():
        logger.info(
            f"{row['station']:<45} | {row['n_samples']:<7} | "
            f"{row['gm_mae']:<7.2f} {row['gm_r2']:<7.3f} | "
            f"{row['xgb_mae']:<7.2f} {row['xgb_r2']:<7.3f} | "
            f"{row['pinn_mae']:<8.2f} {row['pinn_r2']:<7.3f}"
        )
    logger.info(f"{'='*88}")
    logger.info(
        f"{'AVERAGE ACROSS ALL 12 FOLDS':<45} | {res_df['n_samples'].sum():<7} | "
        f"{avg_gm_mae:<7.2f} {avg_gm_r2:<7.3f} | "
        f"{avg_xgb_mae:<7.2f} {avg_xgb_r2:<7.3f} | "
        f"{avg_pinn_mae:<8.2f} {avg_pinn_r2:<7.3f}"
    )
    logger.info(f"{'='*88}\n")

    # Export LOOCV metrics JSON
    loocv_payload = {
        "evaluation_type": "Leave-One-Out Cross-Validation (12 Folds)",
        "epochs_per_fold": epochs_per_fold,
        "folds": results,
        "average_metrics": [
            {"model": "Global Mean Baseline", "mae": avg_gm_mae, "r2": avg_gm_r2},
            {"model": "Spatial XGBoost", "mae": avg_xgb_mae, "r2": avg_xgb_r2},
            {"model": "PINN (Ours)", "mae": avg_pinn_mae, "r2": avg_pinn_r2},
        ],
    }
    loocv_path = os.path.join(WEIGHTS_DIR, "loocv_benchmark_metrics.json")
    with open(loocv_path, "w", encoding="utf-8") as f:
        json.dump(loocv_payload, f, indent=2)
    logger.info(f"Saved LOOCV benchmark metrics -> {loocv_path}")

    return res_df


def main():
    logger.info("=== Starting PINN Training & Validation Experiment ===")
    train_df, test_df, norm_params = prepare_data(DATA_PATH)
    model, pinn_mae, pinn_r2 = train_pinn_model(train_df, test_df, norm_params)
    xgb_mae, xgb_r2, global_mean_mae, global_mean_r2 = train_baselines(train_df, test_df)
    export_artifacts(
        model,
        norm_params["withheld_stations"],
        pinn_mae,
        pinn_r2,
        xgb_mae,
        xgb_r2,
        global_mean_mae,
        global_mean_r2,
        norm_params,
    )

    # Execute 12-Fold Leave-One-Out Cross-Validation
    raw_df = pd.read_csv(DATA_PATH)
    raw_df["timestamp"] = pd.to_datetime(raw_df["timestamp"])
    min_time = raw_df["timestamp"].min()
    max_time = raw_df["timestamp"].max()
    time_range = max(1.0, (max_time - min_time).total_seconds())
    raw_df["t_norm"] = (raw_df["timestamp"] - min_time).dt.total_seconds() / time_range
    raw_df["x_norm"] = ((raw_df["lon"] - 73.75) / (73.98 - 73.75)).clip(0, 1)
    raw_df["y_norm"] = ((raw_df["lat"] - 18.44) / (18.65 - 18.44)).clip(0, 1)
    hours = raw_df["timestamp"].dt.hour + raw_df["timestamp"].dt.minute / 60.0
    raw_df["sin_hour"] = np.sin(2.0 * np.pi * hours / 24.0)
    raw_df["cos_hour"] = np.cos(2.0 * np.pi * hours / 24.0)

    loocv_df = run_leave_one_out_cv(raw_df, epochs_per_fold=100)

    logger.info("=== PINN Training, LOOCV & Validation Engine Complete ===")


if __name__ == "__main__":
    main()
