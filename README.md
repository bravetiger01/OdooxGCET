# DayFlow

A modern Human Resource Management System (HRMS) built with Next.js, designed to streamline employee management, payroll, attendance tracking, and leave management.

## Features

- **Employee Management** - Comprehensive employee profiles and records
- **Attendance Tracking** - Monitor and manage employee attendance
- **Leave Management** - Handle leave requests and approvals
- **Payroll System** - Process payroll and generate payslips
- **Approvals Workflow** - Streamlined approval processes
- **Reports & Analytics** - Generate insights with interactive charts
- **Settings & Configuration** - Customize system preferences

## Tech Stack

- **Framework:** Next.js 16 (React 19)
- **Styling:** Tailwind CSS 4
- **Database:** MySQL
- **Authentication:** Custom auth with bcrypt
- **Charts:** Recharts
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **Email:** Nodemailer
- **Language:** TypeScript

## Prerequisites

- Node.js 20 or higher
- MySQL database
- Gmail account (for email notifications)

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd frontend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example environment file and update with your credentials:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your configuration:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=workzen

# Email Configuration (Gmail)
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Application URLs
NEXT_PUBLIC_API_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000
```

### 4. Set up the database

Create a MySQL database named `workzen` and run the necessary migrations (if available in the `backend` folder).

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── (auth)/          # Authentication pages (login, signup)
│   │   ├── (dashboard)/     # Protected dashboard routes
│   │   │   ├── approvals/
│   │   │   ├── attendance/
│   │   │   ├── dashboard/
│   │   │   ├── employees/
│   │   │   ├── leaves/
│   │   │   ├── my-payslips/
│   │   │   ├── payroll/
│   │   │   ├── reports/
│   │   │   └── settings/
│   │   └── api/             # API routes
│   ├── components/          # Reusable UI components
│   ├── context/             # React context providers
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utility functions and configurations
│   └── types/               # TypeScript type definitions
├── public/                  # Static assets
└── backend/                 # Backend-related files
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Email Configuration

For Gmail integration, you need to generate an App Password:

1. Enable 2-factor authentication on your Google account
2. Go to Google Account Settings > Security > App Passwords
3. Generate a new app password for "Mail"
4. Use this password in your `.env.local` file

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request


## Support

For support or questions, please contact the development team.
