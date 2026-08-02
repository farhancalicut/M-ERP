

# M-ERP (Modern Madrassa ERP)

## Overview

M-ERP is a **multi-tenant SaaS ERP platform** for madrassas.

One application serves **hundreds or thousands of madrassas**, while each madrassa has its own isolated ERP.


Madrassa ERP
Super Admin Platform
(App Owner)

↓

Creates and manages Madrassas

------------------------------


Madrassa ERP

↓

Used by

Management
Principal
Teacher
Parent
Alumni
```

---

# Super Admin Platform

The Super Admin is **the owner of the software**, not a madrassa staff member.

The Super Admin **cannot access students, attendance, marks, or academic records**.

His responsibility is only running the SaaS business.

---

## Super Admin Features

### Dashboard

Shows platform information only.

Examples:

* Total Madrassas
* Active Subscriptions
* Expired Subscriptions
* Locked Accounts
* Trial Accounts
* Monthly Revenue
* Total Customers
* firebase usage
* storage usage

---

### Madrassa Management

Create new madrassa

Edit madrassa

Suspend madrassa

Activate madrassa

Delete madrassa (Soft Delete)

Search madrassas

View subscription status

---

### Subscription Management

Assign plan

Renew

Extend

Lock

Unlock

Expiry date

Payment status

---

### Billing

Payment history

Invoices

Renewals

Receipts

Outstanding payments

---

### Platform Settings

Plans

Trial Days

Support Information

Application Branding

---

### Profile

Own profile

Password

Photo

---

# Creating a New Madrassa

The Super Admin opens

```
Create Madrassa
```

and fills

```
Madrassa Name

Address

Phone

Email

Manager Name

Manager Mobile

Manager Email

Subscription Plan

Subscription Expiry
```

After clicking

```
Create
```

System automatically

```
↓

Generate

MDR0001

↓

Generate Manager User ID

↓

Generate Temporary Password

↓

Create Madrassa

↓

Create Subscription

↓

Create Pending User

↓

Show Credentials
```

Example

```
Madrassa ID

MDR0001

Manager User ID

MGR0001

Temporary Password

X7HF82PQ
```

The Super Admin shares these credentials with the madrassa.

His work is finished.

---

# First Login

The Manager opens

```
Login
```

Uses

```
User ID

Temporary Password
```

System detects

```
Pending User
```

System asks

```
Create New Password
```

Firebase Authentication account is created.

Pending account is removed.

User becomes active.

---

# First Time Setup Wizard

Since the madrassa is new,

Manager is redirected to

```
Initial Setup
```

instead of Dashboard.

---

## Step 1

General Information

```
Logo

Address

Phone

Email

Academic Type

Timezone

Language
```

---

## Step 2

Academic Year

Example

```
2026-2027
```

---

## Step 3

Grade Settings

```
A

B

C

Pass Percentage

Fail Percentage
```

---

## Step 4

Attendance Settings

Teacher edit limit

Principal permissions

Holiday settings

---

## Step 5

Fee Categories

Monthly Tuition

Admission

Exam

Book

Transport

Custom

---

## Step 6

Create Principal



Wizard completed.

ERP is ready.

---

# User Hierarchy

```
Super Admin

↓

Management

↓

Principal

↓

Teacher

↓

Parent

↓

Alumni
```

---

# Management

Management manages the institution.

Can

Create Principal

Create Teachers

Manage Students

Manage Parents

Manage Fees

Manage Classes

View Reports

Configure Settings

Promotion

Attendance

Results

Notifications

Everything inside that madrassa.

Cannot manage other madrassas.

---

# Principal

Academic head.

Can

Manage Students

Attendance

Marks

Results

Promotion

Subjects

Teacher class Assignments

Academic Year

Settings

Grade Settings

Notice Board

Approve Marks

Lock Marks

Lock Attendance

Publish Results

---

# Teacher

Can only access

Assigned Classes

Assigned Subjects

Can

Take Attendance

Enter Marks

View Students

collect Fees

Upload Homework

View Notices

Cannot

Publish Results

Change Settings


---

# Parent

Login using

```
Madrassa ID

