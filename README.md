# SmartKhet Planner

->A lightweight Indian farm planning system that recommends crops, irrigation schedules, fertilizer plans, and expected profit based on land resources.

---

## 1. Problem Statement

### Problem Title

->Farm Resource Allocation Optimization for Indian Farmers

### Problem Description

->Farmers must decide crop placement, irrigation schedules, and fertilizer distribution using limited resources such as water availability, soil type, and land size. These decisions are mostly based on experience rather than structured optimization, often resulting in inefficient resource usage and reduced profitability.

### Target Users

* Small and medium Indian farmers (1–10 acres)
* Agriculture students
* Agricultural advisors / extension workers

### Existing Gaps

* No simple planning tool for farmers
* Manual decision making based on guesswork
* No integration of soil, water, and profit together
* No visualization of farm allocation

---

## 2. Problem Understanding & Approach

### Root Cause Analysis

->Farm planning requires balancing multiple interdependent variables:

* Soil compatibility
* Water availability
* Crop season suitability
* Expected profitability

->Farmers lack a structured system to evaluate all constraints simultaneously.

### Solution Strategy

->Convert agricultural guidelines into a rule-based optimization engine that scores crops and generates the best farm plan automatically.

---

## 3. Proposed Solution

### Solution Overview

->AgroManager is a decision-support web application that recommends the best crop allocation plan using Indian agricultural standards and profitability metrics.

### Core Idea

->A constraint-based scoring algorithm evaluates crops using soil type, water availability, season, and MSP-based profit estimation.

### Key Features

* Farm input form (land, soil, water, season)
* Crop recommendation engine
* Land allocation optimization
* Irrigation scheduling
* Fertilizer recommendation
* Expected profit calculation
* Visual farm layout grid

---

## 4. System Architecture

### High-Level Flow

* User → Frontend → Backend → Optimization Engine → Database → Response

### Architecture Description

->The user submits farm details through a web interface. The backend processes inputs using a scoring algorithm and Indian agricultural rules stored in a JSON database. The optimized plan is returned and displayed visually on the dashboard.

### Architecture Diagram

<img width="1536" height="1024" alt="image" src="https://github.com/user-attachments/assets/24d5e8c3-1146-44ce-8b55-5dcf8e9c89f8" />


---

## 5. Database Design

### ER Diagram

<img width="1536" height="1024" alt="image" src="https://github.com/user-attachments/assets/06efa193-18f7-4a53-8d84-0f9ba1372d51" />


### ER Diagram Description

Entities:

* User Input
* Crop Database
* Recommendation Engine
* Output Plan

Relationships:
User input parameters filter crop database → scoring algorithm → generate optimized plan

---

## 6. Dataset Selected

### Dataset Name

Indian Crop Recommendation Knowledge Base (Custom Curated)

### Source

* ICAR Crop Production Guidelines
* Soil Health Card Standards
* Government MSP & Yield Statistics

### Data Type

Structured JSON rules dataset

### Selection Reason

Provides realistic and region-relevant agricultural recommendations for India.

### Preprocessing Steps

* Converted agricultural guidelines into rule tables
* Classified crops into low/medium/high water categories
* Added MSP and yield-based profit formula

---

## 7. Model Selected

### Model Name

Rule-Based Constraint Optimization Engine

### Selection Reasoning

Lightweight, interpretable, fast, and feasible within hackathon time constraints.

### Alternatives Considered

* Machine Learning regression models
* Neural networks
* Genetic algorithms

### Evaluation Metrics

* Feasibility of crop recommendation
* Resource utilization efficiency
* Expected profit improvement

---

## 8. Technology Stack

### Frontend

HTML, CSS, JavaScript

### Backend

Try to use Python Flask

### ML/AI
Try to use Rule-Based Optimization Algorithm

### Database

JSON File Storage

### Deployment

Localhost / Lightweight hosting

---

## 9. API Documentation & Testing

### API Endpoints List

* / : Load homepage
* /recommend : Generate crop plan
* /plan : Allocation and profit calculation

### API Testing Screenshots

(Add Postman / Thunder Client screenshots here)

---

## 10. Module-wise Development & Deliverables

### Checkpoint 1: Research & Planning

* Problem analysis
* Data identification

### Checkpoint 2: Backend Development

* Flask server
* API routes

### Checkpoint 3: Frontend Development

* Input form
* Dashboard UI

### Checkpoint 4: Model Training

* Rule creation and scoring logic

### Checkpoint 5: Model Integration

* Backend + database connection

### Checkpoint 6: Deployment

* End-to-end working prototype

---

## 11. End-to-End Workflow

1. User enters farm details
2. Backend receives request
3. Crops filtered by constraints
4. Scoring algorithm ranks crops
5. Allocation and profit calculated
6. Irrigation & fertilizer plan generated
7. Results displayed visually

---

## 12. Demo & Video

* Live Demo Link:
* Demo Video Link:
* GitHub Repository:

---

## 13. Hackathon Deliverables Summary

* Working web application
* Optimization algorithm
* Indian agriculture-based dataset
* Visualization dashboard

---

## 14. Team Roles & Responsibilities

| Member Name      | Role  | Responsibilities     |
| ---------------- | ----- | -------------------- |
| Shivam Bilwadiya | Member| research and backend |
| Vedansh gupta    | Leader| research and backend |
| Arshiyan Khan    | Member| frontend and ppt     |

---

## 15. Future Scope & Scalability

### Short-Term

* Weather integration
* Location-based crop suggestions

### Long-Term

* Satellite data analysis
* AI yield prediction

---

## 16. Known Limitations

* Static dataset
* No real-time weather
* Region generalization

---

## 17. Impact

* Improves farmer decision making
* Reduces resource wastage
* Increases profitability
