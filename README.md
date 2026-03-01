# 🔐 SentinelAI  
**Behavior-Based Identity Theft Detection System**
https://sentinel-ai-flax.vercel.app/

---

## 🚀 Project Overview

SentinelAI is a web-based analytics platform that detects suspicious login behavior and identity theft using behavioral anomaly detection.  
It empowers organizations to identify high-risk login events before damage occurs by analyzing patterns in login metadata such as location, device, time, and frequency.

This repository contains the frontend dashboard built in **React, TypeScript, and Vite** with visualizations, anomaly alerts, and risk scoring.

---

## 📊 Key Features

✔ Drag-and-Drop CSV Ingestion  
✔ Multi-Signal Anomaly Detection  
✔ Risk Scoring Engine (0–100 scale)  
✔ Interactive Behavior Visualizations  
✔ Filterable Alerts Dashboard  
✔ Premium Dark UI with Sidebar Navigation  
✔ CSV Column Aliases Supported  
✔ Demo Dataset Included  

---

## 🧠 Detection Logic (Explained Simply)

Each login attempt is scored using weighted anomaly signals such as:

| Signal | Weight | Meaning |
|--------|--------|---------|
| Impossible Travel | 30 | Unphysical travel speed between logins |
| New Location | 26 | Country/city not seen before for the user |
| New Device | 24 | Device not previously seen |
| Frequency Anomaly | 22 | Login rate outside expected patterns |
| Failed Login | 18 | Unsuccessful attempt |
| Off-hours Activity | 15 | Login outside usual hours |

Thresholds:
- **Low Risk:** < 45  
- **Medium Risk:** 45–69  
- **High Risk:** ≥ 70

---

## 🧩 Required CSV Columns

Minimum:
- `timestamp`  
- `userId`

Optional but recommended:
- `location`
- `device`
- `loginStatus`
- `ipAddress`

Aliases supported:
- `user`, `username` → `userId`  
- `time`, `datetime` → `timestamp` 

---

## 🛠️ Tech Stack

- **Frontend:** React 19 + TypeScript + Vite  
- **UI Visualizations:** Recharts  
- **Routing:** React Router  
- **CSV Parsing:** PapaParse  
- **Theme:** Dark cybersecurity style  
- **Build Tool:** Vite 

---

## 🧪 Run Locally (Development)

```bash
# 1. Clone the repository
git clone https://github.com/Noyoucringe/SentinelAI.git

cd SentinelAI

# 2. Install dependencies
npm install

# 3. Run development server
npm run dev
