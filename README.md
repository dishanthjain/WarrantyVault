# WarrantyVault 🔐
### Smart Product Warranty & Document Management System

WarrantyVault is a full-stack web application designed to help users organize product purchases, manage warranty information, store important documents, and track warranty expiration dates in one centralized platform.

The application combines a modern React dashboard with an Express.js backend and MySQL database. It also includes document scanning with OCR to help extract useful information from receipts and warranty documents.

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [Project Architecture](#-project-architecture)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Installation and Setup](#-installation-and-setup)
- [Database Configuration](#-database-configuration)
- [Environment Variables](#-environment-variables)
- [Running the Application](#-running-the-application)
- [API Overview](#-api-overview)
- [Document Scanning and OCR](#-document-scanning-and-ocr)
- [Warranty Expiry Reminders](#-warranty-expiry-reminders)
- [Security Considerations](#-security-considerations)
- [Troubleshooting](#-troubleshooting)
- [Future Enhancements](#-future-enhancements)
- [Author](#-author)

---

## 🚀 Overview

Managing product warranties can become difficult when purchase receipts, warranty cards, serial numbers, and expiration dates are scattered across emails, physical documents, and different applications.

WarrantyVault aims to simplify this process by providing a centralized dashboard for managing products and their associated warranty information.

The application is built around the following workflow:

1. Register purchased products.
2. Record purchase details and warranty periods.
3. Organize warranties and related documents.
4. Scan receipts and extract text using Optical Character Recognition (OCR).
5. Monitor warranty expiration dates.
6. Access product and warranty information through a centralized dashboard.

The project demonstrates the integration of frontend development, REST API design, relational database management, document processing, and backend automation.

## ✨ Features

### 📊 Dashboard

- Centralized dashboard for warranty and product information.
- Overview of registered products, purchases, warranties, and repairs.
- Navigation between the application's major sections.
- Dark-green visual theme with a responsive interface.

### 📦 Product Management

- Register and organize purchased products.
- Maintain product information and identifiers.
- Associate products with purchase and warranty records.
- View product information from the dashboard.

### 🛡️ Warranty Management

- Store warranty details associated with products.
- Track warranty start and end dates.
- Identify warranties approaching their expiration date.
- Maintain a centralized record of warranty coverage.

### 🧾 Purchase Management

- Organize purchase records.
- Maintain transaction details and purchase dates.
- Associate purchases with registered products.

### 🔧 Repair Management

- Maintain repair-related records.
- Organize repair information associated with products.
- Keep product maintenance information alongside warranty records.

### 📷 Document Scanning and OCR

- Access a document-scanning interface from the dashboard.
- Capture receipt or document images using a supported camera.
- Extract text from captured images using Tesseract.js.
- Identify potential product details, brand names, serial numbers, dates, prices, and transaction references.
- Review and edit extracted information before saving.
- Save scanned documents and their extracted text to the backend when the document-storage feature is configured.
- Associate saved documents with registered products where supported.

**Note:** OCR results depend on image quality, lighting, text clarity, and document layout. Extracted information should be checked before saving.

### 🔔 Warranty Expiry Reminders

The project includes database preparation for warranty reminder functionality. The reminder workflow depends on the corresponding backend implementation and configuration.

The intended functionality includes:

- Tracking upcoming warranty expiration dates.
- Providing dashboard notifications.
- Sending scheduled reminders before expiration.
- Avoiding duplicate reminders through persistent reminder records.

Actual email delivery requires SMTP configuration, and the reminder workflow should be tested before relying on it.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React |
| Frontend tooling | Vite |
| Styling | CSS |
| Icons | Lucide React |
| OCR | Tesseract.js |
| Backend | Node.js |
| API framework | Express.js |
| Database | MySQL |
| Database driver | mysql2 |
| Configuration | dotenv |
| Cross-origin requests | CORS |
| Document storage | MySQL binary storage using `LONGBLOB` |
| Version control | Git and GitHub |

Additional dependencies may be used for scheduled tasks and email notifications, depending on the installed backend implementation.

---

## 🏗️ Project Architecture

WarrantyVault follows a client-server architecture.

```text
                  ┌──────────────────────┐
                  │        User          │
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │   React + Vite UI    │
                  │                      │
                  │ Dashboard            │
                  │ Products             │
                  │ Warranties           │
                  │ Purchases            │
                  │ Repairs              │
                  │ Document Scanner     │
                  └──────────┬───────────┘
                             │
                        HTTP / REST
                             │
                             ▼
                  ┌──────────────────────┐
                  │   Express.js API     │
                  │                      │
                  │ Route Handlers       │
                  │ Business Logic       │
                  │ Document Processing  │
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │     MySQL Database   │
                  │                      │
                  │ Products             │
                  │ Purchases            │
                  │ Warranties           │
                  │ Repairs              │
                  │ Documents            │
                  │ Reminder Records*    │
                  └──────────────────────┘
```

`*` Reminder storage depends on the corresponding database migration.

The frontend communicates with the backend through HTTP requests. The backend processes requests and interacts with MySQL using the configured database connection.

---

## 📁 Project Structure

```text
WarrantyVault/
│
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── index.js
│   │   │   └── documents.js
│   │   ├── db.js
│   │   └── server.js
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── ...
│   ├── package.json
│   └── index.html
│
├── database.sql
├── database_documents.sql
├── database_reminders.sql
├── .gitignore
└── README.md
```

The exact file structure may vary with subsequent development. The `warrantyvault-scan/` directory, if retained locally, is a supplementary bundle rather than a required application directory.

---

## 💻 Prerequisites

Install the following before running WarrantyVault:

- **Node.js and npm** — to run the frontend and backend.
- **MySQL Server** — to store application data.
- **Git** — to clone and manage the repository.
- **A modern browser** — for the web interface and camera functionality.

Verify your installations:

```bash
node --version
npm --version
mysql --version
git --version
```

---

## ⚙️ Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/dishanthjain/WarrantyVault.git
cd WarrantyVault
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Configure backend environment variables

Create a `.env` file inside the `backend/` directory.

Example:

```env
PORT=5001
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=warrantyvault
```

Replace `your_mysql_password` with the credentials configured for your MySQL account.

Do not commit the real `.env` file to GitHub.

### 4. Install frontend dependencies

Open another terminal and navigate to the frontend directory:

```bash
cd frontend
npm install
```

Install Tesseract.js if it is not already included in the frontend dependencies:

```bash
npm install tesseract.js
```

---

## 🗄️ Database Configuration

WarrantyVault uses MySQL as its relational database.

### 1. Create the database

Ensure the MySQL server is running and create the database if necessary:

```sql
CREATE DATABASE IF NOT EXISTS warrantyvault;
```

### 2. Import the main schema

From the project root, run:

```bash
mysql -u root -p < database.sql
```

Enter your MySQL password when prompted.

If your MySQL account uses socket authentication or does not require a password, use the appropriate connection command for your local setup.

### 3. Create the document storage table

Run:

```bash
mysql -u root -p < database_documents.sql
```

This migration creates the `Documents` table used to store document metadata, extracted text, and binary image data.

### 4. Apply the reminder migration

If the reminder migration is part of your current implementation, run:

```bash
mysql -u root -p < database_reminders.sql
```

Ensure the backend and migration use the same database name and schema.

**Important:** Apply migrations in an order compatible with their foreign-key dependencies. Back up existing data before applying schema changes to a database containing important records.

---

## 🔐 Environment Variables

The backend configuration belongs in `backend/.env`.

| Variable | Purpose |
|---|---|
| `PORT` | Backend server port |
| `DB_HOST` | MySQL server hostname |
| `DB_PORT` | MySQL server port |
| `DB_USER` | MySQL username |
| `DB_PASSWORD` | MySQL password |
| `DB_NAME` | Database name |

If email notifications are implemented, configure the SMTP variables required by the backend, for example:

```env
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
```

Use the exact variable names expected by your email implementation. Never publish real SMTP credentials or passwords.

---

## ▶️ Running the Application

Run the backend and frontend in separate terminals.

### Terminal 1: Backend

```bash
cd backend
npm run dev
```

The backend is expected to run on:

```text
http://localhost:5001
```

Check the actual startup output if your backend uses a different command or port.

### Terminal 2: Frontend

```bash
cd frontend
npm run dev
```

Open the local Vite URL, usually:

```text
http://localhost:5173
```

The frontend's API base URL should point to the backend, for example:

```javascript
const API = 'http://localhost:5001/api';
```

Ensure that the frontend and backend configuration agree.

---

## 🔌 API Overview

The Express backend exposes REST API routes for the application's main resources.

The exact endpoints are defined in `backend/src/routes/index.js` and `backend/src/routes/documents.js`.

| Resource | Purpose |
|---|---|
| Products | Manage product records |
| Purchases | Manage purchase information |
| Warranties | Manage warranty records |
| Repairs | Manage repair information |
| Dashboard | Retrieve dashboard information |
| Documents | Save, retrieve, download, and delete scanned documents |
| Notifications | Support warranty reminders if implemented |

### Document API

The document router is mounted under:

```text
/api/documents
```

The implemented document operations are intended to include:

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/documents` | Retrieve document metadata |
| `POST` | `/api/documents` | Save a document and associated metadata |
| `GET` | `/api/documents/:id/download` | Download a stored document |
| `DELETE` | `/api/documents/:id` | Delete a stored document |

The exact request fields, response formats, and error handling should be checked in the backend route implementation.

---

## 📷 Document Scanning and OCR

The document-scanning workflow uses browser camera access and Tesseract.js.

### Workflow

1. Open the document scanner.
2. Allow camera access when requested.
3. Position the receipt or document inside the camera preview.
4. Capture the image.
5. Run OCR to recognize visible text.
6. Review the suggested product, brand, serial number, dates, price, and other fields.
7. Correct any inaccurate values.
8. Save the scanned document or register the product using the available interface.

### Camera requirements

- Camera access must be granted by the browser.
- Localhost is generally treated as a secure context for camera access.
- OCR performance depends on document quality and lighting.
- The first OCR run may need to download language data, requiring an internet connection.

Always verify the extracted values before saving them as official product or warranty information.

---

## 🔔 Warranty Expiry Reminders

Warranty expiry reminders are designed to help users identify warranties that are approaching their end dates.

A complete reminder implementation may include:

- Daily backend checks.
- Reminders 30 days before expiry, 7 days before expiry, and on the expiry date.
- Persistent reminder records to prevent duplicates.
- In-app notification indicators.
- Optional email delivery through an SMTP provider.

To verify the feature, check the reminder scheduler, notification API, database migration, and SMTP configuration in the current codebase. A database migration alone does not enable automatic notifications.

---

## 🔒 Security Considerations

- Keep `.env` files out of version control.
- Never publish passwords, API keys, or SMTP credentials.
- Validate and sanitize data received through API requests.
- Restrict document upload size and validate supported file types.
- Use parameterized SQL queries to reduce SQL injection risks.
- Configure appropriate CORS policies for deployment.
- Use HTTPS and suitable authentication and authorization before exposing the application publicly.
- Back up the database and any important stored documents.
- Avoid committing `node_modules/`, generated build output, and local operating-system files.

---

## 🧪 Troubleshooting

### MySQL access denied

Verify the username, password, host, and port in `backend/.env`.

```bash
mysql -u root -p
```

A successful command-line connection confirms that the supplied credentials work for that connection method.

### Backend fails to start

Check that backend dependencies are installed and environment variables are configured correctly.

```bash
cd backend
npm install
npm run dev
```

### Frontend cannot reach the backend

- Confirm that the backend is running.
- Check the API base URL in the frontend.
- Check the backend port and CORS configuration.
- Review browser developer tools and backend logs for errors.

### Camera does not open

- Grant camera permission in the browser.
- Ensure no other application is blocking the camera.
- Use localhost or HTTPS.
- Verify that the browser supports the required media APIs.

### OCR returns incorrect values

- Improve lighting and focus.
- Capture the receipt straight-on.
- Avoid glare and shadows.
- Review and correct the extracted fields manually.

### Document saving fails

Check that the `Documents` table exists, the backend database connection works, and the document upload size is within the configured server limit.

---

## 🚀 Future Enhancements

Potential improvements include:

- User authentication and secure account management.
- Multi-user warranty management.
- Automatic email and in-app reminders.
- Improved receipt parsing and field validation.
- PDF and additional document-format support.
- Search, sorting, filtering, and export features.
- Cloud backup and secure document storage.
- Warranty claim tracking.
- Deployment with production environment configuration.
- Automated tests for APIs, database operations, and reminder scheduling.

---

## 👨‍💻 Author

**Dishanth Jain**

- GitHub: [@dishanthjain](https://github.com/dishanthjain)
- LinkedIn: [Dishanth Jain](https://www.linkedin.com/in/dishanth-jain-86a172381/)

---


**WarrantyVault — Keep your products, purchases, warranties, and important documents organized in one place.**
