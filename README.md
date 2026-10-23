# Salon Management System — Sage & Serenity

A complete college minor project using React, Vite, plain CSS, Express, Mongoose and MongoDB sessions. Public visitors discover treatments, offers and specialists. Customers book visits, manage profiles, see bills and review completed visits. Admins manage the catalogue, schedule, payment records, customers and reviews.

## Setup and run

Node.js 20.19+ or 22.12+ and MongoDB are required. Run commands from `salon-management-system/`. On Windows PowerShell, use `npm.cmd` if script execution policy blocks `npm`.

The supplied workspace was empty, so package manifests and example environment files were created. No real `.env` file was created or changed. Dependencies have been installed and lockfiles are included.

1. Copy `backend/.env.example` to `backend/.env`. Set a strong `SESSION_SECRET` and your own `SEED_ADMIN_NAME`, `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`. Configure MongoDB if it is not on localhost. The application and sessions must use separate database names.
2. Optionally copy `frontend/.env.example` to `frontend/.env`; without it the frontend defaults to `http://localhost:5001/api`.
3. Run the following in a terminal:

```powershell
cd backend
npm install
npm run seed
npm run dev
```

4. In another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. Use localhost consistently; the configured CORS and write-origin checks intentionally reject other origins, including `127.0.0.1` unless `CLIENT_URL` is changed accordingly. The backend runs at **http://localhost:5001**.

Shared customer/admin login: **http://localhost:5173/login**. Email is the value you set in `SEED_ADMIN_EMAIL`; password is the value in `SEED_ADMIN_PASSWORD`. There was no existing `.env`, so no real admin login was available to report. Seeding preserves existing admin credentials. Test credentials are randomly generated in isolated databases and removed afterward.

The seed adds six categories, 24 treatments, six specialists, and three offers. `GLOW15` is initially valid, `PAST20` is expired, and `SOON10` is inactive. Because seeding preserves existing records, it does not extend old offer dates on later runs. No fake customer reviews are inserted.

### Optional realistic testing data

From `backend/`, run `npm run seed:demo`. This explicitly adds synthetic demo records while preserving existing customer/admin data. Repeating it does not duplicate appointments or reset demo passwords. Default `npm run seed` still adds only the catalogue/admin data.

The expanded demo contains 20 customers, 72 appointments (36 completed, 12 pending, 12 confirmed, 12 cancelled), 36 bills, and 24 clearly labelled demo reviews. It also adds 12 treatments, six specialists and the `DEMO20`/`WEEKDAY12` offers alongside `DEMO10`. Existing admin changes to demo records are preserved. Appointment dates are relative to the first run, use specialist working days/hours and free slots, and include treatment price/duration snapshots. Existing demo appointments remain unchanged on subsequent runs. Reviews belong to completed appointments; paid bills populate dashboard revenue. These are fictional testing records, not actual customer data.

All new demo customers use password **`SalonDemo123`** at **http://localhost:5173/login**:

| Customer | Login email |
| --- | --- |
| Aditi Deshmukh | aditi.demo@example.com |
| Rohan Mehta | rohan.demo@example.com |
| Sneha Kulkarni | sneha.demo@example.com |
| Vikram Joshi | vikram.demo@example.com |
| Neha Shah | neha.demo@example.com |
| Aarav Patil | aarav.demo@example.com |
| Isha Rao | isha.demo@example.com |
| Dev Malhotra | dev.demo@example.com |
| Anjali Verma | anjali.demo@example.com |
| Kunal Bhat | kunal.demo@example.com |
| Pooja Nair | pooja.demo@example.com |
| Siddharth Jain | siddharth.demo@example.com |
| Tanvi More | tanvi.demo@example.com |
| Nikhil Sen | nikhil.demo@example.com |
| Maya Dutta | maya.demo@example.com |
| Rahul Sethi | rahul.demo@example.com |
| Kavya Iyer | kavya.demo@example.com |
| Aditya Menon | aditya.demo@example.com |
| Sana Khan | sana.demo@example.com |
| Yash Gupta | yash.demo@example.com |

Aditi's account includes completed visits with bills/reviews and a confirmed upcoming visit. Neha's account includes pending and cancelled visits. Rohan has a completed visit without a review, allowing the review-creation flow to be tested. The admin uses the credentials configured in `.env` through the same login page.

Changing `SEED_ADMIN_EMAIL` or `SEED_ADMIN_PASSWORD` in `.env` does not automatically change stored credentials. From `backend/`, run `npm run seed -- --sync-admin` to explicitly create or update the admin matching the configured email. Other admin accounts are preserved. Both administrators and customers use `/login`. The server detects the role from verified credentials and opens the matching dashboard. Old `/admin/login` bookmarks redirect to `/login`.

## Implementation decisions

- Salon business time is **Asia/Kolkata**. Dates and appointment times are strings, while created/paid timestamps use MongoDB dates.
- One specialist handles the whole appointment; the first selected treatment determines the required specialization, including for “Any available specialist”. Multiple categories are permitted as requested by that first-service matching rule.
- An appointment may finish exactly at closing time. Slots repeat every 30 minutes from each specialist’s opening time.
- Booking and appointment-status operations share a process lock to prevent simultaneous booking races in this single Node server. **Run one backend process.** Multiple replicas need a distributed lock/transaction strategy before deployment.
- Cascades and appointment-service writes have sequential operations and compensation for booking write failures. They are not full multi-document database transactions; a process/database failure during a cascade can require recovery. The project works with standalone MongoDB.
- Admin completion may be recorded at any time, as the specification does not require waiting until the scheduled end. Final statuses cannot be changed.
- Bills record payments collected at the salon; there is no online payment. Deleting a bill is permanent and does not recreate it automatically.
- Branding, contact address and phone are illustrative college-project content. External image URLs and Google Fonts have local SVG/system font fallbacks. Every image has alternative text and an error fallback; decorative logos have empty alt text.
- Local MERN implementation only; no hosting service, extra runtime libraries, UI framework, or new application collections were added. Test helpers use Node built-ins and existing Mongoose.

