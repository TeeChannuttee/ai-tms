# AI-TMS 3-Tier Testing Manual 🧪

This guide provides step-by-step instructions to verify that the Backend, Driver Mobile, and Planner UI are fully integrated and functional.

---

## 1. Environment Verification 🔌
Before testing, ensure all services are running:
- **Backend (Go)**: `go run cmd/server/main.go` (Port 8080)
- **AI Service (Python)**: `uvicorn main:app --port 8000`
- **Planner UI (Next.js)**: `npm run dev` (Port 3000)
- **Driver Mobile (Expo)**: `npx expo start` (Open on phone or emulator)

---

## 2. Phase 1: Authentication & Shared Identity 🔐
**Goal**: Verify that users can access their respective platforms.

- **[ ] Planner Login**: Open `http://localhost:3000` and login as a Planner/Admin.
- **[ ] Driver Login**: Open the mobile app. Login as a Driver. Verify "Remember Me" works by restarting the app.
- **[ ] Identity Sync**: Ensure the mobile app displays the correct Driver Name and Vehicle Plate in the **Settings** or **Profile** tab.

---

## 3. Phase 2: The Delivery Lifecycle 🚛
**Goal**: Verify the end-to-end flow from planning to completion.

- **[ ] 1. Check Routes**: On Mobile, go to the **Routes** tab. Pull-down to refresh. You should see today's assigned routes.
- **[ ] 2. Start Work**: Tap on a route -> Tap **Start Route**. Verify the button text changes or the state transitions to "In Progress".
- **[ ] 3. Arrival**: Tap the first stop. Tap **Mark as Arrived**.
    - *UI Check*: Go to the **Dispatch Monitoring** page on the Planner UI. Verify the truck status for this vehicle changed to "Arrived".
- **[ ] 4. Delivery & POD**: Tap **Confirm Delivery**.
    - Capture a photo.
    - Sign the screen.
    - Type the recipient's name.
    - Tap **Submit POD**.
- **[ ] 5. Completion**: Verify the stop is marked as "Delivered" on the mobile app.

---

## 4. Phase 3: Real-Time Fleet Awareness 🛰️
**Goal**: Verify GPS telemetry and Live Map updates.

- **[ ] 1. Background Pings**: While the mobile app is open (or in background), walk/move or use a GPS simulator.
- **[ ] 2. Live Tracking**: Open the **GPS Tracking** tab on the Planner UI.
    - Verify your truck icon moves on the map every few seconds.
    - Click the icon to see real-time speed and heading updates.
- **[ ] 3. Dashboard Pulse**: Open the **Dashboard**. Verify the "Completed Today" card updates within seconds of your delivery on mobile.

---

## 5. Phase 4: AI Support (The Copilot) 🤖
**Goal**: Verify Thai-language AI analysis.

- **[ ] 1. Open Copilot**: Go to the **AI Copilot** tab on the Planner UI.
- **[ ] 2. Ask a Question**: Type (in Thai): `"สรุปสถานะการส่งของวันนี้หน่อย"` (Summarize today's status).
- **[ ] 3. Verify Response**: Ensure the AI uses real data (e.g., mentions the number of active routes or specific delays) rather than generalities.
- **[ ] 4. Role-Based Queries**: Try: `"ต้องการลดค่าขนส่ง ทำได้อย่างไรบ้าง?"` (How can I reduce transport costs?).

---

## 6. Phase 5: Reliability & Offline 🛡️
**Goal**: Verify the system handles real-world connectivity issues.

- **[ ] 1. Offline Mode**: Turn on Airplane Mode on the mobile phone.
- **[ ] 2. Action Cache**: Perform an "Arrive" and "Deliver" action. Verify they appear in the **Outbox** (Sync) tab as "Pending".
- **[ ] 3. Re-Sync**: Turn off Airplane Mode. Verify the items automatically process and disappear from the Outbox.
- **[ ] 4. Data Integrity**: Check the Backend DB or Planner UI to confirm the late-synced data is identical to real-time data.

---
> [!TIP]
> **Pro-Tip**: Keep the Browser Console (F12) open on the Planner UI and use `Logcat`/`Console` for the mobile app to watch the real-time events firing between the tiers!
