<div align="center">

# 🛍️ Baianat Store | Enterprise Full-Stack E-commerce Ecosystem
### *A high-performance, scalable, and feature-rich digital commerce platform engineered for seamless user experience and robust administrative control.*

[![React](https://img.shields.io/badge/React-18.x-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-green?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)

</div>

---

## 📖 Executive Summary
**Baianat Store** is an enterprise-grade full-stack e-commerce web application meticulously designed to bridge the gap between high-end consumer UI/UX and powerful backend management. Featuring real-time state management, advanced relational database architecture, secure authentication, and deep data analytics, this platform delivers a production-ready shopping ecosystem.

---

## ✨ Core Architecture & Key Features

### 🛒 Consumer Experience (Frontend)
- **Advanced Product Discovery:** Dynamic search, multi-criteria filtering by category, and an intelligent **Related Products** recommendation engine.
- **Interactive Engagement:** Real-time customer reviews, dynamic rating system (Social Proof), and wishlist management.
- **Streamlined Checkout Workflow:** Built-in client-side form validation, coupon/discount code application system, and PDF invoice generation capabilities.
- **Optimized UI/UX:** Fully responsive layout styled with Tailwind CSS, accompanied by custom loading skeletons and smooth spinners for zero-latency perception.

### ⚙️ Backend & Administration (Backend / Database)
- **Comprehensive Admin Dashboard:** Real-time inventory tracking, order management, and visual analytics powered by interactive charts (`Recharts`).
- **RESTful API Architecture:** Robust endpoints built with Node.js and Express, implementing secure CORS policies and global error-handling boundaries.
- **Secure Data Layer:** Type-safe database management utilizing **Prisma ORM** with secure user authentication and session management.

---

## 🛠️ Technology Stack

| Component | Technology / Tools |
| :--- | :--- |
| **Frontend** | React, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts |
| **Backend** | Node.js, Express.js, REST APIs |
| **Database & ORM** | Prisma ORM, SQLite / PostgreSQL |
| **State & Auth** | React Context / Hooks, Firebase Authentication |
| **Version Control** | Git & GitHub |

---

## 📂 Project Structure

```text
baianat/
├── backend/            # Express Server, Routes, and Controllers
├── my-app/             # React + TypeScript Frontend (Vite)
├── prisma/             # Database Schema, Migrations, and Seeding
└── .gitignore          # Production-grade ignore rules