## Project organisation

`backend/` contains configuration, ten explicit collection models, validation/slot utilities, authentication and origin middleware, controllers, routes and an idempotent seed script. `frontend/src/` contains lazy public/customer/admin pages, session context, protected routes, layouts, shared components and the CSS theme. Colours are controlled at the top of `styles/global.css`.

Lists are paginated with `page` and `limit` (maximum 100). Treatment search supports `search`, `categoryId`, `maxPrice`, and `sort=name|-name|price|-price`. Admin appointment filters are `status` and `date`. All APIs return `{ success, message, data }`; paginated data contains `{ items, total, page, limit, pages }`.

Categories, services, staff and offers have Active/Inactive switches in both the table and editor. `PATCH /api/admin/{entity}/:id/active` accepts a boolean `isActive` and changes only status. Form validation matches server limits: required names/categories, positive prices, whole-minute durations, ten-digit phones, working days/hours, offer percentages/date ranges/codes and complete HTTP(S) image URLs. Related historical records still prevent deletion; inactivate those records instead. Save/delete/toggle controls are disabled during writes, failures preserve form input, and deleting the current edit record closes its editor.

Categories, services and staff now use an **Upload image** chooser instead of a URL input, with a preview and replacement/removal controls. Accepted files: JPG, PNG and WebP, maximum 2 MB. The browser checks file type, size and decodability; the admin-only upload API also checks size, MIME type and file signatures. Images are stored in `backend/uploads/` with generated names and served by Express at `/uploads/`. Existing seeded remote URLs remain supported. Back up this directory with the database; images are kept when records are removed to avoid breaking any other references. No additional dependencies or collections were added.

Additional admin checks: from `frontend/`, run `node --test tests/entityValidation.test.mjs` for seven form-validation tests. With frontend/backend running and a seeded admin configured in `backend/.env`, run `node tests/admin-browser.mjs` to check authenticated CRUD, real image file selection, previews, upload persistence/replacement/removal, validation, switches, confirmations and mobile layouts. It creates uniquely named QA records and removes those records and test image files afterward; credentials are read locally without printing them.

Booking regression: with both servers running, use `node tests/booking-flow-browser.mjs` from `frontend/`. It verifies any/named specialist bookings, review/back preserving the chosen time, date changes clearing old time selections, and saved appointment dates/times. Its temporary customer and bookings are removed afterward.

## Verification

```powershell
cd backend
npm test
node tests/integration.mjs
cd ../frontend
npm run build
npm run lint
```

The integration script needs local MongoDB on port 27017 and free port 5099. It generates uniquely named temporary databases, seeds them twice, starts its own API, runs 140 API assertions plus concurrency/cascade/collection checks, stops the API, and removes only its test databases. It never writes credentials or changes `.env`.

Backend rule tests cover IST dates, slot intervals, overlaps, non-working days, duration/closing limits, the 30-day range, two-hour cancellation, concurrent-operation serialization and invalid inputs. The integration checks cover registration/login/logout, session persistence, password/profile edits, forbidden origins, role isolation, ownership, slots, conflicting bookings, offers, status transitions, automatic bills, paid revenue, review eligibility/uniqueness, CRUD, protected deletion, stats, account cascades and stale sessions after account deletion. This uses Node fetch with cookie jars, serving the same purpose as curl cookie-jar tests.

All 36 public/guarded-route browser checks passed at 360/768/1280px, including mobile navigation, inline login validation, show/hide password and no horizontal overflow. The mobile home screenshot was visually inspected. To repeat these checks, start Vite, then from `frontend/` run `node tests/browser-smoke.mjs`. It uses the locally installed Chrome via its debugging protocol and writes ignored screenshots/results in `test-results/`. Override `CHROME_PATH` for another Chrome location. No browser dependency is required.

Not verified: external production MongoDB credentials, actual user `.env` configuration, production hosting, payment gateways (out of scope), and authenticated browser flows against a persistent salon database. The reference template could not be fetched, so the supplied visual description was implemented independently.

## Ten likely viva questions

1. **What is MERN?** MongoDB stores documents, Express exposes APIs, React renders the interface, and Node runs the backend.
2. **Why use sessions instead of JWT?** The browser holds an httpOnly session cookie; login state stays in the separate MongoDB session database.
3. **How are passwords protected?** bcrypt hashes them using a configurable work factor; password fields are excluded from query responses.
4. **How do you prevent double booking?** Compare half-open intervals for pending/confirmed visits and serialize competing booking writes.
5. **Why are dates stored as strings?** Salon calendar dates and times stay stable across server timezones; IST is used explicitly for current-time rules.
6. **Why have appointmentServices?** It represents multiple treatments per appointment and snapshots price/duration so later menu edits do not alter old visits.
7. **How do customer and admin access differ?** Each session has one role; middleware enforces role and controllers check record ownership.
8. **When is a bill created?** When an admin changes a confirmed appointment to completed; a unique appointment reference prevents duplicate bills.
9. **What happens on account deletion?** The customer’s appointment services, bills, reviews and appointments are deleted before the user record.
10. **How does React keep login after refresh?** AuthContext calls `/auth/me` with credentials and protected routes wait for that result.
