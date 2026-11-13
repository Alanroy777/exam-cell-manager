# Exam Cell Manager

Offline Windows Desktop Application for Exam Cell operations at College of Engineering Poonjar. Built with Electron, React, TypeScript, Tailwind CSS, SQLite, and Drizzle ORM.

## Features

- **Dashboard & Session Management**: Organize examination sessions, time slots, and schedules.
- **Halls & Seating Arrangement**: Intelligent hall allocation and student seating plans with interactive layouts.
- **Student Data Management**: Import and validate student enrollments via Excel.
- **Invigilator Duty Assignment**: Duty scheduling and workload balancing for faculty members.
- **Document & Notice Generation**: Automated generation of attendance sheets, seating arrangement notices, and duty lists in DOCX and Excel formats.
- **Offline & Local Storage**: Fully local database powered by SQLite (via `better-sqlite3` and `drizzle-orm`) requiring no cloud connection.

## Tech Stack

- **Framework**: [Electron](https://www.electronjs.org/) + [React 18](https://reactjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + Lucide Icons
- **Bundler**: [Vite](https://vitejs.dev/)
- **Database**: SQLite via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) & [Drizzle ORM](https://orm.drizzle.team/)
- **Document Exporting**: [exceljs](https://github.com/exceljs/exceljs), [docxtemplater](https://github.com/open-xml-templating/docxtemplater), [pizzip](https://github.com/open-xml-templating/pizzip)
- **Packaging**: [electron-builder](https://www.electron.build/)

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or pnpm

### Installation

```bash
git clone https://github.com/Alanroy777/exam-cell-manager.git
cd exam-cell-manager
npm install
```

### Development

Run the Vite dev server and launch Electron:

```bash
npm run electron:dev
```

Or run frontend dev only:

```bash
npm run dev
```

### Build

Compile TypeScript and build the React frontend and Electron bundle:

```bash
npm run build:all
```

Generate Windows installer / portable executable:

```bash
npm run dist
# or for portable build
npm run dist:portable
```

## License

Private / Proprietary. All rights reserved.

