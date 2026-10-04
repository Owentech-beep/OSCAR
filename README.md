# OSCAR — AI Agency Operating System

OSCAR is an AI-powered agency operating system built for OwenTech.

It brings CRM, business intelligence, AI-assisted workflows, communication, project management, analytics, memory, and automation into a single operational platform.

OSCAR is designed as a real business system rather than a simulated chatbot. Business statistics are retrieved from application data, AI capabilities operate through controlled tools and services, and sensitive actions are designed around authorization, confirmation, and auditability.

---

## Table of Contents

- [Overview](#overview)
- [Core Capabilities](#core-capabilities)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [OSCAR AI Architecture](#oscar-ai-architecture)
- [3D OSCAR Brain](#3d-oscar-brain)
- [CRM](#crm)
- [Security](#security)
- [Environment Configuration](#environment-configuration)
- [Installation](#installation)
- [Running OSCAR](#running-oscar)
- [Database](#database)
- [Development Status](#development-status)
- [Roadmap](#roadmap)
- [Development Principles](#development-principles)

---

# Overview

OSCAR — **AI Agency Operating System** — is intended to function as the operational intelligence layer for an AI-powered agency.

The system is built around several major areas:

- Business intelligence
- Lead management
- Client management
- Project management
- Task management
- Email and outreach
- Calendar management
- Analytics
- Financial workflows
- Website analysis
- AI-assisted research
- Business memory
- Controlled AI tool calling
- Audit logging
- Future MCP integration
- Future voice interaction
- Proactive business intelligence

The long-term objective is for OSCAR to understand the agency's business context, retrieve relevant information, perform authorized operations through tools, and assist with day-to-day agency operations.

---

# Core Capabilities

## Dashboard

The dashboard provides the central operating interface for OSCAR.

It includes:

- Business overview
- Revenue metrics
- Active clients
- Potential leads
- Emails sent
- Responses
- Conversion rate
- Business activity
- OSCAR AI interface
- 3D OSCAR Brain
- Chat interface

Dashboard statistics are intended to come from real application data rather than hardcoded values.

---

## Lead Management

OSCAR includes a CRM lead management system.

Lead information includes:

- Company name
- Contact name
- Email
- Phone
- Website
- Industry
- Location
- Source
- Lead score
- Status
- Notes
- Last contact
- Next follow-up
- Assigned user
- Creation date
- Updated date

Supported lead statuses include:

- New
- Researching
- Qualified
- Contacted
- Interested
- Meeting
- Proposal
- Won
- Lost
- No Response

The system supports:

- Lead creation
- Lead viewing
- Lead updating
- Lead deletion
- Searching
- Filtering
- Sorting
- Pagination
- Lead analysis
- Lead qualification

---

# Client Management

The client management system provides CRUD operations for agency clients.

The architecture supports relationships between clients and other operational resources such as:

- Projects
- Tasks
- Meetings
- Emails
- Financial information

---

# Project Management

Projects are connected to clients and provide a structure for managing agency work.

Projects can be:

- Created
- Viewed
- Updated
- Deleted

Projects can also contain associated tasks.

---

# Task Management

Tasks provide actionable work items for projects and business operations.

Tasks support:

- Creation
- Updating
- Completion/status management
- Assignment
- Deletion
- Project relationships

---

# Calendar

OSCAR includes calendar functionality for managing meetings and scheduled business activities.

Calendar functionality supports:

- Creating meetings
- Viewing meetings
- Updating meetings
- Deleting meetings
- Client relationships
- Project relationships
- Date/time validation

---

# Email and Outreach

OSCAR includes an email and outreach architecture designed for controlled communication workflows.

The system supports:

- Email generation
- Email drafts
- Email sending
- Email statistics
- Outreach workflows
- Resend integration

Sensitive communication actions are designed to require appropriate authorization and confirmation rather than being silently executed by the AI.

---

# Analytics

OSCAR includes business analytics functionality for retrieving operational information.

Analytics can be used for:

- Revenue information
- Business metrics
- Business reports
- Lead pipeline information
- Client information
- Email activity

The system is designed so OSCAR does not invent business statistics when real data is unavailable.

---

# Website Analysis

OSCAR includes an architecture for analyzing lead websites.

Website analysis is intended to support:

- Website auditing
- Lead research
- Lead qualification
- Business intelligence
- Sales preparation

External website information should be treated as untrusted input and should never automatically override OSCAR's internal instructions or security controls.

---

# Architecture

OSCAR follows a layered architecture designed to separate the user interface, application logic, AI behavior, tools, integrations, and database.

```text
                         OSCAR
                           │
                           ▼
                  Server-rendered UI
                       EJS / CSS
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
        OSCAR Chat                 3D OSCAR Brain
              │                    React / Three.js
              │
              ▼
         Express API
              │
      ┌───────┼────────┐
      │       │        │
      ▼       ▼        ▼
   Routes  Services   Agents
      │       │        │
      │       │        ▼
      │       │      Tools
      │       │        │
      └───────┼────────┘
              │
              ▼
           MongoDB

oscar/
│
├── client/
│   ├── public/
│   │   └── models/
│   │       └── brain.glb
│   │
│   ├── src/
│   │   ├── components/
│   │   │   └── oscar-brain/
│   │   │       ├── BrainScene.tsx
│   │   │       ├── OscarBrain.tsx
│   │   │       ├── brain.activity.ts
│   │   │       ├── brain.css
│   │   │       ├── brain.state.ts
│   │   │       ├── brain.types.ts
│   │   │       └── brain.neural.ts
│   │   │
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   │
│   ├── package.json
│   └── vite.config.ts
│
├── server/
│   │
│   ├── agents/
│   │   ├── lead-qualification.agent.js
│   │   └── oscar.agent.js
│   │
│   ├── config/
│   │   ├── db.js
│   │   └── env.js
│   │
│   ├── controllers/
│   │
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── csrf.js
│   │   ├── errorHandler.js
│   │   └── security.js
│   │
│   ├── models/
│   │   ├── User.js
│   │   ├── Lead.js
│   │   ├── LeadAnalysis.js
│   │   ├── Client.js
│   │   ├── Project.js
│   │   ├── Task.js
│   │   ├── Meeting.js
│   │   ├── Email.js
│   │   ├── BusinessMetric.js
│   │   ├── ActivityLog.js
│   │   └── ...
│   │
│   ├── routes/
│   │
│   ├── services/
│   │
│   ├── tools/
│   │
│   ├── integrations/
│   │
│   ├── mcp/
│   │
│   ├── scripts/
│   │
│   └── app.js
│
├── public/
│   ├── css/
│   │   └── oscar.css
│   │
│   └── oscar-brain/
│       ├── assets/
│       └── models/
│           └── brain.glb
│
├── views/
│   ├── layouts/
│   │   └── main.ejs
│   │
│   ├── dashboard/
│   │   └── index.ejs
│   │
│   ├── leads/
│   ├── clients/
│   ├── projects/
│   ├── tasks/
│   ├── calendar/
│   └── ...
│
├── docs/
├── tests/
│
├── .env.example
├── .gitignore
├── package.json
└── README.md

get_business_metrics
get_business_context

get_leads
search_leads
create_lead
update_lead
delete_lead
analyze_lead
get_lead_analysis

analyze_website
get_website_audit

generate_email
send_email

get_clients
create_client
update_client
delete_client

get_projects
create_project
update_project
delete_project

get_tasks
create_task
update_task
delete_task

get_calendar_events
create_calendar_event
update_calendar_event
delete_calendar_event

get_revenue
generate_business_report

search_memory
save_memory

The intended workflow is:
User Request
     │
     ▼
OSCAR
     │
     ▼
Tool Selected
     │
     ▼
Confirmation Required?
     │
   ┌─┴─┐
   │   │
  YES  NO
   │   │
   ▼   ▼
Confirm Execute
   │
   ▼
Execute
   │
   ▼
Audit Log

License

This project is proprietary software developed for OwenTech.

Unauthorized copying, redistribution, or commercial use is not permitted without permission from the project owner.

Author
OwenTech

AI Agency Operating System
OSCAR