+

Mobile Number

+

Password
```

One parent account

↓

Multiple children

Switch between children

Can

View Attendance

View Marks

View Results

View Homework

View Notices

View Fee Due

View Payment History

Update Student profile

Upload Homework

Receive Notifications

Cannot edit academic records.

---

# Alumni

Login after graduation.

Can

View Profile

View Notices

View Achievements

View Donation Information

Receive Notifications

Cannot access student ERP.

---

# Student Admission Workflow

Principal

↓

Admission Form

↓

Search Parent Mobile

↓

Parent Exists?

YES

↓

Link Student

NO

↓

Create Parent

↓

Create Parent Pending Account

↓

Generate Credentials

↓

Admission Complete

---

# Teacher Assignment Workflow

Principal

↓

Assign Teacher

↓

Select

Class

Subjects

↓

Teacher user document updated

↓

Teacher Dashboard automatically changes

---

# Attendance Workflow

Teacher

↓

Select Class

↓

Select Date

↓

Mark Attendance

↓

Save Draft

↓

Submit


Parents immediately see attendance.

---

# Examination Workflow

Principal

↓

Create Exam

↓

Assign Subjects

↓

Teachers enter marks

↓

Submit

↓

Principal reviews

↓

Lock Marks

↓

Generate Result

↓

Publish Result

↓

Parents can view.

---

# Promotion Workflow

Principal

↓

Select Class

↓

System loads results

↓

Promote

Detain

Alumni

↓

Confirm

↓

Students updated

↓

Alumni accounts generated

↓

Promotion history saved

---

# Fee Workflow

Management

↓

Create Fee Categories

↓

Monthly Fee

↓

Book Fee

↓

Exam Fee

↓

Assign Fees

↓

Parent pays

↓

Payment recorded

↓

Due updated

↓

Receipt generated

---

# Notice Workflow

Management/Principal

↓

Create Notice

↓

Choose Audience

Everyone

Teachers

Parents

Students

Class

Specific Users

↓

Publish

↓

Notifications appear

↓

Bell icon updated

↓

Large audience reads tracked locally

↓

Specific notifications tracked in Firestore

---

# Reports

Management

↓

Student Reports

Attendance Reports

Fee Reports

Academic Reports

Exam Reports

Promotion Reports

Alumni Reports

Export Excel

Export PDF

---

# Security Model

Every request follows

```
Login

↓

Firebase Authentication

↓

User Document

↓

Role

↓

Madrassa ID

↓

Permission

↓

Firestore Security Rules

↓

Access Granted
```

No user can access another madrassa.

Even Super Admin cannot read academic data.

---

# Complete Account Creation Flow

```
Super Admin

↓

Create Madrassa

↓

Manager Pending Account

↓

Manager First Login

↓

Manager Creates Password

↓

Manager Configures Madrassa

↓

Manager Creates Principal

↓

management Creates Teachers

↓

Principal Admits Students

↓

Parents Receive Accounts

↓

Teachers Start Classes

↓

Attendance

↓

Exams

↓

Results

↓

Promotion

↓

Alumni
```

# Core Modules

### Super Admin Platform

* Dashboard
* Madrassa Management
* Subscription Management
* Billing
* Platform Settings
* Profile

### Madrassa ERP

* Authentication
* Dashboard
* Student Management
* Parent Management
* Teacher Management
* Academic Year
* Classes
* Subjects
* Teacher Assignments
* Attendance
* Examinations
* Marks
* Results
* Promotions
* Alumni
* Fees & Payments
* File Uploads
* Homework
* Notice Board
* Notifications
* Reports & Analytics
* Settings
* Audit Logs
* Profile